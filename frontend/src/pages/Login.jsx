import { useLocation } from "react-router-dom";
import Brand from "../components/Brand/Brand.jsx";
import LoginForm from "../components/LoginForm/LoginForm.jsx";

function Login({ initialMode = "user" }) {
    const location = useLocation();
    return (
        <div>
            <Brand />
            <LoginForm key={`${location.pathname}:${initialMode}`} initialMode={initialMode} />
        </div>
    );
}

export default Login