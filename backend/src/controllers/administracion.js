import crypto from 'node:crypto';
import * as usuarios from '../repositories/usuarios.js';
import * as usuariosTunja from '../repositories/usuariosTunja.js';
import * as administracion from '../repositories/administracion.js';
import { listarUsuariosTunja } from '../services/tunjaUsuarios.js';
import {
  CATEGORIAS_SERVICIOS, EPS_CATALOGO, IPS_CATALOGO, SERVICIOS_POR_CATEGORIA
} from '../config/convenios.js';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const tiposDocumentoPermitidos = new Set(['CC', 'TI', 'CE', 'PAS']);
const sexosPermitidos = new Set(['M', 'F', 'O']);
const responderError = (res, status, error, mensaje) =>
  res.status(status).json({ error, mensaje });
const carpetaComprobantes = path.resolve(
  process.env.DB_PATH
    ? path.join(path.dirname(path.resolve(process.env.DB_PATH)), 'afiliaciones-privadas')
    : path.join(path.dirname(fileURLToPath(import.meta.url)), '../../data/afiliaciones-privadas')
);

function esTexto(valor, maximo) {
  return typeof valor === 'string' && valor.trim().length > 0 &&
    valor.trim().length <= maximo;
}

function normalizarEps(valor) {
  return typeof valor === 'string'
    ? valor.normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLocaleLowerCase('es')
      .replace(/\beps\b/g, '')
      .replace(/[^a-z0-9]/g, '')
    : '';
}

function mismaEps(valor, epsAutenticada) {
  return normalizarEps(valor) !== '' &&
    normalizarEps(valor) === normalizarEps(epsAutenticada);
}

function fechaValida(fecha) {
  return typeof fecha === 'string' &&
    /^\d{4}-\d{2}-\d{2}$/.test(fecha) &&
    !Number.isNaN(Date.parse(`${fecha}T00:00:00Z`)) &&
    new Date(`${fecha}T00:00:00Z`).toISOString().slice(0, 10) === fecha &&
    fecha <= new Date().toISOString().slice(0, 10);
}

function datosAfiliadoValidos(datos) {
  const tipoDocumento = typeof datos.tipoDocumento === 'string'
    ? datos.tipoDocumento.trim().toUpperCase()
    : '';
  const numeroDocumento = typeof datos.numeroDocumento === 'string'
    ? datos.numeroDocumento.trim()
    : '';
  const email = typeof datos.email === 'string' ? datos.email.trim().toLowerCase() : '';
  const telefono = datos.telefono == null ? '' : datos.telefono;

  if (!esTexto(datos.nombres, 80) || !esTexto(datos.apellidos, 80) ||
      !tiposDocumentoPermitidos.has(tipoDocumento) ||
      !/^[A-Za-z0-9.-]{4,30}$/.test(numeroDocumento) ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254 ||
      (telefono !== '' && (typeof telefono !== 'string' || telefono.length > 30 ||
        !/^\+?[0-9\s()-]{7,30}$/.test(telefono.trim()))) ||
      !fechaValida(datos.fechaNacimiento) ||
      !sexosPermitidos.has(datos.sexo)) {
    return null;
  }

  return {
    nombres: datos.nombres.trim(),
    apellidos: datos.apellidos.trim(),
    tipoDocumento,
    numeroDocumento,
    email,
    telefono: typeof telefono === 'string' && telefono.trim() ? telefono.trim() : null,
    fechaNacimiento: datos.fechaNacimiento,
    sexo: datos.sexo
  };
}

export async function listarAfiliados(req, res) {
  try {
    const data = await usuarios.listarAfiliados(req.usuario.eps);
    return res.status(200).json({ data });
  } catch (error) {
    console.error('Error al listar afiliados:', error.code || 'ERROR_INTERNO');
    return responderError(res, 500, 'Error interno del servidor', 'No fue posible consultar los afiliados.');
  }
}

export async function actualizarAfiliado(req, res) {
  const id = Number(req.params.id);
  const datos = datosAfiliadoValidos(req.body || {});
  if (!Number.isSafeInteger(id) || id < 1 || !datos) {
    return responderError(res, 400, 'Datos inválidos', 'Revisa los datos del afiliado.');
  }

  try {
    const resultado = await usuarios.actualizarAfiliado(req.usuario.eps, id, datos);
    if (resultado.changes === 0) {
      return responderError(res, 404, 'Afiliado no encontrado', 'No se encontró el afiliado de esta EPS.');
    }
    return res.status(200).json({ mensaje: 'Datos del afiliado actualizados.' });
  } catch (error) {
    if (error.code === 'SQLITE_CONSTRAINT_UNIQUE' ||
        (error.code === 'SQLITE_CONSTRAINT' && /UNIQUE constraint failed/.test(error.message))) {
      return responderError(res, 409, 'Registro duplicado', 'El documento o correo ya está asociado a otro usuario.');
    }
    console.error('Error al actualizar afiliado:', error.code || 'ERROR_INTERNO');
    return responderError(res, 500, 'Error interno del servidor', 'No fue posible actualizar el afiliado.');
  }
}

export async function actualizarEstadoAfiliado(req, res) {
  const id = Number(req.params.id);
  const { estado } = req.body || {};
  if (!Number.isSafeInteger(id) || id < 1 ||
      !['pendiente', 'aprobado', 'rechazado'].includes(estado)) {
    return responderError(res, 400, 'Datos inválidos', 'Indica un estado válido para el afiliado.');
  }

  try {
    const resultado = await usuarios.actualizarEstadoAfiliado(req.usuario.eps, id, estado);
    if (resultado.changes === 0) {
      return responderError(res, 404, 'Afiliado no encontrado', 'No se encontró el afiliado de esta EPS.');
    }
    return res.status(200).json({ mensaje: `Solicitud ${estado}.` });
  } catch (error) {
    console.error('Error al actualizar estado del afiliado:', error.code || 'ERROR_INTERNO');
    return responderError(res, 500, 'Error interno del servidor', 'No fue posible actualizar el estado.');
  }
}

export async function listarSolicitudesAfiliacion(req, res) {
  try {
    const solicitudes = await usuariosTunja.listarSolicitudesPorEps(req.usuario.eps);
    if (!solicitudes.length) return res.json({ data: [] });

    let cuentas;
    try {
      cuentas = await listarUsuariosTunja();
    } catch (error) {
      console.error('Error al consultar los usuarios de TunjaAPI:', error.code || error.status);
      return responderError(res, 502, 'tunja_api_no_disponible', 'No fue posible verificar las cuentas de esta EPS en TunjaAPI.');
    }
    const cuentasPorEmail = new Map(cuentas
      .filter((cuenta) => typeof cuenta?.email === 'string')
      .map((cuenta) => [cuenta.email.trim().toLowerCase(), cuenta]));
    const data = solicitudes.map((solicitud) => {
      const cuenta = cuentasPorEmail.get(solicitud.email.trim().toLowerCase());
      const documento = String(cuenta?.documento ?? cuenta?.numero_documento ?? '').trim().toUpperCase();
      const coincide = cuenta && (!documento || documento === solicitud.numero_documento.trim().toUpperCase());
      return {
        ...solicitud,
        estado_cuenta: coincide ? (cuenta.activo === true ? 'activa' : 'inactiva') : 'sin_coincidencia'
      };
    });
    return res.status(200).json({ data });
  } catch (error) {
    console.error('Error al listar solicitudes de afiliación:', error.code || 'ERROR_INTERNO');
    return responderError(res, 500, 'Error interno del servidor', 'No fue posible consultar las solicitudes.');
  }
}

export async function actualizarEstadoSolicitudAfiliacion(req, res) {
  const { tipoDocumento, numeroDocumento } = req.params;
  const { estado } = req.body || {};
  if (!['CC', 'TI', 'CE', 'PAS'].includes(tipoDocumento) ||
      !/^[A-Za-z0-9.-]{4,30}$/.test(numeroDocumento) ||
      !['aprobado', 'rechazado'].includes(estado)) {
    return responderError(res, 400, 'Datos inválidos', 'Indica un estado válido para la solicitud.');
  }

  try {
    const solicitud = await usuariosTunja.buscarSolicitud(
      tipoDocumento,
      numeroDocumento,
      req.usuario.eps
    );
    if (!solicitud) {
      return responderError(res, 404, 'Solicitud no encontrada', 'No se encontró la solicitud de esta EPS.');
    }

    if (estado === 'aprobado' &&
        /^[\da-f-]{36}\.(pdf|jpg|png)$/i.test(solicitud.comprobante_archivo || '')) {
      try {
        await fs.unlink(path.join(carpetaComprobantes, solicitud.comprobante_archivo));
      } catch (errorArchivo) {
        if (errorArchivo.code !== 'ENOENT') throw errorArchivo;
      }
    }

    const resultado = await usuariosTunja.actualizarEstadoSolicitud(
      tipoDocumento,
      numeroDocumento,
      req.usuario.eps,
      estado
    );
    if (resultado.changes === 0) {
      return responderError(res, 404, 'Solicitud no encontrada', 'No se encontró la solicitud de esta EPS.');
    }
    return res.status(200).json({ mensaje: `Solicitud ${estado}.` });
  } catch (error) {
    console.error('Error al actualizar solicitud de afiliación:', error.code || 'ERROR_INTERNO');
    return responderError(res, 500, 'Error interno del servidor', 'No fue posible actualizar la solicitud.');
  }
}

export async function descargarComprobanteAfiliacion(req, res) {
  const { tipoDocumento, numeroDocumento } = req.params;
  if (!['CC', 'TI', 'CE', 'PAS'].includes(tipoDocumento) ||
      !/^[A-Za-z0-9.-]{4,30}$/.test(numeroDocumento)) {
    return responderError(res, 400, 'Datos inválidos', 'Indica una solicitud válida.');
  }

  try {
    const solicitud = await usuariosTunja.buscarSolicitud(
      tipoDocumento,
      numeroDocumento,
      req.usuario.eps
    );
    if (!solicitud) {
      return responderError(res, 404, 'Solicitud no encontrada', 'No se encontró la solicitud de esta EPS.');
    }
    if (!/^[\da-f-]{36}\.(pdf|jpg|png)$/i.test(solicitud.comprobante_archivo || '')) {
      return responderError(res, 404, 'Comprobante no disponible', 'La solicitud no tiene un comprobante disponible.');
    }

    const archivo = await fs.readFile(path.join(carpetaComprobantes, solicitud.comprobante_archivo));
    res.setHeader('Content-Type', solicitud.comprobante_tipo);
    res.setHeader('Content-Disposition', `attachment; filename="comprobante-${tipoDocumento}-${numeroDocumento}.${solicitud.comprobante_archivo.split('.').pop()}"`);
    res.setHeader('Cache-Control', 'private, no-store');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    return res.status(200).send(archivo);
  } catch (error) {
    if (error.code === 'ENOENT') {
      return responderError(res, 404, 'Comprobante no disponible', 'No se encontró el archivo del comprobante.');
    }
    console.error('Error al descargar comprobante de afiliación:', error.code || 'ERROR_INTERNO');
    return responderError(res, 500, 'Error interno del servidor', 'No fue posible descargar el comprobante.');
  }
}

export async function listarConvenios(req, res) {
  try {
    const data = await administracion.listarConvenios(req.usuario.eps);
    const ipsPorId = new Map(IPS_CATALOGO.map((ips) => [ips.id, ips]));
    const conveniosNormalizados = data.map((convenio) => {
      const ips = ipsPorId.get(convenio.ipsId);
      return ips ? {
        ...convenio,
        ipsNombre: ips.nombre,
        ipsSede: ips.sede,
        ipsDireccion: ips.direccion
      } : convenio;
    });
    const epsUnicas = EPS_CATALOGO.filter(({ nombre }, indice, lista) =>
      mismaEps(nombre, req.usuario.eps) &&
      lista.findIndex((opcion) => mismaEps(opcion.nombre, nombre)) === indice
    );
    return res.status(200).json({
      data: conveniosNormalizados,
      catalogo: {
        eps: epsUnicas,
        ips: IPS_CATALOGO,
        categorias: CATEGORIAS_SERVICIOS,
        servicios: SERVICIOS_POR_CATEGORIA
      }
    });
  } catch (error) {
    console.error('Error al listar convenios:', error.code || 'ERROR_INTERNO');
    return responderError(res, 500, 'Error interno del servidor', 'No fue posible consultar los convenios.');
  }
}

export async function crearConvenio(req, res) {
  const datos = req.body || {};
  const servicios = datos.serviciosSeleccionados;
  if (!esTexto(datos.epsNombre, 100) || !mismaEps(datos.epsNombre, req.usuario.eps)) {
    return responderError(res, 403, 'EPS no autorizada', 'Solo puedes crear convenios para la EPS asignada a tu cuenta.');
  }
  const ipsCatalogada = IPS_CATALOGO.find(({ id }) => id === datos.ipsId);
  const servicioIdsValidos = new Set(SERVICIOS_POR_CATEGORIA.map(({ id }) => id));
  if (!esTexto(datos.epsId, 100) || !esTexto(datos.epsSede, 160) ||
      !esTexto(datos.epsDireccion, 240) || !esTexto(datos.ipsId, 100) ||
      !ipsCatalogada || !ipsCatalogada.eps.some((eps) => mismaEps(eps, req.usuario.eps)) ||
      !esTexto(datos.ipsNombre, 160) || !esTexto(datos.ipsSede, 160) ||
      !esTexto(datos.ipsDireccion, 240) ||
      !Array.isArray(servicios) || servicios.length < 1 || servicios.length > 100 ||
      !servicios.every((servicio) => esTexto(servicio, 100) &&
        servicioIdsValidos.has(servicio) && ipsCatalogada.servicios.includes(servicio))) {
    return responderError(res, 400, 'Datos inválidos', 'Revisa la información del convenio y sus servicios.');
  }

  const convenio = {
    id: `CNV-TUN-${new Date().getFullYear()}-${crypto.randomBytes(4).toString('hex').toUpperCase()}`,
    epsId: datos.epsId.trim(),
    epsNombre: req.usuario.eps.trim(),
    epsSede: datos.epsSede.trim(),
    epsDireccion: datos.epsDireccion.trim(),
    ipsId: datos.ipsId.trim(),
    ipsNombre: datos.ipsNombre.trim(),
    ipsSede: datos.ipsSede.trim(),
    ipsDireccion: datos.ipsDireccion.trim(),
    portafolioId: 'servicios',
    portafolioNombre: 'Servicios autorizados',
    serviciosSeleccionados: [...new Set(servicios.map((servicio) => servicio.trim()))],
    clausulaTransporte: true,
    fechaCreacion: new Date().toISOString().slice(0, 10)
  };

  try {
    await administracion.crearConvenio(convenio);
    return res.status(201).json({ mensaje: 'Convenio formalizado y guardado.', data: convenio });
  } catch (error) {
    console.error('Error al crear convenio:', error.code || 'ERROR_INTERNO');
    return responderError(res, 500, 'Error interno del servidor', 'No fue posible guardar el convenio.');
  }
}

export async function actualizarConvenio(req, res) {
  const id = typeof req.params.id === 'string' ? req.params.id.trim() : '';
  const servicios = req.body?.serviciosSeleccionados;
  if (!id || id.length > 100 || !Array.isArray(servicios) || servicios.length < 1 || servicios.length > 100 ||
      !servicios.every((servicio) => esTexto(servicio, 100))) {
    return responderError(res, 400, 'Datos invÃ¡lidos', 'Selecciona uno o mÃ¡s servicios vÃ¡lidos para el convenio.');
  }

  try {
    const convenios = await administracion.listarConvenios(req.usuario.eps);
    const convenio = convenios.find((opcion) => opcion.id === id);
    if (!convenio) return responderError(res, 404, 'Convenio no encontrado', 'No se encontrÃ³ el convenio de esta EPS.');
    const ips = IPS_CATALOGO.find(({ id: ipsId }) => ipsId === convenio.ipsId);
    const permitidos = new Set(ips?.servicios || []);
    const serviciosUnicos = [...new Set(servicios.map((servicio) => servicio.trim()))];
    if (serviciosUnicos.some((servicio) => !permitidos.has(servicio) ||
        !SERVICIOS_POR_CATEGORIA.some(({ id: servicioId }) => servicioId === servicio))) {
      return responderError(res, 400, 'Servicio no disponible', 'El convenio solo puede incluir servicios habilitados para esa IPS.');
    }
    const resultado = await administracion.actualizarServiciosConvenio(req.usuario.eps, id, serviciosUnicos);
    if (!resultado.changes) return responderError(res, 404, 'Convenio no encontrado', 'No se encontrÃ³ el convenio de esta EPS.');
    const actualizado = { ...convenio, serviciosSeleccionados: serviciosUnicos, clausulaTransporte: true, estado: 'Activo' };
    return res.status(200).json({ mensaje: 'Convenio actualizado.', data: actualizado });
  } catch (error) {
    console.error('Error al actualizar convenio:', error.code || 'ERROR_INTERNO');
    return responderError(res, 500, 'Error interno del servidor', 'No fue posible actualizar el convenio.');
  }
}

export async function desactivarConvenio(req, res) {
  const id = typeof req.params.id === 'string' ? req.params.id.trim() : '';
  if (!id || id.length > 80) {
    return responderError(res, 400, 'Datos inválidos', 'Indica un código de convenio válido.');
  }

  try {
    const resultado = await administracion.desactivarConvenio(req.usuario.eps, id);
    if (resultado.changes === 0) {
      return responderError(res, 404, 'Convenio no encontrado', 'No se encontró el convenio activo de esta EPS.');
    }
    return res.status(200).json({ mensaje: 'Convenio desactivado.' });
  } catch (error) {
    console.error('Error al desactivar convenio:', error.code || 'ERROR_INTERNO');
    return responderError(res, 500, 'Error interno del servidor', 'No fue posible desactivar el convenio.');
  }
}
