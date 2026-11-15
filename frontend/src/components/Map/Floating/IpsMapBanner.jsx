import { useMemo } from "react";
import { TrainFront, X, RotateCcw } from "lucide-react";
import { obtenerTransporteCercano } from "../../../../../backend/src/services/transportProximity.js";
import styles from "../Map.module.css";

/**
 * Banner flotante interactivo en la parte inferior del mapa cuando una IPS está seleccionada.
 * Permite visualizar y seleccionar directamente sobre el mapa las rutas más cercanas.
 */
export default function IpsMapBanner({
    ips,
    mostrarMetro,
    setMostrarMetro,
    setLineasMetroActivas,
    mostrarBuses,
    setMostrarBuses,
    rutaBusSeleccionada,
    setRutaBusSeleccionada,
    onCerrar,
}) {
    const transporte = useMemo(() => obtenerTransporteCercano(ips), [ips]);

    if (!ips || !transporte) return null;

    const { metro, buses } = transporte;

    const activarMetro = (lineaId) => {
        setMostrarMetro(true);
        if (lineaId) {
            setLineasMetroActivas((prev) =>
                prev.includes(lineaId) ? prev : [...prev, lineaId],
            );
        }
    };

    const alternarRuta = (rutaId) => {
        setMostrarBuses(true);
        if (rutaBusSeleccionada === rutaId) {
            setRutaBusSeleccionada("all");
        } else {
            setRutaBusSeleccionada(rutaId);
        }
    };

    // Tomar las primeras 6 rutas más cercanas para mantener el banner compacto
    const rutasPrincipales = buses?.todasRutas?.slice(0, 6) || [];

    return (
        <div
            className={styles.ipsMapBanner}
            role="region"
            aria-label={`Rutas de transporte para llegar a ${ips.nombre}`}
        >
            {/* Info IPS */}
            <div className={styles.bannerIpsInfo}>
                <span className={styles.bannerIpsBadge}>🏥</span>
                <div className={styles.bannerIpsText}>
                    <strong className={styles.bannerIpsName}>{ips.nombre}</strong>
                    <span className={styles.bannerIpsPrompt}>Rutas más cercanas:</span>
                </div>
            </div>

            <div className={styles.bannerRoutesScroller}>
                {/* Botón rápido de Metro */}
                {metro && (
                    <button
                        type="button"
                        onClick={() => activarMetro(metro.lineas[0]?.id)}
                        className={`${styles.bannerMetroPill} ${
                            mostrarMetro ? styles.bannerMetroPillActive : ""
                        }`}
                        title={`Metro: Estación ${metro.nombre} (${metro.distanciaMetros} m a pie)`}
                    >
                        <TrainFront size={13} />
                        <span>
                            {metro.nombre} ({metro.distanciaMetros}m)
                        </span>
                    </button>
                )}

                {/* Separador sutil */}
                <span className={styles.bannerDivider} aria-hidden="true" />

                {/* Chips rápidos de Buses */}
                <div className={styles.bannerBusChipsGroup}>
                    {rutasPrincipales.map((ruta) => {
                        const activa = mostrarBuses && rutaBusSeleccionada === ruta.id;
                        return (
                            <button
                                key={ruta.id}
                                type="button"
                                onClick={() => alternarRuta(ruta.id)}
                                className={`${styles.bannerBusPill} ${
                                    activa ? styles.bannerBusPillActive : ""
                                }`}
                                style={{
                                    borderColor: activa ? ruta.color : "transparent",
                                    backgroundColor: activa ? ruta.color : "#ffffff",
                                    color: activa ? "#ffffff" : "var(--color-text)",
                                }}
                                title={`Trazar ${ruta.number}: ${ruta.name}`}
                            >
                                {!activa && (
                                    <span
                                        className={styles.bannerDot}
                                        style={{ backgroundColor: ruta.color }}
                                    />
                                )}
                                <span>{ruta.number}</span>
                            </button>
                        );
                    })}

                    {mostrarBuses && rutaBusSeleccionada !== "all" && (
                        <button
                            type="button"
                            onClick={() => setRutaBusSeleccionada("all")}
                            className={styles.bannerResetBtn}
                            title="Ver todas las rutas"
                        >
                            <RotateCcw size={11} />
                        </button>
                    )}
                </div>
            </div>

            {/* Botón cerrar */}
            {onCerrar && (
                <button
                    type="button"
                    onClick={onCerrar}
                    className={styles.bannerCloseBtn}
                    aria-label="Cerrar barra de transporte"
                >
                    <X size={14} />
                </button>
            )}
        </div>
    );
}
