import { useEffect } from "react";
import L from "leaflet";
import busData from "./bus_tunja.json";

/**
 * Componente de capa para las rutas y paraderos de bus urbano en Tunja.
 * Permite visualizar todas las rutas o aislar una ruta específica,
 * e interactuar con los paraderos y frecuencias de paso.
 */
export default function BusComponent({
    map,
    visible = false,
    rutaSeleccionada = "all",
    mostrarParaderos = false,
    onSelectRuta,
    onSelectParadero,
}) {
    useEffect(() => {
        if (!map || !visible) return undefined;

        const capaBuses = L.layerGroup().addTo(map);

        // Rutas que se deben renderizar
        const esRutaUnica = rutaSeleccionada && rutaSeleccionada !== "all";
        const rutasParaRenderizar = esRutaUnica
            ? busData.routes.filter((r) => r.id === rutaSeleccionada)
            : busData.routes;

        const limitesRuta = L.latLngBounds([]);

        // 1. Trazado de las rutas de bus
        rutasParaRenderizar.forEach((ruta) => {
            const esSeleccionada = esRutaUnica && ruta.id === rutaSeleccionada;

            ruta.directions.forEach((sentido) => {
                if (!sentido.path || sentido.path.length < 2) return;

                if (esSeleccionada) {
                    sentido.path.forEach((punto) => limitesRuta.extend(punto));
                }

                // Casing blanco para ruta aislada
                if (esSeleccionada) {
                    L.polyline(sentido.path, {
                        color: "#ffffff",
                        weight: 7,
                        opacity: 0.95,
                        interactive: false,
                    }).addTo(capaBuses);
                }

                const trazoBus = L.polyline(sentido.path, {
                    color: ruta.color || "#3b82f6",
                    weight: esSeleccionada ? 4.5 : 3,
                    opacity: esSeleccionada ? 1 : 0.82,
                    lineCap: "round",
                    lineJoin: "round",
                    bubblingMouseEvents: false,
                }).addTo(capaBuses);

                const popupHtml = `
                    <div style="font-family: inherit; font-size: 13px; max-width: 250px;">
                        <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 6px;">
                            <span style="background: ${ruta.color}; color: #ffffff; padding: 2px 8px; border-radius: 4px; font-weight: bold; font-size: 12px;">${ruta.number}</span>
                            <strong style="font-size: 14px; color: #0f172a;">${ruta.name}</strong>
                        </div>
                        <p style="margin: 0 0 4px; color: #334155;"><strong>Sentido:</strong> ${sentido.direction}</p>
                        <p style="margin: 0 0 6px; color: #475569; font-size: 12px;">${sentido.description}</p>
                        <div style="background: #f1f5f9; padding: 6px 8px; border-radius: 6px; font-size: 11px; color: #475569;">
                            <div>⏱ <strong>Hora Pico:</strong> cada ${ruta.frequency?.peak || "N/A"}</div>
                            <div>🕒 <strong>Hora Valle:</strong> cada ${ruta.frequency?.offPeak || "N/A"}</div>
                        </div>
                    </div>
                `;

                trazoBus.bindPopup(popupHtml);
                trazoBus.bindTooltip(
                    `🚌 ${ruta.number}: ${ruta.name} (${sentido.direction})`,
                    { sticky: true },
                );

                trazoBus.on("mouseover", () => {
                    trazoBus.setStyle({
                        weight: esSeleccionada ? 6.5 : 5,
                        opacity: 1,
                    });
                });
                trazoBus.on("mouseout", () => {
                    trazoBus.setStyle({
                        weight: esSeleccionada ? 4.5 : 3,
                        opacity: esSeleccionada ? 1 : 0.82,
                    });
                });

                if (onSelectRuta) {
                    trazoBus.on("click", () => onSelectRuta(ruta.id));
                }
            });
        });

        // Si se selecciona una sola ruta, enfocar la vista en su recorrido
        if (esRutaUnica && limitesRuta.isValid()) {
            map.fitBounds(limitesRuta, {
                padding: [45, 45],
                maxZoom: 15,
                duration: 0.7,
            });
        }

        // 2. Marcadores de paraderos
        const debeMostrarParaderos = mostrarParaderos || esRutaUnica;

        if (debeMostrarParaderos && busData.stops) {
            const paraderosFiltrados = esRutaUnica
                ? busData.stops.filter((paradero) =>
                      paradero.routes?.includes(rutaSeleccionada),
                  )
                : busData.stops;

            paraderosFiltrados.forEach((paradero) => {
                if (!paradero.pos) return;

                const marcadorParadero = L.circleMarker(paradero.pos, {
                    radius: esRutaUnica ? 5.5 : 4,
                    fillColor: "#0284c7",
                    color: "#ffffff",
                    weight: 2,
                    fillOpacity: 1,
                    bubblingMouseEvents: false,
                }).addTo(capaBuses);

                marcadorParadero.bindTooltip(`🚏 ${paradero.name}`, {
                    direction: "top",
                    offset: [0, -4],
                });

                const popupHtml = `
                    <div style="font-family: inherit; font-size: 13px; max-width: 250px;">
                        <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 4px;">
                            <span style="font-size: 15px;">🚏</span>
                            <strong style="font-size: 14px; color: #0f172a;">${paradero.name}</strong>
                        </div>
                        <p style="margin: 0 0 6px; color: #64748b; font-size: 11px; text-transform: capitalize;">Categoría: ${paradero.category}</p>
                        <div style="margin-top: 6px; border-top: 1px solid #e2e8f0; padding-top: 6px;">
                            <span style="font-size: 11px; font-weight: bold; color: #475569; display: block; margin-bottom: 4px;">Rutas en este paradero (${paradero.routes?.length || 0}):</span>
                            <div style="display: flex; flex-wrap: wrap; gap: 4px; max-height: 90px; overflow-y: auto;">
                                ${(paradero.routes || [])
                                    .map(
                                        (rId) =>
                                            `<span style="background: #e2e8f0; color: #0f172a; padding: 2px 6px; border-radius: 4px; font-size: 10px; font-weight: 600;">${rId.toUpperCase()}</span>`,
                                    )
                                    .join("")}
                            </div>
                        </div>
                    </div>
                `;
                marcadorParadero.bindPopup(popupHtml);

                if (onSelectParadero) {
                    marcadorParadero.on("click", () =>
                        onSelectParadero(paradero),
                    );
                }
            });
        }

        return () => {
            capaBuses.remove();
        };
    }, [
        map,
        visible,
        rutaSeleccionada,
        mostrarParaderos,
        onSelectRuta,
        onSelectParadero,
    ]);

    return null;
}
