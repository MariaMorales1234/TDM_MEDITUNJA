import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiRequest, mensajeError } from "../../../../auth/api.js";
import { useAuth } from "../../../../auth/useAuth.js";
import styles from "./ScheduleAppointment.module.css";

function ScheduleAppointment() {
    const { sesion } = useAuth();
    const navigate = useNavigate();
    const [catalogo, setCatalogo] = useState(null);
    const [errorCatalogo, setErrorCatalogo] = useState("");
    const [ips, setIps] = useState("");
    const [servicio, setServicio] = useState("");
    const [fecha, setFecha] = useState("");
    const [modalidad, setModalidad] = useState("presencial");
    const [hora, setHora] = useState("");
    const [disponibilidad, setDisponibilidad] = useState({ clave: "", horarios: [], error: "" });
    const [enviando, setEnviando] = useState(false);
    const [error, setError] = useState("");
    const [actualizacion, setActualizacion] = useState(0);
    const claveDisponibilidad = fecha && ips
        ? `${sesion?.accessToken}|${ips}|${fecha}|${actualizacion}`
        : "";
    const cargandoHorarios = Boolean(claveDisponibilidad) &&
        disponibilidad.clave !== claveDisponibilidad;
    const horarios = disponibilidad.clave === claveDisponibilidad
        ? disponibilidad.horarios
        : [];
    const errorDisponibilidad = disponibilidad.clave === claveDisponibilidad
        ? disponibilidad.error
        : "";

    useEffect(() => {
        if (!sesion?.accessToken) return undefined;
        const solicitud = new AbortController();
        apiRequest("/citas/catalogo", {
            headers: { Authorization: `Bearer ${sesion.accessToken}` },
            signal: solicitud.signal,
        }).then(setCatalogo).catch((errorSolicitud) => {
            if (!solicitud.signal.aborted) setErrorCatalogo(mensajeError(errorSolicitud));
        });
        return () => solicitud.abort();
    }, [sesion?.accessToken]);

    useEffect(() => {
        let activa = true;
        if (!sesion?.accessToken || !claveDisponibilidad) return undefined;

        apiRequest(`/citas/disponibilidad?ips=${encodeURIComponent(ips)}&fecha=${encodeURIComponent(fecha)}`, {
            headers: { Authorization: `Bearer ${sesion.accessToken}` },
        }).then((respuesta) => {
            if (activa) setDisponibilidad({
                clave: claveDisponibilidad,
                horarios: respuesta.horarios,
                error: "",
            });
        }).catch((errorSolicitud) => {
            if (activa) setDisponibilidad({
                clave: claveDisponibilidad,
                horarios: [],
                error: mensajeError(errorSolicitud),
            });
        });

        return () => {
            activa = false;
        };
    }, [sesion?.accessToken, ips, fecha, actualizacion, claveDisponibilidad]);

    async function confirmarCita(event) {
        event.preventDefault();
        if (!fecha || !ips || !servicio || !hora || cargandoHorarios || enviando) return;
        setError("");
        setEnviando(true);

        try {
            const respuesta = await apiRequest("/citas", {
                method: "POST",
                headers: { Authorization: `Bearer ${sesion.accessToken}` },
                body: JSON.stringify({ ips, servicio, fecha, hora, modalidad }),
            });
            window.dispatchEvent(new Event("citas-actualizadas"));
            navigate(`/transporte?cita=${respuesta.cita.id_cita}`);
        } catch (errorSolicitud) {
            setError(mensajeError(errorSolicitud));
            setActualizacion((valor) => valor + 1);
        } finally {
            setEnviando(false);
        }
    }

    const ipsDisponibles = catalogo?.data || [];
    const ipsSeleccionada = ipsDisponibles.find((opcion) => opcion.id === ips);
    const ipsNombre = ipsSeleccionada?.nombre;
    const serviciosDisponibles = ipsSeleccionada?.servicios || [];
    const servicioNombre = serviciosDisponibles.find((opcion) => opcion.id === servicio)?.nombre;

    return (
        <div className={styles.appointmentContainer}>
            <section className={styles.form}>
                <form onSubmit={confirmarCita}>
                    <fieldset>
                        <h3><span className={styles.Number}>1</span>Información de la cita</h3>
                        {errorCatalogo && <p role="alert">{errorCatalogo}</p>}
                        {!catalogo && !errorCatalogo && <p role="status">Consultando convenios de tu EPS…</p>}
                        {catalogo && !ipsDisponibles.length && <p>No hay servicios en convenios activos de tu EPS.</p>}
                        <div className={styles.formGrid}>
                            <div className={styles.formGroup}>
                                <label htmlFor="ips">IPS</label>
                                <select id="ips" value={ips} onChange={(event) => {
                                    setIps(event.target.value);
                                    setServicio("");
                                    setHora("");
                                    setError("");
                                }} required disabled={!ipsDisponibles.length}>
                                    <option value="">Selecciona una IPS</option>
                                    {ipsDisponibles.map((opcion) => (
                                        <option key={opcion.id} value={opcion.id}>{opcion.nombre} · {opcion.sede}</option>
                                    ))}
                                </select>
                            </div>
                            <div className={styles.formGroup}>
                                <label htmlFor="especialidad">Servicio</label>
                                <select id="especialidad" value={servicio} onChange={(event) => setServicio(event.target.value)} required disabled={!ipsSeleccionada}>
                                    <option value="">Selecciona un servicio</option>
                                    {serviciosDisponibles.map((opcion) => (
                                        <option key={opcion.id} value={opcion.id}>{opcion.nombre}</option>
                                    ))}
                                </select>
                            </div>
                            <div className={styles.formGroup}>
                                <label htmlFor="fecha">Fecha</label>
                                <input
                                    type="date"
                                    id="fecha"
                                    value={fecha}
                                    min={catalogo?.fechaMinima}
                                    onChange={(event) => {
                                        setFecha(event.target.value);
                                        setHora("");
                                        setError("");
                                    }}
                                    required
                                />
                            </div>
                            <div className={styles.formGroup}>
                                <label htmlFor="modalidad">Modalidad</label>
                                <select id="modalidad" value={modalidad} onChange={(event) => setModalidad(event.target.value)}>
                                    <option value="presencial">Presencial</option>
                                    <option value="telemedicina">Telemedicina</option>
                                </select>
                            </div>
                        </div>
                    </fieldset>

                    <fieldset>
                        <h3><span className={styles.Number}>2</span>Horarios disponibles</h3>
                        <p>Las citas se agendan con al menos 24 horas de anticipación. Última cita del día: 5:30 p. m.</p>
                        {(!ips || !fecha) && <p>Selecciona una IPS y una fecha para consultar los horarios.</p>}
                        {cargandoHorarios && <p role="status">Consultando disponibilidad...</p>}
                        {errorDisponibilidad && <p role="alert">{errorDisponibilidad}</p>}
                        {!cargandoHorarios && ips && fecha && !horarios.some((opcion) => opcion.disponible) && !errorDisponibilidad && (
                            <p>No hay horarios disponibles para esta fecha.</p>
                        )}
                        <div className={styles.gridHours}>
                            {horarios.map((opcion) => (
                                <button
                                    key={opcion.hora}
                                    type="button"
                                    disabled={!opcion.disponible || cargandoHorarios}
                                    aria-pressed={hora === opcion.hora}
                                    className={hora === opcion.hora ? styles.select : styles.hour}
                                    onClick={() => setHora(opcion.hora)}
                                >
                                    {opcion.hora}
                                    {!opcion.disponible && <span className={styles.slotStatus}> · No disponible</span>}
                                </button>
                            ))}
                        </div>
                    </fieldset>
                    {error && <p role="alert">{error}</p>}
                </form>
            </section>

            <section className={styles.summary}>
                <div className={styles.summaryContainer}>
                    <h4>Resumen de tu cita</h4>
                    <span>{servicioNombre}</span>
                    <hr className={styles.divider} />
                    <div className={styles.summaryDetails}>
                        <div><span>IPS</span><strong>{ipsNombre}</strong></div>
                        <div><span>Fecha</span><strong>{fecha || "Selecciona una fecha"}</strong></div>
                        <div><span>Hora</span><strong>{hora || "Selecciona un horario"}</strong></div>
                        <div><span>Modalidad</span><strong>{modalidad === "telemedicina" ? "Telemedicina" : "Presencial"}</strong></div>
                    </div>
                    <button
                        type="button"
                        disabled={!servicio || !fecha || !horarios.some((opcion) => opcion.hora === hora && opcion.disponible) || cargandoHorarios || enviando}
                        onClick={confirmarCita}
                    >
                        {enviando ? "Agendando..." : "Confirmar cita"}
                    </button>
                </div>
            </section>
        </div>
    );
}

export default ScheduleAppointment;
