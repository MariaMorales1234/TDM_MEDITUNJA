import { tunjaRequest } from './tunjaApi.js';

export function coincideOperador(usuario, { email, nit }) {
  const documento = usuario?.documento || usuario?.numero_documento;
  return usuario?.email?.trim().toLowerCase() === email &&
    typeof documento === 'string' &&
    (documento === nit || documento === nit.replace('-', ''));
}

export async function autenticarOperadorTunja({ email, nit, contrasena }) {
  const { usuario } = await tunjaRequest('/auth/login', {
    method: 'POST',
    body: { email, contrasena }
  });
  if (!Number.isSafeInteger(usuario?.id) || usuario.id < 1) return null;
  const cuenta = await tunjaRequest(`/users/${usuario.id}`, { requiresKey: true });
  return cuenta.activo === true && coincideOperador(cuenta, { email, nit }) ? cuenta : null;
}
