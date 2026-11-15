import logo from "../../../assets/logo-192.png";
import { NavLink, Link } from "react-router-dom";
import { House, CalendarDays, MapPin, FileText, UserRound, Wallet, Moon, Sun } from "lucide-react";
import { useAuth } from "../../../auth/useAuth.js";
import { useTheme } from "../../../context/ThemeContext.jsx";
import styles from "./NavbarUser.module.css";

function NavbarUser() {
    const { sesion } = useAuth();
    const { dark, toggle } = useTheme();
    const afiliacionAprobada = sesion?.usuario?.estado_afiliacion === "aprobado";

    return (
        <nav className={styles.navbar}>
            <div className={styles.logo}>
                <img src={logo} alt="Logo de MediTunja" />
                <span>
                    <Link to="/home" className={styles.name} aria-label="landing page">
                        MediTunja
                    </Link>
                </span>
            </div>
            <ul className={styles.links}>
                {afiliacionAprobada && (
                    <>
                        <li>
                            <NavLink to="/home" aria-current="page" className={({ isActive }) => isActive ? styles.active : styles.link}><House className={styles.mobileIcon} size={22} />Inicio</NavLink>
                        </li>
                        <li>
                            <NavLink to="/citas" className={({ isActive }) => isActive ? styles.active : styles.link}><CalendarDays className={styles.mobileIcon} size={22} />Agendar citas</NavLink>
                        </li>
                        <li>
                            <NavLink to="/mapa" className={({ isActive }) => isActive ? styles.active : styles.link}><MapPin className={styles.mobileIcon} size={22} />Mapa</NavLink>
                        </li>
                        <li>
                            <NavLink to="/resultados-procedimientos" className={({ isActive }) => isActive ? styles.active : styles.link}><FileText className={styles.mobileIcon} size={22} />Resultados</NavLink>
                        </li>
                        <li>
                            <NavLink to="/recargar-saldo" className={({ isActive }) => isActive ? styles.active : styles.link}><Wallet className={styles.mobileIcon} size={22} />Recargar saldo</NavLink>
                        </li>
                    </>
                )}
                <li>
                    <NavLink to="/perfilUsuario" className={({ isActive }) => isActive ? styles.active : styles.link}><UserRound className={styles.mobileIcon} size={22} />Perfil</NavLink>
                </li>
            </ul>
            <button
                className={styles.themeBtn}
                onClick={toggle}
                aria-label={dark ? "Activar modo claro" : "Activar modo oscuro"}
                title={dark ? "Modo claro" : "Modo oscuro"}
            >
                {dark ? <Sun size={18} /> : <Moon size={18} />}
            </button>
        </nav>
    );
}

export default NavbarUser;
