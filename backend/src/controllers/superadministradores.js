import crypto from 'node:crypto';
import { promisify } from 'node:util';
import { administradoresEps } from '../config/administradoresEps.js';
import * as sesiones from '../repositories/sesiones.js';
import * as usuarios from '../repositories/usuarios.js';
import { tunjaRequest } from '../services/tunjaApi.js';
import { listarUsuariosTunja } from '../services/tunjaUsuarios.js';

const scrypt = promisify(crypto.scrypt);

function responderError(res, status, error, mensaje) {
  return res.status(status).json({ error, mensaje });
}

function normalizarEmail(email) {
  return typeof email === 'string' ? email.trim().toLocaleLowerCase('es') : '';
}

function normalizarDocumento(documento) {
  return typeof documento === 'string' ? documento.replace(/\D/g, '') : '';
}

function slugEps(eps) {
  return eps.toLocaleLowerCase('es')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, '');
}

function hashContrasena(contrasena) {
  const salt = crypto.randomBytes(16).toString('hex');
  return scrypt(contrasena, salt, 64)
    .then((hash) => `${salt}:${hash.toString('hex')}`);
}

async function verificarCuentaTunja(email, nit, contrasena) {
  const usuariosTunja = await listarUsuariosTunja();
  const documento = normalizarDocumento(nit);
  const coincidencias = usuariosTunja.filter((usuario) =>
    normalizarEmail(usuario?.email) === email ||
    normalizarDocumento(usuario?.documento || usuario?.numero_documento) === documento
  );
  const coincidencia = coincidencias.find((usuario) =>
    normalizarEmail(usuario?.email) === email &&
    normalizarDocumento(usuario?.documento || usuario?.numero_documento) === documento
  );

  if (coincidencias.length > 0) {
    if (!coincidencia || coincidencia.activo !== true ||
        !Number.isSafeInteger(coincidencia.id)) {
      const error = new Error('TunjaAPI ya tiene una cuenta que no coincide o está inactiva.');
      error.code = 'CUENTA_TUNJA_INCOMPATIBLE';
      throw error;
    }
    return coincidencia.id;
  }

  const registro = await tunjaRequest('/auth/register', {
    method: 'POST',
    requiresKey: true,
    body: {
      email,
      contrasena,
      nombre: 'Administrador EPS',
      documento: nit,
      tipo_documento: 'NIT',
      numero_documento: nit,
      perfil: 'general',
      descuento: 0
    }
  });
  return registro.usuario?.id || registro.id;
}

function responderFalloTunja(res, error) {
  if (error.code === 'CUENTA_TUNJA_INCOMPATIBLE') {
    return responderError(res, 409, 'cuenta_tunja_incompatible', error.message);
  }
  if (error.code === 'TUNJA_KEY_MISSING') {
    return responderError(
      res,
      503,
      'servicio_no_configurado',
      'El servidor no tiene configurada la clave de TunjaAPI.'
    );
  }
  if (error.status === 409) {
    return responderError(res, 409, 'cuenta_tunja_duplicada', 'TunjaAPI ya tiene una cuenta con esos datos.');
  }
  if (error.status === 400) {
    return responderError(res, 400, 'cuenta_tunja_rechazada', 'TunjaAPI rechazó los datos del administrador.');
  }
  if (error.status === 401 || error.status === 403 || error.status === 404 ||
      error.status === 429 || error.code === 'TUNJA_API_UNAVAILABLE' ||
      error.code === 'TUNJA_API_INVALID_RESPONSE' ||
      (Number.isInteger(error.status) && error.status >= 500)) {
    console.error('TunjaAPI no pudo aprovisionar la cuenta administradora:', error.code || error.status);
    return responderError(
      res,
      502,
      'tunja_api_no_disponible',
      'No fue posible verificar o aprovisionar la cuenta en TunjaAPI.'
    );
  }

  console.error('Error interno al gestionar administradores EPS:', error.code || 'ERROR_INTERNO');
  return responderError(res, 500, 'error_interno', 'No fue posible completar la operación.');
}

export async function listarAdministradoresEps(req, res) {
  try {
    const administradores = await usuarios.listarAdministradoresEps();
    const epsRegistradas = new Set(
      administradores.map(({ eps }) => eps.toLocaleLowerCase('es'))
    );
    return res.status(200).json({
      data: {
        administradores,
        epsDisponibles: administradoresEps
          .map(({ eps }) => eps)
          .filter((eps) => !epsRegistradas.has(eps.toLocaleLowerCase('es')))
      }
    });
  } catch (error) {
    console.error('Error al listar administradores EPS:', error.code || 'ERROR_INTERNO');
    return responderError(res, 500, 'error_interno', 'No fue posible cargar los administradores EPS.');
  }
}

export async function crearAdministradorEps(req, res) {
  const nit = typeof req.body?.nit === 'string' ? req.body.nit.trim() : '';
  const epsSolicitada = typeof req.body?.eps === 'string' ? req.body.eps.trim() : '';
  const contrasena = typeof req.body?.contrasena === 'string' ? req.body.contrasena : '';
  const eps = administradoresEps.find(
    ({ eps: epsPermitida }) => epsPermitida.toLocaleLowerCase('es') === epsSolicitada.toLocaleLowerCase('es')
  )?.eps;
  if (!/^\d{9}-\d$/.test(nit) || !eps ||
      contrasena.length < 12 || contrasena.length > 128) {
    return responderError(
      res,
      400,
      'datos_invalidos',
      'Selecciona una EPS válida e ingresa un NIT y contraseña de al menos 12 caracteres.'
    );
  }

  try {
    if (await usuarios.buscarPorDocumento('NIT', nit)) {
      return responderError(res, 409, 'nit_duplicado', 'Ya existe una cuenta con ese NIT.');
    }
    if (await usuarios.buscarAdministradorEpsPorEps(eps)) {
      return responderError(res, 409, 'eps_ya_asignada', 'Esta EPS ya tiene una cuenta administradora local.');
    }

    const email = `admin.${slugEps(eps)}@meditunja.com`;
    if (await usuarios.buscarPorEmail(email)) {
      return responderError(
        res,
        409,
        'email_duplicado',
        'El correo administrativo ya está asociado a otra cuenta local.'
      );
    }

    const passwordHash = await hashContrasena(contrasena);
    const usuarioTunjaId = Number(await verificarCuentaTunja(email, nit, contrasena));
    if (!Number.isSafeInteger(usuarioTunjaId) || usuarioTunjaId < 1) {
      return responderError(
        res,
        502,
        'cuenta_tunja_no_verificada',
        'TunjaAPI no confirmó una cuenta activa para este administrador.'
      );
    }
    const usuarioTunja = await tunjaRequest(`/users/${usuarioTunjaId}`, { requiresKey: true });
    const documentoTunja = usuarioTunja.documento || usuarioTunja.numero_documento;
    if (usuarioTunja.activo !== true ||
        normalizarEmail(usuarioTunja.email) !== email ||
        normalizarDocumento(documentoTunja) !== normalizarDocumento(nit)) {
      return responderError(
        res,
        409,
        'cuenta_tunja_incompatible',
        'TunjaAPI no confirmó una cuenta activa con el mismo NIT y correo.'
      );
    }

    const resultado = await usuarios.crearAdministradorEps({
      nit,
      nombres: `Administrador ${eps}`,
      email,
      eps,
      passwordHash
    });
    return res.status(201).json({
      mensaje: 'Cuenta administradora EPS creada.',
      data: {
        id: resultado.lastID,
        nombres: `Administrador ${eps}`,
        nit,
        email,
        eps,
        activo: 1
      }
    });
  } catch (error) {
    if (error.code === 'SQLITE_CONSTRAINT' ||
        error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      return responderError(res, 409, 'cuenta_duplicada', 'El NIT, EPS o correo ya está registrado.');
    }
    return responderFalloTunja(res, error);
  }
}

export async function actualizarEstadoAdministradorEps(req, res) {
  const id = Number(req.params.id);
  const { activo } = req.body || {};
  if (!Number.isSafeInteger(id) || id < 1 || typeof activo !== 'boolean') {
    return responderError(res, 400, 'datos_invalidos', 'Selecciona un administrador y un estado válido.');
  }

  try {
    const administrador = await usuarios.buscarAdministradorEpsPorId(id);
    if (!administrador) {
      return responderError(res, 404, 'administrador_no_encontrado', 'No se encontró el administrador EPS.');
    }
    await usuarios.actualizarEstadoAdministradorEps(id, activo);
    if (!activo) await sesiones.revocarTodasDeUsuario(id, Date.now());
    return res.status(200).json({
      mensaje: activo ? 'Cuenta administradora activada.' : 'Cuenta administradora desactivada.',
      data: { id, activo: activo ? 1 : 0 }
    });
  } catch (error) {
    console.error('Error al cambiar el estado del administrador EPS:', error.code || 'ERROR_INTERNO');
    return responderError(res, 500, 'error_interno', 'No fue posible cambiar el estado de la cuenta.');
  }
}

export async function restablecerContrasenaAdministradorEps(req, res) {
  const id = Number(req.params.id);
  const contrasena = typeof req.body?.contrasena === 'string'
    ? req.body.contrasena
    : '';
  if (!Number.isSafeInteger(id) || id < 1 ||
      contrasena.length < 12 || contrasena.length > 128) {
    return responderError(
      res,
      400,
      'datos_invalidos',
      'La contraseña debe tener entre 12 y 128 caracteres.'
    );
  }

  try {
    const administrador = await usuarios.buscarAdministradorEpsPorId(id);
    if (!administrador) {
      return responderError(res, 404, 'administrador_no_encontrado', 'No se encontró el administrador EPS.');
    }
    const passwordHash = await hashContrasena(contrasena);
    await usuarios.actualizarContrasenaAdministradorEps(id, passwordHash);
    await sesiones.revocarTodasDeUsuario(id, Date.now());
    return res.status(200).json({
      mensaje: 'Contraseña restablecida; se cerraron las sesiones anteriores.'
    });
  } catch (error) {
    console.error('Error al restablecer contraseña de administrador EPS:', error.code || 'ERROR_INTERNO');
    return responderError(res, 500, 'error_interno', 'No fue posible restablecer la contraseña.');
  }
}
