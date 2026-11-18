import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { X, CheckCircle2, RotateCcw, User, ArrowRight } from "lucide-react";
import { useAuth } from "../../auth/useAuth.js";
import { apiRequest, mensajeError } from "../../auth/api.js";
import NavbarUser from "../../components/user/NavbarUser/NavbarUser.jsx";
import styles from "./PaymentModule.module.css";
import { metodosPago } from "./metodosRecarga.js";

const montosSugeridos = [20000, 50000, 100000, 200000];

const formatoPesos = new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
});

function PaymentModule() {
    const { sesion } = useAuth();
    const navigate = useNavigate();
    const [parametros] = useSearchParams();
    const citaId = parametros.get("cita");
    const volverAPagar = citaId ? `/pagos?cita=${encodeURIComponent(citaId)}` : null;
    const { state } = useLocation();
    const accessToken = sesion?.accessToken;
    const [resultadoCita, setResultadoCita] = useState(null);

    const [tarjeta, setTarjeta] = useState(null);
    const [saldo, setSaldo] = useState(null);
    const [cargando, setCargando] = useState(true);
    const [errorSaldo, setErrorSaldo] = useState("");

    const [monto, setMonto] = useState(50000);
    const [otroMonto, setOtroMonto] = useState("");
    const [metodoPago, setMetodoPago] = useState(() =>
        metodosPago.find(({ id }) => id === parametros.get("metodo"))?.id || "nequi"
    );

    const [procesando, setProcesando] = useState(false);
    const [error, setError] = useState("");
    const [transaccionExitosa, setTransaccionExitosa] = useState(null);

    useEffect(() => {
        if (!citaId || !accessToken) return undefined;
        const solicitud = new AbortController();
        apiRequest(`/citas?id=${encodeURIComponent(citaId)}`, {
            headers: { Authorization: `Bearer ${accessToken}` },
            signal: solicitud.signal,
        }).then(({ data }) => {
            const cita = data.find((item) => item.estado === "confirmada");
            setResultadoCita({ citaId, cita, error: cita ? "" : "La cita seleccionada no está confirmada." });
        }).catch((errorSolicitud) => {
            if (!solicitud.signal.aborted) setResultadoCita({ citaId, error: mensajeError(errorSolicitud) });
        });
        return () => solicitud.abort();
    }, [accessToken, citaId]);

    // Cargar información de la tarjeta y saldo actual
    useEffect(() => {
        let activo = true;
        if (!accessToken) return;

        const headers = { Authorization: `Bearer ${accessToken}` };

        apiRequest("/nfc/tarjeta", { headers })
            .then(async (respTarjeta) => {
                if (!activo) return;
                if (!respTarjeta.data.vinculada) {
                    setTarjeta(null);
                    setSaldo(null);
                    return;
                }

                setTarjeta(respTarjeta.data);
                try {
                    const respSaldo = await apiRequest("/wallet", { headers });
                    if (activo) {
                        const saldoActual = respSaldo?.data?.saldo;
                        if (!Number.isSafeInteger(saldoActual) || saldoActual < 0) {
                            throw new Error("No fue posible consultar el saldo de tu billetera.");
                        }
                        setSaldo(saldoActual);
                    }
                } catch (error) {
                    if (activo) {
                        setSaldo(null);
                        setErrorSaldo(mensajeError(error));
                    }
                }
            })
            .catch((error) => {
                if (activo) {
                    setTarjeta(null);
                    setSaldo(null);
                    setErrorSaldo(mensajeError(error));
                }
            })
            .finally(() => {
                if (activo) setCargando(false);
            });

        return () => {
            activo = false;
        };
    }, [accessToken]);

    const montoFinal = otroMonto === "" ? monto : Number(otroMonto);

    const manejarSeleccionMonto = (val) => {
        setMonto(val);
        setOtroMonto("");
        setError("");
    };

    const manejarCambioOtroMonto = (e) => {
        const val = e.target.value;
        setOtroMonto(val);
        setMonto(null);
        setError("");
    };

    const recargarSaldo = async (e) => {
        e.preventDefault();
        setError("");

        if (!tarjeta) {
            setError("Debes vincular una tarjeta NFC antes de recargar saldo.");
            return;
        }

        if (saldo === null) {
            setError("No fue posible consultar tu saldo. Intenta de nuevo más tarde.");
            return;
        }

        if (!Number.isSafeInteger(montoFinal) || montoFinal < 100 || montoFinal > 500000) {
            setError("Ingresa un monto entero válido entre $100 y $500.000 COP.");
            return;
        }

        setProcesando(true);

        try {
            const resp = await apiRequest("/wallet/topup", {
                method: "POST",
                headers: { Authorization: `Bearer ${accessToken}` },
                body: JSON.stringify({ monto: montoFinal }),
            });

            const saldoPrevio = saldo;
            const nuevoSaldoTotal = resp.saldo !== undefined ? resp.saldo : (saldoPrevio + montoFinal);
            setSaldo(nuevoSaldoTotal);

            const metodoSeleccionado = metodosPago.find(m => m.id === metodoPago);

            setTransaccionExitosa({
                codigoTx: `TX-${Date.now().toString().slice(-7)}`,
                montoRecargado: montoFinal,
                metodoNombre: metodoSeleccionado?.nombre || "Nequi",
                metodoId: metodoPago,
                saldoAnterior: saldoPrevio,
                nuevoSaldo: nuevoSaldoTotal,
                fecha: new Date().toLocaleString("es-CO", {
                    dateStyle: "medium",
                    timeStyle: "short"
                })
            });
        } catch (err) {
            setError(mensajeError(err) || "No fue posible procesar la recarga.");
        } finally {
            setProcesando(false);
        }
    };

    const resetearParaNuevaRecarga = () => {
        setTransaccionExitosa(null);
        setMonto(50000);
        setOtroMonto("");
        setError("");
    };

    return (
        <>
            <NavbarUser />
            <div className={styles.pageContainer}>
                <main className={styles.rechargeCard} aria-labelledby="modal-title">
                    {/* Encabezado */}
                    <div className={styles.header}>
                        <div className={styles.headerText}>
                            <p className={styles.eyebrow}>BILLETERA MEDITUNJA</p>
                            <h1 id="modal-title" className={styles.title}>
                                {transaccionExitosa ? "Recarga confirmada" : "Recargar saldo"}
                            </h1>
                        </div>
                        <Link to={volverAPagar || "/home"} className={styles.closeButton} aria-label={volverAPagar ? "Volver al pago de la cita" : "Cerrar y volver al inicio"}>
                            <X size={20} />
                        </Link>
                    </div>

                    {state?.mensajeTransporte && <p role="status">{state.mensajeTransporte}</p>}
                    {citaId && (
                        <section className={styles.sectionBlock} aria-label="Cita confirmada">
                            {resultadoCita?.citaId !== citaId ? (
                                <p role="status">Consultando tu cita…</p>
                            ) : resultadoCita.error ? (
                                <p role="alert">{resultadoCita.error}</p>
                            ) : (
                                <p>
                                    <strong>{resultadoCita.cita.codigo_cita}</strong> · {resultadoCita.cita.servicio} ·{" "}
                                    {resultadoCita.cita.ips_nombre} · {resultadoCita.cita.fecha} a las {resultadoCita.cita.hora}
                                </p>
                            )}
                        </section>
                    )}

                    {/* Tarjeta Billetera / Banner Oscuro (Estilo Exacto de la Imagen) */}
                    <div className={styles.walletBanner} aria-label="Estado de la tarjeta y saldo disponible">
                        <div className={styles.walletColLeft}>
                            <p className={styles.walletLabel}>SALDO DISPONIBLE</p>
                            <p className={styles.walletAmount}>
                                {cargando ? "..." : saldo === null ? "—" : formatoPesos.format(saldo)}
                            </p>
                        </div>
                        <div className={styles.walletColRight}>
                            <p className={styles.walletLabel}>TARJETA VINCULADA</p>
                            {tarjeta ? (
                                <p className={styles.walletCardNumber}>
                                    •••• {tarjeta.identificador || tarjeta.numero || "4821"}
                                </p>
                            ) : (
                                <Link to="/vinculacionNFC" className={styles.linkCardAction}>
                                    Vincular tarjeta NFC
                                </Link>
                            )}
                        </div>
                    </div>

                    {!transaccionExitosa ? (
                        /* Formulario de Recarga */
                        <form onSubmit={recargarSaldo}>
                            {/* 1. Selector de montos sugeridos */}
                            <div className={styles.sectionBlock}>
                                <label className={styles.sectionLabel}>Selecciona cuánto quieres recargar</label>
                                <div className={styles.amountGrid} role="radiogroup" aria-label="Montos sugeridos de recarga">
                                    {montosSugeridos.map((m) => (
                                        <button
                                            key={m}
                                            type="button"
                                            className={`${styles.amountButton} ${monto === m && otroMonto === "" ? styles.amountButtonActive : ""}`}
                                            onClick={() => manejarSeleccionMonto(m)}
                                            role="radio"
                                            aria-checked={monto === m && otroMonto === ""}
                                        >
                                            {formatoPesos.format(m)}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* 2. Otro monto */}
                            <div className={styles.sectionBlock}>
                                <label htmlFor="otro-monto" className={styles.sectionLabel}>Otro monto</label>
                                <div className={styles.customInputWrapper}>
                                    <input
                                        id="otro-monto"
                                        type="number"
                                        min="100"
                                        max="500000"
                                        step="100"
                                        className={styles.customInput}
                                        placeholder="Ingresa un monto específico"
                                        value={otroMonto}
                                        onChange={manejarCambioOtroMonto}
                                    />
                                </div>
                            </div>

                            {/* 3. Métodos de pago (Nequi, PSE, Tarjeta débito/crédito, Daviplata) */}
                            <div className={styles.sectionBlock}>
                                <label className={styles.sectionLabel}>Método de pago (simulado)</label>
                                <div className={styles.paymentMethodsGrid} role="radiogroup" aria-label="Métodos de pago disponibles">
                                    {metodosPago.map(({ id, nombre, subtitulo, icono: Icono, colorIcono }) => (
                                        <div
                                            key={id}
                                            className={`${styles.paymentMethodCard} ${metodoPago === id ? styles.paymentMethodActive : ""}`}
                                            onClick={() => setMetodoPago(id)}
                                            role="radio"
                                            aria-checked={metodoPago === id}
                                            tabIndex={0}
                                            onKeyDown={(e) => {
                                                if (e.key === "Enter" || e.key === " ") {
                                                    e.preventDefault();
                                                    setMetodoPago(id);
                                                }
                                            }}
                                        >
                                            <div className={styles.paymentIconWrapper}>
                                                <Icono size={20} color={colorIcono} />
                                            </div>
                                            <div className={styles.paymentTextGroup}>
                                                <span className={styles.paymentName}>{nombre}</span>
                                                <span className={styles.paymentSubtext}>{subtitulo}</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {errorSaldo && <div className={styles.alertError} role="alert">{errorSaldo}</div>}

                            {/* 4. Total a recargar */}
                            <div className={styles.totalBox}>
                                <span className={styles.totalLabel}>Total a recargar</span>
                                <span className={styles.totalAmount}>
                                    {formatoPesos.format(montoFinal > 0 ? montoFinal : 0)}
                                </span>
                            </div>

                            {/* 5. Botón de Acción Principal */}
                            <button
                                type="submit"
                                className={styles.submitButton}
                                disabled={procesando || cargando || saldo === null || !montoFinal || montoFinal < 100 || !tarjeta}
                            >
                                {procesando
                                    ? "Procesando pago y acreditando..."
                                    : `Recargar ${formatoPesos.format(montoFinal > 0 ? montoFinal : 0)}`}
                            </button>

                            <p className={styles.simulationNotice}>
                                Simulación de pago: no se realiza un cobro real. El monto se acreditará al saldo de tu tarjeta NFC MediTunja.
                            </p>

                            {error && <div className={styles.alertError} role="alert">{error}</div>}
                        </form>
                    ) : (
                        /* Apartado de Confirmación y Recarga Exitosa */
                        <div className={styles.receiptCard} role="status" aria-live="polite">
                            <div className={styles.successIconCircle}>
                                <CheckCircle2 size={36} />
                            </div>
                            <h2 className={styles.receiptTitle}>¡Recarga exitosa!</h2>
                            <p className={styles.receiptSubtitle}>
                                Pago simulado con <strong>{transaccionExitosa.metodoNombre}</strong>: se descontaron virtualmente <strong>{formatoPesos.format(transaccionExitosa.montoRecargado)}</strong> y el saldo se acreditó automáticamente a tu tarjeta NFC.
                            </p>

                            <div className={styles.receiptDetailsBox}>
                                <div className={styles.receiptRow}>
                                    <span>N° Transacción</span>
                                    <strong>{transaccionExitosa.codigoTx}</strong>
                                </div>
                                <div className={styles.receiptRow}>
                                    <span>Método de pago</span>
                                    <strong>{transaccionExitosa.metodoNombre}</strong>
                                </div>
                                <div className={styles.receiptRow}>
                                    <span>Fecha y hora</span>
                                    <strong>{transaccionExitosa.fecha}</strong>
                                </div>
                                <div className={styles.receiptRow}>
                                    <span>Tarjeta NFC</span>
                                    <strong>•••• {tarjeta?.identificador || "4821"}</strong>
                                </div>
                                <div className={styles.receiptRow}>
                                    <span>Monto acreditado</span>
                                    <strong>{formatoPesos.format(transaccionExitosa.montoRecargado)}</strong>
                                </div>
                                <div className={`${styles.receiptRow} ${styles.receiptRowHighlight}`}>
                                    <span>Nuevo saldo disponible</span>
                                    <strong>{formatoPesos.format(transaccionExitosa.nuevoSaldo)}</strong>
                                </div>
                            </div>

                            <div className={styles.receiptActions}>
                                <button
                                    type="button"
                                    className={styles.submitButton}
                                    onClick={() => navigate(volverAPagar || "/citas")}
                                >
                                    <span>{volverAPagar ? "Volver a pagar la cita" : "Continuar a agendar citas"}</span>
                                    <ArrowRight size={18} style={{ marginLeft: 8 }} />
                                </button>
                                <button
                                    type="button"
                                    className={styles.secondaryButton}
                                    onClick={resetearParaNuevaRecarga}
                                >
                                    <RotateCcw size={16} style={{ marginRight: 8 }} />
                                    Realizar otra recarga
                                </button>
                                <Link to="/perfilUsuario" className={styles.secondaryButton}>
                                    <User size={16} style={{ marginRight: 8 }} />
                                    Ver en mi perfil
                                </Link>
                            </div>
                        </div>
                    )}
                </main>
            </div>
        </>
    );
}

export default PaymentModule;
