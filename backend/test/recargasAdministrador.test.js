import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { after, test } from 'node:test';
import { once } from 'node:events';

const carpetaTemporal = fs.mkdtempSync(path.join(os.tmpdir(), 'meditunja-admin-wallet-'));
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
const salt = crypto.randomBytes(16).toString('hex');
const passwordHash = `${salt}:${crypto.scryptSync('contrasena-admin', salt, 64).toString('hex')}`;
await ejecutar(
  'run',
  `INSERT INTO usuarios (
    tipo_documento, numero_documento, nombres, apellidos, email, eps, rol,
    password_hash, activo, estado_registro
  ) VALUES ('NIT', '900111111-1', 'Administradora', 'Sura', 'admin@sura.test',
    'Sura', 'administrador', ?, 1, 'aprobado')`,
  [passwordHash]
);
await ejecutar(
  'run',
  `INSERT INTO usuarios_tunja (
    tipo_documento, numero_documento, email, nombres, apellidos, eps, estado_afiliacion
  ) VALUES
    ('CC', '1234567890', 'afiliado@sura.test', 'Afiliado', 'Sura', 'EPS Sura', 'aprobado'),
    ('CC', '1234567891', 'sin-tarjeta@sura.test', 'Sin Tarjeta', 'Sura', 'EPS Sura', 'aprobado'),
    ('CC', '9876543210', 'afiliado@otra.test', 'Afiliado', 'Otra EPS', 'Otra EPS', 'aprobado'),
    ('CC', '5555555555', 'pendiente@sura.test', 'Pendiente', 'Sura', 'Sura', 'pendiente')`
);
await ejecutar(
  'run',
  `INSERT INTO tarjetas_nfc (usuario_id, email, uid)
   VALUES ('17', 'afiliado@sura.test', 'AABBCC17')`
);

const llamadasTunja = [];
let tarjetaAdministradorCreada = false;
const fetchOriginal = globalThis.fetch;
globalThis.fetch = async (input, opciones = {}) => {
  const url = new URL(input);
  if (url.origin !== 'https://tunja-api.test') {
    return fetchOriginal(input, opciones);
  }

  llamadasTunja.push({
    method: opciones.method || 'GET',
    path: url.pathname,
    headers: new Headers(opciones.headers),
    body: opciones.body
  });

  if (url.pathname === '/api/v1/users' && (!opciones.method || opciones.method === 'GET')) {
    const desde = Number(url.searchParams.get('desde') || 0);
    if (desde > 0) return Response.json({ total: 5, limite: 200, desde, usuarios: [] });
    return Response.json({
      total: 5,
      limite: 200,
      desde: 0,
      usuarios: [
        {
          id: 17,
          nombre: 'Afiliado Sura',
          activo: true,
          documento: '123.456.789-0',
          email: 'afiliado@sura.test',
          saldo: 25000
        },
        {
          id: 18,
          nombre: 'Afiliado Otra EPS',
          activo: true,
          documento: '9876543210',
          email: 'afiliado@otra.test',
          saldo: 10000
        },
        {
          id: 20,
          nombre: 'Afiliado sin tarjeta',
          activo: true,
          documento: '1234567891',
          email: 'sin-tarjeta@sura.test',
          saldo: 9000
        },
        {
          id: 19,
          nombre: 'Cuenta inactiva',
          activo: false,
          documento: '5555555555',
          email: 'pendiente@sura.test',
          saldo: 0
        },
        {
          id: 99,
          nombre: 'Administradora Sura',
          activo: true,
          documento: '900111111-1',
          email: 'admin@sura.test',
          saldo: 0
        }
      ]
    });
  }
  if (url.pathname === '/api/v1/users/17') {
    return Response.json({
      id: 17,
      nombre: 'Afiliado Sura',
      activo: true,
      documento: '123.456.789-0',
      email: 'afiliado@sura.test',
      saldo: 25000
    });
  }
  if (url.pathname === '/api/v1/users/18') {
    return Response.json({
      id: 18,
      nombre: 'Afiliado Otra EPS',
      activo: true,
      documento: '9876543210',
      email: 'afiliado@otra.test',
      saldo: 10000
    });
  }
  if (url.pathname === '/api/v1/users/20') {
    return Response.json({
      id: 20,
      nombre: 'Afiliado sin tarjeta',
      activo: true,
      documento: '1234567891',
      email: 'sin-tarjeta@sura.test',
      saldo: 9000
    });
  }
  if (url.pathname === '/api/v1/users/99') {
    return Response.json({
      id: 99,
      nombre: 'Administradora Sura',
      activo: true,
      documento: '900111111-1',
      email: 'admin@sura.test',
      saldo: 0
    });
  }
  if (/^\/api\/v1\/cards\/[A-F0-9]+$/i.test(url.pathname) && (!opciones.method || opciones.method === 'GET')) {
    if (tarjetaAdministradorCreada && url.pathname.endsWith('/DEADBEEF')) {
      return Response.json({
        uid: 'DEADBEEF',
        activa: true,
        usuario: { id: 99, email: 'admin@sura.test' }
      });
    }
    return Response.json({ error: 'tarjeta_no_encontrada' }, { status: 404 });
  }
  if (url.pathname === '/api/v1/cards' && opciones.method === 'POST') {
    const body = JSON.parse(opciones.body);
    if (body.uid === 'DEADBEEF') tarjetaAdministradorCreada = true;
    const emailsPorId = new Map([
      [17, 'afiliado@sura.test'],
      [18, 'afiliado@otra.test'],
      [20, 'sin-tarjeta@sura.test'],
      [99, 'admin@sura.test']
    ]);
    return Response.json({
      uid: body.uid,
      activa: true,
      usuario: { id: body.usuario_id, email: emailsPorId.get(body.usuario_id) }
    }, { status: 201 });
  }
  if (url.pathname === '/api/v1/users/17/wallet/topup' && opciones.method === 'POST') {
    return Response.json({
      operacion: 'recarga',
      monto: JSON.parse(opciones.body).monto,
      saldo: 45000,
      usuario_id: 17
    });
  }
  return Response.json({ error: 'ruta_desconocida' }, { status: 404 });
};

const servidor = app.listen(0);
await once(servidor, 'listening');
const baseUrl = `http://127.0.0.1:${servidor.address().port}`;

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

async function iniciarSesionAdministrador() {
  const respuesta = await fetchOriginal(`${baseUrl}/api/admin/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      tipo_documento: 'NIT',
      numero_documento: '900111111-1',
      contrasena: 'contrasena-admin'
    })
  });
  assert.equal(respuesta.status, 200);
  return (await respuesta.json()).token;
}

test('lista afiliados activos solo de la EPS y recarga mediante TunjaAPI', async () => {
  const token = await iniciarSesionAdministrador();
  const autorizacion = { Authorization: `Bearer ${token}` };

  const listado = await fetchOriginal(`${baseUrl}/api/admin/recargas/afiliados`, {
    headers: autorizacion
  });
  assert.equal(listado.status, 200);
  assert.deepEqual((await listado.json()).data, [{
    id: 17,
    nombre: 'Afiliado Sura',
    tipoDocumento: 'CC',
    numeroDocumento: '1234567890',
    email: 'afiliado@sura.test',
    saldo: 25000
  }]);

  const recarga = await fetchOriginal(`${baseUrl}/api/admin/recargas/afiliados/17`, {
    method: 'POST',
    headers: {
      ...autorizacion,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ monto: 20000, metodoPago: 'nequi' })
  });
  assert.equal(recarga.status, 200);
  assert.equal((await recarga.json()).data.saldo, 45000);

  const operacionTunja = llamadasTunja.find((llamada) =>
    llamada.path === '/api/v1/users/17/wallet/topup'
  );
  assert.ok(operacionTunja);
  assert.equal(operacionTunja.headers.get('x-api-key'), 'clave-de-prueba');
  assert.equal(operacionTunja.headers.get('authorization'), null);
  assert.deepEqual(JSON.parse(operacionTunja.body), {
    monto: 20000,
    concepto: 'Recarga MediTunja (pago simulado: nequi)'
  });
});

test('rechaza recargar afiliados ajenos o medios inválidos sin acreditar saldo', async () => {
  const token = await iniciarSesionAdministrador();
  const autorizacion = { Authorization: `Bearer ${token}` };
  const cantidadRecargas = llamadasTunja.filter((llamada) =>
    llamada.path.endsWith('/wallet/topup')
  ).length;

  const afiliadoAjeno = await fetchOriginal(`${baseUrl}/api/admin/recargas/afiliados/18`, {
    method: 'POST',
    headers: {
      ...autorizacion,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ monto: 10000, metodoPago: 'pse' })
  });
  assert.equal(afiliadoAjeno.status, 404);

  const metodoInvalido = await fetchOriginal(`${baseUrl}/api/admin/recargas/afiliados/17`, {
    method: 'POST',
    headers: {
      ...autorizacion,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ monto: 10000, metodoPago: 'efectivo' })
  });
  assert.equal(metodoInvalido.status, 400);
  assert.equal(
    llamadasTunja.filter((llamada) => llamada.path.endsWith('/wallet/topup')).length,
    cantidadRecargas
  );

  const sinTarjeta = await fetchOriginal(`${baseUrl}/api/admin/recargas/afiliados/20`, {
    method: 'POST',
    headers: {
      ...autorizacion,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ monto: 10000, metodoPago: 'pse' })
  });
  assert.equal(sinTarjeta.status, 404);
  assert.equal(
    llamadasTunja.filter((llamada) => llamada.path.endsWith('/wallet/topup')).length,
    cantidadRecargas
  );
});

test('lista afiliados activos aprobados de la EPS para vincular tarjetas', async () => {
  const token = await iniciarSesionAdministrador();
  const respuesta = await fetchOriginal(`${baseUrl}/api/admin/tarjetas-nfc/afiliados`, {
    headers: { Authorization: `Bearer ${token}` }
  });

  assert.equal(respuesta.status, 200);
  assert.deepEqual((await respuesta.json()).data, [
    {
      id: 17,
      nombre: 'Afiliado Sura',
      tipoDocumento: 'CC',
      numeroDocumento: '1234567890',
      email: 'afiliado@sura.test',
      tarjetaIdentificador: 'CC17'
    },
    {
      id: 20,
      nombre: 'Sin Tarjeta Sura',
      tipoDocumento: 'CC',
      numeroDocumento: '1234567891',
      email: 'sin-tarjeta@sura.test',
      tarjetaIdentificador: null
    }
  ]);
});

test('vincula una tarjeta al afiliado activo y guarda la asociación local y en TunjaAPI', async () => {
  const token = await iniciarSesionAdministrador();
  const respuesta = await fetchOriginal(`${baseUrl}/api/admin/tarjetas-nfc/afiliados/20/vincular`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ uid: 'abcdef01' })
  });

  assert.equal(respuesta.status, 200);
  assert.deepEqual((await respuesta.json()).data, {
    vinculada: true,
    identificador: 'EF01'
  });
  assert.deepEqual(
    await ejecutar('get', 'SELECT usuario_id, email, uid FROM tarjetas_nfc WHERE uid = ?', ['ABCDEF01']),
    { usuario_id: '20', email: 'sin-tarjeta@sura.test', uid: 'ABCDEF01' }
  );
  const creacionTarjeta = llamadasTunja.find((llamada) =>
    llamada.path === '/api/v1/cards' && llamada.method === 'POST'
  );
  assert.deepEqual(JSON.parse(creacionTarjeta.body), {
    uid: 'ABCDEF01',
    usuario_id: 20
  });
});

test('rechaza vincular tarjetas a afiliados de otra EPS o con UID inválido', async () => {
  const token = await iniciarSesionAdministrador();
  const autorizacion = {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json'
  };
  const cantidadCreaciones = llamadasTunja.filter((llamada) =>
    llamada.path === '/api/v1/cards' && llamada.method === 'POST'
  ).length;

  const afiliadoAjeno = await fetchOriginal(`${baseUrl}/api/admin/tarjetas-nfc/afiliados/18/vincular`, {
    method: 'POST',
    headers: autorizacion,
    body: JSON.stringify({ uid: 'AABBCCDD' })
  });
  assert.equal(afiliadoAjeno.status, 404);

  const uidInvalido = await fetchOriginal(`${baseUrl}/api/admin/tarjetas-nfc/afiliados/20/vincular`, {
    method: 'POST',
    headers: autorizacion,
    body: JSON.stringify({ uid: 'not-a-uid' })
  });
  assert.equal(uidInvalido.status, 400);
  assert.equal(
    llamadasTunja.filter((llamada) =>
      llamada.path === '/api/v1/cards' && llamada.method === 'POST'
    ).length,
    cantidadCreaciones
  );
});

test('el administrador puede consultar y vincular su propia tarjeta', async () => {
  const token = await iniciarSesionAdministrador();
  const autorizacion = { Authorization: `Bearer ${token}` };

  const estadoInicial = await fetchOriginal(`${baseUrl}/api/admin/tarjetas-nfc/mi-tarjeta`, {
    headers: autorizacion
  });
  assert.equal(estadoInicial.status, 200);
  assert.deepEqual((await estadoInicial.json()).data, {
    vinculada: false,
    identificador: null
  });

  const vinculacion = await fetchOriginal(`${baseUrl}/api/admin/tarjetas-nfc/mi-tarjeta`, {
    method: 'POST',
    headers: {
      ...autorizacion,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ uid: 'deadbeef' })
  });
  assert.equal(vinculacion.status, 200);
  assert.deepEqual((await vinculacion.json()).data, {
    vinculada: true,
    identificador: 'BEEF'
  });
  assert.deepEqual(
    await ejecutar('get', 'SELECT usuario_id, email, uid FROM tarjetas_nfc WHERE uid = ?', ['DEADBEEF']),
    { usuario_id: '99', email: 'admin@sura.test', uid: 'DEADBEEF' }
  );
  const creacionTarjeta = llamadasTunja.find((llamada) =>
    llamada.path === '/api/v1/cards' && llamada.method === 'POST' &&
    JSON.parse(llamada.body).uid === 'DEADBEEF'
  );
  assert.deepEqual(JSON.parse(creacionTarjeta.body), {
    uid: 'DEADBEEF',
    usuario_id: 99
  });
});

test('el administrador puede iniciar sesión con su propia tarjeta y se rechazan tarjetas de afiliados', async () => {
  const respuestaAdmin = await fetchOriginal(`${baseUrl}/api/admin/card-login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ uid: 'deadbeef' })
  });
  assert.equal(respuestaAdmin.status, 200);
  const sesionAdmin = await respuestaAdmin.json();
  assert.equal(sesionAdmin.data.rol, 'administrador');
  assert.equal(sesionAdmin.data.eps, 'Sura');
  assert.equal(sesionAdmin.tipo_token, 'Bearer');

  const sesionValidada = await fetchOriginal(`${baseUrl}/api/admin/sesion`, {
    headers: { Authorization: `Bearer ${sesionAdmin.token}` }
  });
  assert.equal(sesionValidada.status, 200);
  assert.equal((await sesionValidada.json()).data.rol, 'administrador');

  const tarjetaAfiliado = await fetchOriginal(`${baseUrl}/api/admin/card-login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ uid: 'AABBCC17' })
  });
  assert.equal(tarjetaAfiliado.status, 404);
  assert.equal((await tarjetaAfiliado.json()).error, 'tarjeta_no_administrativa');
});
