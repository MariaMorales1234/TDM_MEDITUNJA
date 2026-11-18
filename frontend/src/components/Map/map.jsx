import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { TrainFront, Bus } from "lucide-react";
import styles from "./Map.module.css";
import {
    MetroComponent,
    BusComponent,
    TransportControls,
    IpsTransportCard,
    IpsMapBanner,
} from ".";

const TUNJA = [5.548, -73.35];

const ubicacionesIps = [
    {
        id: "san-rafael",
        nombre: "Hospital Universitario San Rafael de Tunja - Sede Principal",
        direccion: "Carrera 11 # 27-27",
        lat: 5.540422,
        lng: -73.361261,
    },
    {
        id: "san-rafael-av-colon",
        nombre: "Hospital Universitario San Rafael de Tunja - Sede Edificio Colón",
        direccion: "Av. Colon, 27-87",
        lat: 5.5398737,
        lng: -73.3598501,
    },
    {
        id: "materno-infantil-san-rafael",
        nombre: "Hospital Universitario San Rafael - Sede Unidad Materno Infantil Maria Josefa Canelones",
        direccion: "Av. Universitaria No. 51-60",
        lat: 5.556623, 
        lng: -73.344725,
    },
    {
        id: "santiago-tunja",
        nombre: "E.S.E. Santiago de Tunja",
        direccion: "Calle 16 N.° 9-41",
        lat: 5.528524,
        lng: -73.362395,
    },
    {
        id: "clinica-medilaser",
        nombre: "Clínica Medilaser",
        direccion: "Carrera 2 Este # 67b-90",
        lat: 5.569604,
        lng: -73.33682,
    },
    {
        id: "clinica-andes",
        nombre: "Clínica Los Andes",
        direccion: "Transversal 11 # 30-61",
        lat: 5.5439915,
        lng: -73.359711,
    },
    {
        id: "clinica-chia",
        nombre: "Clínica de Chía S.A.",
        direccion: "Carrera 1A # 46-08",
        lat: 5.551633,
        lng: -73.346677,
    },
    {
        id: "cm-colsubsidio",
        nombre: "Centro Médico Colsubsidio",
        direccion: "Diagonal 38 #12-192",
        lat: 5.549552,
        lng: -73.360060,
    },
    {
        id: "cm-sanitas",
        nombre: "Centro Médico Sanitas",
        direccion: "Diagonal 38 # 12-160",
        lat: 5.549351,
        lng: -73.359981,
    },
    {
        id: "cm-sura",
        nombre: "Centro Médico Sura",
        direccion: "Cra. 6 # 44-22",
        lat: 5.553052,
        lng: -73.3522317,
    },
    {
        id: "sireb",
        nombre: "SIREB - Servicios Integrales de Rehabilitación en Boyacá",
        direccion: "Cra. 11 #28-84",
        lat: 5.542475,
        lng: -73.360650,
    },
    {
        id: "nueva-eps-1",
        nombre: "Nueva EPS - Sede Pozo Donato",
        direccion: "Cra 7 #44-57",
        lat: 5.553828,
        lng: -73.352013,
    },
    {
        id: "nueva-eps-2",
        nombre: "Nueva EPS - Sede Centro Histórico",
        direccion: "Carrera 9 #24-93",
        lat: 5.537177,
        lng: -73.359672,
    },
];

function MapaTunja({
    lugares,
    seleccionada,
    ubicacionUsuario,
    onSeleccionar,
    onClicMapa,
    mostrarMetro,
    lineasMetroActivas,
    mostrarBuses,
    rutaBusSeleccionada,
    mostrarParaderos,
    onSelectRuta,
}) {
    const contenedor = useRef(null);
    const mapa = useRef(null);
    const [instanciaMapa, setInstanciaMapa] = useState(null);

    useEffect(() => {
        const instancia = L.map(contenedor.current, {
            minZoom: 11,
            maxZoom: 18,
            scrollWheelZoom: true,
            attributionControl: false,
        }).setView(TUNJA, 13);

        L.tileLayer(
            "https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}",
            {
                maxZoom: 20,
                attribution:
                    'Tiles &copy; <a href="https://www.esri.com/">Esri</a>; Sources: Esri, HERE, Garmin, USGS, Intermap, INCREMENT P, NRCan, Esri Japan, METI, Esri China (Hong Kong), Esri Korea, Esri (Thailand), NGCC, &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap contributors</a>, and the GIS User Community',
            },
        ).addTo(instancia);

        mapa.current = instancia;
        setInstanciaMapa(instancia);

        return () => {
            instancia.remove();
            mapa.current = null;
            setInstanciaMapa(null);
        };
    }, []);

    useEffect(() => {
        const instancia = mapa.current;
        if (!instancia) return undefined;

        const capa = L.layerGroup().addTo(instancia);
        lugares.forEach((lugar) => {
            L.circleMarker([lugar.lat, lugar.lng], {
                radius: seleccionada?.id === lugar.id ? 11 : 8,
                color: "#ffffff",
                weight: 3,
                fillColor: "#6045f4",
                fillOpacity: 1,
                bubblingMouseEvents: false,
            })
                .bindTooltip(lugar.nombre)
                .on("click", () => onSeleccionar(lugar))
                .addTo(capa);
        });

        return () => capa.remove();
    }, [lugares, onSeleccionar, seleccionada]);

    useEffect(() => {
        const instancia = mapa.current;
        if (!instancia || !ubicacionUsuario) return undefined;

        const { lat, lng, accuracy } = ubicacionUsuario;
        const capa = L.layerGroup().addTo(instancia);
        L.circle([lat, lng], {
            radius: accuracy,
            color: "#26fff0",
            weight: 1,
            fillColor: "#000f54",
            fillOpacity: 0.12,
            interactive: false,
        }).addTo(capa);
        L.circleMarker([lat, lng], {
            radius: 8,
            color: "#ffffff",
            weight: 3,
            fillColor: "#70ff9e",
            fillOpacity: 1,
            bubblingMouseEvents: false,
        })
            .bindTooltip("Mi ubicación")
            .addTo(capa);

        instancia.panTo([lat, lng], { animate: false });
        return () => capa.remove();
    }, [ubicacionUsuario]);

    useEffect(() => {
        if (seleccionada && mapa.current) {
            mapa.current.flyTo([seleccionada.lat, seleccionada.lng], 16, {
                duration: 0.6,
            });
        }
    }, [seleccionada]);

    useEffect(() => {
        const instancia = mapa.current;
        if (!instancia) return undefined;

        const handleClick = (evento) => onClicMapa(evento.latlng);
        instancia.on("click", handleClick);
        return () => instancia.off("click", handleClick);
    }, [onClicMapa]);

    return (
        <div ref={contenedor} className={styles.map} aria-label="Mapa interactivo de Tunja">
            {instanciaMapa && (
                <>
                    <MetroComponent
                        map={instanciaMapa}
                        visible={mostrarMetro}
                        lineasActivas={lineasMetroActivas}
                    />
                    <BusComponent
                        map={instanciaMapa}
                        visible={mostrarBuses}
                        rutaSeleccionada={rutaBusSeleccionada}
                        mostrarParaderos={mostrarParaderos}
                        onSelectRuta={onSelectRuta}
                    />
                </>
            )}
        </div>
    );
}

function Map() {
    const [busqueda, setBusqueda] = useState("");
    const [seleccionada, setSeleccionada] = useState(null);
    const [coordenadaSeleccionada, setCoordenadaSeleccionada] = useState(null);
    const [ubicacionUsuario, setUbicacionUsuario] = useState(null);
    const [siguiendoUbicacion, setSiguiendoUbicacion] = useState(false);
    const [errorUbicacion, setErrorUbicacion] = useState("");
    const seguimientoRef = useRef(null);

    // Estados para las capas de transporte (Metro y Bus)
    const [mostrarMetro, setMostrarMetro] = useState(false);
    const [lineasMetroActivas, setLineasMetroActivas] = useState(["l1", "l2"]);
    const [mostrarBuses, setMostrarBuses] = useState(false);
    const [rutaBusSeleccionada, setRutaBusSeleccionada] = useState("all");
    const [mostrarParaderos, setMostrarParaderos] = useState(false);

    const ipsVisibles = useMemo(() => {
        const termino = busqueda.trim().toLocaleLowerCase("es");
        if (!termino) return ubicacionesIps;
        return ubicacionesIps.filter((ips) =>
            `${ips.nombre} ${ips.direccion}`.toLocaleLowerCase("es").includes(termino),
        );
    }, [busqueda]);

    const seleccionarIps = useCallback((ips) => {
        setSeleccionada(ips);
        setCoordenadaSeleccionada(null);
    }, []);

    const seleccionarCoordenada = useCallback((coordenada) => {
        setCoordenadaSeleccionada(coordenada);
    }, []);

    const detenerSeguimiento = useCallback(() => {
        if (seguimientoRef.current !== null) {
            navigator.geolocation.clearWatch(seguimientoRef.current);
            seguimientoRef.current = null;
        }
        setSiguiendoUbicacion(false);
    }, []);

    const alternarSeguimiento = useCallback(() => {
        if (siguiendoUbicacion) {
            detenerSeguimiento();
            return;
        }

        if (!navigator.geolocation) {
            setErrorUbicacion("Este navegador no permite consultar la ubicación.");
            return;
        }

        setErrorUbicacion("");
        try {
            seguimientoRef.current = navigator.geolocation.watchPosition(
                (posicion) => {
                    setUbicacionUsuario({
                        lat: posicion.coords.latitude,
                        lng: posicion.coords.longitude,
                        accuracy: posicion.coords.accuracy,
                    });
                    setErrorUbicacion("");
                },
                (error) => {
                    const mensajes = {
                        1: "Permite el acceso a la ubicación en tu navegador para verla en el mapa.",
                        2: "No fue posible determinar tu ubicación. Inténtalo de nuevo.",
                        3: "La consulta de ubicación tardó demasiado. Inténtalo de nuevo.",
                    };
                    setErrorUbicacion(
                        mensajes[error.code] ?? "No se pudo obtener tu ubicación.",
                    );
                    detenerSeguimiento();
                },
                {
                    enableHighAccuracy: true,
                    maximumAge: 5000,
                    timeout: 15000,
                },
            );
            setSiguiendoUbicacion(true);
        } catch (error) {
            setErrorUbicacion(
                error instanceof Error
                    ? `No se pudo activar la ubicación: ${error.message}`
                    : "No se pudo activar la ubicación.",
            );
        }
    }, [detenerSeguimiento, siguiendoUbicacion]);

    useEffect(() => () => {
        if (seguimientoRef.current !== null && navigator.geolocation) {
            navigator.geolocation.clearWatch(seguimientoRef.current);
        }
    }, []);

    return (
        <main>
            <section className={styles.mapSection} aria-label="Mapa de IPS en Tunja">
                <aside className={styles.sidebar}>
                    <label htmlFor="buscar-ips">Buscar una IPS</label>
                    <input
                        id="buscar-ips"
                        type="search"
                        value={busqueda}
                        onChange={(event) => setBusqueda(event.target.value)}
                        placeholder="Nombre o dirección"
                    />
                    <p className={styles.resultsCount}>
                        {ipsVisibles.length} {ipsVisibles.length === 1 ? "institución" : "instituciones"}
                    </p>

                    {ipsVisibles.length ? (
                        <ul className={styles.locationList}>
                            {ipsVisibles.map((ips) => (
                                <li key={ips.id}>
                                    <button
                                        type="button"
                                        className={
                                            seleccionada?.id === ips.id
                                                ? `${styles.locationButton} ${styles.selectedLocation}`
                                                : styles.locationButton
                                        }
                                        onClick={() => seleccionarIps(ips)}
                                        aria-pressed={seleccionada?.id === ips.id}
                                    >
                                        <strong>{ips.nombre}</strong>
                                        <span>{ips.direccion}</span>
                                    </button>
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <p role="status">No hay IPS que coincidan con la búsqueda.</p>
                    )}

                    <button
                        type="button"
                        className={`${styles.myUbication} ${styles.locationControl}`}
                        onClick={alternarSeguimiento}
                        aria-pressed={siguiendoUbicacion}
                    >
                        {siguiendoUbicacion ? "Detener seguimiento" : "Usar mi ubicación"}
                    </button>
                    {errorUbicacion && (
                        <p className={styles.locationMessage} role="alert">
                            {errorUbicacion}
                        </p>
                    )}
                    {siguiendoUbicacion && ubicacionUsuario && (
                        <p className={styles.locationMessage} role="status">
                            Ubicación en tiempo real activa (precisión aproximada:{" "}
                            {Math.round(ubicacionUsuario.accuracy)} m).
                        </p>
                    )}

                    {/* Si hay una IPS seleccionada, mostrar la tarjeta interactiva de transporte cercano */}
                    {seleccionada ? (
                        <IpsTransportCard
                            ips={seleccionada}
                            mostrarMetro={mostrarMetro}
                            setMostrarMetro={setMostrarMetro}
                            lineasMetroActivas={lineasMetroActivas}
                            setLineasMetroActivas={setLineasMetroActivas}
                            mostrarBuses={mostrarBuses}
                            setMostrarBuses={setMostrarBuses}
                            rutaBusSeleccionada={rutaBusSeleccionada}
                            setRutaBusSeleccionada={setRutaBusSeleccionada}
                            onCerrar={() => setSeleccionada(null)}
                        />
                    ) : (
                        /* Tarjeta de estado y accesos rápidos de Transporte general */
                        <div className={styles.transportSidebarCard}>
                            <h4>
                                <TrainFront size={16} className={styles.iconPrimary} /> Movilidad Tunja
                            </h4>
                            <p>
                                Selecciona una IPS para consultar sus rutas de metro y bus más cercanas.
                            </p>
                            <div className={styles.transportSidebarBadges}>
                                <button
                                    type="button"
                                    className={`${styles.transportMiniBadge} ${
                                        mostrarMetro ? styles.transportMiniBadgeActiveMetro : ""
                                    }`}
                                    onClick={() => setMostrarMetro((prev) => !prev)}
                                    aria-pressed={mostrarMetro}
                                >
                                    <TrainFront size={13} />
                                    <span>Metro: {mostrarMetro ? "Activo" : "Inactivo"}</span>
                                </button>
                                <button
                                    type="button"
                                    className={`${styles.transportMiniBadge} ${
                                        mostrarBuses ? styles.transportMiniBadgeActiveBus : ""
                                    }`}
                                    onClick={() => setMostrarBuses((prev) => !prev)}
                                    aria-pressed={mostrarBuses}
                                >
                                    <Bus size={13} />
                                    <span>Buses: {mostrarBuses ? "Activo" : "Inactivo"}</span>
                                </button>
                            </div>
                        </div>
                    )}
                </aside>

                <div className={styles.mapColumn}>
                    <div className={styles.mapFrame}>
                        <MapaTunja
                            lugares={ipsVisibles}
                            seleccionada={seleccionada}
                            ubicacionUsuario={ubicacionUsuario}
                            onSeleccionar={seleccionarIps}
                            onClicMapa={seleccionarCoordenada}
                            mostrarMetro={mostrarMetro}
                            lineasMetroActivas={lineasMetroActivas}
                            mostrarBuses={mostrarBuses}
                            rutaBusSeleccionada={rutaBusSeleccionada}
                            mostrarParaderos={mostrarParaderos}
                            onSelectRuta={setRutaBusSeleccionada}
                        />

                        {/* Botones flotantes interactivos tipo cápsula en el mapa */}
                        <TransportControls
                            mostrarMetro={mostrarMetro}
                            setMostrarMetro={setMostrarMetro}
                            lineasMetroActivas={lineasMetroActivas}
                            setLineasMetroActivas={setLineasMetroActivas}
                            mostrarBuses={mostrarBuses}
                            setMostrarBuses={setMostrarBuses}
                            rutaBusSeleccionada={rutaBusSeleccionada}
                            setRutaBusSeleccionada={setRutaBusSeleccionada}
                            mostrarParaderos={mostrarParaderos}
                            setMostrarParaderos={setMostrarParaderos}
                        />

                        {/* Banner flotante en el mapa para la IPS seleccionada */}
                        {seleccionada && (
                            <IpsMapBanner
                                ips={seleccionada}
                                mostrarMetro={mostrarMetro}
                                setMostrarMetro={setMostrarMetro}
                                setLineasMetroActivas={setLineasMetroActivas}
                                mostrarBuses={mostrarBuses}
                                setMostrarBuses={setMostrarBuses}
                                rutaBusSeleccionada={rutaBusSeleccionada}
                                setRutaBusSeleccionada={setRutaBusSeleccionada}
                                onCerrar={() => setSeleccionada(null)}
                            />
                        )}
                    </div>
                    <p className={styles.mapCredits}>
                        Tiles © <a href="https://www.esri.com/">Esri</a>; Sources: Esri, HERE,
                        Garmin, USGS, Intermap, INCREMENT P, NRCan, Esri Japan, METI, Esri
                        China (Hong Kong), Esri Korea, Esri (Thailand), NGCC, ©{" "}
                        <a href="https://www.openstreetmap.org/copyright">
                            OpenStreetMap contributors
                        </a>
                        , and the GIS User Community.
                    </p>
                </div>
            </section>
            {coordenadaSeleccionada && (
                <p className={styles.mapStatus} role="status">
                    Ubicación seleccionada: {coordenadaSeleccionada.lat.toFixed(5)},{" "}
                    {coordenadaSeleccionada.lng.toFixed(5)}
                </p>
            )}
        </main>
    );
}

export default Map;
