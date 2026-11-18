import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import corsConfig from '../middlewares/corsConfig.js';
import { logger } from '../middlewares/logger.js';
import { limpiarEntradas } from '../middlewares/validaciones.js';
import { rutaNoEncontrada, manejarErrores } from '../middlewares/errorHandler.js';
import rutasApi from '../src/routes/api.js';
import { ready } from '../src/config/db.js';

const app = express();

app.use(corsConfig);
app.use(logger);
app.use(express.json({ limit: '7mb' }));
app.use(limpiarEntradas);

app.get('/api/salud', (req, res) => {
  res.json({ ok: true, mensaje: 'Servidor MediTunja funcionando' });
});

app.use('/api', rutasApi);
app.use(rutaNoEncontrada);
app.use(manejarErrores);

export default app;
