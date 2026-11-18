import { ejecutar } from './sqlite.js';

const condicionMismaEps = `(
  lower(trim(r.eps)) = lower(trim(?)) OR
  lower(trim(r.eps)) = lower('EPS ' || trim(?)) OR
  lower(trim(r.eps)) = lower(trim(replace(lower(?), 'eps ', '')))
)`;

const condicionMismaEpsEliminar = `(
  lower(trim(eps)) = lower(trim(?)) OR
  lower(trim(eps)) = lower('EPS ' || trim(?)) OR
  lower(trim(eps)) = lower(trim(replace(lower(?), 'eps ', '')))
)`;

const condicionMismaEpsUsuario = `(
  lower(trim(u.eps)) = lower(trim(?)) OR
  lower(trim(u.eps)) = lower('EPS ' || trim(?)) OR
  lower(trim(u.eps)) = lower(trim(replace(lower(?), 'eps ', '')))
)`;

export async function listarPorUsuario(tipoDocumento, numeroDocumento, eps) {
  return ejecutar(
    'all',
    `SELECT id_resultado AS id, procedimiento, fecha_procedimiento AS fecha,
            ips AS proveedor, estado AS status,
            CASE WHEN estado = 'Disponible' THEN informe ELSE NULL END AS informe,
            CASE WHEN estado = 'Disponible' THEN adjunto_nombre END AS adjunto
     FROM resultados_procedimientos r
     WHERE tipo_documento = ? AND numero_documento = ? AND ${condicionMismaEps}
     ORDER BY fecha_procedimiento DESC, id_resultado DESC`,
    [tipoDocumento, numeroDocumento, eps, eps, eps]
  );
}

export async function listarPorEps(eps) {
  return ejecutar(
    'all',
    `SELECT r.id_resultado AS id,
            trim(coalesce(u.nombres, '') || ' ' || coalesce(u.apellidos, '')) AS patient,
            r.tipo_documento AS tipoDocumento,
            r.numero_documento AS document,
            r.procedimiento AS procedure,
            r.fecha_procedimiento AS date,
            r.ips AS provider,
            r.estado AS status,
            r.informe AS report, r.adjunto_nombre AS adjunto
     FROM resultados_procedimientos r
     JOIN usuarios_tunja u
       ON u.tipo_documento = r.tipo_documento
      AND u.numero_documento = r.numero_documento
     WHERE ${condicionMismaEps}
       AND ${condicionMismaEpsUsuario}
       AND u.estado_afiliacion = 'aprobado'
     ORDER BY r.fecha_procedimiento DESC, r.id_resultado DESC`,
    [eps, eps, eps, eps, eps, eps]
  );
}

export async function crear(datos) {
  const { lastID } = await ejecutar(
    'run',
    `INSERT INTO resultados_procedimientos (
       tipo_documento, numero_documento, eps, procedimiento,
       fecha_procedimiento, ips, estado, informe, creado_por, adjunto_nombre, adjunto_contenido
     ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      datos.tipoDocumento,
      datos.numeroDocumento,
      datos.eps,
      datos.procedimiento,
      datos.fecha,
      datos.proveedor,
      datos.estado,
      datos.informe,
      datos.creadoPor,
      datos.adjunto?.nombre ?? null,
      datos.adjunto?.contenido ?? null
    ]
  );
  return lastID;
}

export function buscarAdjunto(id, eps, afiliado) {
  const filtro = afiliado ? "AND estado = 'Disponible' AND tipo_documento = ? AND numero_documento = ?" : '';
  return ejecutar('get', `
    SELECT adjunto_nombre AS nombre, adjunto_contenido AS contenido
    FROM resultados_procedimientos r
    WHERE id_resultado = ? AND ${condicionMismaEps} AND adjunto_contenido IS NOT NULL ${filtro}`,
  [id, eps, eps, eps, ...(afiliado ? [afiliado.tipo_documento, afiliado.numero_documento] : [])]);
}

export async function eliminarPorEps(eps, id) {
  return ejecutar(
    'run',
    `DELETE FROM resultados_procedimientos
     WHERE id_resultado = ? AND ${condicionMismaEpsEliminar}`,
    [id, eps, eps, eps]
  );
}

export function publicarPorEps(eps, id) {
  return ejecutar('run', `
    UPDATE resultados_procedimientos AS r SET estado = 'Disponible'
    WHERE r.id_resultado = ? AND ${condicionMismaEps}
      AND EXISTS (
        SELECT 1 FROM usuarios_tunja u
        WHERE u.tipo_documento = r.tipo_documento AND u.numero_documento = r.numero_documento
          AND u.estado_afiliacion = 'aprobado' AND ${condicionMismaEpsUsuario}
      )`,
  [id, eps, eps, eps, eps, eps, eps]);
}
