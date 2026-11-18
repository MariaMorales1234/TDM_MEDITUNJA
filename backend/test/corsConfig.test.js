import assert from 'node:assert/strict';
import { once } from 'node:events';
import test, { after } from 'node:test';
import express from 'express';

process.env.CORS_ORIGINS = 'https://meditunja-test.vercel.app/';
const { default: corsConfig } = await import('../middlewares/corsConfig.js');

const app = express();
app.use(corsConfig);
app.get('/salud', (req, res) => res.json({ ok: true }));

const servidor = app.listen(0);
await once(servidor, 'listening');
after(() => new Promise((resolve) => servidor.close(resolve)));

const baseUrl = `http://127.0.0.1:${servidor.address().port}`;

test('permite el origen exacto de frontend configurado', async () => {
  const respuesta = await fetch(`${baseUrl}/salud`, {
    headers: { Origin: 'https://meditunja-test.vercel.app' }
  });

  assert.equal(respuesta.headers.get('access-control-allow-origin'), 'https://meditunja-test.vercel.app');
});

test('no permite orígenes no configurados', async () => {
  const respuesta = await fetch(`${baseUrl}/salud`, {
    headers: { Origin: 'https://otro-proyecto.vercel.app' }
  });

  assert.equal(respuesta.headers.get('access-control-allow-origin'), null);
});
