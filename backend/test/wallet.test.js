import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { after, test } from 'node:test';
import { once } from 'node:events';

const carpetaTemporal = fs.mkdtempSync(path.join(os.tmpdir(), 'meditunja-wallet-'));
process.env.DB_PATH = path.join(carpetaTemporal, 'test.db');
process.env.LOG_PATH = path.join(carpetaTemporal, 'app.log');
process.env.TUNJA_API = 'https://tunja-api.test/api/v1';
process.env.TUNJA_CLAVE = 'clave-de-prueba';

const [{ default: app }, { ready, db }, { ejecutar }] = await Promise.all([
  import('../server.js'),
  import('../src/config/db.js'),
  import('../src/repositories/sqlite.js')
]);

await ready;
await ejecutar(
  'run',
  `INSERT INTO usuarios_tunja (
    tipo_documento, numero_documento, email, estado_afiliacion
  ) VALUES
    ('CC', '1234567890', 'wallet@example.com', 'aprobado'),
    ('CC', '1234567891', 'wallet-sin-tarjeta@example.com', 'aprobado')`
);
await ejecutar(
  'run',
  `INSERT INTO tarjetas_nfc (usuario_id, email, uid)
   VALUES ('17', 'wallet@example.com', 'AABBCCDD')`
);

const llamadasTunja = [];
let saldoCitas = 5000;
let simularRespuestaPerdida = false;
const movimientosCitas = [];
const fetchOriginal = globalThis.fetch;
globalThis.fetch = async (input, opciones = {}) => {
  const url = new URL(input);
  if (url.origin !== 'https://tunja-api.test') {
    return fetchOriginal(input, opciones);
  }

  const headers = new Headers(opciones.headers);
  llamadasTunja.push({
    method: opciones.method || 'GET',
    path: url.pathname,
    headers,
    body: opciones.body
  });

  if (url.pathname === '/api/v1/auth/me') {
    if (headers.get('authorization') === 'Bearer wallet-sin-tarjeta') {
      return Response.json({
        usuario: {
          id: 18,
          email: 'wallet-sin-tarjeta@example.com',
          descuento: 0
        }
      });
    }
    return Response.json({
      usuario: {
        id: 17,
        email: 'wallet@example.com',
        descuento: 0
      }
    });
  }
  if (url.pathname === '/api/v1/wallet' && (!opciones.method || opciones.method === 'GET')) {
    return Response.json({ saldo: 25000 });
  }
  if (url.pathname === '/api/v1/wallet/topup' && opciones.method === 'POST') {
    return Response.json({
      id: 901,
      monto: JSON.parse(opciones.body).monto,
      saldo: 45000
    });
  }
  if (url.pathname === '/api/v1/users/17/wallet') {
    return Response.json({ saldo: saldoCitas, movimientos: movimientosCitas });
  }
  if (url.pathname === '/api/v1/cards/AABBCCDD') {
    return Response.json({ activa: true, usuario: { id: 17, email: 'wallet@example.com' } });
  }
  if (url.pathname === '/api/v1/users/17/wallet/charge') {
    assert.equal(headers.get('x-api-key'), 'clave-de-prueba');
    const { monto, concepto } = JSON.parse(opciones.body);
    if (monto > saldoCitas) {
      return Response.json({ error: 'saldo_insuficiente', saldo: saldoCitas, falta: monto - saldoCitas }, { status: 402 });
    }
    saldoCitas -= monto;
    const movimiento = { operacion: 'cobro', monto, saldo: saldoCitas, concepto };
    movimientosCitas.unshift(movimiento);
    if (simularRespuestaPerdida) throw new Error('Tiempo de espera agotado');
    return Response.json(movimiento);
  }
  return Response.json({ error: 'ruta_desconocida' }, { status: 404 });
};

const servidor = app.listen(0);
await once(servidor, 'listening');
const baseUrl = `http://127.0.0.1:${servidor.address().port}`;
const token = 'token-de-prueba';

test('paga la cita por su total en TunjaAPI y evita duplicados o reintentos ambiguos', async () => {
  const insertarCita = (codigo, titular, hora) => ejecutar('run', `
    INSERT INTO citas (codigo_cita, usuario_id, ips, servicio, especialidad, fecha, hora, modalidad, costo, descuento_aplicado)
    VALUES (?, ?, 'san-rafael', 'Medicina general', 'Medicina general', '2099-01-01', ?, 'presencial', 12000, 2000)`,
  [codigo, titular, hora]);
  const { lastID: cita } = await insertarCita('PAGO-PRUEBA-1', '17', '08:00');
  const { lastID: otra } = await insertarCita('PAGO-PRUEBA-2', '18', '09:30');
  const peticion = (id, method = 'GET', uid = 'AABBCCDD') => fetchOriginal(`${baseUrl}/api/citas/${id}/pago`, {
    method, headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    ...(method === 'POST' && { body: JSON.stringify({ monto: 1, uid }) })
  });
  assert.equal((await peticion(otra, 'POST')).status, 404);
  const consulta = (await (await peticion(cita)).json()).data;
  assert.equal(consulta.total, 10000);
  assert.equal(consulta.saldo, 5000);
  assert.equal((await peticion(cita, 'POST', '046891p7ACAF2A81')).status, 400);
  assert.equal((await peticion(cita, 'POST', 'DEADBEEF')).status, 403);
  assert.equal(llamadasTunja.some(({ path }) => path.endsWith('/charge')), false);
  assert.equal((await peticion(cita, 'POST')).status, 402);
  saldoCitas = 25000;
  const resultados = await Promise.all([peticion(cita, 'POST'), peticion(cita, 'POST')]);
  assert.ok(resultados.some(({ status }) => status === 200));
  assert.equal(movimientosCitas.length, 1);
  assert.equal(saldoCitas, 15000);
  assert.equal((await peticion(cita, 'POST')).status, 200);
  assert.equal(movimientosCitas.length, 1);

  const { lastID: citaConIncidencia } = await insertarCita('PAGO-PRUEBA-3', '17', '11:00');
  simularRespuestaPerdida = true;
  assert.equal((await peticion(citaConIncidencia, 'POST')).status, 202);
  assert.equal((await peticion(citaConIncidencia, 'POST')).status, 409);
  const verificado = (await (await peticion(citaConIncidencia)).json()).data;
  assert.equal(verificado.estado_pago, 'pagado');
  assert.equal(verificado.saldo, 5000);
  assert.equal(movimientosCitas.length, 2);
  const { lastID: citaSimulada } = await insertarCita('PAGO-PRUEBA-4', '17', '12:30');
  const simulacion = (confirmar) => fetchOriginal(`${baseUrl}/api/citas/${citaSimulada}/pago`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ metodo: 'pse', confirmar_simulacion: confirmar })
  });
  assert.equal((await simulacion(false)).status, 400);
  assert.deepEqual((await (await simulacion(true)).json()).data, { estado_pago: 'pagado', metodo: 'pse' });
  assert.equal((await (await peticion(citaSimulada)).json()).data.metodo, 'pse');
  assert.equal(saldoCitas, 5000);
  assert.equal(movimientosCitas.length, 2);
});

after(async () => {
  globalThis.fetch = fetchOriginal;
  await new Promise((resolve, reject) => {
    servidor.close((error) => error ? reject(error) : resolve());
  });
  await new Promise((resolve, reject) => {
    db.close((error) => error ? reject(error) : resolve());
  });
  fs.rmSync(carpetaTemporal, { recursive: true, force: true });
});

test('consulta saldo y acredita recargas usando la clave solo en el backend', async () => {
  const autorizacion = { Authorization: `Bearer ${token}` };
  const consulta = await fetchOriginal(`${baseUrl}/api/wallet`, {
    headers: autorizacion
  });
  assert.equal(consulta.status, 200);
  assert.deepEqual(await consulta.json(), { data: { saldo: 25000 } });

  const recarga = await fetchOriginal(`${baseUrl}/api/wallet/topup`, {
    method: 'POST',
    headers: {
      ...autorizacion,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ monto: 20000 })
  });
  assert.equal(recarga.status, 200);
  assert.deepEqual(await recarga.json(), {
    mensaje: 'El saldo fue acreditado en tu billetera TunjaAPI.',
    data: { id: 901, monto: 20000, saldo: 45000 },
    saldo: 45000
  });

  const solicitudTopup = llamadasTunja.find((llamada) =>
    llamada.path === '/api/v1/wallet/topup'
  );
  assert.ok(solicitudTopup);
  assert.equal(solicitudTopup.headers.get('x-api-key'), 'clave-de-prueba');
  assert.equal(solicitudTopup.headers.get('authorization'), `Bearer ${token}`);
  assert.deepEqual(JSON.parse(solicitudTopup.body), {
    monto: 20000,
    concepto: 'Recarga de saldo MediTunja'
  });
});

test('rechaza montos fuera de rango antes de llamar a TunjaAPI', async () => {
  const llamadasAntes = llamadasTunja.filter((llamada) =>
    llamada.path === '/api/v1/wallet/topup'
  ).length;
  const respuesta = await fetchOriginal(`${baseUrl}/api/wallet/topup`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ monto: 99 })
  });

  assert.equal(respuesta.status, 400);
  assert.equal((await respuesta.json()).error, 'monto_fuera_de_rango');
  assert.equal(
    llamadasTunja.filter((llamada) => llamada.path === '/api/v1/wallet/topup').length,
    llamadasAntes
  );
});

test('no consulta ni recarga saldo si el usuario no tiene tarjeta vinculada', async () => {
  const llamadasSaldoAntes = llamadasTunja.filter((llamada) =>
    llamada.path === '/api/v1/wallet' ||
    llamada.path === '/api/v1/wallet/topup'
  ).length;
  const autorizacion = { Authorization: 'Bearer wallet-sin-tarjeta' };

  const consulta = await fetchOriginal(`${baseUrl}/api/wallet`, {
    headers: autorizacion
  });
  assert.equal(consulta.status, 403);
  assert.equal((await consulta.json()).error, 'tarjeta_no_vinculada');

  const recarga = await fetchOriginal(`${baseUrl}/api/wallet/topup`, {
    method: 'POST',
    headers: {
      ...autorizacion,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ monto: 20000 })
  });
  assert.equal(recarga.status, 403);
  assert.equal((await recarga.json()).error, 'tarjeta_no_vinculada');
  assert.equal(
    llamadasTunja.filter((llamada) =>
      llamada.path === '/api/v1/wallet' ||
      llamada.path === '/api/v1/wallet/topup'
    ).length,
    llamadasSaldoAntes
  );
});
