import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { once } from 'node:events';
import test from 'node:test';

const carpetaTemporal = fs.mkdtempSync(path.join(os.tmpdir(), 'meditunja-citas-'));
process.env.DB_PATH = path.join(carpetaTemporal, 'test.db');
process.env.LOG_PATH = path.join(carpetaTemporal, 'app.log');
process.env.TUNJA_API = 'https://tunja-api.test/api/v1';

const [{ default: app }, { ready }, { ejecutar }] = await Promise.all([
  import('../server.js'),
  import('../src/config/db.js'),
  import('../src/repositories/sqlite.js')
]);

await ready;
await ejecutar(
  'run',
  `INSERT INTO usuarios_tunja (
     tipo_documento, numero_documento, email, eps, estado_afiliacion
   ) VALUES ('CC', '1000000001', 'usuario1@example.com', 'Nueva EPS', 'aprobado'),
            ('CC', '1000000002', 'usuario2@example.com', 'Nueva EPS', 'aprobado'),
            ('CC', '1000000003', 'usuario3@example.com', 'Nueva EPS', 'pendiente'),
            ('CC', '1000000004', 'usuario4@example.com', 'Nueva EPS', 'aprobado'),
            ('CC', '1000000005', 'usuario5@example.com', 'Famisanar', 'aprobado')`
);
await ejecutar(
  'run',
  `INSERT INTO tarjetas_nfc (usuario_id, email, uid) VALUES
    ('1', 'usuario1@example.com', 'AABBCC01'),
    ('2', 'usuario2@example.com', 'AABBCC02'),
    ('5', 'usuario5@example.com', 'AABBCC05')`
);
for (const [id, eps, ips, nombre, servicios, estado] of [
  ['1', 'Nueva EPS', 'san-rafael', 'Hospital San Rafael de Tunja', ['srv-cardiologia', 'srv-rayos-x'], 'Activo'],
  ['2', 'Nueva EPS', 'medilaser', 'Clínica Medilaser', ['srv-neumologia'], 'Activo'],
  ['3', 'SURA', 'los-andes', 'Clínica Los Andes', ['srv-med-gen'], 'Activo'],
  ['4', 'Nueva EPS', 'clinica-chia', 'Clínica de Chía', ['srv-enfermeria'], 'Inactivo']
]) {
  await ejecutar('run', `INSERT INTO convenios (
    id, eps_id, eps_nombre, eps_sede, eps_direccion, ips_id, ips_nombre,
    ips_sede, ips_direccion, portafolio_id, portafolio_nombre,
    servicios_seleccionados, clausula_transporte, estado, fecha_creacion
  ) VALUES (?, ?, ?, 'Principal', 'Tunja', ?, ?, 'Principal', 'Tunja',
    'integral', 'Integral', ?, 1, ?, '2020-01-01')`, [id, eps, eps, ips, nombre, JSON.stringify(servicios), estado]);
}
const servidor = app.listen(0);
await once(servidor, 'listening');
const baseUrl = `http://127.0.0.1:${servidor.address().port}`;
const fetchOriginal = globalThis.fetch;
globalThis.fetch = async (url, opciones) => {
  const token = opciones.headers.Authorization;
  if (token === 'Bearer eps-sin-convenios') {
    return Response.json({ id: 5, email: 'usuario5@example.com', descuento: 0 });
  }
  if (token.includes('usuario-pendiente')) {
    return new Response(JSON.stringify({
      id: 3,
      email: 'usuario3@example.com',
      perfil: 'general',
      descuento: 0
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  }
  if (token.includes('usuario-sin-tarjeta')) {
    return new Response(JSON.stringify({
      id: 4,
      email: 'usuario4@example.com',
      perfil: 'general',
      descuento: 0
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  }
  const usuario = token === 'Bearer usuario-dos'
    ? { id: 2, email: 'usuario2@example.com', perfil: 'general', descuento: 0 }
    : { id: 1, email: 'usuario1@example.com', perfil: 'estudiante', descuento: 15 };
  return new Response(JSON.stringify(usuario), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  });
};

function fechaEnDias(dias) {
  const fecha = new Date(Date.now() - 5 * 60 * 60 * 1000);
  fecha.setUTCDate(fecha.getUTCDate() + dias);
  return fecha.toISOString().slice(0, 10);
}

async function peticion(ruta, token, opciones = {}) {
  return fetchOriginal(`${baseUrl}${ruta}`, {
    ...opciones,
    headers: {
      ...(opciones.body ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...opciones.headers
    }
  });
}

test('reservas validan disponibilidad, descuento, usuario y cancelación', async () => {
  try {
    const sinSesion = await peticion('/api/citas', null);
    assert.equal(sinSesion.status, 401);

    const accesoPendiente = await peticion('/api/citas', 'usuario-pendiente');
    assert.equal(accesoPendiente.status, 403);
    assert.equal((await accesoPendiente.json()).error, 'afiliacion_pendiente');

    const fecha = fechaEnDias(3);
    const sinConvenios = 'eps-sin-convenios';
    const catalogoBase = await peticion('/api/citas/catalogo', sinConvenios);
    assert.equal(catalogoBase.status, 200);
    const base = (await catalogoBase.json()).data;
    assert.ok(base.find(({ id }) => id === 'santiago-tunja').servicios.some(({ id }) => id === 'srv-med-familiar'));
    const disponibilidadBase = await peticion(
      `/api/citas/disponibilidad?ips=santiago-tunja&fecha=${fecha}`, sinConvenios
    );
    assert.equal(disponibilidadBase.status, 200);
    assert.deepEqual((await disponibilidadBase.json()).horarios.at(-1),
      { hora: '17:30', disponible: true, estado: 'disponible' });
    const reservaBase = await peticion('/api/citas', sinConvenios, {
      method: 'POST',
      body: JSON.stringify({ ips: 'santiago-tunja', servicio: 'srv-med-familiar', fecha, hora: '17:30' })
    });
    assert.equal(reservaBase.status, 201);
    const catalogo = await peticion('/api/citas/catalogo', 'usuario-uno');
    assert.equal(catalogo.status, 200);
    const ipsPorId = new Map((await catalogo.json()).data.map((ips) => [ips.id, ips]));
    assert.deepEqual([...ipsPorId.keys()].sort(), ['clinica-medilaser', 'san-rafael']);
    assert.deepEqual(ipsPorId.get('clinica-medilaser').servicios.map(({ id }) => id), ['srv-neumologia']);
    const citaSinTarjeta = await peticion('/api/citas', 'usuario-sin-tarjeta', {
      method: 'POST',
      body: JSON.stringify({
        ips: 'san-rafael',
        servicio: 'cardio',
        fecha,
        hora: '08:00',
        modalidad: 'presencial'
      })
    });
    assert.equal(citaSinTarjeta.status, 403);
    assert.equal((await citaSinTarjeta.json()).error, 'tarjeta_no_vinculada');

    const disponibilidad = await peticion(
      `/api/citas/disponibilidad?ips=san-rafael&fecha=${fecha}`,
      'usuario-uno'
    );
    assert.equal(disponibilidad.status, 200);
    const horas = (await disponibilidad.json()).horarios;
    assert.equal(horas.at(-1).hora, '17:30');
    assert.equal(horas.at(-1).disponible, true);
    const disponibilidadHoy = await peticion(
      `/api/citas/disponibilidad?ips=san-rafael&fecha=${fechaEnDias(0)}`, 'usuario-uno'
    );
    assert.equal((await disponibilidadHoy.json()).horarios.every(({ disponible }) => !disponible), true);

    const datosReserva = {
      ips: 'san-rafael',
      servicio: 'cardio',
      fecha,
      hora: '09:30',
      modalidad: 'presencial'
    };
    for (const [cambios, error] of [
      [{ servicio: 'srv-neumologia' }, 'servicio_sin_convenio'],
      [{ fecha: fechaEnDias(0) }, 'anticipacion_insuficiente']
    ]) {
      const rechazada = await peticion('/api/citas', 'usuario-uno', {
        method: 'POST', body: JSON.stringify({ ...datosReserva, ...cambios })
      });
      assert.equal(rechazada.status, 400);
      assert.equal((await rechazada.json()).error, error);
    }
    const reserva = await peticion('/api/citas', 'usuario-uno', {
      method: 'POST',
      body: JSON.stringify(datosReserva)
    });
    assert.equal(reserva.status, 201);
    const resultadoReserva = await reserva.json();
    assert.equal(resultadoReserva.cita.codigo_cita.startsWith('CITA-'), true);
    assert.equal(resultadoReserva.cita.descuento_aplicado, 7500);
    assert.equal(resultadoReserva.total_a_pagar, 42500);
    const detalleAjeno = await peticion(`/api/citas?id=${resultadoReserva.cita.id_cita}`, 'usuario-dos');
    assert.deepEqual((await detalleAjeno.json()).data, []);

    const citaDuplicada = await peticion('/api/citas', 'usuario-dos', {
      method: 'POST',
      body: JSON.stringify(datosReserva)
    });
    assert.equal(citaDuplicada.status, 409);

    const ocupada = await peticion(
      `/api/citas/disponibilidad?ips=san-rafael&fecha=${fecha}`,
      'usuario-dos'
    );
    const horariosOcupados = (await ocupada.json()).horarios;
    assert.equal(horariosOcupados.find((horario) => horario.hora === '09:30').disponible, false);

    const citasUsuarioUno = await peticion('/api/citas', 'usuario-uno');
    const listaUsuarioUno = await citasUsuarioUno.json();
    assert.equal(listaUsuarioUno.data.length, 1);
    assert.equal(listaUsuarioUno.data[0].codigo_cita, resultadoReserva.cita.codigo_cita);

    const citasUsuarioDos = await peticion('/api/citas', 'usuario-dos');
    assert.deepEqual((await citasUsuarioDos.json()).data, []);

    const cancelacion = await peticion(
      `/api/citas/${resultadoReserva.cita.id_cita}/cancelar`,
      'usuario-uno',
      { method: 'PUT' }
    );
    assert.equal(cancelacion.status, 200);
    assert.equal((await cancelacion.json()).cita.estado, 'cancelada');

    const reservaHorarioLiberado = await peticion('/api/citas', 'usuario-dos', {
      method: 'POST',
      body: JSON.stringify(datosReserva)
    });
    assert.equal(reservaHorarioLiberado.status, 201);

    const reservaTarde = await peticion('/api/citas', 'usuario-uno', {
      method: 'POST',
      body: JSON.stringify({
        ...datosReserva, ips: 'clinica-medilaser', servicio: 'srv-neumologia', hora: '17:30'
      })
    });
    assert.equal(reservaTarde.status, 201);
    const { cita: citaTarde } = await reservaTarde.json();
    const transporte = await peticion('/api/transporte', 'usuario-uno', {
      method: 'POST',
      body: JSON.stringify({
        citaId: citaTarde.id_cita,
        tipoDiscapacidad: 'motora-silla-ruedas',
        requerimientos: ['rampa'],
        viajaAcompanante: false,
        direccionOrigen: 'Carrera 11 # 27-27',
        barrioSector: 'Centro',
        modalidadViaje: 'ida-y-regreso',
        declaracionVeracidad: true
      })
    });
    assert.equal(transporte.status, 201);
    assert.equal((await transporte.json()).data.citaId, citaTarde.id_cita);
    const detalle = await peticion(`/api/citas?id=${citaTarde.id_cita}`, 'usuario-uno');
    assert.deepEqual((await detalle.json()).data, [citaTarde]);

    const fechaCercana = fechaEnDias(0);
    const instanteCercano = new Date(Date.now() + 2 * 60 * 60 * 1000 - 5 * 60 * 60 * 1000);
    const horaCercana = `${String(instanteCercano.getUTCHours()).padStart(2, '0')}:${String(instanteCercano.getUTCMinutes()).padStart(2, '0')}`;
    const { lastID } = await ejecutar(
      'run',
      `INSERT INTO citas (
         codigo_cita, usuario_id, ips, servicio, especialidad, fecha, hora,
         modalidad, costo, descuento_aplicado
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      ['CITA-PRUEBA-24H', '1', 'clinica-chia', 'Cardiología', 'Cardiología',
        fechaCercana, horaCercana, 'presencial', 120000, 18000]
    );
    const cancelacionTardia = await peticion(
      `/api/citas/${lastID}/cancelar`,
      'usuario-uno',
      { method: 'PUT' }
    );
    assert.equal(cancelacionTardia.status, 409);
    assert.equal((await cancelacionTardia.json()).error, 'plazo_vencido');
  } finally {
    globalThis.fetch = fetchOriginal;
    await new Promise((resolve, reject) => {
      servidor.close((error) => error ? reject(error) : resolve());
    });
    const { db } = await import('../src/config/db.js');
    await new Promise((resolve, reject) => {
      db.close((error) => error ? reject(error) : resolve());
    });
    fs.rmSync(carpetaTemporal, { recursive: true, force: true });
  }
});
