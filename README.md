# MediTunja

Aplicación React/Vite con API Express y base SQLite para afiliación, citas,
billetera, tarjetas NFC y administración por EPS.

## Desarrollo local

Requisitos: Node.js 22.9 o superior y npm.

1. Instala las dependencias desde la raíz:

   ```powershell
   npm install
   npm --prefix backend install
   npm --prefix frontend install
   ```

2. Copia `backend/.env.example` a `backend/.env` y completa allí la configuración
   necesaria para TunjaAPI y las cuentas administrativas. Usa valores propios;
   nunca publiques ese archivo ni credenciales en documentación, capturas o logs.
3. Inicia el backend y el frontend juntos:

   ```powershell
   npm run dev
   ```

   El backend también se inicia con `npm run start`. Para el frontend por
   separado usa `npm --prefix frontend run dev`.

El backend escucha en `http://localhost:3001`; Vite suele usar
`http://localhost:5173` y reenvía `/api` al backend. En otros despliegues define
`VITE_API_URL` con la URL pública de la API terminada en `/api`, y configura
`CORS_ORIGINS` en el backend con los orígenes exactos del frontend, separados
por comas. No se permiten automáticamente todos los dominios `vercel.app`.
Presiona `Ctrl+C` para detener ambos procesos.

## Funciones disponibles

- Los afiliados se registran e inician sesión mediante TunjaAPI. Las cuentas
  administrativas EPS y general usan sesiones locales; el acceso NFC de
  administradores EPS valida la tarjeta en TunjaAPI.
- Las citas, pagos asociados, afiliaciones, convenios, resultados y solicitudes
  de transporte se gestionan con la API y SQLite. Reservar citas y solicitar
  transporte requiere una tarjeta NFC vinculada.
- Las solicitudes de transporte corresponden a citas confirmadas y quedan
  pendientes de coordinación. No hay un flujo administrativo para aceptarlas o
  rechazarlas.
- Los administradores EPS operan sobre datos de su propia EPS y pueden gestionar
  afiliados, citas, convenios, resultados, recargas en ventanilla y tarjetas NFC.
- El administrador general gestiona cuentas de administradores EPS; no accede a
  datos de pacientes. Las rutas antiguas de operador redirigen al inicio de sesión.
- El lector ACR122U usa el puente local de `Lector/`. Ejecuta `Lector/Puente.bat`
  en el PC del lector; el navegador no puede iniciar ese archivo por sí solo.
  Consulta [Lector/README.md](Lector/README.md) para el uso y los límites.

## Billetera, pagos y NFC

La billetera consulta y acredita saldo en TunjaAPI. La clave de integración se
usa únicamente en el backend y se configura en `backend/.env`. Las opciones de
pago Nequi, Daviplata, tarjeta y PSE son simuladas: no se conecta una pasarela ni
se cobran esos medios. El pago NFC de citas sí solicita el cobro a la billetera
de TunjaAPI. Una recarga acredita saldo en esa billetera; no confirma que el
saldo esté disponible en la tarjeta física.

El UID se registra para vincular una tarjeta y puede usarse para iniciar sesión
con una sesión MediTunja de 15 minutos, renovada durante el uso. La cuenta debe
estar activa y aprobada, y la tarjeta debe estar activa en TunjaAPI. El UID se
puede copiar y no demuestra por sí solo la identidad del titular; bloquea o
desvincula de inmediato las tarjetas perdidas.

## Aprovisionamiento administrativo

Configura los NIT, nombres, correos y contraseñas en `backend/.env`; no guardes
valores reales en el repositorio. Desde `backend/`, ejecuta `npm run
provision:admins` para aprovisionar las cuentas EPS y la cuenta de prueba que
esté configurada. Ejecuta `npm run provision:superadmin` para registrar o
actualizar el administrador general. Volver a aprovisionarlo revoca sus
sesiones anteriores. Los detalles están en [backend/README.md](backend/README.md).

## Datos locales

La base de datos se crea en `backend/data/meditunja.db` o en la ruta definida por
`DB_PATH`. Los comprobantes privados se almacenan junto a la base de datos y no
se sirven como archivos estáticos. `backend/data/` y los archivos `.env` están
excluidos del repositorio.
