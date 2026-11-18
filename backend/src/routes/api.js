import { Router } from 'express';
import {
  iniciarSesion,
  iniciarSesionAdministrador,
  iniciarSesionAdministradorTarjeta,
  iniciarSesionSuperadministrador
} from '../controllers/login.js';
import { registrarUsuario } from '../controllers/registro.js';
import { autenticarSesion } from '../middleware/autenticarSesion.js';
import { exigirAdministrador } from '../middleware/exigirAdministrador.js';
import { exigirSuperadministrador } from '../middleware/exigirSuperadministrador.js';
import { gestionarTarjetaOperador } from '../controllers/tarjetaOperador.js';
import { exigirTarjetaVinculada } from '../middleware/exigirTarjetaVinculada.js';
import {
  actualizarAfiliado,
  actualizarEstadoAfiliado,
  actualizarEstadoSolicitudAfiliacion,
  crearConvenio,
  descargarComprobanteAfiliacion,
  desactivarConvenio,
  listarAfiliados,
  listarSolicitudesAfiliacion,
  listarConvenios
} from '../controllers/administracion.js';
import {
  autenticarUsuarioTunja,
  cancelarCita,
  cancelarCitaAdministrador,
  crearCita,
  listarCitasAdministrador,
  listarCitas,
  obtenerResumenAdministrador,
  obtenerDisponibilidad,
  listarCatalogoCitas,
  reprogramarCitaAdministrador
} from '../controllers/citas.js';
import {
  crearResultado,
  descargarAdjuntoResultado,
  eliminarResultado,
  listarResultadosAdministrador,
  listarAfiliadosResultados,
  recibirAdjuntoResultado,
  publicarResultado,
  listarResultadosUsuario
} from '../controllers/resultados.js';
import {
  desvincularTarjeta,
  obtenerTarjeta,
  vincularTarjeta
} from '../controllers/nfc.js';
import { obtenerSaldo, recargarSaldo } from '../controllers/wallet.js';
import { consultarPagoCita, pagarCita } from '../controllers/pagosCita.js';
import {
  listarAfiliadosParaRecarga,
  recargarAfiliado
} from '../controllers/recargasAdministrador.js';
import {
  obtenerTarjetaPropiaAdministrador,
  listarAfiliadosParaVincularTarjeta,
  vincularTarjetaPropiaAdministrador,
  vincularTarjetaAfiliado
} from '../controllers/tarjetasAdministrador.js';
import {
  actualizarEstadoAdministradorEps,
  crearAdministradorEps,
  listarAdministradoresEps,
  restablecerContrasenaAdministradorEps
} from '../controllers/superadministradores.js';
import {
  crearSolicitudTransporte,
  listarSolicitudesTransporte
} from '../controllers/transporte.js';
import { consultarProximidadTransporte } from '../controllers/transporteProximidad.js';
import * as sesiones from '../repositories/sesiones.js';
import {
  cerrarSesionTunja,
  iniciarSesionTarjeta,
  iniciarSesionTunja,
  obtenerUsuarioTunja,
  registrarEnTunja,
  renovarSesionTunja
} from '../controllers/tunjaAuth.js';
import { recibirComprobante } from '../middleware/recibirComprobante.js';

const router = Router();

router.post('/tunja/auth/register', recibirComprobante, registrarEnTunja);
router.post('/tunja/auth/card-login', iniciarSesionTarjeta);
router.post('/tunja/auth/login', iniciarSesionTunja);
router.post('/tunja/auth/refresh', renovarSesionTunja);
router.post('/tunja/auth/logout', cerrarSesionTunja);
router.get('/tunja/auth/me', obtenerUsuarioTunja);

router.post('/registro', registrarUsuario);
router.post('/login', iniciarSesion);
router.post('/admin/login', iniciarSesionAdministrador);
router.post('/admin/card-login', iniciarSesionAdministradorTarjeta);
router.post('/superadmin/login', iniciarSesionSuperadministrador);

router.get('/citas/disponibilidad', autenticarUsuarioTunja, obtenerDisponibilidad);
router.get('/citas/catalogo', autenticarUsuarioTunja, listarCatalogoCitas);
router.get('/citas', autenticarUsuarioTunja, listarCitas);
router.post('/citas', autenticarUsuarioTunja, exigirTarjetaVinculada, crearCita);
router.get('/citas/:id/pago', autenticarUsuarioTunja, exigirTarjetaVinculada, consultarPagoCita);
router.post('/citas/:id/pago', autenticarUsuarioTunja, exigirTarjetaVinculada, pagarCita);
router.put('/citas/:id/cancelar', autenticarUsuarioTunja, cancelarCita);
router.get('/resultados', autenticarUsuarioTunja, listarResultadosUsuario);
router.get('/resultados/:id/adjunto', autenticarUsuarioTunja, descargarAdjuntoResultado);
router.get('/nfc/tarjeta', autenticarUsuarioTunja, obtenerTarjeta);
router.post('/nfc/tarjeta', autenticarUsuarioTunja, vincularTarjeta);
router.delete('/nfc/tarjeta', autenticarUsuarioTunja, desvincularTarjeta);
router.get('/wallet', autenticarUsuarioTunja, exigirTarjetaVinculada, obtenerSaldo);
router.post('/wallet/topup', autenticarUsuarioTunja, exigirTarjetaVinculada, recargarSaldo);
router.get('/transporte', autenticarUsuarioTunja, listarSolicitudesTransporte);
router.post('/transporte', autenticarUsuarioTunja, exigirTarjetaVinculada, crearSolicitudTransporte);
router.get('/transporte/proximidad', consultarProximidadTransporte);

router.use(autenticarSesion);
router.get('/sesion', (req, res) => {
  res.status(200).json({
    mensaje: 'Sesión activa y renovada por actividad.',
    expira_en: new Date(req.sesionExpiraEn).toISOString(),
    data: req.usuario
  });
});
router.get('/admin/sesion', exigirAdministrador, (req, res) => {
  res.status(200).json({ data: req.usuario });
});
router.get('/superadmin/sesion', exigirSuperadministrador, (req, res) => {
  res.status(200).json({ data: req.usuario });
});
router.get('/superadmin/administradores-eps', exigirSuperadministrador, listarAdministradoresEps);
router.get('/superadmin/mi-tarjeta', exigirSuperadministrador, gestionarTarjetaOperador);
router.post('/superadmin/mi-tarjeta', exigirSuperadministrador, gestionarTarjetaOperador);
router.post('/superadmin/administradores-eps', exigirSuperadministrador, crearAdministradorEps);
router.patch(
  '/superadmin/administradores-eps/:id/estado',
  exigirSuperadministrador,
  actualizarEstadoAdministradorEps
);
router.patch(
  '/superadmin/administradores-eps/:id/contrasena',
  exigirSuperadministrador,
  restablecerContrasenaAdministradorEps
);
router.get('/admin/afiliados', exigirAdministrador, listarAfiliados);
router.get('/admin/recargas/afiliados', exigirAdministrador, listarAfiliadosParaRecarga);
router.post('/admin/recargas/afiliados/:id', exigirAdministrador, recargarAfiliado);
router.get('/admin/tarjetas-nfc/mi-tarjeta', exigirAdministrador, obtenerTarjetaPropiaAdministrador);
router.post('/admin/tarjetas-nfc/mi-tarjeta', exigirAdministrador, vincularTarjetaPropiaAdministrador);
router.get('/admin/tarjetas-nfc/afiliados', exigirAdministrador, listarAfiliadosParaVincularTarjeta);
router.post('/admin/tarjetas-nfc/afiliados/:id/vincular', exigirAdministrador, vincularTarjetaAfiliado);
router.get('/admin/resumen', exigirAdministrador, obtenerResumenAdministrador);
router.get('/admin/citas', exigirAdministrador, listarCitasAdministrador);
router.put('/admin/citas/:id/reprogramar', exigirAdministrador, reprogramarCitaAdministrador);
router.put('/admin/citas/:id/cancelar', exigirAdministrador, cancelarCitaAdministrador);
router.get('/admin/solicitudes-afiliacion', exigirAdministrador, listarSolicitudesAfiliacion);
router.get(
  '/admin/solicitudes-afiliacion/:tipoDocumento/:numeroDocumento/comprobante',
  exigirAdministrador,
  descargarComprobanteAfiliacion
);
router.put(
  '/admin/solicitudes-afiliacion/:tipoDocumento/:numeroDocumento/estado',
  exigirAdministrador,
  actualizarEstadoSolicitudAfiliacion
);
router.put('/admin/afiliados/:id', exigirAdministrador, actualizarAfiliado);
router.put('/admin/afiliados/:id/estado', exigirAdministrador, actualizarEstadoAfiliado);
router.get('/admin/convenios', exigirAdministrador, listarConvenios);
router.post('/admin/convenios', exigirAdministrador, crearConvenio);
router.put('/admin/convenios/:id/desactivar', exigirAdministrador, desactivarConvenio);
router.get('/admin/resultados', exigirAdministrador, listarResultadosAdministrador);
router.get('/admin/resultados/afiliados', exigirAdministrador, listarAfiliadosResultados);
router.get('/admin/resultados/:id/adjunto', exigirAdministrador, descargarAdjuntoResultado);
router.post('/admin/resultados', exigirAdministrador, recibirAdjuntoResultado, crearResultado);
router.put('/admin/resultados/:id/publicar', exigirAdministrador, publicarResultado);
router.delete('/admin/resultados/:id', exigirAdministrador, eliminarResultado);
router.post('/logout', async (req, res, next) => {
  try {
    await sesiones.revocar(req.sesionTokenHash, Date.now());
    return res.status(200).json({ mensaje: 'Sesión cerrada correctamente.' });
  } catch (error) {
    return next(error);
  }
});

export default router;
