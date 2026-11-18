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

const direccionesIpsMapa = {
  "san-rafael": "Carrera 11 # 27-27",
  "san-rafael-colon": "Av. Colon, # 27-87",
  "san-rafael-materno": "Av. Universitaria # 51-60",
  "ese-san-antonio": "Calle 16 # 9-41",
  medilaser: "Carrera 2 Este # 67b-90",
  "los-andes": "Transversal 11 # 30-61",
  "clinica-chia": "Carrera 1A # 46-08",
  "centro-colsubsidio": "Diagonal 38 # 12-192",
  "centro-sanitas": "Diagonal 38 # 12-160",
  "centro-sura": "Cra. 6 # 44-22",
  sireb: "Cra. 11 # 28-84",
  "nueva-eps-pozo": "Cra 7 # 44-57",
  "nueva-eps-centro": "Carrera 9 # 24-93"
};

export function nombreIpsComoEnMapa(ips) {
  return nombresIpsMapa[ips?.id] || [ips?.nombre, ips?.sede].filter(Boolean).join(" - ");
}

export function direccionIpsComoEnMapa(ips) {
  return direccionesIpsMapa[ips?.id] || ips?.direccion || "Dirección no disponible";
}
