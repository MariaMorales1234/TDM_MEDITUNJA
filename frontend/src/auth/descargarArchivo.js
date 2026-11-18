import { apiBaseUrl } from "./api.js";

export async function descargarArchivo(ruta, token, nombre) {
    const respuesta = await fetch(`${apiBaseUrl}${ruta}`, {
        headers: { Authorization: `Bearer ${token}` },
    });
    if (!respuesta.ok) throw new Error("No fue posible descargar el archivo.");
    const url = URL.createObjectURL(await respuesta.blob());
    const enlace = document.createElement("a");
    enlace.href = url;
    enlace.download = nombre;
    document.body.append(enlace);
    enlace.click();
    enlace.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
