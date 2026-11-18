import crypto from 'node:crypto';
import { ready, db } from '../src/config/db.js';
import { ejecutar } from '../src/repositories/sqlite.js';
import * as sesiones from '../src/repositories/sesiones.js';
import { tunjaRequest } from '../src/services/tunjaApi.js';
import { listarUsuariosTunja } from '../src/services/tunjaUsuarios.js';
import { autenticarOperadorTunja, coincideOperador } from '../src/services/operadorTunja.js';

async function aprovisionar() {
  const nit = process.env.SUPERADMIN_NIT?.trim() || '';
  const nombre = process.env.SUPERADMIN_NAME?.trim() || '';
  const email = process.env.SUPERADMIN_EMAIL?.trim().toLowerCase() || '';
  const contrasena = process.env.SUPERADMIN_PASSWORD || '';
  if (!/^\d{9}-\d$/.test(nit) ||
      nombre.length < 2 || nombre.length > 100 ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
      contrasena.length < 12 || contrasena.length > 128) {
    throw new Error(
      'Configura SUPERADMIN_NIT, SUPERADMIN_NAME, SUPERADMIN_EMAIL y SUPERADMIN_PASSWORD; la contraseña debe tener entre 12 y 128 caracteres.'
    );
  }

  await ready;
  const existente = await ejecutar(
    'get',
    `SELECT id_usuario, rol FROM usuarios
     WHERE tipo_documento = 'NIT' AND numero_documento = ?`,
    [nit]
  );
  if (existente && existente.rol !== 'superadministrador') {
    throw new Error('Ese NIT ya pertenece a otra cuenta; no se modificó.');
  }

  const cuentaLocalPorEmail = await ejecutar(
    'get', 'SELECT id_usuario FROM usuarios WHERE lower(email) = ?', [email]
  );
  if (cuentaLocalPorEmail && cuentaLocalPorEmail.id_usuario !== existente?.id_usuario) {
    throw new Error('El correo ya pertenece a otra cuenta de MediTunja.');
  }

  const cuentasTunja = await listarUsuariosTunja();
  const cuentaTunja = cuentasTunja.find((cuenta) => coincideOperador(cuenta, { email, nit }));
  if (!cuentaTunja) {
    if (cuentasTunja.some((cuenta) =>
      cuenta.email?.trim().toLowerCase() === email ||
      [nit, nit.replace('-', '')].includes(cuenta.documento || cuenta.numero_documento)
    )) {
      throw new Error('El NIT o correo corresponde a otra cuenta de TunjaAPI.');
    }
    await tunjaRequest('/auth/register', {
      method: 'POST',
      requiresKey: true,
      body: {
        email, contrasena, nombre, documento: nit, tipo_documento: 'NIT',
        numero_documento: nit, perfil: 'general', descuento: 0
      }
    });
  }
  if (!await autenticarOperadorTunja({ email, nit, contrasena })) {
    throw new Error('TunjaAPI no confirmó una cuenta activa con el NIT y correo configurados.');
  }

  // El esquema de MediTunja requiere un hash. La contraseña se valida en TunjaAPI.
  const passwordHash = `${crypto.randomBytes(16).toString('hex')}:${crypto.randomBytes(64).toString('hex')}`;
  if (existente) {
    await ejecutar(
      'run',
      `UPDATE usuarios
       SET nombres = ?, apellidos = 'Administración general', email = ?, eps = NULL,
           rol = 'superadministrador', password_hash = ?, activo = 1,
           estado_registro = 'aprobado'
       WHERE id_usuario = ?`,
      [nombre, email, passwordHash, existente.id_usuario]
    );
    await sesiones.revocarTodasDeUsuario(existente.id_usuario, Date.now());
  } else {
    await ejecutar(
      'run',
      `INSERT INTO usuarios (
         tipo_documento, numero_documento, nombres, apellidos, email, eps,
         rol, password_hash, activo, estado_registro
       ) VALUES ('NIT', ?, ?, 'Administración general', ?, NULL,
         'superadministrador', ?, 1, 'aprobado')`,
      [nit, nombre, email, passwordHash]
    );
  }
}

try {
  await aprovisionar();
  console.log('Operador general aprovisionado y autenticado en TunjaAPI.');
} catch (error) {
  console.error('No se pudo aprovisionar el operador general:', error.status || error.code || error.message);
  process.exitCode = 1;
} finally {
  await new Promise((resolve) => db.close(resolve));
}
