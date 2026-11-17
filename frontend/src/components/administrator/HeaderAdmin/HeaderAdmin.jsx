import { Moon, Sun } from "lucide-react";
import { useAdminAuth } from "../../../auth/useAdminAuth.js";
import { useTheme } from "../../../context/ThemeContext.jsx";
import styles from "./HeaderAdmin.module.css";

function HeaderAdmin({ eps, nombreEps, rol = "Administrador EPS" } = {}) {
    const { usuario } = useAdminAuth();
    const { dark, toggle } = useTheme();
    const epsAdministrada = eps || nombreEps || usuario?.eps || "EPS";

    return (
        <header className={styles.header}>
            <div>
                <p className={styles.rol}>{rol}</p>
                <span className={styles.title}>{epsAdministrada}</span>
            </div>
            <button
                type="button"
                className={styles.btnTema}
                onClick={toggle}
                aria-label={dark ? "Activar modo claro" : "Activar modo oscuro"}
            >
                {dark ? <Sun size={20} /> : <Moon size={20} />}
            </button>
        </header>
    );
}

export default HeaderAdmin;