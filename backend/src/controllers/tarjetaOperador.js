import { buscarCredenciales } from '../repositories/usuarios.js';
import { coincideOperador } from '../services/operadorTunja.js';
import { tunjaRequest } from '../services/tunjaApi.js';
import { listarUsuariosTunja } from '../services/tunjaUsuarios.js';
import { responderFalloTarjeta } from './nfc.js';

async function cuentaOperador({ numero_documento: nit }) {
  const { email } = await buscarCredenciales('NIT', nit);
  const identidad = { nit, email: email.trim().toLowerCase() };
  return (await listarUsuariosTunja()).find((cuenta) =>
    cuenta.activo === true && Number.isSafeInteger(cuenta.id) && coincideOperador(cuenta, identidad)
  );
}

async function tarjetaActiva(usuarioId) {
  let desde = 0;
  while (true) {
    const pagina = await tunjaRequest(`/cards?limite=200&desde=${desde}`, { requiresKey: true });
    if (!Array.isArray(pagina.tarjetas) || !Number.isSafeInteger(pagina.total) ||
        pagina.total < 0 || (!pagina.tarjetas.length && desde < pagina.total)) {
      const error = new Error('TunjaAPI devolvió un listado de tarjetas inválido.');
      error.code = 'TUNJA_API_INVALID_RESPONSE';
      throw error;
    }
    const tarjeta = pagina.tarjetas.find((item) =>
      item.activa === true && !item.admin &&
      String(item.usuario?.id) === String(usuarioId) && typeof item.uid === 'string'
    );
    if (tarjeta) return tarjeta;
    desde += pagina.tarjetas.length;
    if (desde >= pagina.total) return null;
  }
}

function estadoTarjeta(tarjeta) {
  return { vinculada: Boolean(tarjeta), identificador: tarjeta?.uid.slice(-4) ?? null };
}

export async function gestionarTarjetaOperador(req, res) {
  const vincular = req.method === 'POST';
  const uid = typeof req.body?.uid === 'string' ? req.body.uid.trim().toUpperCase() : '';
  if (vincular && !/^(?:[A-F0-9]{2}){2,20}$/.test(uid)) {
    return res.status(400).json({ mensaje: 'Ingresa un UID NFC hexadecimal válido.' });
  }

  try {
    const cuenta = await cuentaOperador(req.usuario);
    if (!cuenta) return res.status(409).json({ mensaje: 'La cuenta del operador debe estar activa en TunjaAPI.' });
    const actual = await tarjetaActiva(cuenta.id);
    if (!vincular || actual?.uid === uid) {
      return res.json({ data: estadoTarjeta(actual) });
    }
    if (actual) return res.status(409).json({ mensaje: 'Ya tienes una tarjeta NFC activa.' });

    const ruta = `/cards/${encodeURIComponent(uid)}`;
    let tarjeta;
    try {
      tarjeta = await tunjaRequest(ruta, { requiresKey: true });
    } catch (error) {
      if (error.status !== 404) throw error;
    }
    if (tarjeta && (tarjeta.admin || String(tarjeta.usuario?.id) !== String(cuenta.id))) {
      return res.status(409).json({ mensaje: 'La tarjeta ya está asignada en TunjaAPI.' });
    }
    if (!tarjeta) {
      await tunjaRequest('/cards', { method: 'POST', requiresKey: true, body: { uid, usuario_id: cuenta.id } });
    } else if (!tarjeta.activa) {
      await tunjaRequest(ruta, { method: 'PATCH', requiresKey: true, body: { activa: true } });
    }
    const confirmada = await tunjaRequest(ruta, { requiresKey: true });
    if (confirmada.activa !== true || confirmada.admin ||
        String(confirmada.usuario?.id) !== String(cuenta.id)) {
      return res.status(502).json({ mensaje: 'TunjaAPI no confirmó la vinculación de la tarjeta.' });
    }
    return res.json({ data: estadoTarjeta({ uid }) });
  } catch (error) {
    return responderFalloTarjeta(res, error);
  }
}
