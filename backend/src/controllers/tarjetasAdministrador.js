import * as tarjetas from '../repositories/tarjetasNfc.js';
import * as usuarios from '../repositories/usuarios.js';
import * as usuariosTunja from '../repositories/usuariosTunja.js';
import { tunjaRequest } from '../services/tunjaApi.js';
import { listarUsuariosTunja } from '../services/tunjaUsuarios.js';
import { responderFalloTarjeta } from './nfc.js';

function responderError(res, status, error, mensaje) {
  return res.status(status).json({ error, mensaje });
}

function normalizarEmail(email) {
  return typeof email === 'string'
    ? email.trim().toLocaleLowerCase('es')
    : '';
}

function responderFalloCuentaAdministrador(res, error) {
  if (error.code === 'ADMINISTRADOR_NO_ENCONTRADO') {
    return responderError(res, 403, 'administrador_no_disponible', error.message);
  }
  if (error.code === 'ADMINISTRADOR_TUNJA_NO_DISPONIBLE') {
    return responderError(res, 409, 'administrador_tunja_no_disponible', error.message);
  }
  return responderFalloTarjeta(res, error);
}

async function obtenerCuentaTunjaAdministrador(req) {
  const administrador = await usuarios.buscarAdministradorPorId(req.usuario.id_usuario);
  if (!administrador || administrador.eps !== req.usuario.eps) {
    const error = new Error('No fue posible verificar la cuenta administradora de esta EPS.');
    error.code = 'ADMINISTRADOR_NO_ENCONTRADO';
    throw error;
  }

  const email = normalizarEmail(administrador.email);
  const cuentaTunja = (await listarUsuariosTunja()).find(
    (usuario) => usuario?.activo === true && normalizarEmail(usuario.email) === email
  );
  if (!Number.isSafeInteger(cuentaTunja?.id)) {
    const error = new Error(
      'La cuenta administradora no está activa en TunjaAPI. Solicita que aprovisionen la cuenta para vincular su tarjeta.'
    );
    error.code = 'ADMINISTRADOR_TUNJA_NO_DISPONIBLE';
    throw error;
  }

  const usuarioTunja = await tunjaRequest(`/users/${cuentaTunja.id}`, { requiresKey: true });
  if (usuarioTunja?.id !== cuentaTunja.id || usuarioTunja.activo !== true ||
      normalizarEmail(usuarioTunja.email) !== email) {
    const error = new Error(
      'La cuenta administradora no está activa en TunjaAPI. Solicita que aprovisionen la cuenta para vincular su tarjeta.'
    );
    error.code = 'ADMINISTRADOR_TUNJA_NO_DISPONIBLE';
    throw error;
  }

  return { id: cuentaTunja.id, email };
}

export async function obtenerTarjetaPropiaAdministrador(req, res) {
  try {
    const cuentaTunja = await obtenerCuentaTunjaAdministrador(req);
    const tarjeta = await tarjetas.buscarPorUsuario(String(cuentaTunja.id));
    if (!tarjeta || normalizarEmail(tarjeta.email) !== cuentaTunja.email) {
      return res.status(200).json({
        data: { vinculada: false, identificador: null }
      });
    }

    return res.status(200).json({
      data: { vinculada: true, identificador: tarjeta.identificador }
    });
  } catch (error) {
    return responderFalloCuentaAdministrador(res, error);
  }
}

export async function vincularTarjetaPropiaAdministrador(req, res) {
  const uid = typeof req.body?.uid === 'string'
    ? req.body.uid.trim().toUpperCase()
    : '';
  if (!/^(?:[A-F0-9]{2}){2,20}$/.test(uid)) {
    return responderError(
      res,
      400,
      'uid_invalido',
      'El UID debe contener entre 4 y 40 caracteres hexadecimales.'
    );
  }

  try {
    const cuentaTunja = await obtenerCuentaTunjaAdministrador(req);
    const existente = await tarjetas.buscarPorUid(uid);
    if (existente &&
        (String(existente.usuario_id) !== String(cuentaTunja.id) ||
         normalizarEmail(existente.email) !== cuentaTunja.email)) {
      return responderError(
        res,
        409,
        'tarjeta_ya_vinculada',
        'Esta tarjeta ya está asociada a otra cuenta.'
      );
    }

    const tarjetaActual = await tarjetas.buscarPorUsuario(String(cuentaTunja.id));
    if (tarjetaActual &&
        (tarjetaActual.uid !== uid || normalizarEmail(tarjetaActual.email) !== cuentaTunja.email)) {
      return responderError(
        res,
        409,
        'administrador_ya_tiene_tarjeta',
        'Tu cuenta administradora ya tiene una tarjeta vinculada.'
      );
    }

    let tarjetaTunja;
    try {
      tarjetaTunja = await tunjaRequest(`/cards/${encodeURIComponent(uid)}`, {
        requiresKey: true
      });
    } catch (error) {
      if (error.status !== 404) throw error;
    }

    if (tarjetaTunja) {
      if (String(tarjetaTunja.usuario?.id) !== String(cuentaTunja.id)) {
        return responderError(
          res,
          409,
          'tarjeta_ya_vinculada',
          'TunjaAPI ya tiene esta tarjeta asociada a otra cuenta.'
        );
      }
      if (!tarjetaTunja.activa) {
        tarjetaTunja = await tunjaRequest(`/cards/${encodeURIComponent(uid)}`, {
          method: 'PATCH',
          requiresKey: true,
          body: { activa: true }
        });
      }
    } else {
      tarjetaTunja = await tunjaRequest('/cards', {
        method: 'POST',
        requiresKey: true,
        body: { uid, usuario_id: cuentaTunja.id }
      });
    }

    if (String(tarjetaTunja?.usuario?.id) !== String(cuentaTunja.id) ||
        tarjetaTunja.activa !== true) {
      return responderError(
        res,
        502,
        'tarjeta_no_verificada',
        'TunjaAPI no confirmó la asociación activa de tu tarjeta administradora.'
      );
    }

    await tarjetas.vincular(String(cuentaTunja.id), cuentaTunja.email, uid);
    return res.status(200).json({
      mensaje: 'Tarjeta NFC vinculada a tu cuenta administradora.',
      data: { vinculada: true, identificador: uid.slice(-4) }
    });
  } catch (error) {
    return responderFalloCuentaAdministrador(res, error);
  }
}

export async function listarAfiliadosParaVincularTarjeta(req, res) {
  try {
    const [afiliados, usuariosApi] = await Promise.all([
      usuariosTunja.listarAprobadosParaTarjetaPorEps(req.usuario.eps),
      listarUsuariosTunja()
    ]);
    const usuariosPorEmail = new Map(
      usuariosApi
        .filter((usuario) => usuario?.activo === true)
        .map((usuario) => [normalizarEmail(usuario.email), usuario])
        .filter(([email]) => email)
    );
    const data = afiliados.flatMap((afiliado) => {
      const usuarioApi = usuariosPorEmail.get(normalizarEmail(afiliado.email));
      if (!Number.isSafeInteger(usuarioApi?.id)) return [];
      return [{
        id: usuarioApi.id,
        nombre: [afiliado.nombres, afiliado.apellidos].filter(Boolean).join(' ') ||
          usuarioApi.nombre || afiliado.email,
        tipoDocumento: afiliado.tipo_documento,
        numeroDocumento: afiliado.numero_documento,
        email: afiliado.email,
        tarjetaIdentificador: afiliado.tarjeta_uid
          ? afiliado.tarjeta_uid.slice(-4)
          : null
      }];
    });

    return res.status(200).json({ data });
  } catch (error) {
    return responderFalloTarjeta(res, error);
  }
}

export async function vincularTarjetaAfiliado(req, res) {
  const id = Number(req.params.id);
  const uid = typeof req.body?.uid === 'string'
    ? req.body.uid.trim().toUpperCase()
    : '';
  if (!Number.isSafeInteger(id) || id < 1 ||
      !/^(?:[A-F0-9]{2}){2,20}$/.test(uid)) {
    return responderError(
      res,
      400,
      'datos_invalidos',
      'Selecciona un afiliado y proporciona un UID NFC válido.'
    );
  }

  try {
    let usuarioApi;
    try {
      usuarioApi = await tunjaRequest(`/users/${id}`, { requiresKey: true });
    } catch (error) {
      if (error.status === 404) {
        return responderError(
          res,
          404,
          'afiliado_no_disponible',
          'El afiliado no está activo o no pertenece a la EPS administrada.'
        );
      }
      throw error;
    }
    const email = normalizarEmail(usuarioApi?.email);
    if (!usuarioApi || usuarioApi.id !== id || usuarioApi.activo !== true || !email) {
      return responderError(
        res,
        404,
        'afiliado_no_disponible',
        'El afiliado no está activo o no pertenece a la EPS administrada.'
      );
    }

    const afiliado = await usuariosTunja.buscarAprobadoSinTarjetaPorEmail(
      req.usuario.eps,
      email
    );
    if (!afiliado) {
      return responderError(
        res,
        404,
        'afiliado_no_disponible',
        'El afiliado no está activo o no pertenece a la EPS administrada.'
      );
    }

    const tarjetaExistente = await tarjetas.buscarPorUid(uid);
    if (tarjetaExistente && String(tarjetaExistente.usuario_id) !== String(id)) {
      return responderError(
        res,
        409,
        'tarjeta_ya_vinculada',
        'Esta tarjeta ya está asociada a otra cuenta.'
      );
    }

    const tarjetaActual = await tarjetas.buscarPorUsuario(String(id));
    if (tarjetaActual && tarjetaActual.uid !== uid) {
      return responderError(
        res,
        409,
        'afiliado_ya_tiene_tarjeta',
        'El afiliado ya tiene una tarjeta vinculada. Desvincúlala antes de asignar otra.'
      );
    }

    let tarjetaTunja;
    try {
      tarjetaTunja = await tunjaRequest(`/cards/${encodeURIComponent(uid)}`, {
        requiresKey: true
      });
    } catch (error) {
      if (error.status !== 404) throw error;
    }

    if (tarjetaTunja) {
      if (String(tarjetaTunja.usuario?.id) !== String(id)) {
        return responderError(
          res,
          409,
          'tarjeta_ya_vinculada',
          'TunjaAPI ya tiene esta tarjeta asociada a otra cuenta.'
        );
      }
      if (!tarjetaTunja.activa) {
        tarjetaTunja = await tunjaRequest(`/cards/${encodeURIComponent(uid)}`, {
          method: 'PATCH',
          requiresKey: true,
          body: { activa: true }
        });
      }
    } else {
      tarjetaTunja = await tunjaRequest('/cards', {
        method: 'POST',
        requiresKey: true,
        body: { uid, usuario_id: id }
      });
    }

    if (String(tarjetaTunja?.usuario?.id) !== String(id) ||
        tarjetaTunja.activa !== true) {
      return responderError(
        res,
        502,
        'tarjeta_no_verificada',
        'TunjaAPI no confirmó la asociación activa de la tarjeta con el afiliado.'
      );
    }

    await tarjetas.vincular(String(id), email, uid);
    return res.status(200).json({
      mensaje: 'Tarjeta NFC vinculada al afiliado.',
      data: { vinculada: true, identificador: uid.slice(-4) }
    });
  } catch (error) {
    return responderFalloTarjeta(res, error);
  }
}
