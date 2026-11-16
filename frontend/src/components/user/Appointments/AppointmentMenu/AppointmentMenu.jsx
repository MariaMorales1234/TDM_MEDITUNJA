import { useEffect, useState } from "react";
import { NavLink } from "react-router-dom";
import { useAuth } from "../../../../auth/useAuth.js";
import { apiRequest, mensajeError } from "../../../../auth/api.js";
import styles from "./AppointmentMenu.module.css";

function AppointmentMenu() {
    const { sesion } = useAuth();
    const [cantidadCitas, setCantidadCitas] = useState(null);
    const [error, setError] = useState("");

    useEffect(() => {
        let activa = true;

        async function cargarCantidadCitas() {
            if (!sesion?.accessToken) {
                setCantidadCitas(null);
                setError("");
                return;
            }

            setCantidadCitas(null);
            setError("");
            try {
                const respuesta = await apiRequest("/citas", {
                    headers: { Authorization: `Bearer ${sesion.accessToken}` },
                });
                if (!Array.isArray(respuesta.data)) {
                    throw new Error("El servidor devolvió una lista de citas no válida.");
                }
                if (activa) setCantidadCitas(respuesta.data.length);
            } catch (errorSolicitud) {
                if (activa) {
                    setCantidadCitas(null);
                    setError(mensajeError(errorSolicitud));
                }
            }
        }

        cargarCantidadCitas();
        window.addEventListener("citas-actualizadas", cargarCantidadCitas);
        return () => {
            activa = false;
            window.removeEventListener("citas-actualizadas", cargarCantidadCitas);
        };
    }, [sesion?.accessToken]);

    return (
        <nav className={styles.menu}>

            <NavLink
                to="/citas"
                className={({ isActive }) =>
                    `${styles.menuButton} ${isActive ? styles.active : ""}`
                }
            >
                Agendar nueva cita
            </NavLink>

            <NavLink
                to="/mis-citas"
                className={({ isActive }) =>
                    `${styles.menuButton} ${isActive ? styles.active : ""}`
                }
            >
                Mis citas

                {cantidadCitas > 0 && (
                    <span className={styles.badge}>
                        {cantidadCitas}
                    </span>
                )}
            </NavLink>

            {error && <span role="alert">{error}</span>}
        </nav>
    );
}

export default AppointmentMenu;