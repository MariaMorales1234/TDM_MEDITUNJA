import { useEffect } from "react";
import L from "leaflet";
import metroData from "../Metro/metro_tunja.json";

/**
 * Componente de capa para la red de Metro de Tunja en Leaflet.
 * Renderiza las líneas principales, estaciones normales y de intercambio,
 * y muestra popups detallados con información de salidas y vías.
 */
export default function MetroComponent({
    map,
    visible = false,
    lineasActivas = ["l1", "l2"],
    onSelectEstacion,
}) {
    useEffect(() => {
        if (!map || !visible) return undefined;

        const capaMetro = L.layerGroup().addTo(map);

        // Mapeo de estaciones a las líneas a las que pertenecen
        const estacionesPorLinea = {};
        metroData.lineas.forEach((linea) => {
            if (!lineasActivas.includes(linea.id)) return;
            linea.estaciones.forEach((estId) => {
                if (!estacionesPorLinea[estId]) estacionesPorLinea[estId] = [];
                estacionesPorLinea[estId].push(linea);
            });
        });

        // 1. Trazado de líneas de Metro
        metroData.lineas.forEach((linea) => {
            if (!lineasActivas.includes(linea.id)) return;

            const puntosLinea = linea.estaciones
                .map((estId) => metroData.estaciones[estId]?.pos)
                .filter(Boolean);

            if (puntosLinea.length < 2) return;

            // Borde / fondo blanco para que resalte sobre el mapa
            L.polyline(puntosLinea, {
                color: "#ffffff",
                weight: 7,
                opacity: 0.9,
                lineCap: "round",
                lineJoin: "round",
                interactive: false,
            }).addTo(capaMetro);

            // Línea con color representativo
            const trazoPrincipal = L.polyline(puntosLinea, {
                color: linea.color,
                weight: 4.5,
                opacity: 0.95,
                lineCap: "round",
                lineJoin: "round",
                bubblingMouseEvents: false,
            }).addTo(capaMetro);

            const popupLinea = `
                <div style="font-family: inherit; font-size: 13px; min-width: 190px;">
                    <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 6px;">
                        <span style="display: inline-block; width: 12px; height: 12px; border-radius: 50%; background: ${linea.color};"></span>
                        <strong style="font-size: 14px; color: #1e293b;">${linea.nombre}</strong>
                    </div>
                    <p style="margin: 0 0 4px; color: #475569;">⏱ <strong>Recorrido:</strong> ~${linea.recorridoMin} min</p>
                    <p style="margin: 0 0 4px; color: #475569;">🚇 <strong>Estaciones:</strong> ${linea.estaciones.length}</p>
                    <p style="margin: 0; color: #64748b; font-size: 11px;">Trenes sugeridos: ${linea.trenesSugeridos}</p>
                </div>
            `;
            trazoPrincipal.bindPopup(popupLinea);
            trazoPrincipal.bindTooltip(`🚇 ${linea.nombre}`, { sticky: true });
        });

        // 2. Marcadores de estaciones
        Object.entries(estacionesPorLinea).forEach(([estId, lineasDeEstacion]) => {
            const estacion = metroData.estaciones[estId];
            if (!estacion || !estacion.pos) return;

            const esIntercambio = lineasDeEstacion.length > 1;
            const colorPrimario = lineasDeEstacion[0]?.color || "#ef6c2f";

            const marcador = L.circleMarker(estacion.pos, {
                radius: esIntercambio ? 8 : 6,
                fillColor: "#ffffff",
                color: esIntercambio ? "#0f172a" : colorPrimario,
                weight: esIntercambio ? 3.5 : 2.5,
                fillOpacity: 1,
                bubblingMouseEvents: false,
            }).addTo(capaMetro);

            marcador.bindTooltip(`🚇 Estación ${estacion.nombre}`, {
                direction: "top",
                offset: [0, -6],
            });

            const salidasHtml =
                estacion.salidas && estacion.salidas.length > 0
                    ? `
                    <div style="margin-top: 6px; padding-top: 6px; border-top: 1px solid #e2e8f0;">
                        <span style="font-size: 11px; color: #64748b; font-weight: bold;">Salidas:</span>
                        <ul style="margin: 4px 0 0 16px; padding: 0; font-size: 11px; color: #475569;">
                            ${estacion.salidas
                                .map(
                                    (s) =>
                                        `<li><strong>${s.nombre}:</strong> ${s.hacia}</li>`,
                                )
                                .join("")}
                        </ul>
                    </div>
                `
                    : "";

            const viasHtml =
                estacion.vias && estacion.vias.length > 0
                    ? `<p style="margin: 6px 0 2px; color: #475569; font-size: 11px;"><strong>Vías conectadas:</strong> ${estacion.vias.join(", ")}</p>`
                    : "";

            const popupHtml = `
                <div style="font-family: inherit; font-size: 13px; max-width: 260px;">
                    <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 4px;">
                        <span style="font-size: 16px;">🚇</span>
                        <strong style="font-size: 14px; color: #0f172a;">Estación ${estacion.nombre}</strong>
                    </div>
                    ${
                        esIntercambio
                            ? `<span style="display:inline-block; margin-bottom:6px; background:#e0e7ff; color:#3730a3; padding:2px 6px; border-radius:4px; font-size:10px; font-weight:bold;">ESTACIÓN DE INTERCAMBIO</span>`
                            : ""
                    }
                    <div style="margin: 6px 0;">
                        <span style="font-size: 11px; color: #64748b; font-weight: bold; display: block; margin-bottom: 4px;">LÍNEAS:</span>
                        <div style="display: flex; flex-wrap: wrap; gap: 4px;">
                            ${lineasDeEstacion
                                .map(
                                    (l) =>
                                        `<span style="background: ${l.color}; color: #ffffff; padding: 2px 7px; border-radius: 4px; font-size: 11px; font-weight: 600;">${l.nombre}</span>`,
                                )
                                .join("")}
                        </div>
                    </div>
                    ${viasHtml}
                    ${salidasHtml}
                </div>
            `;
            marcador.bindPopup(popupHtml);

            if (onSelectEstacion) {
                marcador.on("click", () => onSelectEstacion(estacion));
            }
        });

        return () => {
            capaMetro.remove();
        };
    }, [map, visible, lineasActivas, onSelectEstacion]);

    return null;
}
