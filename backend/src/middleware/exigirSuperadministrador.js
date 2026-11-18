export function exigirSuperadministrador(req, res, next) {
  if (req.usuario?.rol !== 'superadministrador') {
    return res.status(403).json({
      error: 'Acceso denegado',
      mensaje: 'Se requieren permisos de administrador general.'
    });
  }

  return next();
}
