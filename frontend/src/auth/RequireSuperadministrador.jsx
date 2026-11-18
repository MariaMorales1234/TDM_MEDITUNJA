import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAdminAuth } from "./useAdminAuth.js";

function RequireSuperadministrador() {
    const { usuario, cargando } = useAdminAuth();
    const location = useLocation();

    if (cargando) return <p role="status">Validando acceso de administración general...</p>;
    if (usuario?.rol !== "superadministrador") {
        return <Navigate to="/superadmin/login" replace state={{ from: location }} />;
    }
    return <Outlet />;
}

export default RequireSuperadministrador;
