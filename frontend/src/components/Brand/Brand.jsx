import { Link } from "react-router-dom";
import Logo from "../../assets/logo-192.png";
import styles from "./Brand.module.css";

function Brand() {
    return (
        <div className={styles.brandBar}>
            <div className={styles.brand}>
                <img src={Logo} alt="Logo MediTunja" />
                <span>
                    <Link to="/" className={styles.name} aria-label="landing page">
                        MediTunja
                    </Link>
                </span>
            </div>
        </div>
    );
}

export default Brand;