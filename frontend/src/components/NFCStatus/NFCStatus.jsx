import { Link } from "react-router-dom";
import { Nfc, Wallet } from "lucide-react";
import styles from "./NFCStatus.module.css";

const formatoPesos = new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
});

function obtenerIdentificador(tarjeta) {
    if (typeof tarjeta === "string") return tarjeta;
    return tarjeta?.identificador || tarjeta?.id || tarjeta?.uid || "4821";
}

function NfcStatus({ tarjeta, saldo }) {
    if (tarjeta) {
        const habilitada = tarjeta.habilitada !== false;
        const idCompleto = String(obtenerIdentificador(tarjeta));
        const idCorto = idCompleto.length > 4 ? idCompleto.slice(-4) : idCompleto;

        return (
            <section className={styles.container}>
                {/* Banner de Billetera / Tarjeta NFC con los estilos de la imagen */}
                <div className={styles.walletBanner}>
                    <div className={styles.walletColLeft}>
                        <p className={styles.walletLabel}>SALDO DISPONIBLE</p>
                        <p className={styles.walletAmount}>
                            {saldo !== null && saldo !== undefined
                                ? formatoPesos.format(saldo)
                                : "—"}
                        </p>
                    </div>
                    <div className={styles.walletColRight}>
                        <p className={styles.walletLabel}>TARJETA VINCULADA</p>
                        <p className={styles.walletCardNumber}>
                            •••• {idCorto || "4821"}
                        </p>
                    </div>
                </div>

                <div className={styles.actionsBar}>
                    <Link
                        to="/pagos"
                        className={styles.rechargeButton}
                    >
                        <Wallet size={16} />
                        <span>Recargar saldo</span>
                    </Link>
                    <Link
                        to="/vinculacionNFC"
                        state={{ origen: "/perfilUsuario" }}
                        className={styles.manageButton}
                    >
                        <span>Administrar tarjeta</span>
                    </Link>
                </div>

                <p className={styles.statusBadge} role="status">
                    {habilitada ? "Tarjeta vinculada y activa" : "Tarjeta vinculada, pendiente de habilitación"}
                </p>
            </section>
        );
    }

    return (
        <section>
            <div className={`${styles.nfcCard} ${styles.nfcUnlinked}`}>
                <span className={styles.nfcIcon}>
                    <Nfc size={28} />
                </span>
                <div className={styles.nfcContent}>
                    <p className={styles.nfcDescription}>
                        Aún no tienes una tarjeta física asociada a tu cuenta. Vincúlala para
                        asociarla a tu perfil. Podrás iniciar sesión con ella cuando esté activa
                        y asociada a tu cuenta en TunjaAPI. Vincularla no realiza pagos físicos.
                    </p>
                    <Link
                        to="/vinculacionNFC"
                        state={{ origen: "/perfilUsuario" }}
                        className={styles.nfcButton}
                    >
                        Vincular tarjeta NFC
                    </Link>
                </div>
            </div>
        </section>
    );
}

export default NfcStatus;
