import cors from 'cors';

function normalizarOrigen(origen) {
  const url = new URL(origen);
  if (!['http:', 'https:'].includes(url.protocol) ||
      url.pathname !== '/' || url.search || url.hash) {
    throw new Error(`Origen CORS inválido: ${origen}`);
  }
  return url.origin;
}

const origenesPermitidos = new Set([
  'http://localhost:5173',
  'http://localhost:4173',
  'http://localhost:3000',
  ...(process.env.CORS_ORIGINS || '')
    .split(',')
    .map((origen) => origen.trim())
    .filter(Boolean)
].map(normalizarOrigen));

const opciones = {
  origin: (origin, callback) => {
    callback(null, !origin || origenesPermitidos.has(origin));
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
};

export default cors(opciones);