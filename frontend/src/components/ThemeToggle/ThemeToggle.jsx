import { Moon, Sun } from "lucide-react";
import { useTheme } from "../../context/ThemeContext.jsx";

export default function ThemeToggle({ className, floating = false, showLabel = false }) {
    const { dark, toggle } = useTheme();
    const label = dark ? "Activar modo claro" : "Activar modo oscuro";
    const Icon = dark ? Sun : Moon;

    return (
        <button type="button" className={className} onClick={toggle}
            aria-label={label} title={label} data-theme-toggle={floating ? "floating" : "inline"}>
            <Icon size={20} aria-hidden="true" />
            {showLabel && <span>{label}</span>}
        </button>
    );
}
