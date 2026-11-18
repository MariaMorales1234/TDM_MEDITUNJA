import crypto from 'node:crypto';
import { promisify } from 'node:util';
import * as usuarios from '../repositories/usuarios.js';
import * as sesiones from '../repositories/sesiones.js';
import * as tarjetasNfc from '../repositories/tarjetasNfc.js';
import { tunjaRequest } from '../services/tunjaApi.js';
import { autenticarOperadorTunja, coincideOperador } from '../services/operadorTunja.js';
import { responderFalloTarjeta } from './nfc.js';

const scrypt = promisify(crypto.scrypt);
const tiposDocumentoPermitidos = new Set(['CC', 'TI', 'CE', 'PAS', 'NIT']);
const duracionSesionMs = 30 * 60 * 1000;

const responderError = (res, status, error, mensaje) =>
  res.status(status).json({ error, mensaje });

async function verificarContrasena(contrasena, passwordHash) {
  if (typeof passwordHash !== 'string') return false;
  const [sal, hashGuardado, ...resto] = passwordHash.split(':');
  if (!sal || !/^[a-f0-9]{32}$/i.test(sal) ||
      !hashGuardado || !/^[a-f0-9]{128}$/i.test(hashGuardado) || resto.length > 0) {
    return false;
  }

  const hashIngresado = await scrypt(contrasena, sal, 64);
  return crypto.timingSafeEqual(hashIngresado, Buffer.from(hashGuardado, 'hex'));
}

async function procesarInicioSesion(req, res, soloAdministrador) {
  const { tipo_documento, numero_documento, contrasena } = req.body || {};
  if (typeof tipo_documento !== 'string' ||
      typeof numero_documento !== 'string' ||
      typeof contrasena !== 'string' ||
      !tipo_documento.trim() ||
      !numero_documento.trim() ||
      !contrasena.length ||
      numero_documento.trim().length > 30 ||
      contrasena.length > 128) {
    return responderError(
      res,
      400,
      'Datos inválidos',
      'Envía tipo_documento, numero_documento y contrasena válidos.'
    );
  }

  const tipoDocumento = tipo_documento.trim().toUpperCase();
  const numeroDocumento = numero_documento.trim().toUpperCase();
  const documentoValido = tipoDocumento === 'PAS'
    ? /^[A-Z]{2}\d{6}$/.test(numeroDocumento)
    : tipoDocumento === 'NIT'
      ? /^\d{9}-\d$/.test(numeroDocumento)
      : /^\d{1,10}$/.test(numeroDocumento);
  if (!tiposDocumentoPermitidos.has(tipoDocumento) ||
      (tipoDocumento === 'NIT' && !soloAdministrador) ||
      !documentoValido) {
    return responderError(res, 400, 'Datos inválidos', 'Revisa el tipo y número de documento.');
  }

  try {
    const usuario = await usuarios.buscarCredenciales(tipoDocumento, numeroDocumento);

    if (soloAdministrador && tipoDocumento === 'NIT' && usuario?.rol === 'superadministrador') {
      return autenticarSuperadministrador(res, numeroDocumento, contrasena, usuario);
    }

    const contrasenaValida = usuario &&
      await verificarContrasena(contrasena, usuario.password_hash);

    if (!usuario || !contrasenaValida) {
      return responderError(
        res,
        401,
        'Credenciales incorrectas',
        'El tipo, número de documento o contraseña no son correctos.'
      );
    }

    if (usuario.estado_registro === 'pendiente') {
      return responderError(res, 403, 'Cuenta pendiente', 'Tu solicitud de registro está pendiente de aprobación.');
    }
    if (usuario.estado_registro === 'rechazado') {
      return responderError(
        res,
        403,
        'Cuenta rechazada',
        'Tu solicitud de registro fue rechazada. Contacta al administrador para más información.'
      );
    }
    if (usuario.estado_registro !== 'aprobado') {
      return responderError(res, 403, 'Cuenta no disponible', 'La cuenta no está habilitada para iniciar sesión.');
    }
    if (soloAdministrador && usuario.rol !== 'administrador') {
      return responderError(res, 403, 'Acceso denegado', 'Esta cuenta no tiene permisos de administrador.');
    }
    if (soloAdministrador && usuario.activo !== 1) {
      return responderError(res, 403, 'Cuenta desactivada', 'La cuenta administradora está desactivada.');
    }
    if (soloAdministrador && (typeof usuario.eps !== 'string' || !usuario.eps.trim())) {
      return responderError(res, 403, 'EPS no asignada', 'La cuenta administradora debe tener una EPS asignada.');
    }

    const token = crypto.randomBytes(32).toString('hex');
    const ahora = Date.now();
    const expiraEn = ahora + duracionSesionMs;
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    await sesiones.crear(usuario.id_usuario, tokenHash, ahora, expiraEn);

    return res.status(200).json({
      mensaje: 'Inicio de sesión exitoso.',
      token,
      tipo_token: 'Bearer',
      expira_en: new Date(expiraEn).toISOString(),
      expira_en_segundos: duracionSesionMs / 1000,
      data: {
        id_usuario: usuario.id_usuario,
        nombres: usuario.nombres,
        apellidos: usuario.apellidos,
        tipo_documento: usuario.tipo_documento,
        numero_documento: usuario.numero_documento,
        estado_registro: usuario.estado_registro,
        rol: usuario.rol,
        eps: usuario.eps
      }
    });
  } catch (error) {
    console.error('Error en POST /api/login:', error.code || 'ERROR_INTERNO');
    return responderError(res, 500, 'Error interno del servidor', 'Ocurrió un error al iniciar sesión.');
  }
}

export function iniciarSesion(req, res) {
  return procesarInicioSesion(req, res, false);
}

export function iniciarSesionAdministrador(req, res) {
  return procesarInicioSesion(req, res, true);
}

export function iniciarSesionSuperadministrador(req, res) {
  const { tipo_documento, numero_documento, contrasena } = req.body || {};
  const tipoDocumento = typeof tipo_documento === 'string'
    ? tipo_documento.trim().toUpperCase()
    : '';
  const numeroDocumento = typeof numero_documento === 'string'
    ? numero_documento.trim().toUpperCase()
    : '';
  if (tipoDocumento !== 'NIT' || !/^\d{9}-\d$/.test(numeroDocumento) ||
      typeof contrasena !== 'string' || contrasena.length < 1 || contrasena.length > 128) {
    return responderError(res, 400, 'Datos inválidos', 'Revisa el NIT y la contraseña.');
  }

  return autenticarSuperadministrador(res, numeroDocumento, contrasena);
}

async function autenticarSuperadministrador(res, numeroDocumento, contrasena, cuentaEncontrada) {
  try {
    const usuario = cuentaEncontrada ?? await usuarios.buscarCredenciales('NIT', numeroDocumento);
    const cuentaValida = usuario?.rol === 'superadministrador' &&
      usuario.estado_registro === 'aprobado' &&
      usuario.activo === 1 &&
      await autenticarOperadorTunja({
        email: usuario.email.trim().toLowerCase(), nit: numeroDocumento, contrasena
      });
    if (!cuentaValida) {
      return responderError(
        res,
        401,
        'Credenciales incorrectas',
        'El NIT o la contraseña no son correctos.'
      );
    }

    return await responderSesionOperador(res, usuario);
  } catch (error) {
    if ([400, 401, 403].includes(error.status)) {
      return responderError(res, 401, 'Credenciales incorrectas', 'El NIT o la contraseña no son correctos.');
    }
    if (error.status || error.code?.startsWith('TUNJA_')) {
      return responderFalloTarjeta(res, error);
    }
    console.error('Error en POST /api/superadmin/login:', error.code || 'ERROR_INTERNO');
    return responderError(res, 500, 'Error interno del servidor', 'Ocurrió un error al iniciar sesión.');
  }
}

async function responderSesionOperador(res, usuario) {
  const token = crypto.randomBytes(32).toString('hex');
  const ahora = Date.now();
  const expiraEn = ahora + duracionSesionMs;
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
  await sesiones.crear(usuario.id_usuario, tokenHash, ahora, expiraEn);

  return res.status(200).json({
    mensaje: 'Inicio de sesión exitoso.',
    token,
    tipo_token: 'Bearer',
    expira_en: new Date(expiraEn).toISOString(),
    expira_en_segundos: duracionSesionMs / 1000,
    data: {
      id_usuario: usuario.id_usuario,
      nombres: usuario.nombres,
      apellidos: usuario.apellidos,
      tipo_documento: usuario.tipo_documento,
      numero_documento: usuario.numero_documento,
      estado_registro: usuario.estado_registro,
      rol: usuario.rol,
      eps: null
    }
  });
}

async function iniciarSesionOperadorTarjeta(res, uid) {
  const noAdministrativa = () => responderError(
    res, 404, 'tarjeta_no_administrativa', 'Esta tarjeta no corresponde a una cuenta administradora.'
  );
  try {
    const tarjeta = await tunjaRequest(`/cards/${encodeURIComponent(uid)}`, { requiresKey: true });
    const titular = tarjeta.usuario;
    if (tarjeta.admin || !Number.isSafeInteger(titular?.id) || titular.id < 1 ||
        typeof titular.email !== 'string') return noAdministrativa();

    const email = titular.email.trim().toLowerCase();
    const operador = await usuarios.buscarOperadorPorEmail(email);
    if (!operador) return noAdministrativa();
    if (tarjeta.activa !== true || operador.activo !== 1 || operador.estado_registro !== 'aprobado') {
      return responderError(res, 403, 'cuenta_no_disponible', 'La tarjeta y la cuenta del operador deben estar activas.');
    }
    const cuenta = await tunjaRequest(`/users/${titular.id}`, { requiresKey: true });
    if (cuenta.id !== titular.id || cuenta.activo !== true ||
        !coincideOperador(cuenta, { email, nit: operador.numero_documento })) {
      return responderError(res, 401, 'tarjeta_asociacion_inconsistente', 'TunjaAPI no confirmó la cuenta del operador.');
    }
    return await responderSesionOperador(res, operador);
  } catch (error) {
    if (error.status === 404) return noAdministrativa();
    return responderFalloTarjeta(res, error);
  }
}

export async function iniciarSesionAdministradorTarjeta(req, res) {
  const uid = typeof req.body?.uid === 'string'
    ? req.body.uid.trim().toUpperCase()
    : '';
  if (!/^(?:[A-F0-9]{2}){2,20}$/.test(uid)) {
    return responderError(res, 400, 'uid_invalido', 'El UID debe contener entre 4 y 40 caracteres hexadecimales.');
  }

  try {
    const tarjetaLocal = await tarjetasNfc.buscarPorUid(uid);
    const administrador = tarjetaLocal
      ? await usuarios.buscarAdministradorPorEmail(tarjetaLocal.email)
      : null;
    if (!tarjetaLocal || !administrador) {
      return iniciarSesionOperadorTarjeta(res, uid);
    }

    if (administrador.estado_registro !== 'aprobado' || administrador.activo !== 1) {
      return responderError(
        res,
        403,
        'cuenta_no_disponible',
        'La cuenta administradora debe estar aprobada para iniciar sesión.'
      );
    }
    if (typeof administrador.eps !== 'string' || !administrador.eps.trim()) {
      return responderError(
        res,
        403,
        'eps_no_asignada',
        'La cuenta administradora debe tener una EPS asignada.'
      );
    }

    let tarjetaTunja;
    try {
      tarjetaTunja = await tunjaRequest(`/cards/${encodeURIComponent(uid)}`, {
        requiresKey: true
      });
    } catch (error) {
      if (error.status === 404) {
        return responderError(res, 401, 'tarjeta_no_valida', 'La tarjeta no está activa en TunjaAPI.');
      }
      return responderFalloTarjeta(res, error);
    }

    const usuarioTarjeta = tarjetaTunja?.usuario;
    const asociacionValida = tarjetaTunja?.activa === true &&
      String(usuarioTarjeta?.id) === String(tarjetaLocal.usuario_id) &&
      typeof usuarioTarjeta?.email === 'string' &&
      usuarioTarjeta.email.trim().toLowerCase() === tarjetaLocal.email.trim().toLowerCase();
    if (!asociacionValida) {
      return responderError(
        res,
        401,
        tarjetaTunja?.activa === true ? 'tarjeta_asociacion_inconsistente' : 'tarjeta_inactiva',
        tarjetaTunja?.activa === true
          ? 'La asociación de esta tarjeta no coincide con la cuenta administradora.'
          : 'La tarjeta está desactivada en TunjaAPI.'
      );
    }

    const token = crypto.randomBytes(32).toString('hex');
    const ahora = Date.now();
    const expiraEn = ahora + duracionSesionMs;
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    await sesiones.crear(administrador.id_usuario, tokenHash, ahora, expiraEn);

    return res.status(200).json({
      mensaje: 'Inicio de sesión exitoso.',
      token,
      tipo_token: 'Bearer',
      expira_en: new Date(expiraEn).toISOString(),
      expira_en_segundos: duracionSesionMs / 1000,
      data: {
        id_usuario: administrador.id_usuario,
        nombres: administrador.nombres,
        apellidos: administrador.apellidos,
        tipo_documento: administrador.tipo_documento,
        numero_documento: administrador.numero_documento,
        estado_registro: administrador.estado_registro,
        rol: administrador.rol,
        eps: administrador.eps
      }
    });
  } catch (error) {
    console.error('Error al iniciar sesión administrativa con tarjeta NFC:', error.code || 'ERROR_INTERNO');
    return responderError(res, 500, 'Error interno del servidor', 'Ocurrió un error al iniciar sesión.');
  }
}
