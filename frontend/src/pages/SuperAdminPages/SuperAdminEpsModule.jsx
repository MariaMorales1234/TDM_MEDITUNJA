import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiRequest, mensajeError } from "../../auth/api.js";
import { useAdminAuth } from "../../auth/useAdminAuth.js";
import styles from "./SuperAdminEpsModule.module.css";

function SuperAdminEpsModule() {
    const { token, usuario, cerrarSesion } = useAdminAuth();
    const navigate = useNavigate();
    const [administradores, setAdministradores] = useState([]);
    const [epsDisponibles, setEpsDisponibles] = useState([]);
    const [idRestablecer, setIdRestablecer] = useState("");
    const [cargando, setCargando] = useState(true);
    const [procesando, setProcesando] = useState(false);
    const [error, setError] = useState("");
    const [mensaje, setMensaje] = useState("");
    const [tarjeta, setTarjeta] = useState(null);
    const [errorTarjeta, setErrorTarjeta] = useState("");
    const [vinculando, setVinculando] = useState(false);

    useEffect(() => {
        const solicitud = new AbortController();
        apiRequest("/superadmin/mi-tarjeta", {
            headers: { Authorization: `Bearer ${token}` },
            signal: solicitud.signal,
        }).then(({ data }) => {
            if (!solicitud.signal.aborted) setTarjeta(data);
        }).catch((errorSolicitud) => {
            if (!solicitud.signal.aborted) setErrorTarjeta(mensajeError(errorSolicitud));
        });
        return () => solicitud.abort();
    }, [token]);

    async function vincularTarjeta(evento) {
        evento.preventDefault();
        const uid = new FormData(evento.currentTarget).get("uid");
        setVinculando(true);
        setErrorTarjeta("");
        try {
            const { data } = await apiRequest("/superadmin/mi-tarjeta", {
                method: "POST",
                headers: { Authorization: `Bearer ${token}` },
                body: JSON.stringify({ uid }),
            });
            setTarjeta(data);
        } catch (errorSolicitud) {
            setErrorTarjeta(mensajeError(errorSolicitud));
        } finally {
            setVinculando(false);
        }
    }

    const cargarAdministradores = useCallback(async () => {
        try {
            const respuesta = await apiRequest("/superadmin/administradores-eps", {
                headers: { Authorization: `Bearer ${token}` },
            });
            setAdministradores(respuesta.data.administradores);
            setEpsDisponibles(respuesta.data.epsDisponibles);
            setIdRestablecer((actual) =>
                respuesta.data.administradores.some((admin) => String(admin.id) === actual)
                    ? actual
                    : String(respuesta.data.administradores[0]?.id || "")
            );
        } catch (errorSolicitud) {
            setError(mensajeError(errorSolicitud));
        } finally {
            setCargando(false);
        }
    }, [token]);

    useEffect(() => {
        let activa = true;
        apiRequest("/superadmin/administradores-eps", {
            headers: { Authorization: `Bearer ${token}` },
        }).then((respuesta) => {
            if (!activa) return;
            setAdministradores(respuesta.data.administradores);
            setEpsDisponibles(respuesta.data.epsDisponibles);
            setIdRestablecer(String(respuesta.data.administradores[0]?.id || ""));
        }).catch((errorSolicitud) => {
            if (activa) setError(mensajeError(errorSolicitud));
        }).finally(() => {
            if (activa) setCargando(false);
        });
        return () => {
            activa = false;
        };
    }, [token]);

    async function crearAdministrador(evento) {
        evento.preventDefault();
        const formularioElemento = evento.currentTarget;
        const formulario = new FormData(formularioElemento);
        const contrasena = formulario.get("contrasena");
        if (contrasena !== formulario.get("confirmarContrasena")) {
            setError("Las contraseñas no coinciden.");
            return;
        }

        setProcesando(true);
        setError("");
        setMensaje("");
        try {
            const respuesta = await apiRequest("/superadmin/administradores-eps", {
                method: "POST",
                headers: { Authorization: `Bearer ${token}` },
                body: JSON.stringify({
                    nit: formulario.get("nit"),
                    eps: formulario.get("eps"),
                    contrasena,
                }),
            });
            formularioElemento.reset();
            setMensaje(respuesta.mensaje);
            await cargarAdministradores();
        } catch (errorSolicitud) {
            setError(mensajeError(errorSolicitud));
        } finally {
            setProcesando(false);
        }
    }

    async function cambiarEstado(administrador) {
        setProcesando(true);
        setError("");
        setMensaje("");
        try {
            const respuesta = await apiRequest(
                `/superadmin/administradores-eps/${administrador.id}/estado`,
                {
                    method: "PATCH",
                    headers: { Authorization: `Bearer ${token}` },
                    body: JSON.stringify({ activo: !administrador.activo }),
                },
            );
            setMensaje(respuesta.mensaje);
            await cargarAdministradores();
        } catch (errorSolicitud) {
            setError(mensajeError(errorSolicitud));
        } finally {
            setProcesando(false);
        }
    }

    async function restablecerContrasena(evento) {
        evento.preventDefault();
        const formularioElemento = evento.currentTarget;
        const formulario = new FormData(formularioElemento);
        const contrasena = formulario.get("contrasena");
        if (contrasena !== formulario.get("confirmarContrasena")) {
            setError("Las contraseñas no coinciden.");
            return;
        }

        setProcesando(true);
        setError("");
        setMensaje("");
        try {
            const respuesta = await apiRequest(
                `/superadmin/administradores-eps/${idRestablecer}/contrasena`,
                {
                    method: "PATCH",
                    headers: { Authorization: `Bearer ${token}` },
                    body: JSON.stringify({ contrasena }),
                },
            );
            formularioElemento.reset();
            setMensaje(respuesta.mensaje);
        } catch (errorSolicitud) {
            setError(mensajeError(errorSolicitud));
        } finally {
            setProcesando(false);
        }
    }

    async function salir() {
        await cerrarSesion();
        navigate("/superadmin/login", { replace: true });
    }

    return (
        <main className={styles.page}>
            <header className={styles.header}>
                <div>
                    <span>MEDiTUNJA</span>
                    <h1>Operador del sistema</h1>
                    <p>
                        Gestiona las cuentas administrativas. Esta vista no incluye
                        información de pacientes ni historias clínicas.
                    </p>
                </div>
                <div className={styles.headerActions}>
                    <span>{usuario?.nombres}</span>
                    <button type="button" className={styles.secondaryButton} onClick={salir}>
                        Cerrar sesión
                    </button>
                </div>
            </header>

            {error && <p className={styles.error} role="alert">{error}</p>}
            {mensaje && <p className={styles.success} role="status">{mensaje}</p>}

            <section className={styles.panel} aria-labelledby="operator-card-title">
                <h2 id="operator-card-title">Mi tarjeta NFC</h2>
                {errorTarjeta && <p className={styles.error} role="alert">{errorTarjeta}</p>}
                {tarjeta?.vinculada && (
                    <p className={styles.success} role="status">Tarjeta vinculada · •••• {tarjeta.identificador}</p>
                )}
                {tarjeta && !tarjeta.vinculada && (
                    <form className={styles.form} onSubmit={vincularTarjeta}>
                        <label>
                            UID de tu tarjeta
                            <input name="uid" autoComplete="off" maxLength={40}
                                pattern="([A-Fa-f0-9]{2}){2,20}" required disabled={vinculando} />
                        </label>
                        <p>Con el lector ACR122U, abre <code>Lector\Puente.bat</code>, selecciona el campo UID y acerca la tarjeta.</p>
                        <button type="submit" className={styles.primaryButton} disabled={vinculando}>
                            {vinculando ? "Vinculando…" : "Vincular tarjeta"}
                        </button>
                    </form>
                )}
                {!tarjeta && !errorTarjeta && <p role="status">Consultando tu tarjeta en TunjaAPI…</p>}
            </section>

            <section className={styles.panel} aria-labelledby="accounts-title">
                <div className={styles.panelHeader}>
                    <div>
                        <h2 id="accounts-title">Cuentas registradas</h2>
                        <p>Desactivar una cuenta cierra sus sesiones y bloquea el acceso.</p>
                    </div>
                    <button
                        type="button"
                        className={styles.secondaryButton}
                        onClick={() => {
                            setCargando(true);
                            setError("");
                            cargarAdministradores();
                        }}
                        disabled={cargando || procesando}
                    >
                        Actualizar lista
                    </button>
                </div>

                {cargando ? (
                    <p className={styles.notice} role="status">Cargando administradores EPS...</p>
                ) : administradores.length === 0 ? (
                    <p className={styles.notice} role="status">Aún no hay cuentas administrativas EPS.</p>
                ) : (
                    <div className={styles.tableWrap}>
                        <table>
                            <thead>
                                <tr>
                                    <th>EPS</th>
                                    <th>NIT</th>
                                    <th>Correo</th>
                                    <th>Estado</th>
                                    <th>Acción</th>
                                </tr>
                            </thead>
                            <tbody>
                                {administradores.map((administrador) => (
                                    <tr key={administrador.id}>
                                        <td>{administrador.eps}</td>
                                        <td>{administrador.nit}</td>
                                        <td>{administrador.email}</td>
                                        <td>
                                            <span className={administrador.activo ? styles.active : styles.inactive}>
                                                {administrador.activo ? "Activa" : "Inactiva"}
                                            </span>
                                        </td>
                                        <td>
                                            <button
                                                type="button"
                                                className={styles.secondaryButton}
                                                onClick={() => cambiarEstado(administrador)}
                                                disabled={procesando}
                                            >
                                                {administrador.activo ? "Desactivar" : "Activar"}
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </section>

            <div className={styles.forms}>
                <section className={styles.panel} aria-labelledby="create-title">
                    <h2 id="create-title">Crear administrador EPS</h2>
                    <p>
                        Se crea una cuenta para una EPS disponible y se valida su
                        asociación con TunjaAPI.
                    </p>
                    {epsDisponibles.length === 0 ? (
                        <p className={styles.notice}>Todas las EPS configuradas ya tienen una cuenta local.</p>
                    ) : (
                        <form className={styles.form} onSubmit={crearAdministrador}>
                            <label>
                                EPS
                                <select name="eps" required defaultValue={epsDisponibles[0]}>
                                    {epsDisponibles.map((eps) => <option key={eps}>{eps}</option>)}
                                </select>
                            </label>
                            <label>
                                NIT
                                <input
                                    name="nit"
                                    type="text"
                                    inputMode="numeric"
                                    pattern="[0-9]{9}-[0-9]"
                                    maxLength={11}
                                    placeholder="900123456-7"
                                    required
                                />
                            </label>
                            <label>
                                Contraseña inicial (mínimo 12 caracteres)
                                <input name="contrasena" type="password" minLength={12} maxLength={128} required />
                            </label>
                            <label>
                                Confirmar contraseña
                                <input name="confirmarContrasena" type="password" minLength={12} maxLength={128} required />
                            </label>
                            <button type="submit" className={styles.primaryButton} disabled={procesando}>
                                {procesando ? "Guardando..." : "Crear cuenta"}
                            </button>
                        </form>
                    )}
                </section>

                <section className={styles.panel} aria-labelledby="password-title">
                    <h2 id="password-title">Restablecer contraseña</h2>
                    <p>La contraseña nueva reemplaza la actual y cierra las sesiones anteriores.</p>
                    {administradores.length === 0 ? (
                        <p className={styles.notice}>No hay cuentas para restablecer.</p>
                    ) : (
                        <form className={styles.form} onSubmit={restablecerContrasena}>
                            <label>
                                Administrador EPS
                                <select
                                    value={idRestablecer}
                                    onChange={(evento) => setIdRestablecer(evento.target.value)}
                                    required
                                >
                                    {administradores.map((administrador) => (
                                        <option key={administrador.id} value={administrador.id}>
                                            {administrador.eps} · {administrador.nit}
                                        </option>
                                    ))}
                                </select>
                            </label>
                            <label>
                                Contraseña nueva (mínimo 12 caracteres)
                                <input name="contrasena" type="password" minLength={12} maxLength={128} required />
                            </label>
                            <label>
                                Confirmar contraseña
                                <input name="confirmarContrasena" type="password" minLength={12} maxLength={128} required />
                            </label>
                            <button type="submit" className={styles.primaryButton} disabled={procesando}>
                                {procesando ? "Guardando..." : "Restablecer contraseña"}
                            </button>
                        </form>
                    )}
                </section>
            </div>
        </main>
    );
}

export default SuperAdminEpsModule;
