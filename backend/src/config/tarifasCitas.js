export const tarifaBaseCita = 50000;
export const tarifaMaximaCita = 100000;

const tarifasPorServicio = {
  'srv-med-gen': 50000,
  'srv-med-familiar': 50000,
  'srv-laboratorio-basico': 45000,
  'srv-rayos-x': 55000,
  'srv-electrocardiograma': 45000,
  'srv-ecografia': 80000,
  'srv-resonancia': 100000,
  'srv-terapia-fisica': 50000,
  'srv-fisioterapia': 50000,
  'srv-fonoaudiologia': 50000,
  'srv-terapia-ocupacional': 50000,
  'srv-rehab-cardiopulmonar': 70000,
  'srv-neurorehabilitacion': 75000,
  'srv-cirugia-general': 100000,
  'srv-cirugia-oral': 85000,
  'srv-cirugia-ambulatoria': 100000,
  'srv-cirugia-plastica': 100000,
  'srv-cirugia-vascular': 100000,
  'srv-neurocirugia': 100000,
  'srv-hosp-general': 100000,
  'srv-urgenciologia': 85000,
  'srv-atencion-urgencias': 85000
};

export function tarifaPorServicio(servicio) {
  if (servicio.categoria === 'administrativo') return 0;
  return tarifasPorServicio[servicio.id] ?? (servicio.categoria === 'consultas' ? 65000
    : servicio.categoria === 'terapias' ? 60000
      : servicio.categoria === 'diagnostico' ? 70000
        : tarifaMaximaCita);
}

export function duracionPorServicio(servicio) {
  if (servicio.categoria === 'administrativo') return 30;
  if (servicio.id === 'srv-resonancia' || servicio.id === 'srv-neurorehabilitacion') return 60;
  if (servicio.categoria === 'terapias') return 45;
  if (servicio.categoria === 'hospitalizacion' || servicio.id === 'srv-ecografia') return 60;
  return 30;
}
