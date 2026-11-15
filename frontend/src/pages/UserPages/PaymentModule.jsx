import { Link } from "react-router-dom";
import NavbarUser from "../../components/user/NavbarUser/NavbarUser.jsx";
import styles from "./PaymentModule.module.css";

function PaymentModule() {
    return (
        <>
            <NavbarUser />
            <main className={styles.page}>
                <div className={styles.panel}>
                    <p className={styles.eyebrow}>MediTunja · Pagos</p>
                    <h1 className={styles.title}>Pagos de citas</h1>
                    <section className={styles.statusNotice} role="status" aria-labelledby="payment-unavailable-title">
                        <h2 className={styles.statusTitle} id="payment-unavailable-title">Pagos no disponibles</h2>
                        <p className={styles.statusText}>
                            No hay una pasarela de pago configurada. No se procesan cobros,
                            recargas ni pagos con tarjeta NFC; no se generará un comprobante
                            hasta que el proveedor confirme una transacción real.
                        </p>
                    </section>
                    <div className={styles.actions}>
                        <Link className={styles.backLink} to="/citas">Volver a mis citas</Link>
                    </div>
                </div>
            </main>
        </>
    );
}

export default PaymentModule;
