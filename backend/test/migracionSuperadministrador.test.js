import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import sqlite3 from 'sqlite3';
import test from 'node:test';

const carpetaTemporal = fs.mkdtempSync(path.join(os.tmpdir(), 'meditunja-role-migration-'));
process.env.DB_PATH = path.join(carpetaTemporal, 'legacy.db');
process.env.LOG_PATH = path.join(carpetaTemporal, 'app.log');

function ejecutarDb(archivoDb, metodo, sql, parametros = []) {
  return new Promise((resolve, reject) => {
    archivoDb[metodo](sql, parametros, function (error, resultado) {
      if (error) return reject(error);
      resolve(metodo === 'run' ? { changes: this.changes, lastID: this.lastID } : resultado);
    });
  });
}

test('la migración permite superadministradores y conserva usuarios existentes', async () => {
  const esquema = fs.readFileSync(
    path.join(import.meta.dirname, '../src/config/db.sql'),
    'utf8'
  ).replace(
    "('afiliado', 'administrador', 'superadministrador')",
    "('afiliado', 'administrador')"
  );
  const baseAntigua = new sqlite3.Database(process.env.DB_PATH);
  await new Promise((resolve, reject) => {
    baseAntigua.exec(esquema, (error) => error ? reject(error) : resolve());
  });
  const salt = crypto.randomBytes(16).toString('hex');
  const passwordHash = `${salt}:${crypto.scryptSync('clave-de-prueba', salt, 64).toString('hex')}`;
  await ejecutarDb(
    baseAntigua,
    'run',
    `INSERT INTO usuarios (
      tipo_documento, numero_documento, nombres, apellidos, email, eps, rol,
      password_hash, activo, estado_registro
    ) VALUES ('NIT', '900111111-1', 'Administrador EPS', 'Sura',
      'admin@sura.test', 'Sura', 'administrador', ?, 1, 'aprobado')`,
    [passwordHash]
  );
  await new Promise((resolve, reject) => {
    baseAntigua.close((error) => error ? reject(error) : resolve());
  });

  try {
    const [{ ready }, { ejecutar }] = await Promise.all([
      import('../src/config/db.js'),
      import('../src/repositories/sqlite.js')
    ]);
    await ready;
    await ejecutar(
      'run',
      `UPDATE usuarios SET rol = 'superadministrador'
       WHERE tipo_documento = 'NIT' AND numero_documento = ?`,
      ['900111111-1']
    );
    const usuario = await ejecutar(
      'get',
      `SELECT nombres, rol, password_hash
       FROM usuarios WHERE numero_documento = ?`,
      ['900111111-1']
    );
    assert.equal(usuario.nombres, 'Administrador EPS');
    assert.equal(usuario.rol, 'superadministrador');
    assert.equal(usuario.password_hash, passwordHash);
  } finally {
    const { db } = await import('../src/config/db.js');
    await new Promise((resolve, reject) => {
      db.close((error) => error ? reject(error) : resolve());
    });
    fs.rmSync(carpetaTemporal, { recursive: true, force: true });
  }
});
