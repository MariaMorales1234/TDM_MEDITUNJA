import { Link } from "react-router-dom";
import styles from "./Red.module.css";

function Red() {
    return (
        <section id="Red" className={styles.heroContainer}>
            <div className={styles.heroContent}>
                <div className={styles.leftColumn}>
                    <span className={styles.badge}>Salud conectada en Tunja</span>
                    <h1 className={styles.title}>
                        Todos tus servicios<br />
                        de salud, en un solo<br />
                        lugar.
                    </h1>
                    <p className={styles.description}>
                        Conecta con tu EPS e IPS, agenda citas, consulta resultados,
                        solicita transporte y paga con tu tarjeta NFC.
                    </p>

                    <div className={styles.buttonGroup}>
                        <Link to="/login" className={styles.primaryBtn}>
                            Ingresar a MediTunja
                        </Link>
                        <a href="#Catalog" className={styles.secondaryBtn}>
                            Conocer servicios
                        </a>
                    </div>

                    <div className={styles.trustPoints}>
                        <span className={styles.trustItem}>
                            <span className={styles.dotGreen} aria-hidden="true"></span>
                            Información protegida
                        </span>
                        <span className={styles.trustItem}>
                            <span className={styles.dotCyan} aria-hidden="true"></span>
                            Atención conectada
                        </span>
                    </div>
                </div>

                <div className={styles.rightColumn}>
                    <div className={styles.backdropCard}>
                        <div className={styles.darkCard}>
                            <div className={styles.cardHeader}>
                                <h3 className={styles.cardBrand}>MediTunja</h3>
                                <span className={styles.statusPill}>Red activa</span>
                            </div>
                            <p className={styles.cardSubtitle}>
                                Encuentra tus servicios de salud aquí
                            </p>

                            <div className={styles.gridEntities}>
                                <div className={styles.epsBox}>
                                    <h4 className={styles.boxTitle}>EPS</h4>
                                    <ul className={styles.entityList}>
                                        <li className={styles.entityItem}>Nueva EPS</li>
                                        <li className={styles.entityItem}>Famisanar EPS</li>
                                        <li className={styles.entityItem}>EPS Sanitas</li>
                                        <li className={styles.entityItem}>EPS Sura</li>
                                        <li className={styles.entityItem}>Salud Total</li>
                                    </ul>
                                </div>

                                <div className={styles.ipsBox}>
                                    <h4 className={styles.boxTitle}>IPS</h4>
                                    <ul className={styles.entityList}>
                                        <li className={styles.entityItem}>Hospital Universitario San Rafael de Tunja - Sede Principal</li>
                                        <li className={styles.entityItem}>E.S.E. Santiago de Tunja</li>
                                        <li className={styles.entityItem}>Clínica Medilaser</li>
                                        <li className={styles.entityItem}>Clínica Los Andes</li>
                                        <li className={styles.entityItem}>Clínica de Chía S.A.</li>
                                    </ul>
                                </div>
                            </div>

                            <div className={styles.nfcBox}>
                                <span className={styles.nfcEyebrow}>Acceso sin contacto</span>
                                <p className={styles.nfcText}>
                                    Ingresa y paga con tu tarjeta en un solo toque.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}

export default Red;
