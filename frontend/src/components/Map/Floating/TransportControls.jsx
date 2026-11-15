import { useState } from "react";
import {
    TrainFront,
    Bus,
    MapPin,
    X,
    SlidersHorizontal,
    ChevronDown,
    ChevronUp,
    Check,
    Layers,
    RotateCcw,
} from "lucide-react";
import busData from "../Bus/bus_tunja.json";
import metroData from "../Metro/metro_tunja.json";
import styles from "../Map.module.css";

/**
 * Control flotante ultra-elegante y responsivo para el mapa de Tunja.
 * Diseñado con estilo cápsula glassmorphic flotante para desktop y móvil.
 */
export default function TransportControls({
    mostrarMetro,
    setMostrarMetro,
    lineasMetroActivas,
    setLineasMetroActivas,
    mostrarBuses,
    setMostrarBuses,
    rutaBusSeleccionada,
    setRutaBusSeleccionada,
    mostrarParaderos,
    setMostrarParaderos,
}) {
    const [detallesAbierto, setDetallesAbierto] = useState(false);
    const [pestanaActiva, setPestanaActiva] = useState(mostrarMetro ? "metro" : "buses");

    const tieneCapasActivas = mostrarMetro || mostrarBuses;

    const toggleMetro = () => {
        setMostrarMetro((prev) => {
            const nuevoEstado = !prev;
            if (nuevoEstado && !mostrarBuses) setPestanaActiva("metro");
            return nuevoEstado;
        });
    };

    const toggleBuses = () => {
        setMostrarBuses((prev) => {
            const nuevoEstado = !prev;
            if (nuevoEstado && !mostrarMetro) setPestanaActiva("buses");
            return nuevoEstado;
        });
    };

    const toggleLineaMetro = (idLinea) => {
        setLineasMetroActivas((prev) =>
            prev.includes(idLinea)
                ? prev.filter((id) => id !== idLinea)
                : [...prev, idLinea],
        );
    };

    const limpiarCapas = () => {
        setMostrarMetro(false);
        setMostrarBuses(false);
        setRutaBusSeleccionada("all");
        setMostrarParaderos(false);
        setDetallesAbierto(false);
    };

    const rutaActual =
        rutaBusSeleccionada && rutaBusSeleccionada !== "all"
            ? busData.routes.find((r) => r.id === rutaBusSeleccionada)
            : null;

    return (
        <aside
            className={styles.transportContainer}
            aria-label="Controles de rutas y movilidad"
        >
            {/* Barra cápsula flotante principal (siempre compacta, no tapa el mapa) */}
            <div className={styles.capsuleBar}>
                {/* BOTÓN METRO */}
                <button
                    type="button"
                    onClick={toggleMetro}
                    className={`${styles.capsulePill} ${
                        mostrarMetro ? styles.capsulePillActiveMetro : ""
                    }`}
                    aria-pressed={mostrarMetro}
                    title={mostrarMetro ? "Desactivar red de Metro" : "Activar red de Metro"}
                >
                    <TrainFront size={15} className={mostrarMetro ? styles.iconMetro : ""} />
                    <span className={styles.capsuleText}>Metro</span>
                    {mostrarMetro && (
                        <span className={styles.activeBadgeMetro}>
                            {lineasMetroActivas.length}/2
                        </span>
                    )}
                </button>

                {/* BOTÓN BUSES */}
                <button
                    type="button"
                    onClick={toggleBuses}
                    className={`${styles.capsulePill} ${
                        mostrarBuses ? styles.capsulePillActiveBus : ""
                    }`}
                    aria-pressed={mostrarBuses}
                    title={mostrarBuses ? "Desactivar rutas de bus" : "Activar rutas de bus"}
                >
                    <Bus size={15} className={mostrarBuses ? styles.iconBus : ""} />
                    <span className={styles.capsuleText}>
                        {rutaActual ? rutaActual.number : "Buses"}
                    </span>
                    {mostrarBuses && (
                        <span className={styles.activeBadgeBus}>
                            {rutaActual ? "1 ruta" : "26"}
                        </span>
                    )}
                </button>

                {/* BOTÓN FILTROS / DETALLES (Aparece cuando hay capas activas) */}
                {tieneCapasActivas && (
                    <button
                        type="button"
                        onClick={() => setDetallesAbierto((prev) => !prev)}
                        className={`${styles.capsulePill} ${styles.capsulePillFilter} ${
                            detallesAbierto ? styles.capsulePillFilterActive : ""
                        }`}
                        aria-expanded={detallesAbierto}
                        aria-label="Configurar rutas y opciones detalladas"
                        title="Opciones de rutas y paraderos"
                    >
                        <SlidersHorizontal size={14} />
                        <span className={styles.filterText}>Rutas</span>
                        {detallesAbierto ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                    </button>
                )}

                {/* BOTÓN LIMPIAR */}
                {tieneCapasActivas && (
                    <button
                        type="button"
                        onClick={limpiarCapas}
                        className={styles.capsuleBtnClear}
                        title="Ocultar todas las capas de transporte"
                        aria-label="Ocultar todas las rutas de transporte"
                    >
                        <X size={14} />
                    </button>
                )}
            </div>

            {/* PANEL DETALLADO FLOTANTE (Desplegable elegante, optimizado para móvil) */}
            {detallesAbierto && tieneCapasActivas && (
                <div
                    className={styles.detailCard}
                    role="dialog"
                    aria-label="Panel de opciones de transporte"
                >
                    {/* Asa visual de arrastre para dispositivos móviles */}
                    <div className={styles.mobileDragHandle} aria-hidden="true" />

                    {/* Cabecera del panel */}
                    <div className={styles.detailHeader}>
                        <div className={styles.detailTitleGroup}>
                            <Layers size={16} className={styles.iconPrimary} />
                            <h3>Opciones de Rutas</h3>
                        </div>
                        <button
                            type="button"
                            onClick={() => setDetallesAbierto(false)}
                            className={styles.detailCloseBtn}
                            aria-label="Cerrar opciones"
                        >
                            <X size={16} />
                        </button>
                    </div>

                    {/* Pestañas de selección rápida si ambas capas están activas */}
                    {mostrarMetro && mostrarBuses && (
                        <div className={styles.tabsContainer}>
                            <button
                                type="button"
                                className={`${styles.tabBtn} ${
                                    pestanaActiva === "metro" ? styles.tabBtnActiveMetro : ""
                                }`}
                                onClick={() => setPestanaActiva("metro")}
                            >
                                <TrainFront size={14} />
                                <span>Metro</span>
                            </button>
                            <button
                                type="button"
                                className={`${styles.tabBtn} ${
                                    pestanaActiva === "buses" ? styles.tabBtnActiveBus : ""
                                }`}
                                onClick={() => setPestanaActiva("buses")}
                            >
                                <Bus size={14} />
                                <span>Buses Urbanos</span>
                            </button>
                        </div>
                    )}

                    {/* Contenido scrolleable */}
                    <div className={styles.detailContent}>
                        {/* SECCIÓN METRO */}
                        {mostrarMetro && (!mostrarBuses || pestanaActiva === "metro") && (
                            <section className={styles.sectionGroup}>
                                <div className={styles.sectionLabel}>
                                    <span>Líneas del Metro de Tunja</span>
                                    <span className={styles.sectionCounter}>15 estaciones</span>
                                </div>
                                <div className={styles.metroLinesGrid}>
                                    {metroData.lineas.map((linea) => {
                                        const activa = lineasMetroActivas.includes(linea.id);
                                        return (
                                            <button
                                                key={linea.id}
                                                type="button"
                                                onClick={() => toggleLineaMetro(linea.id)}
                                                className={`${styles.metroLineCard} ${
                                                    activa ? styles.metroLineCardActive : ""
                                                }`}
                                                aria-pressed={activa}
                                            >
                                                <span
                                                    className={styles.metroLineColorBar}
                                                    style={{ backgroundColor: linea.color }}
                                                />
                                                <div className={styles.metroLineInfo}>
                                                    <span className={styles.metroLineTitle}>
                                                        {linea.nombre}
                                                    </span>
                                                    <span className={styles.metroLineMeta}>
                                                        {linea.estaciones.length} estaciones · ~
                                                        {linea.recorridoMin} min
                                                    </span>
                                                </div>
                                                <div
                                                    className={`${styles.customCheck} ${
                                                        activa ? styles.customCheckActive : ""
                                                    }`}
                                                    style={{
                                                        backgroundColor: activa
                                                            ? linea.color
                                                            : "transparent",
                                                        borderColor: activa
                                                            ? linea.color
                                                            : "var(--color-border)",
                                                    }}
                                                >
                                                    {activa && <Check size={11} color="#ffffff" />}
                                                </div>
                                            </button>
                                        );
                                    })}
                                </div>
                            </section>
                        )}

                        {/* SECCIÓN BUSES */}
                        {mostrarBuses && (!mostrarMetro || pestanaActiva === "buses") && (
                            <section className={styles.sectionGroup}>
                                <div className={styles.sectionLabel}>
                                    <span>Seleccionar ruta de bus</span>
                                    <span className={styles.sectionCounter}>26 rutas</span>
                                </div>

                                <div className={styles.selectWrapper}>
                                    <select
                                        value={rutaBusSeleccionada || "all"}
                                        onChange={(e) => setRutaBusSeleccionada(e.target.value)}
                                        className={styles.modernSelect}
                                        aria-label="Seleccionar ruta específica"
                                    >
                                        <option value="all">Todas las rutas urbanas (26)</option>
                                        {busData.routes.map((ruta) => (
                                            <option key={ruta.id} value={ruta.id}>
                                                {ruta.number} · {ruta.name} ({ruta.directions[0]?.direction || ""})
                                            </option>
                                        ))}
                                    </select>
                                    <ChevronDown size={14} className={styles.selectChevron} />
                                </div>

                                {/* Tarjeta de resumen de ruta seleccionada */}
                                {rutaActual && (
                                    <div
                                        className={styles.routeHighlightCard}
                                        style={{ borderLeftColor: rutaActual.color }}
                                    >
                                        <div className={styles.routeHighlightTop}>
                                            <span
                                                className={styles.routeNumberTag}
                                                style={{ backgroundColor: rutaActual.color }}
                                            >
                                                {rutaActual.number}
                                            </span>
                                            <strong>{rutaActual.name}</strong>
                                            <button
                                                type="button"
                                                onClick={() => setRutaBusSeleccionada("all")}
                                                className={styles.btnResetRoute}
                                                title="Mostrar todas las rutas"
                                            >
                                                <RotateCcw size={12} />
                                                <span>Ver todas</span>
                                            </button>
                                        </div>
                                        <p className={styles.routeDesc}>
                                            {rutaActual.directions[0]?.description || ""}
                                        </p>
                                        <div className={styles.routeFreqBar}>
                                            <span>⏱ Pico: {rutaActual.frequency?.peak}</span>
                                            <span>🕒 Valle: {rutaActual.frequency?.offPeak}</span>
                                        </div>
                                    </div>
                                )}

                                {/* Control de Paraderos */}
                                <div className={styles.stopsSwitchRow}>
                                    <div className={styles.stopsInfo}>
                                        <div className={styles.stopsTitle}>
                                            <MapPin size={14} />
                                            <span>Paraderos autorizados</span>
                                        </div>
                                        <span className={styles.stopsSubtitle}>
                                            {rutaActual
                                                ? `Paraderos de ${rutaActual.number}`
                                                : "Ver 146 paraderos en el mapa"}
                                        </span>
                                    </div>
                                    <button
                                        type="button"
                                        role="switch"
                                        aria-checked={mostrarParaderos}
                                        onClick={() => setMostrarParaderos((prev) => !prev)}
                                        className={`${styles.toggleSwitch} ${
                                            mostrarParaderos ? styles.toggleSwitchActive : ""
                                        }`}
                                    >
                                        <span className={styles.toggleThumb} />
                                    </button>
                                </div>
                            </section>
                        )}
                    </div>
                </div>
            )}
        </aside>
    );
}
