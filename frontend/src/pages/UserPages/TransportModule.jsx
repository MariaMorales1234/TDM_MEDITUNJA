import TransportePreferencial from "../../components/user/transport/TransportePreferencial.jsx";
import { useSearchParams } from "react-router-dom";

function TransportModule() {
    const [parametros] = useSearchParams();
    const cita = parametros.get("cita");
    return (
        <div>
            <TransportePreferencial key={cita} citaId={cita} />
        </div>
    );
}

export default TransportModule;
