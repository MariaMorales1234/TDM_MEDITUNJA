import { tunjaRequest } from './tunjaApi.js';

const limiteUsuarios = 200;

export async function listarUsuariosTunja() {
  const usuarios = [];
  let total = null;
  for (let desde = 0; total === null || desde < total; desde += limiteUsuarios) {
    const respuesta = await tunjaRequest(
      `/users?limite=${limiteUsuarios}&desde=${desde}`,
      { requiresKey: true }
    );
    if (!Array.isArray(respuesta?.usuarios) ||
        !Number.isSafeInteger(respuesta.total) || respuesta.total < 0) {
      const error = new Error('TunjaAPI devolvió una lista de usuarios no válida.');
      error.code = 'TUNJA_API_INVALID_RESPONSE';
      throw error;
    }
    if (total !== null && respuesta.total !== total) {
      const error = new Error('TunjaAPI cambió la paginación durante la consulta.');
      error.code = 'TUNJA_API_INVALID_RESPONSE';
      throw error;
    }
    total = respuesta.total;
    usuarios.push(...respuesta.usuarios);
    if (respuesta.usuarios.length === 0 && desde < total) {
      const error = new Error('TunjaAPI devolvió una página vacía antes de completar la lista.');
      error.code = 'TUNJA_API_INVALID_RESPONSE';
      throw error;
    }
  }
  return usuarios;
}
