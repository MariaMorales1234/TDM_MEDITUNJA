// Datos constantes y configuración para el Módulo de Convenios
// MediTunja - Red de Salud de Tunja

// 1. Prestadores, sedes, afiliaciones y servicios base para Tunja.
export const EPS_AFILIACIONES = ["Nueva EPS", "Famisanar", "Sanitas", "Salud Total", "SURA"];
const TODAS_LAS_EPS = EPS_AFILIACIONES;
const SERVICIOS_SAN_RAFA_PRINCIPAL = [
  "srv-med-gen", "srv-med-interna", "srv-cirugia-general", "srv-anestesiologia",
  "srv-oncologia", "srv-nefrologia", "srv-cardiologia", "srv-laboratorio-basico",
  "srv-rayos-x", "srv-patologia"
];
const SERVICIOS_SAN_RAFA_COLON = [
  "srv-dermatologia", "srv-neurologia", "srv-oftalmologia", "srv-ortopedia",
  "srv-otorrinolaringologia", "srv-psiquiatria", "srv-gastroenterologia"
];
const SERVICIOS_SAN_RAFA_MATERNO = ["srv-pediatria", "srv-ginecologia", "srv-obstetricia"];
const SERVICIOS_ESE_SANTIAGO = [
  "srv-med-interna", "srv-med-familiar", "srv-med-gen", "srv-ortopedia",
  "srv-ginecologia", "srv-obstetricia", "srv-pediatria", "srv-urgenciologia", "srv-psicologia"
];
const SERVICIOS_MEDILASER = [
  "srv-endocrinologia", "srv-gineco-obstetricia", "srv-neumologia", "srv-neurocirugia",
  "srv-reumatologia", "srv-urologia", "srv-fisiatria", "srv-infectologia-pediatrica",
  "srv-med-interna", "srv-cardiologia", "srv-geriatria", "srv-dermatologia",
  "srv-med-materno-fetal", "srv-neuropediatria", "srv-nefrologia", "srv-oftalmologia-retina",
  "srv-otorrinolaringologia", "srv-pediatria", "srv-gastroenterologia"
];
const SERVICIOS_LOS_ANDES = [
  "srv-med-interna", "srv-med-gen", "srv-cardiologia", "srv-pediatria",
  "srv-gineco-obstetricia", "srv-ortopedia", "srv-cirugia-general", "srv-neurocirugia",
  "srv-urologia", "srv-oftalmologia", "srv-otorrinolaringologia", "srv-cirugia-plastica",
  "srv-cirugia-vascular", "srv-anestesiologia"
];
const SERVICIOS_CHIA = [
  "srv-med-gen", "srv-laboratorio-basico", "srv-ortopedia", "srv-med-interna",
  "srv-gineco-obstetricia", "srv-pediatria", "srv-dermatologia", "srv-neumologia",
  "srv-neurologia", "srv-nefrologia", "srv-psiquiatria", "srv-psicologia",
  "srv-nutricion", "srv-rehabilitacion", "srv-odontologia", "srv-endodoncia",
  "srv-cirugia-oral", "srv-enfermeria", "srv-vacunacion"
];
const SERVICIOS_COLSUBSIDIO = [
  "srv-cardiologia", "srv-dermatologia", "srv-dolor-cuidados-paliativos", "srv-endodoncia",
  "srv-enfermeria", "srv-gastroenterologia", "srv-gineco-obstetricia", "srv-med-familiar",
  "srv-med-fisica-deporte", "srv-fisiatria", "srv-med-gen", "srv-med-interna",
  "srv-neumologia", "srv-neurologia", "srv-nutricion", "srv-odontologia", "srv-oftalmologia",
  "srv-optometria", "srv-ortodoncia", "srv-pediatria", "srv-psicologia", "srv-psiquiatria",
  "srv-cardiologia-pediatrica", "srv-vacunacion", "srv-laboratorio-basico", "srv-fisioterapia",
  "srv-fonoaudiologia", "srv-diagnostico-vascular", "srv-rayos-x", "srv-imagenes-no-ionizantes",
  "srv-radiologia-odontologica", "srv-toma-muestras-ginecologicas"
];
const SERVICIOS_SANITAS = [
  "srv-dermatologia", "srv-enfermeria", "srv-gineco-obstetricia", "srv-med-familiar",
  "srv-fisiatria", "srv-med-gen", "srv-nutricion", "srv-pediatria", "srv-psicologia",
  "srv-vacunacion", "srv-rayos-x", "srv-imagenes-no-ionizantes"
];
const SERVICIOS_SURA = [
  "srv-med-gen", "srv-med-familiar", "srv-med-interna", "srv-cardiologia", "srv-dermatologia",
  "srv-gineco-obstetricia", "srv-pediatria", "srv-psicologia", "srv-psiquiatria", "srv-nutricion",
  "srv-enfermeria", "srv-vacunacion", "srv-laboratorio-basico", "srv-rayos-x",
  "srv-imagenes-no-ionizantes", "srv-fisioterapia", "srv-farmacia"
];
const SERVICIOS_SIREB = [
  "srv-cardiologia", "srv-dermatologia", "srv-endocrinologia", "srv-fisioterapia",
  "srv-fonoaudiologia", "srv-med-familiar", "srv-fisiatria", "srv-med-gen", "srv-med-interna",
  "srv-neumologia", "srv-neurologia", "srv-nutricion", "srv-otorrinolaringologia",
  "srv-otras-consultas-especialidad", "srv-pediatria", "srv-psicologia", "srv-psiquiatria",
  "srv-terapia-ocupacional", "srv-terapia-respiratoria"
];
const SERVICIOS_ADMIN_NUEVA_EPS = [
  "srv-atencion-afiliado", "srv-autorizaciones", "srv-afiliaciones",
  "srv-gestion-incapacidades", "srv-radicacion-pqrs", "srv-orientacion-usuario"
];

export const IPS_CATALOGO = [
  { id: "san-rafael", nombre: "Hospital San Rafael de Tunja", sede: "Sede Principal", direccion: "Carrera 11 # 27-27, Tunja", eps: TODAS_LAS_EPS, servicios: SERVICIOS_SAN_RAFA_PRINCIPAL },
  { id: "san-rafael-colon", nombre: "Hospital San Rafael de Tunja", sede: "Sede Edificio Colón", direccion: "Avenida Colón # 27-87, Tunja", eps: TODAS_LAS_EPS, servicios: SERVICIOS_SAN_RAFA_COLON },
  { id: "san-rafael-materno", nombre: "Hospital San Rafael de Tunja", sede: "Sede Maternoinfantil", direccion: "Avenida Universitaria, Tunja", eps: TODAS_LAS_EPS, servicios: SERVICIOS_SAN_RAFA_MATERNO },
  { id: "ese-san-antonio", nombre: "E.S.E. Santiago de Tunja", sede: "Sede principal", direccion: "Barrio San Antonio, Tunja", eps: TODAS_LAS_EPS, servicios: SERVICIOS_ESE_SANTIAGO },
  { id: "medilaser", nombre: "Clínica Medilaser", sede: "Edificio Davinci", direccion: "Carrera 1F # 39-76, Tunja", eps: TODAS_LAS_EPS, servicios: SERVICIOS_MEDILASER },
  { id: "los-andes", nombre: "Clínica Los Andes", sede: "Sede principal", direccion: "Transversal 11 # 30-61, Tunja", eps: TODAS_LAS_EPS, servicios: SERVICIOS_LOS_ANDES },
  { id: "clinica-chia", nombre: "Clínica de Chía", sede: "Sede Tunja", direccion: "Sector Pozo Donato, Tunja", eps: ["Nueva EPS", "Famisanar", "Sanitas", "Salud Total"], servicios: SERVICIOS_CHIA },
  { id: "centro-colsubsidio", nombre: "Centro Médico Colsubsidio", sede: "Sede Tunja", direccion: "Tunja", eps: TODAS_LAS_EPS, servicios: SERVICIOS_COLSUBSIDIO },
  { id: "centro-sanitas", nombre: "Centro Médico Sanitas", sede: "Sede Tunja", direccion: "Tunja", eps: ["Nueva EPS", "Famisanar", "Sanitas"], servicios: SERVICIOS_SANITAS },
  { id: "centro-sura", nombre: "Centro Médico SURA", sede: "Sede Tunja", direccion: "Tunja", eps: ["Nueva EPS", "Famisanar", "SURA"], servicios: SERVICIOS_SURA },
  { id: "sireb", nombre: "SIREB", sede: "Sede Tunja", direccion: "Tunja", eps: TODAS_LAS_EPS, servicios: SERVICIOS_SIREB },
  { id: "nueva-eps-pozo", nombre: "Nueva EPS", sede: "Sede Pozo de Donato (administrativa)", direccion: "Sector Pozo de Donato, Tunja", eps: ["Nueva EPS"], servicios: SERVICIOS_ADMIN_NUEVA_EPS },
  { id: "nueva-eps-centro", nombre: "Nueva EPS", sede: "Sede Centro Histórico (administrativa)", direccion: "Centro Histórico, Tunja", eps: ["Nueva EPS"], servicios: SERVICIOS_ADMIN_NUEVA_EPS }
];

// 2. Catálogo de Entidades Promotoras de Salud (EPS - Oficinas de Atención en Tunja)
export const EPS_CATALOGO = [
  {
    id: "nueva-eps-principal",
    nombre: "Nueva EPS",
    sede: "Oficina de Atención Principal (Centro)",
    direccion: "Carrera 9 # 24-81 (Centro), Tunja"
  },
  {
    id: "nueva-eps-alterna",
    nombre: "Nueva EPS",
    sede: "Sede Alterna (Contributivo/Subsidiado)",
    direccion: "Carrera 7 # 44-57, Tunja"
  },
  {
    id: "famisanar",
    nombre: "Famisanar",
    sede: "Oficina de Atención Tunja",
    direccion: "Calle 28 # 11-46 (Cerca al Hospital San Rafael), Tunja"
  },
  {
    id: "sanitas",
    nombre: "Sanitas",
    sede: "Edificio Cooservicios, Bloque B",
    direccion: "Carrera 1F # 40-149 (Edificio Cooservicios, Bloque B), Tunja"
  },
  {
    id: "sura",
    nombre: "SURA",
    sede: "Alianza Ambulatoria con Clínica de Chía",
    direccion: "Carrera 6 # 44-22 (Funciona en alianza de atención médica ambulatoria con la Clínica de Chía), Tunja"
  },
  {
    id: "salud-total",
    nombre: "Salud Total",
    sede: "Boulevard Shopping (Local 119)",
    direccion: "Avenida Universitaria # 45-124 (Centro Comercial Boulevard Shopping, Local 119), Tunja"
  }
];

// 3. Categorías de servicios médicos
export const CATEGORIAS_SERVICIOS = [
  { id: "todas", nombre: "Todas las Categorías" },
  { id: "consultas", nombre: "Consultas Médicas y Especialidades" },
  { id: "terapias", nombre: "Terapias y Rehabilitación" },
  { id: "diagnostico", nombre: "Apoyo Diagnóstico y Laboratorio" },
  { id: "hospitalizacion", nombre: "Hospitalización y Procedimientos" },
  { id: "administrativo", nombre: "Atención y Trámites de EPS" }
];

// 4. Catálogo de servicios médicos asociados a categorías
export const SERVICIOS_POR_CATEGORIA = [
  // Consultas
  { id: "srv-med-gen", categoria: "consultas", codigo: "890201", nombre: "Consulta de Medicina General" },
  { id: "srv-med-interna", categoria: "consultas", nombre: "Medicina Interna" },
  { id: "srv-med-familiar", categoria: "consultas", nombre: "Medicina Familiar" },
  { id: "srv-odontologia", categoria: "consultas", codigo: "890203", nombre: "Consulta de Odontología General" },
  { id: "srv-endodoncia", categoria: "consultas", nombre: "Endodoncia" },
  { id: "srv-cirugia-oral", categoria: "hospitalizacion", nombre: "Cirugía Oral" },
  { id: "srv-cardiologia", categoria: "consultas", codigo: "890302", nombre: "Consulta Especializada en Cardiología" },
  { id: "srv-neurologia", categoria: "consultas", codigo: "890315", nombre: "Consulta Especializada en Neurología" },
  { id: "srv-endocrinologia", categoria: "consultas", nombre: "Endocrinología" },
  { id: "srv-ortopedia", categoria: "consultas", codigo: "890321", nombre: "Consulta Especializada en Ortopedia y Traumatología" },
  { id: "srv-pediatria", categoria: "consultas", codigo: "890325", nombre: "Consulta Especializada en Pediatría" },
  { id: "srv-ginecologia", categoria: "consultas", nombre: "Ginecología" },
  { id: "srv-obstetricia", categoria: "consultas", nombre: "Obstetricia" },
  { id: "srv-gineco-obstetricia", categoria: "consultas", nombre: "Ginecología y Obstetricia" },
  { id: "srv-dermatologia", categoria: "consultas", nombre: "Dermatología" },
  { id: "srv-cirugia-general", categoria: "hospitalizacion", nombre: "Cirugía General" },
  { id: "srv-anestesiologia", categoria: "hospitalizacion", nombre: "Anestesiología" },
  { id: "srv-oftalmologia", categoria: "consultas", nombre: "Oftalmología" },
  { id: "srv-oftalmologia-retina", categoria: "consultas", nombre: "Oftalmología y Retinología" },
  { id: "srv-otorrinolaringologia", categoria: "consultas", nombre: "Otorrinolaringología" },
  { id: "srv-oncologia", categoria: "consultas", nombre: "Oncología" },
  { id: "srv-psiquiatria", categoria: "consultas", nombre: "Psiquiatría" },
  { id: "srv-nefrologia", categoria: "consultas", nombre: "Nefrología" },
  { id: "srv-neumologia", categoria: "consultas", nombre: "Neumología" },
  { id: "srv-neurocirugia", categoria: "hospitalizacion", nombre: "Neurocirugía" },
  { id: "srv-reumatologia", categoria: "consultas", nombre: "Reumatología" },
  { id: "srv-urologia", categoria: "consultas", nombre: "Urología" },
  { id: "srv-fisiatria", categoria: "terapias", nombre: "Fisiatría" },
  { id: "srv-infectologia-pediatrica", categoria: "consultas", nombre: "Infectología Pediátrica" },
  { id: "srv-geriatria", categoria: "consultas", nombre: "Geriatría" },
  { id: "srv-med-materno-fetal", categoria: "consultas", nombre: "Medicina Materno-Fetal" },
  { id: "srv-neuropediatria", categoria: "consultas", nombre: "Neuropediatría" },
  { id: "srv-cirugia-plastica", categoria: "hospitalizacion", nombre: "Cirugía Plástica" },
  { id: "srv-cirugia-vascular", categoria: "hospitalizacion", nombre: "Cirugía Vascular" },
  { id: "srv-urgenciologia", categoria: "hospitalizacion", nombre: "Urgenciología" },
  { id: "srv-psicologia", categoria: "consultas", nombre: "Psicología" },
  { id: "srv-nutricion", categoria: "consultas", nombre: "Nutrición Dietética" },
  { id: "srv-rehabilitacion", categoria: "terapias", nombre: "Medicina Física y Rehabilitación" },
  { id: "srv-enfermeria", categoria: "consultas", nombre: "Enfermería" },
  { id: "srv-vacunacion", categoria: "consultas", nombre: "Vacunación" },
  { id: "srv-gastroenterologia", categoria: "consultas", nombre: "Gastroenterología" },
  { id: "srv-patologia", categoria: "diagnostico", nombre: "Patología" },

  // Terapias y Rehabilitación
  { id: "srv-terapia-fisica", categoria: "terapias", codigo: "931000", nombre: "Fisioterapia y Terapia Física Integral" },
  { id: "srv-terapia-ocupacional", categoria: "terapias", codigo: "938300", nombre: "Terapia Ocupacional para Discapacidad" },
  { id: "srv-fonoaudiologia", categoria: "terapias", codigo: "937000", nombre: "Fonoaudiología y Terapia del Lenguaje" },
  { id: "srv-rehab-cardiopulmonar", categoria: "terapias", codigo: "933600", nombre: "Rehabilitación Cardiopulmonar" },
  { id: "srv-neurorehabilitacion", categoria: "terapias", codigo: "939000", nombre: "Neurorehabilitación para Pacientes con Secuelas Motoras" },

  // Apoyo Diagnóstico
  { id: "srv-laboratorio-basico", categoria: "diagnostico", codigo: "902210", nombre: "Laboratorio Clínico de Rutina y Perfil Bioquímico" },
  { id: "srv-rayos-x", categoria: "diagnostico", codigo: "871010", nombre: "Radiología Convencional y Rayos X Digitales" },
  { id: "srv-ecografia", categoria: "diagnostico", codigo: "881201", nombre: "Ecografía Doppler y Tejidos Blandos" },
  { id: "srv-resonancia", categoria: "diagnostico", codigo: "883101", nombre: "Resonancia Magnética Articular y Cerebral" },
  { id: "srv-electrocardiograma", categoria: "diagnostico", codigo: "895100", nombre: "Electrocardiograma de 12 Derivaciones" },

  // Hospitalización y Procedimientos
  { id: "srv-hosp-general", categoria: "hospitalizacion", codigo: "991001", nombre: "Hospitalización Básica en Sala General" },
  { id: "srv-cirugia-ambulatoria", categoria: "hospitalizacion", codigo: "992002", nombre: "Cirugía Ambulatoria de Mediana Complejidad" },
  { id: "srv-atencion-urgencias", categoria: "hospitalizacion", codigo: "993003", nombre: "Atención Médica en Unidad de Urgencias" },
  { id: "srv-dolor-cuidados-paliativos", categoria: "consultas", nombre: "Clínica del Dolor y Cuidados Paliativos" },
  { id: "srv-med-fisica-deporte", categoria: "terapias", nombre: "Medicina Física y del Deporte" },
  { id: "srv-optometria", categoria: "consultas", nombre: "Optometría" },
  { id: "srv-ortodoncia", categoria: "consultas", nombre: "Ortodoncia" },
  { id: "srv-cardiologia-pediatrica", categoria: "consultas", nombre: "Cardiología Pediátrica" },
  { id: "srv-fisioterapia", categoria: "terapias", nombre: "Fisioterapia" },
  { id: "srv-diagnostico-vascular", categoria: "diagnostico", nombre: "Diagnóstico Vascular" },
  { id: "srv-imagenes-no-ionizantes", categoria: "diagnostico", nombre: "Imágenes No Ionizantes" },
  { id: "srv-radiologia-odontologica", categoria: "diagnostico", nombre: "Radiología Odontológica" },
  { id: "srv-toma-muestras-ginecologicas", categoria: "diagnostico", nombre: "Toma de Muestras Ginecológicas" },
  { id: "srv-farmacia", categoria: "administrativo", nombre: "Servicios de Farmacia" },
  { id: "srv-otras-consultas-especialidad", categoria: "consultas", nombre: "Otras Consultas de Especialidad" },
  { id: "srv-terapia-respiratoria", categoria: "terapias", nombre: "Terapia Respiratoria" },
  { id: "srv-atencion-afiliado", categoria: "administrativo", nombre: "Atención al Afiliado" },
  { id: "srv-autorizaciones", categoria: "administrativo", nombre: "Autorizaciones" },
  { id: "srv-afiliaciones", categoria: "administrativo", nombre: "Afiliaciones" },
  { id: "srv-gestion-incapacidades", categoria: "administrativo", nombre: "Gestión de Incapacidades" },
  { id: "srv-radicacion-pqrs", categoria: "administrativo", nombre: "Radicación de PQRS" },
  { id: "srv-orientacion-usuario", categoria: "administrativo", nombre: "Orientación al Usuario" }
];
