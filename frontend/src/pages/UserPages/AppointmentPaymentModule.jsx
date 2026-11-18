import { useEffect, useState } from "react";
import { Link, useLocation, useSearchParams } from "react-router-dom";
import { apiRequest, mensajeError } from "../../auth/api.js";
import { useAuth } from "../../auth/useAuth.js";
import NavbarUser from "../../components/user/NavbarUser/NavbarUser.jsx";
import styles from "./PaymentModule.module.css";
import { metodosPago } from "./metodosRecarga.js";

const pesos = new Intl.NumberFormat("es-CO", {
    style: "currency", currency: "COP", maximumFractionDigits: 0,
});

export default function AppointmentPaymentModule() {
    const [parametros] = useSearchParams();
    const id = parametros.get("cita");
    return <PagoCita key={id} id={id} />;
}

function PagoCita({ id }) {
    const { sesion } = useAuth();
    const { state } = useLocation();
    const token = sesion?.accessToken;
    const ruta = id ? `/citas/${encodeURIComponent(id)}/pago` : null;
    const [pago, setPago] = useState(null);
    const [consulta, setConsulta] = useState(0);
    const [consultando, setConsultando] = useState(Boolean(id));
    const [enviando, setEnviando] = useState(false);
    const [leyendo, setLeyendo] = useState(false);
    const [lecturaUid, setLecturaUid] = useState("");
    const [metodoSimulado, setMetodoSimulado] = useState(null);
    const [error, setError] = useState("");

    useEffect(() => {
        if (!ruta || !token) return undefined;
        const solicitud = new AbortController();
        apiRequest(ruta, {
            headers: { Authorization: `Bearer ${token}` },
            signal: solicitud.signal,
        }).then(({ data }) => {
            if (!solicitud.signal.aborted) setPago(data);
        }).catch((fallo) => {
            if (!solicitud.signal.aborted) setError(mensajeError(fallo));
        }).finally(() => {
            if (!solicitud.signal.aborted) setConsultando(false);
        });
        return () => solicitud.abort();
    }, [ruta, token, consulta]);

    function actualizarPago() {
        setConsultando(true);
        setConsulta((anterior) => anterior + 1);
    }

    async function pagar(uid, metodo = "nfc") {
        setEnviando(true);
        setError("");
        try {
            const { data } = await apiRequest(ruta, {
                method: "POST", headers: { Authorization: `Bearer ${token}` },
                body: JSON.stringify({ uid, metodo, confirmar_simulacion: metodo !== "nfc" }),
            });
            setPago((anterior) => ({ ...anterior, ...data }));
            setLeyendo(false);
            setMetodoSimulado(null);
            actualizarPago();
        } catch (fallo) {
            setError(mensajeError(fallo));
            actualizarPago();
        } finally {
            setEnviando(false);
        }
    }

    function confirmarLectura(evento) {
        evento.preventDefault();
        if (enviando || consultando) return;
        const uid = lecturaUid.trim().toUpperCase();
        setLecturaUid("");
        if (!/^(?:[A-F0-9]{2}){2,20}$/.test(uid)) {
            setError("El identificador leído no es válido. Vuelve a acercar la tarjeta.");
            return;
        }
        pagar(uid);
    }

    const falta = pago ? Math.max(0, pago.total - pago.saldo) : 0;
    const metodoRegistrado = metodosPago.find(({ id }) => id === pago?.metodo);
    return (
        <>
            <NavbarUser />
            <div className={styles.pageContainer}>
                <main className={styles.rechargeCard}>
                    <h1 className={styles.title}>Pago de la cita</h1>
                    {state?.mensajeTransporte && <p role="status">{state.mensajeTransporte}</p>}
                    {!id && <p>Selecciona una cita para pagar. <Link to="/mis-citas">Ver mis citas</Link></p>}
                    {consultando && <p role="status">Consultando el pago y tu saldo…</p>}
                    {error && <p className={styles.alertError} role="alert">{error}</p>}
                    {pago && (
                        <>
                            <section className={styles.sectionBlock} aria-label="Detalle de la cita">
                                <strong>{pago.codigo_cita}</strong>
                                <p>{pago.servicio} · {pago.fecha} a las {pago.hora}</p>
                            </section>
                            <div className={styles.walletBanner}>
                                <div>
                                    <p className={styles.walletLabel}>Saldo disponible</p>
                                    <p className={styles.walletAmount}>{pesos.format(pago.saldo)}</p>
                                </div>
                            </div>
                            <div className={styles.totalBox}>
                                <span className={styles.totalLabel}>Total de la cita</span>
                                <strong className={styles.totalAmount}>{pesos.format(pago.total)}</strong>
                            </div>
                            {pago.estado_pago === "pagado" ? (
                                <>
                                    <p role="status">{metodoRegistrado
                                        ? `Pago simulado registrado con ${metodoRegistrado.nombre}.`
                                        : "Pago confirmado."}</p>
                                    <Link className={styles.secondaryButton} to="/mapa">Continuar al mapa</Link>
                                </>
                            ) : pago.estado_pago === "en_proceso" ? (
                                <>
                                    <p role="status">Estamos verificando el cobro con TunjaAPI.</p>
                                    <button type="button" className={styles.secondaryButton} onClick={actualizarPago} disabled={consultando}>
                                        Consultar estado del pago
                                    </button>
                                </>
                            ) : (
                                <>
                                    {pago.total > 0 && (
                                        <section className={styles.sectionBlock} aria-labelledby="metodos-pago-cita">
                                            <h2 id="metodos-pago-cita" className={styles.sectionLabel}>Métodos de pago</h2>
                                            <div className={styles.paymentMethodsGrid}>
                                                {metodosPago.map((metodo) => (
                                                    <button key={metodo.id} type="button" disabled={enviando || consultando}
                                                        aria-pressed={metodoSimulado?.id === metodo.id}
                                                        className={`${styles.paymentMethodCard} ${metodoSimulado?.id === metodo.id ? styles.paymentMethodActive : ""}`}
                                                        onClick={() => {
                                                            setLeyendo(false);
                                                            setMetodoSimulado(metodo);
                                                        }}>
                                                        <span className={styles.paymentName}>{metodo.nombre}</span>
                                                        <small className={styles.paymentSubtext}>Simulado</small>
                                                    </button>
                                                ))}
                                            </div>
                                            {metodoSimulado && (
                                                <>
                                                    <p>La simulación con {metodoSimulado.nombre} no mueve dinero ni saldo NFC.</p>
                                                    <button type="button" className={styles.secondaryButton} disabled={enviando || consultando}
                                                        onClick={() => pagar(undefined, metodoSimulado.id)}>
                                                        Confirmar pago simulado
                                                    </button>
                                                </>
                                            )}
                                        </section>
                                    )}
                                    {falta > 0 ? (
                                <>
                                    <button type="button" className={styles.submitButton} disabled>Pagar con NFC</button>
                                    <p>Te faltan <strong>{pesos.format(falta)}</strong> para pagar esta cita.</p>
                                    <section className={styles.sectionBlock} aria-labelledby="metodos-recarga-cita">
                                        <h2 id="metodos-recarga-cita" className={styles.sectionLabel}>Recargar saldo</h2>
                                        <p>Elige un método de recarga simulada. Después podrás volver y pagar con tu saldo NFC.</p>
                                        <div className={styles.paymentMethodsGrid}>
                                            {metodosPago.map(({ id: metodo, nombre, icono: Icono, colorIcono }) => (
                                                <Link key={metodo} className={styles.paymentMethodCard}
                                                    to={`/recargar-saldo?${new URLSearchParams({ cita: id, metodo })}`}>
                                                    <span className={styles.paymentIconWrapper}>
                                                        <Icono color={colorIcono} size={20} aria-hidden="true" />
                                                    </span>
                                                    <span className={styles.paymentName}>{nombre}</span>
                                                </Link>
                                            ))}
                                        </div>
                                    </section>
                                </>
                            ) : leyendo ? (
                                <form className={styles.sectionBlock} onSubmit={confirmarLectura}>
                                    <label className={styles.sectionLabel} htmlFor="lectura-pago-nfc">
                                        Acerca tu tarjeta vinculada al lector para autorizar el cobro.
                                    </label>
                                    <input id="lectura-pago-nfc" className={styles.customInput} type="password"
                                        autoComplete="off" value={lecturaUid} autoFocus disabled={enviando}
                                        onChange={(evento) => setLecturaUid(evento.target.value)} />
                                    <button type="submit" className={styles.submitButton} disabled={enviando || consultando || !lecturaUid}>
                                        {enviando ? "Procesando pago…" : "Confirmar lectura"}
                                    </button>
                                </form>
                            ) : (
                                <button type="button" className={styles.submitButton} disabled={enviando || consultando}
                                    onClick={() => {
                                        setMetodoSimulado(null);
                                        if (pago.total === 0) pagar();
                                        else setLeyendo(true);
                                    }}>
                                    {enviando ? "Procesando pago…" : pago.total === 0 ? "Confirmar cita sin costo" : "Pagar con NFC"}
                                </button>
                            )}
                                </>
                            )}
                        </>
                    )}
                    {id && error && !pago && (
                        <button type="button" className={styles.secondaryButton} onClick={() => {
                            setError("");
                            actualizarPago();
                        }} disabled={consultando}>Volver a consultar</button>
                    )}
                </main>
            </div>
        </>
    );
}
