import { CreditCard, Landmark, Smartphone } from "lucide-react";

export const metodosPago = [
    { id: "nequi", nombre: "Nequi", subtitulo: "Débito automático", icono: Smartphone, colorIcono: "#7800ff" },
    { id: "pse", nombre: "PSE", subtitulo: "Débito bancario", icono: Landmark, colorIcono: "#0056b3" },
    { id: "tarjeta", nombre: "Tarjeta débito / crédito", subtitulo: "Visa, Mastercard", icono: CreditCard, colorIcono: "#0284c7" },
    { id: "daviplata", nombre: "Daviplata", subtitulo: "Billetera digital", icono: Smartphone, colorIcono: "#ed1c24" },
];
