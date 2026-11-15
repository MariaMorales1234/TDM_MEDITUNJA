import { CalendarPlus, MapPin, FileText, CarFront } from "lucide-react";
import styles from "./Services.module.css";

const servicios = [
    {
        id: "citas",
        icon: CalendarPlus,
        colorVariant: "purple",
        title: "Agenda y consulta citas",
        description: "Reserva atención con especialistas y administra tus próximas citas."
    },
    {
        id: "ips",
        icon: MapPin,
        colorVariant: "cyan",
        title: "Encuentra tu IPS",
        description: "Ubica la sede más cercana y consulta sus servicios disponibles."
    },
    {
        id: "resultados",
        icon: FileText,
        colorVariant: "purple",
        title: "Consulta resultados",
        description: "Accede de forma segura a tus exámenes e informes clínicos."
    },
    {
        id: "transporte",
        icon: CarFront,
        colorVariant: "cyan",
        title: "Transporte preferencial",
        description: "Solicita transporte accesible para llegar a tu cita médica."
    }
];

function Services() {
    return (
        <section id="Services" className={styles.servicesSection}>
            <div className={styles.container}>
                <span className={styles.eyebrow}>Nuestros Servicios</span>
                <h2 className={styles.title}>Tu salud más simple y cercana</h2>

                <div className={styles.grid}>
                    {servicios.map((servicio) => {
                        const Icon = servicio.icon;
                        const isPurple = servicio.colorVariant === "purple";

                        return (
                            <article key={servicio.id} className={styles.card}>
                                <div
                                    className={`${styles.iconWrapper} ${
                                        isPurple ? styles.iconPurple : styles.iconCyan
                                    }`}
                                >
                                    <Icon size={24} strokeWidth={2.2} />
                                </div>
                                <h3 className={styles.cardTitle}>{servicio.title}</h3>
                                <p className={styles.cardDescription}>{servicio.description}</p>
                            </article>
                        );
                    })}
                </div>
            </div>
        </section>
    );
}

export default Services;
