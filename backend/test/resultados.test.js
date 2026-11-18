import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { once } from 'node:events';
import test from 'node:test';

const carpetaTemporal = fs.mkdtempSync(path.join(os.tmpdir(), 'meditunja-resultados-'));
process.env.DB_PATH = path.join(carpetaTemporal, 'test.db');
process.env.LOG_PATH = path.join(carpetaTemporal, 'app.log');
process.env.TUNJA_API = 'https://tunja-api.test/api/v1';

const [{ default: app }, { ready, db }, { ejecutar }] = await Promise.all([
  import('../server.js'),
  import('../src/config/db.js'),
  import('../src/repositories/sqlite.js')
]);

await ready;
const servidor = app.listen(0);
await once(servidor, 'listening');
const baseUrl = `http://127.0.0.1:${servidor.address().port}`;
const fetchOriginal = globalThis.fetch;
const contrasena = 'contraseña de prueba segura';

async function post(ruta, cuerpo, authorization) {
  return fetchOriginal(`${baseUrl}${ruta}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(authorization ? { Authorization: authorization } : {})
    },
    body: JSON.stringify(cuerpo)
  });
}

test('resultados se guardan y solo se exponen al afiliado y administrador de su EPS', async () => {
  try {
    const registroAdmin = await post('/api/registro', {
      tipo_documento: 'CC',
      numero_documento: '8000000001',
      nombres: 'Administradora',
      apellidos: 'Nueva EPS',
      email: 'admin-resultados@example.test',
      eps: 'Nueva EPS',
      contrasena
    });
    assert.equal(registroAdmin.status, 201);
    await ejecutar(
      'run',
      `UPDATE usuarios SET estado_registro = 'aprobado', rol = 'administrador',
         activo = 1
       WHERE numero_documento = ?`,
      ['8000000001']
    );

    await ejecutar(
      'run',
      `INSERT INTO usuarios_tunja (
         tipo_documento, numero_documento, email, nombres, apellidos, eps, estado_afiliacion
       ) VALUES
         ('CC', '8000000002', 'paciente@example.test', 'Paciente', 'Nueva EPS', 'Nueva EPS', 'aprobado'),
         ('CC', '8000000003', 'otro-eps@example.test', 'Paciente', 'Famisanar', 'Famisanar', 'aprobado'),
         ('CC', '8000000004', 'pendiente@example.test', 'Paciente', 'Pendiente', 'Nueva EPS', 'pendiente')`
    );

    const login = await post('/api/admin/login', {
      tipo_documento: 'CC',
      numero_documento: '8000000001',
      contrasena
    });
    assert.equal(login.status, 200);
    const sesionAdmin = await login.json();
    const authAdmin = `Bearer ${sesionAdmin.token}`;

    const sinSesion = await fetchOriginal(`${baseUrl}/api/admin/resultados`);
    assert.equal(sinSesion.status, 401);
    const afiliados = await fetchOriginal(`${baseUrl}/api/admin/resultados/afiliados`, { headers: { Authorization: authAdmin } });
    const opciones = await afiliados.json();
    assert.deepEqual(opciones.data.map(({ numeroDocumento }) => numeroDocumento), ['8000000002']);
    assert.ok(opciones.ips.some(({ id }) => id === 'san-rafael'));

    const formulario = new FormData();
    for (const [campo, valor] of Object.entries({
      tipoDocumento: 'CC',
      numeroDocumento: '8000000002',
      procedimiento: 'Prueba de integración',
      fecha: '2026-10-12',
      proveedor: 'IPS de prueba',
      estado: 'Disponible',
      informe: 'Informe de prueba para validar el acceso.'
    })) formulario.set(campo, valor);
    const pdf = '%PDF-1.7\nInforme privado de prueba';
    formulario.set('adjunto', new Blob([pdf], { type: 'application/pdf' }), 'informe.pdf');
    const resultadoDisponible = await fetchOriginal(`${baseUrl}/api/admin/resultados`, {
      method: 'POST', headers: { Authorization: authAdmin }, body: formulario
    });
    assert.equal(resultadoDisponible.status, 201);
    const datosDisponible = await resultadoDisponible.json();

    const resultadoEnProceso = await post('/api/admin/resultados', {
      tipoDocumento: 'CC',
      numeroDocumento: '8000000002',
      procedimiento: 'Otro procedimiento',
      fecha: '2026-10-13',
      proveedor: 'IPS de prueba',
      estado: 'En proceso',
      informe: 'Este informe no se debe entregar mientras está en proceso.'
    }, authAdmin);
    assert.equal(resultadoEnProceso.status, 201);
    const { id: idPendiente } = await resultadoEnProceso.json();
    await ejecutar('run', 'UPDATE resultados_procedimientos SET adjunto_nombre = ?, adjunto_contenido = ? WHERE id_resultado = ?',
      ['pendiente.pdf', Buffer.from(pdf), idPendiente]);

    const resultadoOtraEps = await ejecutar(
      'run',
      `INSERT INTO resultados_procedimientos (
         tipo_documento, numero_documento, eps, procedimiento, fecha_procedimiento,
         ips, estado, informe, creado_por
       ) VALUES ('CC', '8000000003', 'Famisanar', 'Registro de otra EPS',
         '2026-10-12', 'IPS de prueba', 'Disponible', 'Informe privado', ?)`,
      [sesionAdmin.data.id_usuario]
    );

    for (const numeroDocumento of ['8000000003', '8000000004']) {
      const noAutorizado = await post('/api/admin/resultados', {
        tipoDocumento: 'CC',
        numeroDocumento,
        procedimiento: 'Procedimiento no autorizado',
        fecha: '2026-10-12',
        proveedor: 'IPS de prueba',
        estado: 'Disponible',
        informe: 'No debe registrarse.'
      }, authAdmin);
      assert.equal(noAutorizado.status, 404);
    }

    const listaAdmin = await fetchOriginal(`${baseUrl}/api/admin/resultados`, {
      headers: { Authorization: authAdmin }
    });
    assert.equal(listaAdmin.status, 200);
    const datosAdmin = await listaAdmin.json();
    assert.equal(datosAdmin.data.length, 2);
    assert.equal(datosAdmin.data[0].patient, 'Paciente Nueva EPS');

    const eliminarResultadoAjeno = await fetchOriginal(
      `${baseUrl}/api/admin/resultados/${resultadoOtraEps.lastID}`,
      { method: 'DELETE', headers: { Authorization: authAdmin } }
    );
    assert.equal(eliminarResultadoAjeno.status, 404);

    const estadoGuardado = await ejecutar(
      'get',
      `SELECT estado FROM resultados_procedimientos WHERE id_resultado = ?`,
      [datosDisponible.id]
    );
    assert.deepEqual(estadoGuardado, { estado: 'Disponible' });

    globalThis.fetch = async (input, options) => {
      const url = typeof input === 'string' ? input : input.url;
      if (url === 'https://tunja-api.test/api/v1/auth/me') {
        const token = options?.headers?.Authorization?.replace(/^Bearer\s+/i, '');
        const email = token === 'paciente-token'
          ? 'paciente@example.test'
          : token === 'otro-eps-token' ? 'otro-eps@example.test' : 'pendiente@example.test';
        return new Response(JSON.stringify({
          usuario: { id: email, email, descuento: 0 }
        }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        });
      }
      return fetchOriginal(input, options);
    };

    const resultadosPaciente = await fetchOriginal(`${baseUrl}/api/resultados`, {
      headers: { Authorization: 'Bearer paciente-token' }
    });
    assert.equal(resultadosPaciente.status, 200);
    const datosPaciente = await resultadosPaciente.json();
    assert.equal(datosPaciente.data.length, 2);
    assert.equal(datosPaciente.data.find((resultado) => resultado.status === 'Disponible').informe,
      'Informe de prueba para validar el acceso.');
    assert.equal(datosPaciente.data.find((resultado) => resultado.status === 'En proceso').informe, null);
    assert.equal(datosPaciente.data.find((resultado) => resultado.status === 'En proceso').adjunto, null);
    assert.equal(datosPaciente.data.find((resultado) => resultado.status === 'Disponible').adjunto, 'informe.pdf');
    const descargar = (id, token) => fetchOriginal(`${baseUrl}/api/resultados/${id}/adjunto`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {}
    });
    const adjunto = await descargar(datosDisponible.id, 'paciente-token');
    assert.equal(adjunto.status, 200);
    assert.match(adjunto.headers.get('content-disposition'), /^attachment/);
    assert.equal(await adjunto.text(), pdf);
    assert.equal((await descargar(datosDisponible.id, 'otro-eps-token')).status, 404);
    assert.equal((await descargar(idPendiente, 'paciente-token')).status, 404);
    assert.equal((await descargar(datosDisponible.id)).status, 401);
    const publicar = (id) => fetchOriginal(`${baseUrl}/api/admin/resultados/${id}/publicar`, {
      method: 'PUT', headers: { Authorization: authAdmin }
    });
    assert.equal((await publicar(resultadoOtraEps.lastID)).status, 404);
    const publicado = await publicar(idPendiente);
    assert.equal(publicado.status, 200);
    assert.equal((await publicado.json()).data.status, 'Disponible');
    assert.equal(await (await descargar(idPendiente, 'paciente-token')).text(), pdf);

    const resultadosSinSesion = await fetchOriginal(`${baseUrl}/api/resultados`);
    assert.equal(resultadosSinSesion.status, 401);

    const resultadosPendiente = await fetchOriginal(`${baseUrl}/api/resultados`, {
      headers: { Authorization: 'Bearer pendiente-token' }
    });
    assert.equal(resultadosPendiente.status, 403);

    const eliminado = await fetchOriginal(
      `${baseUrl}/api/admin/resultados/${datosDisponible.id}`,
      { method: 'DELETE', headers: { Authorization: authAdmin } }
    );
    assert.equal(eliminado.status, 200);
  } finally {
    globalThis.fetch = fetchOriginal;
  }
});

test.after(async () => {
  await new Promise((resolve, reject) => {
    servidor.close((error) => error ? reject(error) : resolve());
  });
  await new Promise((resolve, reject) => {
    db.close((error) => error ? reject(error) : resolve());
  });
  fs.rmSync(carpetaTemporal, { recursive: true, force: true });
});
