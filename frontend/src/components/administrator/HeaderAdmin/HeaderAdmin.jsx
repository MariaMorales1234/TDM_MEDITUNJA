import { useAdminAuth } from "../../../auth/useAdminAuth.js";
import styles from "./HeaderAdmin.module.css";

function HeaderAdmin({ eps, nombreEps, rol = "Administrador" } = {}) {
    const { usuario } = useAdminAuth();
    const epsAdministrada = eps || nombreEps || usuario?.eps || "EPS";

    return (
        <header className={styles.header}>
            <h5 className={styles.rol}>{rol}</h5>
            <span className={styles.title}>{epsAdministrada}</span>
        </header>
    );
}

export default HeaderAdmin;