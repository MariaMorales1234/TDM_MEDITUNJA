// Componente Principal del Módulo de Convenios
// MediTunja - Gestión Administrativa y Convenios de Salud en Tunja
// Código estructurado en HTML semántico dentro de JSX con CSS Modules

import styles from "./Convenios.module.css";
import { useConvenios } from "./hooks/useConvenios";
import FormularioConvenio from "./FormularioConvenio";
import ListaConvenios from "./ListaConvenios";

function Convenios() {
  const {
    convenios,
    epsId,
    epsDisponibles,
    handleCambiarEps,
    epsActual,
    ipsId,
    handleCambiarIps,
    ipsActual,
    ipsDisponibles,
    portafolios,
    categorias,
    portafolioId,
    setPortafolioId,
    categoriaFiltro,
    setCategoriaFiltro,
    serviciosSeleccionados,
    serviciosFiltrados,
    clausulaTransporte,
    setClausulaTransporte,
    notificacion,
    cargando,
    handleToggleServicio,
    handleSeleccionarTodosCategoria,
    handleDeseleccionarCategoria,
    handleRestablecer,
    handleSubmit,
    handleEliminarConvenio
  } = useConvenios();

  return (
    <div className={styles.moduloConvenios}>
      <div className={styles.contenedorPrincipal}>
        {/* Cabecera del Módulo */}
        <header className={styles.cabeceraConvenios}>
          <h1 className={styles.tituloCabecera}>
            Gestión de Convenios Institucionales EPS - IPS
          </h1>
          <p className={styles.subtituloCabecera}>
            Formalización, alcance de servicios de salud autorizados y garantías de transporte preferencial adaptado en la red de Tunja.
          </p>
        </header>

        {/* Mensaje de notificación */}
        {notificacion && (
          <div className={styles.alertaNotificacion} role="alert">
            {notificacion}
          </div>
        )}
        {cargando && <p role="status">Cargando convenios...</p>}

        {/* Formulario de formalización de convenio */}
        {ipsActual && <FormularioConvenio
          epsId={epsId}
          epsCatalogo={epsDisponibles}
          setEpsId={handleCambiarEps}
          epsActual={epsActual}
          ipsId={ipsId}
          setIpsId={handleCambiarIps}
          ipsActual={ipsActual}
          ipsDisponibles={ipsDisponibles}
          portafolios={portafolios}
          categorias={categorias}
          portafolioId={portafolioId}
          setPortafolioId={setPortafolioId}
          categoriaFiltro={categoriaFiltro}
          setCategoriaFiltro={setCategoriaFiltro}
          serviciosSeleccionados={serviciosSeleccionados}
          serviciosFiltrados={serviciosFiltrados}
          clausulaTransporte={clausulaTransporte}
          setClausulaTransporte={setClausulaTransporte}
          onToggleServicio={handleToggleServicio}
          onSeleccionarTodosCategoria={handleSeleccionarTodosCategoria}
          onDeseleccionarCategoria={handleDeseleccionarCategoria}
          onRestablecer={handleRestablecer}
          onSubmit={handleSubmit}
        />}

        {/* Listado de convenios vigentes */}
        <ListaConvenios
          convenios={convenios}
          onEliminarConvenio={handleEliminarConvenio}
        />
      </div>
    </div>
  );
}

export default Convenios;
