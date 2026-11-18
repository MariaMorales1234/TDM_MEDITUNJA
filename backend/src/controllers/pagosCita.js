import { randomUUID } from 'node:crypto';
import { ejecutar } from '../repositories/sqlite.js';
import { buscarPorUsuario } from '../repositories/tarjetasNfc.js';
import { tunjaRequest } from '../services/tunjaApi.js';
import { responderFalloTunja } from './wallet.js';
const metodosSimulados = new Set(['nequi', 'daviplata', 'pse', 'tarjeta']);

function errorPago(res, status, error, mensaje, data) {
  return res.status(status).json({ error, mensaje, ...(data && { data }) });
}

async function conCita(req, res, operar) {
  const id = Number(req.params.id);
  const titular = req.usuarioCitas.id;
  if (!Number.isSafeInteger(id) || id < 1 || !/^\d+$/.test(titular)) {
    return errorPago(res, 400, 'datos_invalidos', 'No se pudo identificar la cita o la billetera.');
  }
  try {
    const cita = await ejecutar('get', `
      SELECT c.id_cita, c.codigo_cita, c.ips, c.servicio, c.fecha, c.hora,
             max(0, c.costo - c.descuento_aplicado) AS total,
             coalesce(p.estado, 'pendiente') AS estado_pago, p.referencia, p.metodo
      FROM citas c LEFT JOIN pagos_cita p ON p.cita_id = c.id_cita
      WHERE c.id_cita = ? AND c.usuario_id = ? AND c.estado = 'confirmada'`, [id, titular]);
    if (!cita) return errorPago(res, 404, 'cita_no_encontrada', 'Selecciona una cita confirmada de tu cuenta.');
    return await operar(cita, `/users/${titular}/wallet`);
  } catch (error) {
    return responderFalloTunja(res, error);
  }
}

async function confirmarPago(id, referencia) {
  await ejecutar('run', "UPDATE pagos_cita SET estado = 'pagado' WHERE cita_id = ? AND referencia = ?",
    [id, referencia]);
}

function datosPago(cita, saldo) {
  const { referencia: _referencia, ...data } = cita;
  return { ...data, saldo };
}

export function consultarPagoCita(req, res) {
  return conCita(req, res, async (cita, ruta) => {
    const billetera = await tunjaRequest(`${ruta}?limite=${cita.estado_pago === 'en_proceso' ? 200 : 1}`, { requiresKey: true });
    if (!Number.isSafeInteger(billetera.saldo) || billetera.saldo < 0) {
      return errorPago(res, 502, 'saldo_no_disponible', 'No fue posible confirmar tu saldo.');
    }
    if (cita.estado_pago === 'en_proceso' && billetera.movimientos?.some((movimiento) =>
      movimiento.operacion === 'cobro' && movimiento.concepto === cita.referencia && movimiento.monto === cita.total
    )) {
      await confirmarPago(cita.id_cita, cita.referencia);
      cita.estado_pago = 'pagado';
    }
    return res.json({ data: datosPago(cita, billetera.saldo) });
  });
}

export function pagarCita(req, res) {
  return conCita(req, res, async (cita, ruta) => {
    if (cita.estado_pago === 'pagado') return res.json({ data: { estado_pago: 'pagado', metodo: cita.metodo } });
    const metodo = req.body?.metodo ?? 'nfc';
    const simulado = metodosSimulados.has(metodo);
    if (metodo !== 'nfc' && (!simulado || req.body?.confirmar_simulacion !== true)) {
      return errorPago(res, 400, 'metodo_invalido', 'Selecciona un método de pago y confirma la simulación.');
    }
    if (!simulado && cita.total > 0 && !process.env.TUNJA_CLAVE) {
      return errorPago(res, 503, 'servicio_no_configurado', 'La billetera no está configurada.');
    }
    if (!simulado && cita.total > 0 && cita.estado_pago === 'pendiente') {
      const uid = typeof req.body?.uid === 'string' ? req.body.uid.trim().toUpperCase() : '';
      if (!/^(?:[A-F0-9]{2}){2,20}$/.test(uid)) {
        return errorPago(res, 400, 'uid_invalido', 'Acerca tu tarjeta al lector para confirmar el pago.');
      }
      const vinculada = await buscarPorUsuario(req.usuarioCitas.id);
      if (vinculada?.uid !== uid) {
        return errorPago(res, 403, 'tarjeta_no_coincide', 'Acerca la tarjeta vinculada a tu cuenta.');
      }
      let tarjeta;
      try {
        tarjeta = await tunjaRequest(`/cards/${encodeURIComponent(uid)}`, { requiresKey: true });
      } catch (error) {
        if (error.status !== 404) throw error;
      }
      if (tarjeta?.activa !== true || tarjeta.admin ||
          String(tarjeta.usuario?.id) !== req.usuarioCitas.id ||
          typeof tarjeta.usuario?.email !== 'string' ||
          tarjeta.usuario.email.trim().toLowerCase() !== vinculada.email.trim().toLowerCase()) {
        return errorPago(res, 403, 'tarjeta_no_disponible', 'TunjaAPI no pudo confirmar que tu tarjeta esté activa y vinculada.');
      }
    }
    const referencia = `MediTunja cita ${cita.codigo_cita} ${randomUUID()}`;
    const reserva = await ejecutar('run', `
      INSERT INTO pagos_cita (cita_id, referencia, estado, metodo)
      SELECT id_cita, ?, ?, ? FROM citas WHERE id_cita = ? AND estado = 'confirmada'
      ON CONFLICT(cita_id) DO NOTHING`,
    [referencia, simulado || cita.total === 0 ? 'pagado' : 'en_proceso', metodo, cita.id_cita]);
    if (!reserva.changes) {
      return errorPago(res, 409, 'pago_no_disponible', 'Consulta el estado de la cita antes de volver a intentar el pago.');
    }
    if (simulado || !cita.total) return res.json({ data: { estado_pago: 'pagado', metodo } });

    try {
      const resultado = await tunjaRequest(`${ruta}/charge`, {
        method: 'POST', requiresKey: true, body: { monto: cita.total, concepto: referencia }
      });
      if (resultado?.operacion !== 'cobro' || resultado.monto !== cita.total) {
        return errorPago(res, 202, 'pago_en_verificacion', 'Estamos verificando el cobro.', { estado_pago: 'en_proceso' });
      }
      await confirmarPago(cita.id_cita, referencia);
      return res.json({ data: { estado_pago: 'pagado', metodo, saldo: resultado.saldo } });
    } catch (error) {
      if ([400, 401, 402, 403, 404, 429].includes(error.status)) {
        await ejecutar('run', "DELETE FROM pagos_cita WHERE cita_id = ? AND referencia = ? AND estado = 'en_proceso'",
          [cita.id_cita, referencia]);
        if (error.status === 402) {
          return errorPago(res, 402, 'saldo_insuficiente', 'Tu saldo no alcanza para pagar la cita.');
        }
        return responderFalloTunja(res, error);
      }
      return errorPago(res, 202, 'pago_en_verificacion', 'Estamos verificando el cobro.', { estado_pago: 'en_proceso' });
    }
  });
}
