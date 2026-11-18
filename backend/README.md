# Backend MediTunja

API Express con persistencia SQLite e integración con TunjaAPI. Requiere Node.js
22.9 o superior. La base y sus migraciones se inicializan al arrancar.

## Configuración y ejecución

Copia `.env.example` a `.env` y configura allí las variables necesarias para la
API externa, las cuentas administrativas y, si aplica, `DB_PATH`. No incluyas
valores reales en el repositorio, documentación, capturas o logs. Desde esta
carpeta:

```sh
npm install
npm run start
```

La API escucha en el puerto configurado por `PORT` (por defecto, 3001). Para
restringir solicitudes de navegador, define `CORS_ORIGINS` con los orígenes
exactos del frontend, separados por comas.

La base predeterminada es `data/meditunja.db`; `DB_PATH` permite elegir otra
ruta. Los comprobantes privados se guardan en `afiliaciones-privadas` junto a la
base de datos y no se sirven como contenido estático.

## Sesiones y rutas principales

- Los afiliados se registran e inician sesión mediante TunjaAPI. Las cuentas
  administrativas EPS usan credenciales locales; el superadministrador valida
  sus credenciales en TunjaAPI y tiene un rol local separado.
- La API expone disponibilidad, creación, listado y cancelación de citas. El
  pago de una cita confirmada se consulta y procesa mediante las rutas
  `/api/citas/:id/pago` y requiere tarjeta vinculada. El pago NFC solicita un
  cobro a la billetera de TunjaAPI; los métodos Nequi, Daviplata, tarjeta y PSE
  se simulan y no cobran esos medios.
- `/api/wallet` y `/api/wallet/topup` consultan y acreditan saldo en TunjaAPI;
  requieren sesión y tarjeta vinculada. El monto de recarga debe ser entero
  entre 100 y 500.000 pesos. La clave de TunjaAPI solo se usa en el backend.
- `/api/transporte` permite al afiliado listar y solicitar transporte para una
  cita confirmada. La solicitud queda pendiente de coordinación; no hay rutas
  administrativas para aceptarla o rechazarla. `/api/transporte/proximidad`
  consulta opciones cercanas.
- Las rutas `/api/admin/*` verifican el rol y restringen los datos a la EPS del
  administrador. Incluyen afiliados, citas, convenios, resultados, tarjetas NFC
  y recargas administrativas. Estas recargas acreditan la billetera de TunjaAPI
  para afiliados aprobados; sus métodos de pago son simulados.
- Las rutas `/api/superadmin/*` permiten gestionar cuentas EPS y la tarjeta del
  superadministrador. Este rol no tiene acceso a rutas ni datos de pacientes.

El acceso NFC crea una sesión local de 15 minutos que se renueva durante el uso.
La tarjeta debe estar activa en TunjaAPI y coincidir con la vinculación local.
El UID es copiable y no constituye una prueba criptográfica de identidad; bloquea
o desvincula inmediatamente una tarjeta perdida.

## Cuentas administrativas EPS

Define los NIT y contraseñas en `backend/.env` con estas variables:

- `ADMIN_NUEVA_EPS_NIT` y `ADMIN_NUEVA_EPS_PASSWORD`
- `ADMIN_FAMISANAR_NIT` y `ADMIN_FAMISANAR_PASSWORD`
- `ADMIN_SANITAS_NIT` y `ADMIN_SANITAS_PASSWORD`
- `ADMIN_SURA_NIT` y `ADMIN_SURA_PASSWORD`
- `ADMIN_SALUD_TOTAL_NIT` y `ADMIN_SALUD_TOTAL_PASSWORD`

La configuración debe incluir también los campos `TEST_USER_DOCUMENT_TYPE`,
`TEST_USER_DOCUMENT_NUMBER`, `TEST_USER_NAME`, `TEST_USER_EMAIL`,
`TEST_USER_EPS` y `TEST_USER_PASSWORD` para aprovisionar la cuenta de prueba.
Desde esta carpeta ejecuta:

```sh
npm run provision:admins
```

El comando crea las cuentas que faltan y activa las existentes cuando sus datos
identificadores coinciden. No cambia contraseñas de cuentas ya creadas. Si un
NIT o una identidad de prueba ya pertenece a una cuenta incompatible, se detiene
sin modificarla. Las contraseñas se guardan como hashes.

## Administrador general

Configura `SUPERADMIN_NIT`, `SUPERADMIN_NAME`, `SUPERADMIN_EMAIL` y
`SUPERADMIN_PASSWORD` en `backend/.env`. Usa un NIT exclusivo y una contraseña de
12 a 128 caracteres. También se requiere la configuración de TunjaAPI. Ejecuta:

```sh
npm run provision:superadmin
```

El comando registra o valida la cuenta en TunjaAPI y le asigna el rol local de
superadministrador. Volver a ejecutarlo actualiza los datos configurados y
revoca las sesiones previas. Se rechaza un NIT o correo que ya pertenezca a otra
cuenta.

## Afiliaciones y resultados

El registro público crea la cuenta en TunjaAPI y guarda localmente la solicitud
de afiliación. Requiere un comprobante PDF, JPG o PNG de hasta 5 MB; solo el
administrador autenticado de la EPS correspondiente puede consultarlo. Las
nuevas cuentas pueden iniciar sesión mientras la solicitud está pendiente, pero
solo acceden al perfil y al cierre de sesión. Las cuentas aprobadas acceden a
citas y demás módulos.

Los resultados de procedimientos se registran manualmente en SQLite; no existe
integración automática con los sistemas de las IPS. Los informes «En proceso»
no se muestran al paciente. Verifica la información antes de publicarla.
