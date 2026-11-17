import { administradoresEps } from '../src/config/administradoresEps.js';
import { ready } from '../src/config/db.js';
import { ejecutar } from '../src/repositories/sqlite.js';
import crypto from 'node:crypto';
import { promisify } from 'node:util';

const scrypt = promisify(crypto.scrypt);

const apiBase = (process.env.TUNJA_API || 'https://nfc.multimediaudeb.com/api/v1').replace(/\/+$/, '');
const apiKey = (process.env.TUNJA_CLAVE || 'tk_2hpnL9apbfBCRlwewq81cvqmPOYxrBND').trim();

async function crearHash(contrasena) {
  const sal = crypto.randomBytes(16).toString('hex');
  const derivada = await scrypt(contrasena, sal, 64);
  return `${sal}:${derivada.toString('hex')}`;
}

const slugEps = (eps) => eps.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, '');

async function consultarUsuariosTunja() {
  const respuesta = await fetch(`${apiBase}/users?limite=200`, {
    headers: { 'X-API-Key': apiKey }
  });
  if (!respuesta.ok) {
    throw new Error(`Error al listar usuarios de TunjaAPI: ${respuesta.status} ${await respuesta.text()}`);
  }
  const datos = await respuesta.json();
  return datos.usuarios || [];
}

async function registrarEnTunja(adminData) {
  const respuesta = await fetch(`${apiBase}/auth/register`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': apiKey
    },
    body: JSON.stringify(adminData)
  });

  const texto = await respuesta.text();
  let json;
  try {
    json = JSON.parse(texto);
  } catch {
    json = { raw: texto };
  }

  return { status: respuesta.status, ok: respuesta.ok, data: json };
}

async function probarLoginTunja(credenciales) {
  const respuesta = await fetch(`${apiBase}/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(credenciales)
  });

  const texto = await respuesta.text();
  let json;
  try {
    json = JSON.parse(texto);
  } catch {
    json = { raw: texto };
  }

  return { status: respuesta.status, ok: respuesta.ok, data: json };
}

async function main() {
  console.log(`Conectando a TunjaAPI en: ${apiBase}`);
  console.log(`Usando clave: ${apiKey.slice(0, 6)}...${apiKey.slice(-4)}`);

  await ready;
  const usuariosExistentes = await consultarUsuariosTunja();
  console.log(`TunjaAPI tiene actualmente ${usuariosExistentes.length} usuarios.`);

  const resultados = [];

  for (const { eps, nitEnv, claveEnv } of administradoresEps) {
    const nit = (process.env[nitEnv] || '').trim();
    const contrasena = (process.env[claveEnv] || '').trim();

    if (!nit || !contrasena) {
      console.error(`Faltan variables para ${eps} (${nitEnv}, ${claveEnv})`);
      continue;
    }

    const email = `admin.${slugEps(eps)}@meditunja.com`;
    const nombre = `Administrador ${eps}`;

    console.log(`\n--------------------------------------------`);
    console.log(`Procesando Administrador para ${eps}:`);
    console.log(`  NIT: ${nit}`);
    console.log(`  Email: ${email}`);
    console.log(`  Nombre: ${nombre}`);

    // Verificar si ya existe en TunjaAPI por email o documento
    const yaExiste = usuariosExistentes.find(u => 
      (u.email && u.email.toLowerCase() === email.toLowerCase()) ||
      (u.documento && (u.documento === nit || u.documento === nit.replace('-', '')))
    );

    let usuarioTunjaId = null;

    if (yaExiste) {
      console.log(`  -> El usuario ya existe en TunjaAPI (ID: ${yaExiste.id}, Nombre: ${yaExiste.nombre}).`);
      usuarioTunjaId = yaExiste.id;
    } else {
      console.log(`  -> Registrando en TunjaAPI...`);
      const reg = await registrarEnTunja({
        email,
        contrasena,
        nombre,
        documento: nit,
        tipo_documento: 'NIT',
        numero_documento: nit,
        perfil: 'general',
        descuento: 0
      });

      if (!reg.ok) {
        console.error(`  [ERROR] Falló registro en TunjaAPI (${reg.status}):`, reg.data);
      } else {
        usuarioTunjaId = reg.data.usuario?.id || reg.data.id;
        console.log(`  [OK] Creado exitosamente en TunjaAPI con ID: ${usuarioTunjaId}`);
      }
    }

    // Probar login en TunjaAPI
    console.log(`  -> Probando login en TunjaAPI con las credenciales...`);
    const loginTest = await probarLoginTunja({
      email,
      contrasena
    });

    if (loginTest.ok) {
      console.log(`  [OK] Login en TunjaAPI verificado correctamente.`);
    } else {
      // Probar login por documento
      const loginDocTest = await probarLoginTunja({
        tipo_documento: 'NIT',
        numero_documento: nit,
        contrasena
      });
      if (loginDocTest.ok) {
        console.log(`  [OK] Login en TunjaAPI verificado por documento.`);
      } else {
        console.warn(`  [AVISO] No se pudo autenticar en TunjaAPI (${loginTest.status}):`, loginTest.data);
      }
    }

    // Sincronizar con base de datos local para que MediTunja reconozca el rol y la EPS
    const passwordHash = await crearHash(contrasena);
    const usuarioLocal = await ejecutar(
      'get',
      `SELECT id_usuario FROM usuarios WHERE tipo_documento = 'NIT' AND numero_documento = ?`,
      [nit]
    );

    if (usuarioLocal) {
      await ejecutar(
        'run',
        `UPDATE usuarios
         SET nombres = ?, email = ?, eps = ?, rol = 'administrador', password_hash = ?, activo = 1, estado_registro = 'aprobado'
         WHERE id_usuario = ?`,
        [nombre, email, eps, passwordHash, usuarioLocal.id_usuario]
      );
      console.log(`  [OK] Registro local actualizado y sincronizado.`);
    } else {
      await ejecutar(
        'run',
        `INSERT INTO usuarios (
          tipo_documento, numero_documento, nombres, apellidos, email, eps,
          rol, password_hash, activo, estado_registro
        ) VALUES ('NIT', ?, ?, 'Administración', ?, ?, 'administrador', ?, 1, 'aprobado')`,
        [nit, nombre, email, eps, passwordHash]
      );
      console.log(`  [OK] Registro local creado y sincronizado.`);
    }

    resultados.push({
      eps,
      nit,
      email,
      creadoEnTunja: Boolean(usuarioTunjaId)
    });
  }

  console.log(`\n============================================`);
  console.log(`Resumen de aprovisionamiento de administradores en TunjaAPI:`);
  console.table(resultados);
}

main()
  .catch(err => {
    console.error('Error durante la ejecución:', err);
    process.exitCode = 1;
  })
  .finally(async () => {
    const { db } = await import('../src/config/db.js');
    await new Promise((resolve) => db.close(resolve));
  });
