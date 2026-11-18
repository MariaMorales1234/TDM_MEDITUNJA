import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { after, test } from 'node:test';
import { once } from 'node:events';

const carpetaTemporal = fs.mkdtempSync(path.join(os.tmpdir(), 'meditunja-superadmin-'));
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

function hashContrasena(contrasena) {
  const salt = crypto.randomBytes(16).toString('hex');
  return `${salt}:${crypto.scryptSync(contrasena, salt, 64).toString('hex')}`;
}

const contrasenaSuperadmin = 'SuperAdmin-segura-123';
const contrasenaAdmin = 'AdminEPS-segura-123';
await ejecutar(
  'run',
  `INSERT INTO usuarios (
    tipo_documento, numero_documento, nombres, apellidos, email, eps, rol,
    password_hash, activo, estado_registro
  ) VALUES ('NIT', '900999999-9', 'Administración general', 'MediTunja',
    'superadmin@meditunja.test', NULL, 'superadministrador', ?, 1, 'aprobado')`,
  [hashContrasena(contrasenaSuperadmin)]
);
await ejecutar(
  'run',
  `INSERT INTO usuarios (
    tipo_documento, numero_documento, nombres, apellidos, email, eps, rol,
    password_hash, activo, estado_registro
  ) VALUES ('NIT', '900111111-1', 'Administrador SURA', 'Administración',
    'admin.sura@meditunja.com', 'SURA', 'administrador', ?, 1, 'aprobado')`,
  [hashContrasena(contrasenaAdmin)]
);

const operadorTunja = {
  id: 99, activo: true, email: 'superadmin@meditunja.test', documento: '900999999-9'
};
const usuariosTunja = [operadorTunja];
const tarjetasTunja = new Map();
let siguienteIdTunja = 100;
const fetchOriginal = globalThis.fetch;
globalThis.fetch = async (input, opciones = {}) => {
  const url = new URL(input);
  if (url.origin !== 'https://tunja-api.test') {
    return fetchOriginal(input, opciones);
  }

  if (url.pathname === '/api/v1/auth/login' && opciones.method === 'POST') {
    const { email, contrasena } = JSON.parse(opciones.body);
    return email === operadorTunja.email && contrasena === contrasenaSuperadmin
      ? Response.json({ usuario: operadorTunja })
      : Response.json({ error: 'credenciales_invalidas' }, { status: 401 });
  }
  if (url.pathname === '/api/v1/cards') {
    if (opciones.method === 'POST') {
      const { uid, usuario_id } = JSON.parse(opciones.body);
      const usuario = usuariosTunja.find(({ id }) => id === usuario_id);
      const tarjeta = { uid, activa: true, admin: false, usuario };
      tarjetasTunja.set(uid, tarjeta);
      return Response.json(tarjeta, { status: 201 });
    }
    return Response.json({ tarjetas: [...tarjetasTunja.values()], total: tarjetasTunja.size });
  }
  if (url.pathname.startsWith('/api/v1/cards/')) {
    const tarjeta = tarjetasTunja.get(url.pathname.split('/').at(-1));
    return tarjeta ? Response.json(tarjeta) : Response.json({ error: 'tarjeta_no_encontrada' }, { status: 404 });
  }
  if (url.pathname === '/api/v1/users' && (!opciones.method || opciones.method === 'GET')) {
    return Response.json({
      total: usuariosTunja.length,
      limite: 200,
      desde: Number(url.searchParams.get('desde') || 0),
      usuarios: usuariosTunja
    });
  }
  if (url.pathname === '/api/v1/auth/register' && opciones.method === 'POST') {
    const body = JSON.parse(opciones.body);
    const usuario = {
      id: siguienteIdTunja++,
      activo: true,
      email: body.email,
      documento: body.documento,
      nombre: body.nombre
    };
    usuariosTunja.push(usuario);
    return Response.json({ usuario }, { status: 201 });
  }
  const coincidencia = /^\/api\/v1\/users\/(\d+)$/.exec(url.pathname);
  if (coincidencia && (!opciones.method || opciones.method === 'GET')) {
    const usuario = usuariosTunja.find(({ id }) => id === Number(coincidencia[1]));
    return usuario
      ? Response.json(usuario)
      : Response.json({ error: 'usuario_no_encontrado' }, { status: 404 });
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

async function post(ruta, cuerpo, token) {
  return fetchOriginal(`${baseUrl}${ruta}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    },
    body: JSON.stringify(cuerpo)
  });
}

async function iniciarSesionAdministrador(nit, contrasena) {
  const respuesta = await post('/api/admin/login', {
    tipo_documento: 'NIT',
    numero_documento: nit,
    contrasena
  });
  return { respuesta, datos: await respuesta.json() };
}

test('el administrador general gestiona EPS sin heredar permisos de afiliados', async () => {
  const loginDedicado = await post('/api/superadmin/login', {
    tipo_documento: 'NIT',
    numero_documento: '900999999-9',
    contrasena: contrasenaSuperadmin
  });
  assert.equal(loginDedicado.status, 200);
  const { respuesta: loginSuperadmin, datos: sesionSuperadmin } =
    await iniciarSesionAdministrador('900999999-9', contrasenaSuperadmin);
  assert.equal(loginSuperadmin.status, 200);
  assert.equal(sesionSuperadmin.data.rol, 'superadministrador');
  const autorizacionSuperadmin = { Authorization: `Bearer ${sesionSuperadmin.token}` };

  const rutaTarjeta = '/api/superadmin/mi-tarjeta';
  const consultarTarjeta = () => fetchOriginal(`${baseUrl}${rutaTarjeta}`, { headers: autorizacionSuperadmin });
  tarjetasTunja.clear();
  assert.deepEqual((await (await consultarTarjeta()).json()).data, { vinculada: false, identificador: null });
  tarjetasTunja.set('ABCD0123', { uid: 'ABCD0123', activa: true, usuario: { id: 1000 } });
  assert.equal((await post(rutaTarjeta, { uid: 'ABCD0123' }, sesionSuperadmin.token)).status, 409);
  assert.equal((await post(rutaTarjeta, { uid: 'ABCD1234' }, sesionSuperadmin.token)).status, 200);
  assert.equal(tarjetasTunja.get('ABCD1234').usuario.id, operadorTunja.id);
  assert.deepEqual((await (await consultarTarjeta()).json()).data, { vinculada: true, identificador: '1234' });
  const ingresoTarjeta = await post('/api/admin/card-login', { uid: 'ABCD1234' });
  assert.equal(ingresoTarjeta.status, 200);
  assert.equal((await ingresoTarjeta.json()).data.rol, 'superadministrador');
  tarjetasTunja.get('ABCD1234').activa = false;
  assert.equal((await post('/api/admin/card-login', { uid: 'ABCD1234' })).status, 403);
  tarjetasTunja.get('ABCD1234').activa = true;

  const listaInicial = await fetchOriginal(`${baseUrl}/api/superadmin/administradores-eps`, {
    headers: autorizacionSuperadmin
  });
  assert.equal(listaInicial.status, 200);
  const cuentasIniciales = (await listaInicial.json()).data;
  assert.equal(cuentasIniciales.administradores.length, 1);
  assert.ok(cuentasIniciales.epsDisponibles.includes('Nueva EPS'));

  const accesoPacientes = await fetchOriginal(`${baseUrl}/api/admin/afiliados`, {
    headers: autorizacionSuperadmin
  });
  assert.equal(accesoPacientes.status, 403);

  const loginAdminExistente = await iniciarSesionAdministrador('900111111-1', contrasenaAdmin);
  assert.equal(loginAdminExistente.respuesta.status, 200);
  const accesoGestionGeneral = await fetchOriginal(`${baseUrl}/api/superadmin/administradores-eps`, {
    headers: { Authorization: `Bearer ${loginAdminExistente.datos.token}` }
  });
  assert.equal(accesoGestionGeneral.status, 403);
  assert.equal((await post(rutaTarjeta, { uid: 'ABCD0123' }, loginAdminExistente.datos.token)).status, 403);

  const claveInicial = 'Nueva-EPS-segura-123';
  const creacion = await post('/api/superadmin/administradores-eps', {
    nit: '900000001-1',
    eps: 'Nueva EPS',
    contrasena: claveInicial
  }, sesionSuperadmin.token);
  assert.equal(creacion.status, 201);
  const administradorCreado = (await creacion.json()).data;
  assert.equal(administradorCreado.email, 'admin.nuevaeps@meditunja.com');
  assert.equal(usuariosTunja.length, 2);

  const duplicado = await post('/api/superadmin/administradores-eps', {
    nit: '900000002-2',
    eps: 'Nueva EPS',
    contrasena: 'Otra-EPS-segura-123'
  }, sesionSuperadmin.token);
  assert.equal(duplicado.status, 409);

  const loginNuevoAdmin = await iniciarSesionAdministrador('900000001-1', claveInicial);
  assert.equal(loginNuevoAdmin.respuesta.status, 200);
  const tokenAdmin = loginNuevoAdmin.datos.token;

  const desactivacion = await fetchOriginal(
    `${baseUrl}/api/superadmin/administradores-eps/${administradorCreado.id}/estado`,
    {
      method: 'PATCH',
      headers: {
        ...autorizacionSuperadmin,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ activo: false })
    }
  );
  assert.equal(desactivacion.status, 200);
  assert.equal(
    (await fetchOriginal(`${baseUrl}/api/admin/sesion`, {
      headers: { Authorization: `Bearer ${tokenAdmin}` }
    })).status,
    401
  );
  const loginDesactivado = await iniciarSesionAdministrador('900000001-1', claveInicial);
  assert.equal(loginDesactivado.respuesta.status, 403);

  const activacion = await fetchOriginal(
    `${baseUrl}/api/superadmin/administradores-eps/${administradorCreado.id}/estado`,
    {
      method: 'PATCH',
      headers: {
        ...autorizacionSuperadmin,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ activo: true })
    }
  );
  assert.equal(activacion.status, 200);

  const loginAntesDeRestablecer = await iniciarSesionAdministrador('900000001-1', claveInicial);
  assert.equal(loginAntesDeRestablecer.respuesta.status, 200);
  const tokenAnterior = loginAntesDeRestablecer.datos.token;
  const nuevaContrasena = 'Reinicio-EPS-seguro-456';
  const restablecimiento = await fetchOriginal(
    `${baseUrl}/api/superadmin/administradores-eps/${administradorCreado.id}/contrasena`,
    {
      method: 'PATCH',
      headers: {
        ...autorizacionSuperadmin,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ contrasena: nuevaContrasena })
    }
  );
  assert.equal(restablecimiento.status, 200);
  assert.equal(
    (await fetchOriginal(`${baseUrl}/api/admin/sesion`, {
      headers: { Authorization: `Bearer ${tokenAnterior}` }
    })).status,
    401
  );
  const contrasenaAnterior = await iniciarSesionAdministrador('900000001-1', claveInicial);
  assert.equal(contrasenaAnterior.respuesta.status, 401);
  const contrasenaNueva = await iniciarSesionAdministrador('900000001-1', nuevaContrasena);
  assert.equal(contrasenaNueva.respuesta.status, 200);
});
