// Ventana modal de confirmación accesible para retirar adaptaciones recomendadas
// MediTunja - Transporte Preferencial

function ModalConfirmacion({ isOpen, reqTitulo, onConfirm, onCancel }) {
  if (!isOpen) return null;

  return (
    <div 
      className="modal-overlay" 
      role="dialog" 
      aria-modal="true" 
      aria-labelledby="modal-titulo"
      aria-describedby="modal-descripcion"
    >
      <div className="modal-contenido">
        <h3 id="modal-titulo" className="modal-titulo">
          ¿Quitar esta adaptación?
        </h3>
        
        <p id="modal-descripcion" className="modal-descripcion">
          Si quitas <strong>{reqTitulo}</strong>, la solicitud se enviará sin esta adaptación.
        </p>

        <div className="modal-acciones">
          <button 
            type="button" 
            className="btn-modal-cancelar"
            onClick={onCancel}
            autoFocus
          >
            Mantener adaptación
          </button>
          <button 
            type="button" 
            className="btn-modal-confirmar"
            onClick={onConfirm}
          >
            Quitar adaptación
          </button>
        </div>
      </div>
    </div>
  );
}

export default ModalConfirmacion;
