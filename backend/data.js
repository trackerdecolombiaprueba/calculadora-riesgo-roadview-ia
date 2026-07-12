'use strict';

const COUNTRIES = [
  { id: 'CO', name: 'Colombia', rate: 16.0, accidentes: 58000, lesionados: 27924, muertes: 8271, fuente: 'ANSV / Observatorio Nacional de Seguridad Vial', currency: 'COP', symbol: '$' },
  { id: 'VE', name: 'Venezuela', rate: 37.0, accidentes: 3800, lesionados: 5400, muertes: 1700, fuente: 'Observatorio de Seguridad Vial (OSV), estimación anualizada', currency: 'USD', symbol: 'US$' },
  { id: 'CR', name: 'Costa Rica', rate: 9.9, accidentes: 46949, lesionados: 52266, muertes: 903, fuente: 'COSEVI / Registro Nacional, Costa Rica', currency: 'CRC', symbol: '₡' },
  { id: 'PA', name: 'Panamá', rate: 8.1, accidentes: 47400, lesionados: 6500, muertes: 345, fuente: 'INEC / Autoridad de Tránsito y Transporte Terrestre (ATTT)', currency: 'USD', symbol: 'US$' },
  { id: 'HN', name: 'Honduras', rate: 19.1, accidentes: 14500, lesionados: 5000, muertes: 1887, fuente: 'Observatorio Nacional de la Violencia, IUDPAS-UNAH', currency: 'USD', symbol: 'US$' },
  { id: 'SV', name: 'El Salvador', rate: 19.0, accidentes: 20301, lesionados: 11954, muertes: 1303, fuente: 'Observatorio Nacional de Seguridad Vial (ONASEVI)', currency: 'USD', symbol: 'US$' },
  { id: 'NI', name: 'Nicaragua', rate: 13.7, accidentes: 50000, lesionados: 2750, muertes: 937, fuente: 'Dirección de Seguridad de Tránsito, Policía Nacional', currency: 'USD', symbol: 'US$' },
  { id: 'GT', name: 'Guatemala', rate: 13.1, accidentes: 8354, lesionados: 8838, muertes: 2352, fuente: 'Departamento de Tránsito PNC / ONSET', currency: 'USD', symbol: 'US$' }
];

const ZONES = [
  { id: 'capital', name: 'Capital / gran ciudad', mult: 1.15 },
  { id: 'intermedia', name: 'Ciudad intermedia', mult: 1.05 },
  { id: 'rural', name: 'Zona rural / carretera', mult: 1.15 }
];

const HOURS = [
  { id: 'h1', name: 'Menos de 4 horas', mult: 1.00 },
  { id: 'h2', name: 'Entre 4 y 8 horas', mult: 1.20 },
  { id: 'h3', name: 'Entre 8 y 12 horas', mult: 1.40 },
  { id: 'h4', name: 'Más de 12 horas', mult: 1.65 }
];

const VEHICLES = [
  { id: 'auto', name: 'Automóvil / sedán', mult: 1.0 },
  { id: 'pickup', name: 'Pickup / camioneta', mult: 1.15 },
  { id: 'camion_liviano', name: 'Camión de carga liviano', mult: 1.35 },
  { id: 'camion_pesado', name: 'Camión de carga pesado', mult: 1.7 },
  { id: 'bus', name: 'Bus / van de pasajeros', mult: 1.5 }
];

const AGES = [
  { id: 'nuevo', name: 'Menos de 3 años', mult: 1.0 },
  { id: 'medio', name: 'Entre 3 y 7 años', mult: 1.15 },
  { id: 'viejo', name: 'Más de 7 años', mult: 1.35 }
];

const USES = [
  { id: 'personal', name: 'Personal / particular', mult: 1.0 },
  { id: 'carga', name: 'Comercial – carga', mult: 1.35 },
  { id: 'personas', name: 'Comercial – personas', mult: 1.40 },
  { id: 'mixto', name: 'Mixto', mult: 1.25 }
];

const TIMES = [
  { id: 'dia', name: 'Solo de día', mult: 1.0 },
  { id: 'mixto', name: 'Día y noche', mult: 1.28 },
  { id: 'noche', name: 'Solo de noche', mult: 1.55 }
];

const CURRENCY_BANDS = {
  USD: [500, 3000, 15000, 60000, 250000],
  COP: [1700000, 10000000, 50000000, 200000000, 850000000],
  CRC: [225000, 1350000, 6800000, 27000000, 113000000]
};

const OPTION_GROUPS = {
  countries: COUNTRIES,
  zones: ZONES,
  hours: HOURS,
  vehicles: VEHICLES,
  ages: AGES,
  uses: USES,
  times: TIMES
};

module.exports = {
  COUNTRIES,
  ZONES,
  HOURS,
  VEHICLES,
  AGES,
  USES,
  TIMES,
  CURRENCY_BANDS,
  OPTION_GROUPS
};
