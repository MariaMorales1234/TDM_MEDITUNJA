import logo from "../../assets/logo-192.png";
import { Link } from "react-router-dom";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "../../context/ThemeContext.jsx";
import styles from "./Navbar.module.css";

function Navbar () {
    const { dark, toggle } = useTheme();

    return (
        <nav className={styles.navbar}>
            <div className={styles.logo}>
                <img src={logo} alt="Logo de MediTunja" />
                <span>MediTunja</span>
            </div>
            <ul className={styles.links}>
                <li><a href="#Red" className={styles.link}>Nuestra Red</a></li>
                <li><a href="#Services" className={styles.link}>Servicios</a></li>
                <li><a href="#NFC" className={styles.link}>Tarjeta NFC</a></li>
            </ul>
            <div className={styles.actions}>
                <button
                    className={styles.themeBtn}
                    onClick={toggle}
                    aria-label={dark ? "Activar modo claro" : "Activar modo oscuro"}
                    title={dark ? "Modo claro" : "Modo oscuro"}
                >
                    {dark ? <Sun size={18} /> : <Moon size={18} />}
                </button>
                <Link to="/login" className={styles.loginBtn}>Ingresar</Link>
            </div>
        </nav>
    );
}

export default Navbar;
