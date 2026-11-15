import { useMemo } from "react";
import {
    TrainFront,
    Bus,
    MapPin,
    Check,
    RotateCcw,
    X,
    ChevronRight,
} from "lucide-react";
import { obtenerTransporteCercano } from "../../../services/transportService.js";
import styles from "../Map.module.css";

/**
 * Tarjeta interactiva que calcula, muestra y permite seleccionar
 * las rutas de metro y de bus más cercanas a una IPS seleccionada.
 */
export default function IpsTransportCard({
    ips,
    mostrarMetro,
    setMostrarMetro,
    lineasMetroActivas,
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

    const activarMetroParaIps = (lineaId) => {
        setMostrarMetro(true);
        if (lineaId) {
            setLineasMetroActivas((prev) =>
                prev.includes(lineaId) ? prev : [...prev, lineaId],
            );
        }
    };

    const alternarRutaBus = (rutaId) => {
        setMostrarBuses(true);
        if (rutaBusSeleccionada === rutaId) {
            setRutaBusSeleccionada("all");
        } else {
            setRutaBusSeleccionada(rutaId);
        }
    };

    return (
        <div
            className={styles.ipsTransportPanel}
            role="region"
            aria-label={`Transporte cercano a ${ips.nombre}`}
        >
            {/* Cabecera de la IPS */}
            <div className={styles.ipsTransportHeader}>
                <div className={styles.ipsTitleGroup}>
                    <span className={styles.ipsBadgeIcon}>🏥</span>
                    <div>
                        <h3 className={styles.ipsNameText}>{ips.nombre}</h3>
                        <p className={styles.ipsAddressText}>{ips.direccion}</p>
                    </div>
                </div>
                {onCerrar && (
                    <button
                        type="button"
                        onClick={onCerrar}
                        className={styles.ipsCloseBtn}
                        title="Cerrar detalles de transporte"
                        aria-label="Cerrar"
                    >
                        <X size={15} />
                    </button>
                )}
            </div>

            {/* SECCIÓN METRO MÁS CERCANO */}
            {metro && (
                <div className={styles.transportProximitySection}>
                    <div className={styles.proximitySectionHeader}>
                        <div className={styles.proximityIconLabel}>
                            <TrainFront size={15} className={styles.iconMetro} />
                            <span>Metro más cercano</span>
                        </div>
                        <span className={styles.proximityDistanceTag}>
                            a {metro.distanciaMetros} m (~{metro.tiempoCaminandoMin} min a pie)
                        </span>
                    </div>

                    <div className={styles.metroStationBox}>
                        <div className={styles.metroStationNameRow}>
                            <strong className={styles.metroStationName}>
                                Estación {metro.nombre}
                            </strong>
                        </div>

                        {/* Líneas que pasan por esta estación */}
                        <div className={styles.metroLinesActionList}>
                            {metro.lineas.map((linea) => {
                                const estaActiva =
                                    mostrarMetro && lineasMetroActivas.includes(linea.id);
                                return (
                                    <button
                                        key={linea.id}
                                        type="button"
                                        onClick={() => activarMetroParaIps(linea.id)}
                                        className={`${styles.metroLineActionBtn} ${
                                            estaActiva ? styles.metroLineActionBtnActive : ""
                                        }`}
                                        style={{
                                            borderLeftColor: linea.color,
                                        }}
                                        aria-pressed={estaActiva}
                                        title={`Trazar ${linea.nombre} en el mapa`}
                                    >
                                        <div className={styles.lineInfoInner}>
                                            <span
                                                className={styles.linePillDot}
                                                style={{ backgroundColor: linea.color }}
                                            />
                                            <span className={styles.lineNameLabel}>
                                                {linea.nombre}
                                            </span>
                                        </div>
                                        <span className={styles.btnActionIndicator}>
                                            {estaActiva ? (
                                                <span className={styles.tagActiva}>
                                                    <Check size={11} /> Activa
                                                </span>
                                            ) : (
                                                <span className={styles.tagTrazar}>
                                                    Trazar <ChevronRight size={12} />
                                                </span>
                                            )}
                                        </span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </div>
            )}

            {/* SECCIÓN BUSES Y PARADEROS MÁS CERCANOS */}
            {buses && (
                <div className={styles.transportProximitySection}>
                    <div className={styles.proximitySectionHeader}>
                        <div className={styles.proximityIconLabel}>
                            <Bus size={15} className={styles.iconBus} />
                            <span>Rutas de Bus cercanas</span>
                        </div>
                        {buses.paraderoPrincipal && (
                            <span className={styles.proximityDistanceTag}>
                                a {buses.paraderoPrincipal.distanciaMetros} m
                            </span>
                        )}
                    </div>

                    {buses.paraderoPrincipal && (
                        <div className={styles.busStopInfoRow}>
                            <MapPin size={13} className={styles.iconStop} />
                            <span className={styles.busStopName}>
                                Paradero: <strong>{buses.paraderoPrincipal.name}</strong>
                            </span>
                        </div>
                    )}

                    {/* Chips de selección de rutas de bus */}
                    <div className={styles.routesListWrapper}>
                        <span className={styles.routesListPrompt}>
                            Selecciona una ruta para ver su recorrido hacia la IPS:
                        </span>

                        <div className={styles.routesPillsGrid}>
                            {buses.todasRutas.map((ruta) => {
                                const esSeleccionada =
                                    mostrarBuses && rutaBusSeleccionada === ruta.id;
                                return (
                                    <button
                                        key={ruta.id}
                                        type="button"
                                        onClick={() => alternarRutaBus(ruta.id)}
                                        className={`${styles.routeProximityPill} ${
                                            esSeleccionada
                                                ? styles.routeProximityPillActive
                                                : ""
                                        }`}
                                        style={{
                                            borderColor: esSeleccionada
                                                ? ruta.color
                                                : "var(--color-border)",
                                            backgroundColor: esSeleccionada
                                                ? `${ruta.color}18`
                                                : "var(--color-bg)",
                                        }}
                                        aria-pressed={esSeleccionada}
                                        title={`${ruta.number}: ${ruta.name} - ${ruta.description}`}
                                    >
                                        <span
                                            className={styles.routePillColorBadge}
                                            style={{ backgroundColor: ruta.color }}
                                        />
                                        <span className={styles.routePillNumber}>
                                            {ruta.number}
                                        </span>
                                        {esSeleccionada && (
                                            <Check size={11} color={ruta.color} />
                                        )}
                                    </button>
                                );
                            })}
                        </div>

                        {/* Si hay una ruta seleccionada, mostrar botón de reinicio a todas */}
                        {mostrarBuses && rutaBusSeleccionada !== "all" && (
                            <div className={styles.routeResetRow}>
                                <button
                                    type="button"
                                    onClick={() => setRutaBusSeleccionada("all")}
                                    className={styles.btnResetAllRoutes}
                                >
                                    <RotateCcw size={12} />
                                    <span>Mostrar todas las rutas activas</span>
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
