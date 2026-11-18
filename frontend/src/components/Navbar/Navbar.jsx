import logo from "../../assets/logo-192.png";
import { Link } from "react-router-dom";
import ThemeToggle from "../ThemeToggle/ThemeToggle.jsx";
import styles from "./Navbar.module.css";

function Navbar () {
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
                <ThemeToggle className={styles.themeBtn} />
                <Link to="/login" className={styles.loginBtn}>Ingresar</Link>
            </div>
        </nav>
    );
}

export default Navbar;
