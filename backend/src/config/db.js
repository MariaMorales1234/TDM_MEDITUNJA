import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sqlite3 from 'sqlite3';
import { tarifaBaseCita, tarifaMaximaCita } from './tarifasCitas.js';
import { EPS_AFILIACIONES, EPS_CATALOGO, IPS_CATALOGO } from './convenios.js';

const carpetaModulo = path.dirname(fileURLToPath(import.meta.url));
// shortcut: en Vercel solo /tmp es escribible y se borra en cada arranque en frío; migrar a una BD gestionada para datos persistentes.
const rutaBaseDatos = path.resolve(
  process.env.DB_PATH ||
    (process.env.VERCEL ? '/tmp/meditunja.db' : path.join(carpetaModulo, '../../data/meditunja.db'))
);
const rutaEsquema = path.join(carpetaModulo, 'db.sql');

fs.mkdirSync(path.dirname(rutaBaseDatos), { recursive: true });

export const db = new sqlite3.Database(rutaBaseDatos);

function actualizarEsquema() {
  return new Promise((resolve, reject) => {
    db.all('PRAGMA table_info(usuarios)', (error, columnas) => {
      if (error) {
        reject(error);
        return;
      }

      const existentes = new Set(columnas.map((columna) => columna.name));
      const migraciones = [
        ['fecha_nacimiento', 'TEXT'],
        ['sexo', "TEXT CHECK (sexo IS NULL OR sexo IN ('M', 'F', 'O'))"],
        ['eps', 'TEXT'],
        ['rol', "TEXT NOT NULL DEFAULT 'afiliado' CHECK (rol IN ('afiliado', 'administrador', 'superadministrador'))"]
      ].filter(([nombre]) => !existentes.has(nombre));

      const agregarSiguiente = (indice) => {
        if (indice === migraciones.length) {
          actualizarTipoDocumentoNIT()
            .then(actualizarSolicitudesTunja)
            .then(resolve, reject);
          return;
        }

        const [nombre, definicion] = migraciones[indice];
        db.run(`ALTER TABLE usuarios ADD COLUMN ${nombre} ${definicion}`, (errorMigracion) => {
          if (errorMigracion) {
            reject(errorMigracion);
            return;
          }
          agregarSiguiente(indice + 1);
        });
      };

      agregarSiguiente(0);
    });
  });
}

function actualizarSolicitudesTunja() {
  return new Promise((resolve, reject) => {
    db.all('PRAGMA table_info(usuarios_tunja)', (error, columnas) => {
      if (error) {
        reject(error);
        return;
      }

      const existentes = new Set(columnas.map((columna) => columna.name));
      const migraciones = [
        ['tunja_usuario_id', 'TEXT'],
        ['nombres', 'TEXT'],
        ['apellidos', 'TEXT'],
        ['telefono', 'TEXT'],
        ['eps', 'TEXT'],
        ['estado_afiliacion', "TEXT NOT NULL DEFAULT 'pendiente' CHECK (estado_afiliacion IN ('pendiente', 'aprobado', 'rechazado'))"],
        ['comprobante_archivo', 'TEXT'],
        ['comprobante_tipo', 'TEXT'],
        ['comprobante_nombre', 'TEXT']
      ].filter(([nombre]) => !existentes.has(nombre));

      const agregarSiguiente = (indice) => {
        if (indice === migraciones.length) {
          db.run(
            'CREATE INDEX IF NOT EXISTS idx_usuarios_tunja_eps_estado ON usuarios_tunja (eps, estado_afiliacion)',
            (errorIndice) => {
              if (errorIndice) {
                reject(errorIndice);
                return;
              }
              db.run(
                'CREATE UNIQUE INDEX IF NOT EXISTS idx_usuarios_tunja_external_id ON usuarios_tunja (tunja_usuario_id) WHERE tunja_usuario_id IS NOT NULL',
                (errorId) => errorId ? reject(errorId) : actualizarCitas(resolve, reject)
              );
            }
          );
          return;
        }

        const [nombre, definicion] = migraciones[indice];
        db.run(`ALTER TABLE usuarios_tunja ADD COLUMN ${nombre} ${definicion}`, (errorMigracion) => {
          if (errorMigracion) {
            reject(errorMigracion);
            return;
          }
          agregarSiguiente(indice + 1);
        });
      };

      agregarSiguiente(0);
    });
  });
}

function actualizarCitas(resolve, reject) {
  db.all('PRAGMA table_info(citas)', (error, columnas) => {
    if (error) {
      reject(error);
      return;
    }

    const existentes = new Set(columnas.map((columna) => columna.name));
    const migraciones = [
      ['motivo_administrativo', 'TEXT'],
      ['modificada_en', 'TEXT']
    ].filter(([nombre]) => !existentes.has(nombre));

    const agregarSiguiente = (indice) => {
      if (indice === migraciones.length) {
        resolve(db);
        return;
      }

      const [nombre, definicion] = migraciones[indice];
      db.run(`ALTER TABLE citas ADD COLUMN ${nombre} ${definicion}`, (errorMigracion) => {
        if (errorMigracion) {
          reject(errorMigracion);
          return;
        }
        agregarSiguiente(indice + 1);
      });
    };

    agregarSiguiente(0);
  });
}

function actualizarTipoDocumentoNIT() {
  return new Promise((resolve, reject) => {
    db.get(
      "SELECT sql FROM sqlite_master WHERE type = 'table' AND name = 'usuarios'",
      (error, tabla) => {
        if (error) {
          reject(error);
          return;
        }
        const sqlTabla = tabla?.sql || '';
        if (/['"]NIT['"]/i.test(sqlTabla) &&
            /['"]superadministrador['"]/i.test(sqlTabla)) {
          resolve(db);
          return;
        }

        db.run('PRAGMA foreign_keys = OFF', (errorLlaveForanea) => {
          if (errorLlaveForanea) {
            reject(errorLlaveForanea);
            return;
          }

          db.exec(`
            BEGIN IMMEDIATE;
            CREATE TABLE usuarios_nueva (
              id_usuario INTEGER PRIMARY KEY AUTOINCREMENT,
              tipo_documento VARCHAR(10) NOT NULL
                CHECK (tipo_documento IN ('CC', 'TI', 'CE', 'PAS', 'NIT')),
              numero_documento VARCHAR(30) NOT NULL,
              nombres VARCHAR(100) NOT NULL,
              apellidos VARCHAR(100) NOT NULL,
              email VARCHAR(254) NOT NULL UNIQUE,
              telefono VARCHAR(30),
              fecha_nacimiento TEXT,
              sexo TEXT CHECK (sexo IS NULL OR sexo IN ('M', 'F', 'O')),
              eps TEXT,
              rol TEXT NOT NULL DEFAULT 'afiliado'
                CHECK (rol IN ('afiliado', 'administrador', 'superadministrador')),
              password_hash TEXT NOT NULL CHECK (
                length(password_hash) = 161 AND
                substr(password_hash, 33, 1) = ':' AND
                substr(password_hash, 1, 32) NOT GLOB '*[^a-fA-F0-9]*' AND
                substr(password_hash, 34, 128) NOT GLOB '*[^a-fA-F0-9]*'
              ),
              activo BOOLEAN NOT NULL DEFAULT 0,
              estado_registro VARCHAR(20) NOT NULL DEFAULT 'pendiente'
                CHECK (estado_registro IN ('pendiente', 'aprobado', 'rechazado')),
              fecha_registro TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
              CONSTRAINT uq_usuarios_tipo_numero
                UNIQUE (tipo_documento, numero_documento)
            );
            INSERT INTO usuarios_nueva (
              id_usuario, tipo_documento, numero_documento, nombres, apellidos, email,
              telefono, fecha_nacimiento, sexo, eps, rol, password_hash, activo,
              estado_registro, fecha_registro
            )
            SELECT
              id_usuario, tipo_documento, numero_documento, nombres, apellidos, email,
              telefono, fecha_nacimiento, sexo, eps, rol, password_hash, activo,
              estado_registro, fecha_registro
            FROM usuarios;
            DROP TABLE usuarios;
            ALTER TABLE usuarios_nueva RENAME TO usuarios;
            COMMIT;
          `, (errorMigracion) => {
            if (errorMigracion) {
              db.exec('ROLLBACK', () => {
                db.run('PRAGMA foreign_keys = ON', () => reject(errorMigracion));
              });
              return;
            }

            db.run('PRAGMA foreign_keys = ON', (errorLlaveForanea) => {
              if (errorLlaveForanea) {
                reject(errorLlaveForanea);
                return;
              }
              db.all('PRAGMA foreign_key_check', (errorVerificacion, violaciones) => {
                if (errorVerificacion) {
                  reject(errorVerificacion);
                } else if (violaciones.length > 0) {
                  reject(new Error('La migración de NIT dejó referencias de usuario inválidas.'));
                } else {
                  resolve(db);
                }
              });
            });
          });
        });
      }
    );
  });
}

async function actualizarPagosCita() {
  const columnas = await new Promise((resolve, reject) =>
    db.all('PRAGMA table_info(pagos_cita)', (error, filas) => error ? reject(error) : resolve(filas))
  );
  const ejecutar = (sql, params = []) => new Promise((resolve, reject) =>
    db.run(sql, params, (error) => error ? reject(error) : resolve())
  );
  if (!columnas.some(({ name }) => name === 'metodo')) {
    await ejecutar("ALTER TABLE pagos_cita ADD COLUMN metodo TEXT NOT NULL DEFAULT 'nfc'");
  }
  await ejecutar(`UPDATE citas
    SET costo = ?, descuento_aplicado = min(?, round(descuento_aplicado * 1.0 * ? / costo))
    WHERE costo > ? AND estado = 'confirmada'
      AND NOT EXISTS (SELECT 1 FROM pagos_cita p WHERE p.cita_id = citas.id_cita)`,
  [tarifaBaseCita, tarifaBaseCita, tarifaBaseCita, tarifaMaximaCita]);
}

function actualizarAdjuntosResultados() {
  return new Promise((resolve, reject) => {
    db.all('PRAGMA table_info(resultados_procedimientos)', (error, columnas) => {
      if (error) return reject(error);
      const cambios = [
        ['adjunto_nombre', 'TEXT'],
        ['adjunto_contenido', 'BLOB']
      ].filter(([nombre]) => !columnas.some(({ name }) => name === nombre));
      db.exec(cambios.map(([nombre, tipo]) =>
        `ALTER TABLE resultados_procedimientos ADD COLUMN ${nombre} ${tipo};`
      ).join(' '), (fallo) => fallo ? reject(fallo) : resolve());
    });
  });
}

function normalizarNombre(valor) {
  return valor.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
    .replace(/eps/g, '').replace(/[^a-z0-9]/g, '');
}

function sembrarConveniosBase() {
  return new Promise((resolve, reject) => {
    db.all('SELECT eps_nombre, ips_id FROM convenios', async (error, existentes) => {
      if (error) return reject(error);
      const ipsEquivalentes = new Map([
        ['santiago-tunja', 'ese-san-antonio'],
        ['clinica-medilaser', 'medilaser'],
        ['clinica-andes', 'los-andes']
      ]);
      const paresExistentes = new Set(existentes.map(({ eps_nombre, ips_id }) =>
        `${normalizarNombre(eps_nombre)}|${ipsEquivalentes.get(ips_id) || ips_id}`
      ));
      const fecha = new Date().toISOString().slice(0, 10);
      try {
        await new Promise((resolveActualizacion, rejectActualizacion) => {
          db.run('UPDATE convenios SET clausula_transporte = 1', (fallo) =>
            fallo ? rejectActualizacion(fallo) : resolveActualizacion()
          );
        });
        for (const ips of IPS_CATALOGO) {
          const idsIps = [ips.id, ...[...ipsEquivalentes]
            .filter(([, destino]) => destino === ips.id)
            .map(([alias]) => alias)];
          await new Promise((resolveActualizacion, rejectActualizacion) => {
            db.run(`UPDATE convenios SET ips_nombre = ?, ips_sede = ?, ips_direccion = ?
              WHERE ips_id IN (${idsIps.map(() => '?').join(', ')})`,
            [ips.nombre, ips.sede, ips.direccion, ...idsIps], (fallo) =>
              fallo ? rejectActualizacion(fallo) : resolveActualizacion()
            );
          });
        }
        for (const nombreEps of EPS_AFILIACIONES) {
          const eps = EPS_CATALOGO.find(({ nombre }) => normalizarNombre(nombre) === normalizarNombre(nombreEps));
          if (!eps) continue;
          for (const ips of IPS_CATALOGO) {
            if (!ips.eps.some((nombre) => normalizarNombre(nombre) === normalizarNombre(nombreEps))) continue;
            const clavePar = `${normalizarNombre(nombreEps)}|${ips.id}`;
            if (paresExistentes.has(clavePar)) continue;
            const id = `BASE-${eps.id}-${ips.id}`;
            await new Promise((resolveInsercion, rejectInsercion) => {
              db.run(`INSERT OR IGNORE INTO convenios (
                id, eps_id, eps_nombre, eps_sede, eps_direccion,
                ips_id, ips_nombre, ips_sede, ips_direccion,
                portafolio_id, portafolio_nombre, servicios_seleccionados,
                clausula_transporte, estado, fecha_creacion
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'servicios', 'Servicios autorizados', ?, 1, 'Activo', ?)`, [
                id, eps.id, nombreEps, eps.sede, eps.direccion,
                ips.id, ips.nombre, ips.sede, ips.direccion,
                JSON.stringify(ips.servicios), fecha
              ], (fallo) => fallo ? rejectInsercion(fallo) : resolveInsercion());
            });
            paresExistentes.add(clavePar);
          }
        }
        resolve();
      } catch (fallo) {
        reject(fallo);
      }
    });
  });
}

export const ready = new Promise((resolve, reject) => {
  fs.readFile(rutaEsquema, 'utf8', (errorLectura, esquema) => {
    if (errorLectura) {
      reject(errorLectura);
      return;
    }

    db.exec(esquema, (errorEsquema) => {
      if (errorEsquema) {
        reject(errorEsquema);
        return;
      }
      actualizarEsquema()
        .then(actualizarPagosCita)
        .then(actualizarAdjuntosResultados)
        .then(sembrarConveniosBase)
        .then(() => resolve(db), reject);
    });
  });
});
