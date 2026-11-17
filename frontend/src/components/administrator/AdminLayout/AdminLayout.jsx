import { Outlet } from "react-router-dom";
import NavbarAdminEPS from "../NavbarAdminEPS/NavbarAdminEPS.jsx";
import HeaderAdmin from "../HeaderAdmin/HeaderAdmin.jsx"; // ajusta si tu carpeta se llama distinto
import styles from "./AdminLayout.module.css";

const handleAyuda = () => {
    window.alert(
        "Centro de Ayuda MediTunja - Administrador EPS\n\nSi necesitas soporte técnico o asistencia en la plataforma, comunícate con la mesa de ayuda de MediTunja."
    );
};

function AdminLayout() {
    return (
        <div className={styles.container}>
            <NavbarAdminEPS />
            <div className={styles.main}>
                <HeaderAdmin />
                <Outlet />
            </div>
            <button
                type="button"
                className={styles.btnAyudaFlotante}
                onClick={handleAyuda}
                aria-label="Abrir ayuda de la plataforma"
                title="Ayuda y Soporte"
            >
                ?
            </button>
        </div>
    );
}

export default AdminLayout;