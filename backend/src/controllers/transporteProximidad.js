import { obtenerTransporteCercano } from "../services/transportProximity.js";

/**
 * Controlador para consultar el transporte público más cercano a unas coordenadas (lat, lng).
 * Endpoint: GET /api/transporte/proximidad?lat=...&lng=...
 */
export function consultarProximidadTransporte(req, res) {
    const lat = parseFloat(req.query.lat);
    const lng = parseFloat(req.query.lng);

    if (isNaN(lat) || isNaN(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
        return res.status(400).json({
            ok: false,
            error: "coordenadas_invalidas",
            mensaje: "Proporciona parámetros de latitud y longitud numéricos válidos.",
        });
    }

    try {
        const resultado = obtenerTransporteCercano({ lat, lng });
        if (!resultado) {
            return res.status(404).json({
                ok: false,
                error: "no_encontrado",
                mensaje: "No se encontraron rutas de transporte cercanas a estas coordenadas.",
            });
        }

        return res.status(200).json({
            ok: true,
            data: resultado,
        });
    } catch (error) {
        console.error("Error al calcular proximidad de transporte:", error);
        return res.status(500).json({
            ok: false,
            error: "error_interno",
            mensaje: "Ocurrió un error al calcular el transporte cercano.",
        });
    }
}
