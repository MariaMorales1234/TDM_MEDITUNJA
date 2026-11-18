import { useAdminAuth } from "../../../auth/useAdminAuth.js";
import ThemeToggle from "../../ThemeToggle/ThemeToggle.jsx";
import styles from "./HeaderAdmin.module.css";

function HeaderAdmin({ eps, nombreEps, rol = "Administrador EPS" } = {}) {
    const { usuario } = useAdminAuth();
    const epsAdministrada = eps || nombreEps || usuario?.eps || "EPS";

    return (
        <header className={styles.header}>
            <div>
                <p className={styles.rol}>{rol}</p>
                <span className={styles.title}>{epsAdministrada}</span>
            </div>
            <ThemeToggle className={styles.btnTema} />
        </header>
    );
}

export default HeaderAdmin;
