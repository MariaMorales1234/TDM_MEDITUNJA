import crypto from 'node:crypto';
import { ejecutar } from '../repositories/sqlite.js';
import * as usuariosTunja from '../repositories/usuariosTunja.js';
import * as sesionesTarjeta from '../repositories/sesionesTarjeta.js';
import { tunjaRequest } from '../services/tunjaApi.js';
import { listarConvenios } from '../repositories/administracion.js';
import { IPS_CATALOGO, SERVICIOS_POR_CATEGORIA, nombreCompletoIps } from '../config/convenios.js';
import { duracionPorServicio, tarifaPorServicio } from '../config/tarifasCitas.js';

const horarios = Array.from({ length: 18 }, (_, indice) => {
  const minutos = indice < 10 ? 8 * 60 + indice * 30 : 14 * 60 + (indice - 10) * 30;
  return `${String(Math.floor(minutos / 60)).padStart(2, '0')}:${String(minutos % 60).padStart(2, '0')}`;
});
const anticipacionMinima = 24 * 60 * 60 * 1000;
const aliasIps = new Map([
  ['ese-san-antonio', 'santiago-tunja'],
  ['medilaser', 'clinica-medilaser'],
  ['los-andes', 'clinica-andes']
]);
const idsServicioAnteriores = new Map([['cardio', 'srv-cardiologia'], ['radio', 'srv-rayos-x']]);
const ipsCatalogo = new Map(IPS_CATALOGO.map((ips) => [aliasIps.get(ips.id) || ips.id, ips]));
const serviciosCatalogo = new Map(SERVICIOS_POR_CATEGORIA.map((servicio) => [servicio.id, servicio]));
const duracionSesionTarjetaMs = 15 * 60 * 1000;
const condicionMismaEpsCita = `(
  lower(trim(u.eps)) = lower(trim(?)) OR
  lower(trim(u.eps)) = lower('EPS ' || trim(?)) OR
  lower(trim(replace(lower(u.eps), 'eps ', ''))) =
    lower(trim(replace(lower(?), 'eps ', '')))
)`;

function servicioPublico(id) {
  const servicio = serviciosCatalogo.get(id);
  if (!servicio) return { id, nombre: id, categoria: 'consultas', costo: 65000, duracionMinutos: 30 };
  return {
    id,
    nombre: servicio.nombre,
    categoria: servicio.categoria,
    costo: tarifaPorServicio(servicio),
    duracionMinutos: duracionPorServicio(servicio)
  };
}

function minutosDelDia(hora) {
  const [horas, minutos] = hora.split(':').map(Number);
  return horas * 60 + minutos;
}

function generarHorarios(duracion) {
  const tramos = [[8 * 60, 13 * 60], [14 * 60, 18 * 60]];
  return tramos.flatMap(([inicio, cierre]) => {
    const resultado = [];
    for (let minuto = inicio; minuto + duracion <= cierre; minuto += duracion) {
      resultado.push(`${String(Math.floor(minuto / 60)).padStart(2, '0')}:${String(minuto % 60).padStart(2, '0')}`);
    }
    return resultado;
  });
}

function hayCruce(hora, duracion, citasExistentes) {
  const inicio = minutosDelDia(hora);
  return citasExistentes.some((cita) => {
    const servicioExistente = SERVICIOS_POR_CATEGORIA.find(({ nombre }) => nombre === cita.servicio);
    const duracionExistente = servicioExistente ? duracionPorServicio(servicioExistente) : 90;
    const inicioExistente = minutosDelDia(cita.hora);
    return inicio < inicioExistente + duracionExistente && inicioExistente < inicio + duracion;
  });
}

function responderError(res, status, error, mensaje) {
  return res.status(status).json({ error, mensaje });
}

function fechaValida(fecha) {
  if (typeof fecha !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(fecha)) return false;
  const [anio, mes, dia] = fecha.split('-').map(Number);
  const fechaUTC = new Date(Date.UTC(anio, mes - 1, dia));
  return fechaUTC.getUTCFullYear() === anio &&
    fechaUTC.getUTCMonth() === mes - 1 &&
    fechaUTC.getUTCDate() === dia;
}

function textoValido(valor, maximo) {
  return typeof valor === 'string' && valor.trim().length > 0 &&
    valor.trim().length <= maximo;
}

function normalizarEps(valor) {
  return String(valor || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('es').replace(/\beps\b/g, '').replace(/[^a-z0-9]/g, '');
}

function fechaHoyColombia() {
  return new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

function instanteCita(fecha, hora) {
  return new Date(`${fecha}T${hora}:00-05:00`).getTime();
}

async function obtenerIpsEnConvenio(eps, { usarCatalogoBase = false } = {}) {
  if (!eps) return [];
  const convenios = await listarConvenios(eps);
  if (usarCatalogoBase && convenios.length === 0) {
    return [...ipsCatalogo].filter(([, ips]) =>
      ips.eps?.some((epsIps) => normalizarEps(epsIps) === normalizarEps(eps))
    ).map(([id, { nombre, sede, servicios }]) => ({
      id, nombre, sede,
      servicios: servicios.map(servicioPublico)
    }));
  }
  const ipsPorId = new Map();
  for (const convenio of convenios) {
    if (convenio.estado !== 'Activo') continue;
    const id = aliasIps.get(convenio.ipsId) || convenio.ipsId;
    const ips = ipsPorId.get(id) || {
      id, nombre: convenio.ipsNombre, sede: convenio.ipsSede, servicios: new Map()
    };
    for (const servicio of convenio.serviciosSeleccionados) {
      const servicioId = idsServicioAnteriores.get(servicio) || servicio;
      ips.servicios.set(servicioId, servicioPublico(servicioId));
    }
    if (ips.servicios.size) ipsPorId.set(id, ips);
  }
  return [...ipsPorId.values()].map((ips) => ({ ...ips, servicios: [...ips.servicios.values()] }));
}

export async function listarCatalogoCitas(req, res) {
  try {
    const data = await obtenerIpsEnConvenio(req.usuarioCitas.eps, { usarCatalogoBase: true });
    return res.json({ data, fechaMinima: new Date(Date.now() + anticipacionMinima - 5 * 60 * 60 * 1000)
      .toISOString().slice(0, 10) });
  } catch (error) {
    console.error('Error al consultar convenios para citas:', error.code || 'ERROR_INTERNO');
    return responderError(res, 500, 'error_interno', 'No fue posible consultar los convenios de tu EPS.');
  }
}

function obtenerPerfilTunja(respuesta) {
  const usuario = respuesta?.usuario && typeof respuesta.usuario === 'object'
    ? respuesta.usuario
    : respuesta;
  if (!usuario || typeof usuario !== 'object' || Array.isArray(usuario)) return null;

  const identificador = usuario.id_usuario ?? usuario.usuario_id ?? usuario.id ??
    usuario.email ?? usuario.documento;
  if ((typeof identificador !== 'string' && typeof identificador !== 'number') ||
      !String(identificador).trim()) {
    return null;
  }

  const descuento = usuario.descuento ?? usuario.porcentaje_descuento ?? 0;
  if (!Number.isInteger(descuento) || descuento < 0 || descuento > 100) return null;

  const id = String(identificador).trim();
  return {
    id: typeof identificador === 'string' && identificador.includes('@')
      ? id.toLowerCase()
      : id,
    email: typeof usuario.email === 'string' ? usuario.email.trim().toLowerCase() : null,
    descuento
  };
}

export async function autenticarUsuarioTunja(req, res, next) {
  const autorizacion = req.get('authorization') || '';
  const coincidencia = /^Bearer\s+(\S+)$/i.exec(autorizacion);
  if (!coincidencia) {
    return responderError(res, 401, 'token_requerido', 'Inicia sesión para agendar y consultar tus citas.');
  }

  try {
    const ahora = Date.now();
    const hashToken = crypto.createHash('sha256').update(coincidencia[1]).digest('hex');
    const sesionTarjeta = await sesionesTarjeta.renovarPorToken(
      hashToken,
      ahora,
      ahora + duracionSesionTarjetaMs
    );
    if (sesionTarjeta) {
      if (sesionTarjeta.estado_afiliacion !== 'aprobado') {
        const rechazado = sesionTarjeta.estado_afiliacion === 'rechazado';
        return responderError(
          res,
          403,
          rechazado ? 'afiliacion_rechazada' : 'afiliacion_pendiente',
          rechazado
            ? 'Tu afiliación fue rechazada. Contacta al administrador de tu EPS.'
            : 'Tu cuenta debe ser activada por el administrador de tu EPS antes de usar este módulo.'
        );
      }

      req.usuarioCitas = {
        id: sesionTarjeta.usuario_id,
        email: sesionTarjeta.email,
        descuento: sesionTarjeta.descuento,
        eps: sesionTarjeta.eps
      };
      req.sesionTarjeta = true;
      return next();
    }
  } catch (error) {
    console.error('Error al validar sesión local de tarjeta:', error.code || 'ERROR_INTERNO');
    return responderError(res, 500, 'error_interno', 'No fue posible validar la sesión.');
  }

  try {
    const respuesta = await tunjaRequest('/auth/me', { accessToken: coincidencia[1] });
    const perfil = obtenerPerfilTunja(respuesta);
    if (!perfil) {
      console.error('TunjaAPI devolvió un perfil sin identificador o descuento válido.');
      return responderError(res, 502, 'perfil_no_disponible', 'No fue posible verificar el perfil del usuario.');
    }

    const solicitud = perfil.email
      ? await usuariosTunja.buscarPorEmail(perfil.email)
      : perfil.id.includes('@')
        ? await usuariosTunja.buscarPorEmail(perfil.id)
        : null;
    if (solicitud?.estado_afiliacion !== 'aprobado') {
      const rechazado = solicitud?.estado_afiliacion === 'rechazado';
      return responderError(
        res,
        403,
        rechazado ? 'afiliacion_rechazada' : 'afiliacion_pendiente',
        rechazado
          ? 'Tu afiliación fue rechazada. Contacta al administrador de tu EPS.'
          : 'Tu cuenta debe ser activada por el administrador de tu EPS antes de usar este módulo.'
      );
    }

    if (solicitud && perfil.email) {
      await usuariosTunja.asociarIdTunja(perfil.email, perfil.id);
    }

    req.usuarioCitas = { ...perfil, eps: solicitud.eps };
    return next();
  } catch (error) {
    if (error.status === 401) {
      return responderError(res, 401, 'sesion_invalida', 'Tu sesión expiró. Inicia sesión nuevamente.');
    }
    if (Number.isInteger(error.status) && error.status >= 400 && error.status < 500) {
      return responderError(res, error.status, error.code || 'autenticacion_rechazada', error.message);
    }
    console.error('Error al verificar usuario para citas:', error.code || 'ERROR_INTERNO');
    return responderError(res, 502, 'autenticacion_no_disponible', 'No fue posible verificar la sesión con TunjaAPI.');
  }
}

export async function obtenerDisponibilidad(req, res) {
  const { ips, fecha } = req.query;
  const servicioId = idsServicioAnteriores.get(req.query.servicio) || req.query.servicio;
  const servicio = serviciosCatalogo.get(servicioId);
  if (typeof ips !== 'string' || !servicio || !fechaValida(fecha) || fecha < fechaHoyColombia()) {
    return responderError(res, 400, 'datos_invalidos', 'Selecciona una IPS y una fecha válida a partir de hoy.');
  }

  try {
    const opciones = await obtenerIpsEnConvenio(req.usuarioCitas.eps, { usarCatalogoBase: true });
    const ipsSeleccionada = opciones.find((opcion) => opcion.id === ips);
    if (!ipsSeleccionada) {
      return responderError(res, 400, 'ips_sin_convenio', 'Selecciona una IPS disponible para tu EPS.');
    }
    if (!ipsSeleccionada.servicios.some(({ id }) => id === servicioId)) {
      return responderError(res, 400, 'servicio_sin_convenio', 'Ese servicio no estÃ¡ disponible en la IPS seleccionada para tu EPS.');
    }
    const ocupadas = await ejecutar(
      'all',
      `SELECT hora, servicio FROM citas
       WHERE ips = ? AND fecha = ? AND estado = 'confirmada'`,
      [ips, fecha]
    );
    const ahora = Date.now();
    const duracion = duracionPorServicio(servicio);
    const datos = generarHorarios(duracion).map((hora) => {
      const ocupada = hayCruce(hora, duracion, ocupadas);
      const disponible = !ocupada && instanteCita(fecha, hora) >= ahora + anticipacionMinima;
      return {
        hora,
        disponible,
        estado: ocupada ? 'ocupado' : disponible ? 'disponible' : 'no_disponible'
      };
    });

    return res.status(200).json({ ips, servicio: servicioId, duracionMinutos: duracion, fecha, horarios: datos });
  } catch (error) {
    console.error('Error al consultar disponibilidad de citas:', error.code || 'ERROR_INTERNO');
    return responderError(res, 500, 'error_interno', 'No fue posible consultar la disponibilidad.');
  }
}

export async function listarCitas(req, res) {
  const id = req.query.id === undefined ? null : Number(req.query.id);
  if (id !== null && (!Number.isSafeInteger(id) || id < 1)) {
    return responderError(res, 400, 'cita_invalida', 'Selecciona una cita válida.');
  }
  try {
    const citas = await ejecutar(
      'all',
      `SELECT id_cita, codigo_cita, ips, servicio, especialidad, fecha, hora,
              modalidad, costo, descuento_aplicado, estado
       FROM citas WHERE usuario_id = ? AND (? IS NULL OR id_cita = ?)
       ORDER BY fecha DESC, hora DESC, id_cita DESC`,
      [req.usuarioCitas.id, id, id]
    );
    const ipsPorId = new Map((await obtenerIpsEnConvenio(req.usuarioCitas.eps)).map((ips) => [ips.id, ips]));
    return res.status(200).json({ data: citas.map((cita) => ({
      ...cita, ips_nombre: nombreCompletoIps(ipsPorId.get(cita.ips) || ipsCatalogo.get(cita.ips)) || cita.ips
    })) });
  } catch (error) {
    console.error('Error al listar citas:', error.code || 'ERROR_INTERNO');
    return responderError(res, 500, 'error_interno', 'No fue posible consultar tus citas.');
  }
}

export async function listarCitasAdministrador(req, res) {
  try {
    const citas = await ejecutar(
      'all',
      `SELECT c.id_cita AS id, c.codigo_cita, c.ips, c.especialidad, c.fecha,
              c.hora, c.estado, c.costo, c.descuento_aplicado,
              u.tipo_documento, u.numero_documento,
              u.email AS correo,
              trim(coalesce(u.nombres, '') || ' ' || coalesce(u.apellidos, '')) AS paciente
       FROM citas c
       JOIN usuarios_tunja u ON u.tunja_usuario_id = c.usuario_id
       WHERE ${condicionMismaEpsCita}
       ORDER BY c.fecha DESC, c.hora DESC, c.id_cita DESC`,
      [req.usuario.eps, req.usuario.eps, req.usuario.eps]
    );
    const ips = new Map(ipsCatalogo);
    for (const convenio of await obtenerIpsEnConvenio(req.usuario.eps)) ips.set(convenio.id, convenio);
    return res.status(200).json({
      data: citas.map((cita) => ({ ...cita, ips_nombre: nombreCompletoIps(ips.get(cita.ips)) || cita.ips })),
      horarios,
      opcionesIps: [...ips].map(([id, { nombre, sede }]) => ({ id, nombre, sede }))
    });
  } catch (error) {
    console.error('Error al listar citas administrativas:', error.code || 'ERROR_INTERNO');
    return responderError(res, 500, 'error_interno', 'No fue posible consultar las citas de la EPS.');
  }
}

export async function obtenerResumenAdministrador(req, res) {
  try {
    const afiliados = await ejecutar(
      'get',
      `SELECT count(*) AS total,
              sum(CASE WHEN estado_afiliacion = 'aprobado' THEN 1 ELSE 0 END) AS activos
       FROM usuarios_tunja
       WHERE lower(trim(eps)) = lower(trim(?))
          OR lower(trim(eps)) = lower('EPS ' || trim(?))
          OR lower(trim(replace(lower(eps), 'eps ', ''))) =
             lower(trim(replace(lower(?), 'eps ', '')))`,
      [req.usuario.eps, req.usuario.eps, req.usuario.eps]
    );
    const citas = await ejecutar(
      'get',
      `SELECT count(*) AS total
       FROM citas c
       JOIN usuarios_tunja u ON u.tunja_usuario_id = c.usuario_id
       WHERE ${condicionMismaEpsCita}
         AND c.estado = 'confirmada'
         AND strftime('%Y-%m', c.fecha) = strftime('%Y-%m', 'now', '-5 hours')`,
      [req.usuario.eps, req.usuario.eps, req.usuario.eps]
    );
    const resultados = await ejecutar(
      'get',
      `SELECT count(*) AS total
       FROM resultados_procedimientos r
       JOIN usuarios_tunja u
         ON u.tipo_documento = r.tipo_documento
        AND u.numero_documento = r.numero_documento
       WHERE r.estado = 'En proceso'
         AND u.estado_afiliacion = 'aprobado'
         AND ${condicionMismaEpsCita.replaceAll('u.eps', 'r.eps')}
         AND ${condicionMismaEpsCita}`,
      [
        req.usuario.eps, req.usuario.eps, req.usuario.eps,
        req.usuario.eps, req.usuario.eps, req.usuario.eps
      ]
    );

    return res.status(200).json({
      data: {
        afiliadosActivos: Number(afiliados.activos) || 0,
        afiliadosTotales: Number(afiliados.total) || 0,
        citasEsteMes: Number(citas.total) || 0,
        resultadosPendientes: Number(resultados.total) || 0
      }
    });
  } catch (error) {
    console.error('Error al consultar resumen administrativo:', error.code || 'ERROR_INTERNO');
    return responderError(res, 500, 'error_interno', 'No fue posible consultar el resumen de la EPS.');
  }
}

async function buscarCitaDeEps(idCita, eps) {
  return ejecutar(
    'get',
    `SELECT c.id_cita, c.fecha, c.hora, c.estado, c.ips
     FROM citas c
     JOIN usuarios_tunja u ON u.tunja_usuario_id = c.usuario_id
     WHERE c.id_cita = ? AND ${condicionMismaEpsCita}`,
    [idCita, eps, eps, eps]
  );
}

export async function reprogramarCitaAdministrador(req, res) {
  const idCita = Number(req.params.id);
  const { ips, fecha, hora, motivo } = req.body || {};
  if (!Number.isSafeInteger(idCita) || idCita < 1 ||
      !textoValido(ips, 100) || !fechaValida(fecha) ||
      fecha < fechaHoyColombia() || !horarios.includes(hora) ||
      !textoValido(motivo, 500)) {
    return responderError(res, 400, 'datos_invalidos', 'Revisa la IPS, la fecha, el horario y la justificación.');
  }
  if (instanteCita(fecha, hora) <= Date.now()) {
    return responderError(res, 400, 'horario_vencido', 'Selecciona un horario futuro.');
  }

  try {
    const cita = await buscarCitaDeEps(idCita, req.usuario.eps);
    if (!cita) return responderError(res, 404, 'cita_no_encontrada', 'No se encontró la cita de esta EPS.');
    if (ips !== cita.ips && !ipsCatalogo.has(ips) &&
        !(await obtenerIpsEnConvenio(req.usuario.eps)).some((opcion) => opcion.id === ips)) {
      return responderError(res, 400, 'ips_sin_convenio', 'Selecciona una IPS válida.');
    }
    if (cita.estado !== 'confirmada') {
      return responderError(res, 409, 'cita_no_confirmada', 'No se puede reprogramar una cita cancelada.');
    }

    const resultado = await ejecutar(
      'run',
      `UPDATE citas
       SET ips = ?, fecha = ?, hora = ?, motivo_administrativo = ?, modificada_en = CURRENT_TIMESTAMP
       WHERE id_cita = ? AND estado = 'confirmada'`,
      [ips, fecha, hora, motivo.trim(), idCita]
    );
    if (resultado.changes !== 1) {
      return responderError(res, 409, 'cita_no_confirmada', 'La cita ya no está disponible para modificar.');
    }
    return res.status(200).json({ mensaje: 'Cita reprogramada correctamente.' });
  } catch (error) {
    if (error.code === 'SQLITE_CONSTRAINT' &&
        error.message.includes('citas.ips, citas.fecha, citas.hora')) {
      return responderError(res, 409, 'horario_no_disponible', 'Ese horario acaba de ser ocupado. Selecciona otro.');
    }
    console.error('Error al reprogramar cita administrativa:', error.code || 'ERROR_INTERNO');
    return responderError(res, 500, 'error_interno', 'No fue posible reprogramar la cita.');
  }
}

export async function cancelarCitaAdministrador(req, res) {
  const idCita = Number(req.params.id);
  const { motivo } = req.body || {};
  if (!Number.isSafeInteger(idCita) || idCita < 1 || !textoValido(motivo, 500)) {
    return responderError(res, 400, 'datos_invalidos', 'Indica la cita y una justificación válida.');
  }

  try {
    const cita = await buscarCitaDeEps(idCita, req.usuario.eps);
    if (!cita) return responderError(res, 404, 'cita_no_encontrada', 'No se encontró la cita de esta EPS.');
    if (cita.estado !== 'confirmada') {
      return responderError(res, 409, 'cita_no_confirmada', 'La cita ya fue cancelada.');
    }

    const resultado = await ejecutar(
      'run',
      `UPDATE citas
       SET estado = 'cancelada', motivo_administrativo = ?, modificada_en = CURRENT_TIMESTAMP
       WHERE id_cita = ? AND estado = 'confirmada'
         AND NOT EXISTS (SELECT 1 FROM pagos_cita WHERE cita_id = citas.id_cita AND estado = 'en_proceso')`,
      [motivo.trim(), idCita]
    );
    if (resultado.changes !== 1) {
      return responderError(res, 409, 'cancelacion_no_disponible', 'Actualiza la cita y verifica si hay un pago en proceso.');
    }
    return res.status(200).json({ mensaje: 'Cita cancelada correctamente.' });
  } catch (error) {
    console.error('Error al cancelar cita administrativa:', error.code || 'ERROR_INTERNO');
    return responderError(res, 500, 'error_interno', 'No fue posible cancelar la cita.');
  }
}

export async function crearCita(req, res) {
  const { ips, servicio, fecha, hora } = req.body || {};
  const servicioId = idsServicioAnteriores.get(servicio) || servicio;
  const servicioInfo = serviciosCatalogo.get(servicioId);

  if (!textoValido(ips, 100) || !textoValido(servicio, 100) || !fechaValida(fecha) ||
      !servicioInfo || !generarHorarios(duracionPorServicio(servicioInfo)).includes(hora)) {
    return responderError(res, 400, 'datos_invalidos', 'Revisa el servicio, la IPS, la fecha y el horario.');
  }
  if (instanteCita(fecha, hora) - Date.now() < anticipacionMinima) {
    return responderError(res, 400, 'anticipacion_insuficiente', 'Agenda con al menos 24 horas de anticipación.');
  }

  try {
    const opciones = await obtenerIpsEnConvenio(req.usuarioCitas.eps, { usarCatalogoBase: true });
    const ipsSeleccionada = opciones.find((opcion) => opcion.id === ips);
    const servicioSeleccionado = ipsSeleccionada?.servicios.find((opcion) => opcion.id === servicioId);
    if (!servicioSeleccionado) {
      return responderError(res, 400, 'servicio_sin_convenio', 'Selecciona un servicio disponible en esa IPS para tu EPS.');
    }
    const existentes = await ejecutar('all',
      `SELECT hora, servicio FROM citas WHERE ips = ? AND fecha = ? AND estado = 'confirmada'`,
      [ips, fecha]
    );
    if (hayCruce(hora, duracionPorServicio(servicioInfo), existentes)) {
      return responderError(res, 409, 'horario_no_disponible', 'Ese horario acaba de ser ocupado. Selecciona otro.');
    }
    const costoCita = tarifaPorServicio(servicioInfo);
    const descuentoAplicado = Math.round(costoCita * req.usuarioCitas.descuento / 100);
    const codigoCita = `CITA-${new Date().getFullYear()}-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
    const { lastID } = await ejecutar(
      'run',
      `INSERT INTO citas (
         codigo_cita, usuario_id, ips, servicio, especialidad, fecha, hora,
         modalidad, costo, descuento_aplicado, estado
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'confirmada')`,
      [
        codigoCita,
        req.usuarioCitas.id,
        ips,
        servicioSeleccionado.nombre,
        servicioSeleccionado.nombre,
        fecha,
        hora,
        'presencial',
        costoCita,
        descuentoAplicado
      ]
    );
    const cita = await ejecutar(
      'get',
      `SELECT id_cita, codigo_cita, ips, servicio, especialidad, fecha, hora,
              modalidad, costo, descuento_aplicado, estado
       FROM citas WHERE id_cita = ?`,
      [lastID]
    );
    return res.status(201).json({
      mensaje: 'Cita confirmada correctamente.',
      porcentaje_descuento: req.usuarioCitas.descuento,
      total_a_pagar: costoCita - descuentoAplicado,
      cita: { ...cita, ips_nombre: nombreCompletoIps(ipsSeleccionada) }
    });
  } catch (error) {
    if (error.code === 'SQLITE_CONSTRAINT' &&
        error.message.includes('citas.ips, citas.fecha, citas.hora')) {
      return responderError(res, 409, 'horario_no_disponible', 'Ese horario acaba de ser ocupado. Selecciona otro.');
    }
    console.error('Error al crear cita:', error.code || 'ERROR_INTERNO');
    return responderError(res, 500, 'error_interno', 'No fue posible registrar la cita.');
  }
}

export async function cancelarCita(req, res) {
  const idCita = Number(req.params.id);
  if (!Number.isSafeInteger(idCita) || idCita < 1) {
    return responderError(res, 400, 'id_invalido', 'El identificador de la cita no es válido.');
  }

  try {
    const cita = await ejecutar(
      'get',
      `SELECT id_cita, codigo_cita, fecha, hora, estado FROM citas
       WHERE id_cita = ? AND usuario_id = ?`,
      [idCita, req.usuarioCitas.id]
    );
    if (!cita) {
      return responderError(res, 404, 'cita_no_encontrada', 'No se encontró la cita solicitada.');
    }
    if (cita.estado !== 'confirmada') {
      return responderError(res, 409, 'cita_no_confirmada', 'La cita ya fue cancelada.');
    }
    if (instanteCita(cita.fecha, cita.hora) - Date.now() <= 24 * 60 * 60 * 1000) {
      return responderError(res, 409, 'plazo_vencido', 'Solo puedes cancelar una cita con más de 24 horas de anticipación.');
    }

    const resultado = await ejecutar(
      'run',
      `UPDATE citas SET estado = 'cancelada'
       WHERE id_cita = ? AND usuario_id = ? AND estado = 'confirmada'
         AND NOT EXISTS (SELECT 1 FROM pagos_cita WHERE cita_id = citas.id_cita AND estado = 'en_proceso')`,
      [idCita, req.usuarioCitas.id]
    );
    if (resultado.changes !== 1) {
      return responderError(res, 409, 'cancelacion_no_disponible', 'Actualiza la cita y verifica si hay un pago en proceso.');
    }
    return res.status(200).json({
      mensaje: 'Cita cancelada correctamente.',
      cita: { ...cita, estado: 'cancelada' }
    });
  } catch (error) {
    console.error('Error al cancelar cita:', error.code || 'ERROR_INTERNO');
    return responderError(res, 500, 'error_interno', 'No fue posible cancelar la cita.');
  }
}
