import metroData from "../../../frontend/src/components/Map/Metro/metro_tunja.json" with { type: "json" };
import busData from "../../../frontend/src/components/Map/Bus/bus_tunja.json" with { type: "json" };

/**
 * Calcula la distancia ortodrómica en metros entre dos coordenadas (fórmula de Haversine).
 */
export function calcularDistanciaMetros(lat1, lon1, lat2, lon2) {
    const R = 6371000; // Radio de la Tierra en metros
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * (Math.PI / 180)) *
            Math.cos(lat2 * (Math.PI / 180)) *
            Math.sin(dLon / 2) *
            Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return Math.round(R * c);
}

/**
 * Servicio del backend que determina las opciones de transporte más cercanas a unas coordenadas dadas.
 * @param {{ lat: number, lng: number }} coordenadas
 */
export function obtenerTransporteCercano({ lat, lng }) {
    if (typeof lat !== "number" || typeof lng !== "number" || isNaN(lat) || isNaN(lng)) {
        return null;
    }

    // 1. Estación de Metro más cercana
    let estacionCercana = null;
    let menorDistMetro = Infinity;

    Object.entries(metroData.estaciones).forEach(([id, est]) => {
        if (!est.pos) return;
        const dist = calcularDistanciaMetros(lat, lng, est.pos[0], est.pos[1]);
        if (dist < menorDistMetro) {
            menorDistMetro = dist;
            const lineas = metroData.lineas
                .filter((l) => l.estaciones.includes(id))
                .map((l) => ({
                    id: l.id,
                    nombre: l.nombre,
                    color: l.color,
                    recorridoMin: l.recorridoMin,
                }));

            estacionCercana = {
                id,
                nombre: est.nombre,
                pos: est.pos,
                distanciaMetros: dist,
                tiempoCaminandoMin: Math.max(1, Math.round(dist / 75)), // ~4.5 km/h a pie
                lineas,
            };
        }
    });

    // 2. Paraderos de bus ordenados por distancia
    const paraderosOrdenados = busData.stops
        .map((st) => ({
            name: st.name,
            pos: st.pos,
            category: st.category,
            routes: st.routes || [],
            distanciaMetros: calcularDistanciaMetros(lat, lng, st.pos[0], st.pos[1]),
        }))
        .sort((a, b) => a.distanciaMetros - b.distanciaMetros);

    const paraderoPrincipal = paraderosOrdenados[0] || null;

    // Rutas directas del paradero principal
    const rutasDirectasSet = new Set(paraderoPrincipal?.routes || []);

    // Rutas en paraderos cercanos adicionales (hasta 250m)
    const rutasAdicionalesSet = new Set();
    paraderosOrdenados.slice(1, 5).forEach((p) => {
        if (p.distanciaMetros <= 250) {
            p.routes.forEach((rId) => {
                if (!rutasDirectasSet.has(rId)) {
                    rutasAdicionalesSet.add(rId);
                }
            });
        }
    });

    const mapearRuta = (rId, esDirecta = true) => {
        const ruta = busData.routes.find((r) => r.id === rId);
        if (!ruta) return null;
        return {
            id: ruta.id,
            number: ruta.number,
            name: ruta.name,
            color: ruta.color || "#3b82f6",
            direction: ruta.directions[0]?.direction || "",
            description: ruta.directions[0]?.description || "",
            frequency: ruta.frequency,
            esDirecta,
        };
    };

    const ordenarRutas = (a, b) => {
        const numA = parseInt(a.number.replace(/\D/g, ""), 10) || 0;
        const numB = parseInt(b.number.replace(/\D/g, ""), 10) || 0;
        return numA - numB;
    };

    const rutasDirectas = [...rutasDirectasSet]
        .map((rId) => mapearRuta(rId, true))
        .filter(Boolean)
        .sort(ordenarRutas);

    const rutasCercanas = [...rutasAdicionalesSet]
        .map((rId) => mapearRuta(rId, false))
        .filter(Boolean)
        .sort(ordenarRutas);

    return {
        metro: estacionCercana,
        buses: {
            paraderoPrincipal,
            rutasDirectas,
            rutasCercanas,
            todasRutas: [...rutasDirectas, ...rutasCercanas],
        },
    };
}
