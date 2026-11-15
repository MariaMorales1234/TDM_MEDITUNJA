import { useState } from "react";
import { Link } from "react-router-dom";
import { RotateCw } from "lucide-react";
import tarjetaFrente from "../../assets/tarjeta_frente.png";
import tarjetaDetras from "../../assets/tarjeta_detras.png";
import styles from "./nfc.module.css";

function Nfc() {
    const [isFlipped, setIsFlipped] = useState(false);

    const toggleFlip = () => {
        setIsFlipped((prev) => !prev);
    };

    const handleKeyDown = (event) => {
        if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            toggleFlip();
        }
    };

    return (
        <section id="NFC" className={styles.nfcSection} aria-label="Tarjeta MediTunja NFC">
            <div className={styles.container}>
                <div className={styles.cardStageWrapper}>
                    <div className={styles.cardStage}>
                        <div
                            className={styles.cardPerspective}
                            onClick={toggleFlip}
                            onKeyDown={handleKeyDown}
                            role="button"
                            tabIndex={0}
                            aria-label={
                                isFlipped
                                    ? "Tarjeta MediTunja NFC (reverso visible). Haz clic para voltear al frente."
                                    : "Tarjeta MediTunja NFC (frente visible). Haz clic para voltear al reverso."
                            }
                            title="Haz clic para voltear la tarjeta"
                        >
                            <div className={`${styles.cardInner} ${isFlipped ? styles.flipped : ""}`}>
                                <div className={styles.cardFront}>
                                    <img
                                        src={tarjetaFrente}
                                        alt="Frente de la Tarjeta MediTunja NFC - Credencial de Paciente"
                                        loading="lazy"
                                    />
                                </div>
                                <div className={styles.cardBack}>
                                    <img
                                        src={tarjetaDetras}
                                        alt="Reverso de la Tarjeta MediTunja NFC - Chip y recomendaciones de uso"
                                        loading="lazy"
                                    />
                                </div>
                            </div>
                        </div>

                        <button
                            type="button"
                            className={styles.flipButton}
                            onClick={toggleFlip}
                            aria-label="Girar tarjeta MediTunja NFC"
                        >
                            <RotateCw size={14} className={styles.flipIcon} aria-hidden="true" />
                            <span>{isFlipped ? "Ver frente de la tarjeta" : "Girar para ver reverso"}</span>
                        </button>
                    </div>
                </div>

                {/* Columna Derecha: Información y llamada a la acción */}
                <div className={styles.infoColumn}>
                    <span className={styles.eyebrow}>Tarjeta MediTunja</span>
                    <h2 className={styles.title}>
                        Un toque para acceder,<br />
                        pagar y recargar.
                    </h2>
                    <p className={styles.description}>
                        Vincula tu tarjeta NFC, administra tu saldo y úsala en toda la red MediTunja.
                    </p>
                    <Link to="/login" className={styles.ctaButton}>
                        Comenzar ahora
                    </Link>
                </div>
            </div>
        </section>
    );
}

export default Nfc;
