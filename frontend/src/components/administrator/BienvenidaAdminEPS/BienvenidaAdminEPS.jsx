import styles from "./BienvenidaAdminEPS.module.css";
import { useBienvenidaAdmin } from "./hooks/useBienvenidaAdmin.js";
import MetricasAdmin from "./MetricasAdmin.jsx";

function BienvenidaAdminEPS() {
  const { infoPanel, metricas, cargando, error } = useBienvenidaAdmin();

  return (
    <div className={styles.moduloBienvenidaAdmin}>
      <main className={styles.contenidoPrincipal}>
        <MetricasAdmin
          badge={infoPanel.badgeSeccion}
          titulo={infoPanel.tituloPrincipal}
          subtitulo={infoPanel.subtitulo}
          metricas={metricas}
          cargando={cargando}
          error={error}
        />
      </main>
    </div>
  );
}

export default BienvenidaAdminEPS;