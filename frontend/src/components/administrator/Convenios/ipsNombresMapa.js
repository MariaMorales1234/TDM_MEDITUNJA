const nombresIpsMapa = {
  "san-rafael": "Hospital Universitario San Rafael de Tunja - Sede Principal",
  "san-rafael-colon": "Hospital Universitario San Rafael de Tunja - Sede Edificio Colón",
  "san-rafael-materno": "Hospital Universitario San Rafael - Sede Unidad Materno Infantil Maria Josefa Canelones",
  "ese-san-antonio": "E.S.E. Santiago de Tunja",
  medilaser: "Clínica Medilaser",
  "los-andes": "Clínica Los Andes",
  "clinica-chia": "Clínica de Chía S.A.",
  "centro-colsubsidio": "Centro Médico Colsubsidio",
  "centro-sanitas": "Centro Médico Sanitas",
  "centro-sura": "Centro Médico Sura",
  sireb: "SIREB - Servicios Integrales de Rehabilitación en Boyacá",
  "nueva-eps-pozo": "Nueva EPS - Sede Pozo Donato",
  "nueva-eps-centro": "Nueva EPS - Sede Centro Histórico"
};

export function nombreIpsComoEnMapa(ips) {
  return nombresIpsMapa[ips?.id] || [ips?.nombre, ips?.sede].filter(Boolean).join(" - ");
}
