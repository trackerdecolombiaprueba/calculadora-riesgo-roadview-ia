'use strict';

const {
  COUNTRIES,
  ZONES,
  HOURS,
  VEHICLES,
  AGES,
  USES,
  TIMES,
  CURRENCY_BANDS
} = require('./data');

function findById(collection, id, fieldName) {
  const item = collection.find((entry) => entry.id === id);
  if (!item) {
    const error = new Error(`Valor inválido para ${fieldName}.`);
    error.statusCode = 400;
    throw error;
  }
  return item;
}

function formatMoney(value) {
  return Math.round(value).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

function formatNumber(value) {
  if (!value) return '0';
  return Math.round(value).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

// Función auxiliar para escalar el score de 0-100 al rango 44-150
function scaleScoreToNewRange(raw) {
  const baseScore = Math.max(0, Math.min(100, Math.round(raw / 1.1) + 2));
  // Interpola el valor base (0-100) al nuevo rango de 44 a 150 (diferencia de 106)
  return 44 + Math.round((baseScore / 100) * 106);
}

function calculateRisk(input) {
  const country = findById(COUNTRIES, input.country, 'país');
  const zone = findById(ZONES, input.zone, 'zona');
  const hours = findById(HOURS, input.hours, 'horas de conducción');
  const vehicle = findById(VEHICLES, input.vehicle, 'tipo de vehículo');
  const age = findById(AGES, input.age, 'antigüedad');
  const use = findById(USES, input.use, 'tipo de operación');
  const time = findById(TIMES, input.time, 'franja horaria');

  const raw = country.rate * vehicle.mult * age.mult * use.mult * hours.mult * time.mult * zone.mult;
  
  // Nuevo cálculo aplicado con rango 44 a 150
  const score = scaleScoreToNewRange(raw);

  let level;
  let headline;
  let description;
  
  // Textos optimizados para lectura rápida en Web/UI
  // Ajuste de umbrales para el nuevo rango 44-150: 
  // 1/3 del rango equivale a ~79, 2/3 equivalen a ~115
  if (score <= 79) {
    level = 'Medio';
    headline = 'Riesgo latente: Toda operación exige prevención continua';
    description = 'Tu perfil combina factores que, según la evidencia regional, mantienen una probabilidad constante de siniestros viales que debe ser gestionada.';
  } else if (score <= 115) {
    level = 'Alto';
    headline = 'Exposición elevada: Tu operación enfrenta un riesgo significativo';
    description = 'Tu perfil combina varios factores que, según la evidencia regional, elevan significativamente la probabilidad y severidad de un siniestro vial.';
  } else {
    level = 'Crítico';
    headline = 'Alerta máxima: Tu perfil operativo requiere intervención inmediata';
    description = 'Tu perfil agrupa factores críticos que, según la evidencia regional, maximizan fuertemente la probabilidad y severidad de un siniestro vial.';
  }

  const drivers = [
    `En ${country.name}, la tasa estimada de mortalidad vial usada como variable base es de ${country.rate.toFixed(1)} por cada 100.000 habitantes.`
  ];

  if (vehicle.id === 'camion_pesado' || vehicle.id === 'bus') {
    drivers.push('Los vehículos pesados y de pasajeros pueden generar incidentes de mayor severidad y consecuencias operativas más costosas.');
  }
  if (age.id === 'viejo') {
    drivers.push('Los vehículos con más de 7 años acumulan mayor desgaste mecánico y requieren controles preventivos más frecuentes.');
  } else if (age.id === 'medio') {
    drivers.push('Los vehículos de 3 a 7 años requieren especial atención en frenos, suspensión y mantenimiento periódico.');
  }
  if (time.id === 'noche' || time.id === 'mixto') {
    drivers.push('La conducción nocturna reduce la visibilidad y eleva la exposición a fatiga, distracción y condiciones imprevistas en carretera.');
  }
  if (hours.id === 'h3' || hours.id === 'h4') {
    drivers.push('Las jornadas prolongadas incrementan la exposición a fatiga y disminución del tiempo de reacción.');
  }
  if (use.id === 'carga' || use.id === 'personas') {
    drivers.push('El uso comercial aumenta los kilómetros recorridos, las horas de operación y el impacto de una interrupción.');
  }
  if (zone.id === 'rural') {
    drivers.push('Las carreteras y zonas rurales pueden presentar velocidades más altas, menor iluminación y tiempos de respuesta más extensos.');
  }
  if (drivers.length < 2) {
    drivers.push('El clima, el tráfico y las decisiones de terceros siguen siendo variables externas que deben gestionarse de forma preventiva.');
  }

  const bands = CURRENCY_BANDS[country.currency] || CURRENCY_BANDS.USD;
  
  const costBands = {
    Medio: {
      value: `${country.symbol} ${formatMoney(bands[0])} – ${country.symbol} ${formatMoney(bands[1])}`,
      note: 'Rango referencial para daños materiales menores y atención ambulatoria.'
    },
    Alto: {
      value: `${country.symbol} ${formatMoney(bands[1])} – ${country.symbol} ${formatMoney(bands[2])}`,
      note: 'Puede incluir hospitalización breve, reparación e incapacidad temporal.'
    },
    Crítico: {
      value: `${country.symbol} ${formatMoney(bands[2])} – ${country.symbol} ${formatMoney(bands[3])}+`,
      note: 'Escenario referencial de consecuencias graves, litigios y pérdida de continuidad operativa.'
    }
  };

  const typicalRaw = country.rate * 1.15 * 1.15 * 1.35 * 1.20 * 1.28 * 1.05;
  // Calculando el puntaje típico en la nueva escala 44-150
  const typicalScore = scaleScoreToNewRange(typicalRaw);
  const difference = score - typicalScore;
  let industryComparison;
  
  if (Math.abs(difference) <= 3) {
    industryComparison = `Tu índice (${score}) está prácticamente en línea con el perfil estimado de una flota comercial similar en ${country.name} (${typicalScore}/150).`;
  } else if (difference > 0) {
    industryComparison = `Tu índice (${score}) está ${difference} puntos por encima del perfil estimado de una flota comercial similar en ${country.name} (${typicalScore}/150).`;
  } else {
    industryComparison = `Tu índice (${score}) está ${Math.abs(difference)} puntos por debajo del perfil estimado de una flota comercial similar en ${country.name} (${typicalScore}/150).`;
  }

  const plan = ['Prioriza rutas y horarios con menor exposición histórica cuando la operación lo permita.'];
  if (vehicle.id === 'camion_pesado' || vehicle.id === 'bus') plan.push('Implementa inspecciones preoperacionales y verifica descansos para vehículos pesados y de pasajeros.');
  if (age.id === 'viejo') plan.push('Incrementa la frecuencia del mantenimiento preventivo y evalúa la renovación de las unidades más antiguas.');
  else if (age.id === 'medio') plan.push('Refuerza la revisión periódica de frenos, suspensión y sistemas de seguridad.');
  if (time.id === 'noche' || time.id === 'mixto') plan.push('Reduce trayectos nocturnos cuando sea posible y refuerza los protocolos de visibilidad y descanso.');
  if (hours.id === 'h3' || hours.id === 'h4') plan.push('Establece límites de conducción continua y pausas activas programadas.');
  if (use.id === 'carga' || use.id === 'personas') plan.push('Define políticas claras de velocidad, comportamiento y seguimiento para la operación comercial.');
  if (zone.id === 'rural') plan.push('Identifica tramos rurales críticos y establece alertas específicas por ruta.');

  const benefits = [];
  if (time.id === 'noche' || time.id === 'mixto') benefits.push('Monitoreo y alertas para rutas y horarios nocturnos de mayor exposición.');
  if (hours.id === 'h3' || hours.id === 'h4') benefits.push('Alertas de fatiga y comportamiento para prevenir eventos en jornadas extendidas.');
  if (age.id === 'viejo' || age.id === 'medio') benefits.push('Información de conducción útil para orientar mantenimiento y acciones preventivas.');
  if (use.id === 'carga') benefits.push('Trazabilidad, evidencia y geocercas para proteger la operación de carga.');
  if (use.id === 'personas') benefits.push('Monitoreo de conducta para elevar la seguridad de conductores y pasajeros.');
  if (vehicle.id === 'camion_pesado' || vehicle.id === 'bus') benefits.push('Videotelemática y seguimiento especializado para flotas pesadas y de pasajeros.');
  if (zone.id === 'rural') benefits.push('Seguimiento de recorridos y alertas para zonas rurales y corredores críticos.');
  if (benefits.length === 0) benefits.push('Evidencia en video y visibilidad operativa para fortalecer la prevención en cada recorrido.');
  benefits.push('Respaldo integral Detektor Roadview IA para monitoreo, prevención y gestión de eventos.');

  return {
    score,
    level,
    title: `Riesgo ${level.toLowerCase()} en ${country.name}`,
    headline,
    description,
    country: {
      id: country.id,
      name: country.name,
      rate: country.rate,
      accidents: country.accidentes,
      injured: country.lesionados,
      deaths: country.muertes,
      source: country.fuente,
      currency: country.currency
    },
    selections: {
      country: country.name,
      zone: zone.name,
      hours: hours.name,
      vehicle: vehicle.name,
      age: age.name,
      use: use.name,
      time: time.name
    },
    drivers,
    estimatedCost: costBands[level],
    industryComparison,
    plan,
    benefits: benefits.slice(0, 4),
    disclaimer: 'Resultado estimado con fines informativos y referenciales. No constituye una cotización de seguros ni garantiza la ocurrencia o el costo de futuros siniestros.'
  };
}

function validateSelectionPayload(payload) {
  const required = ['country', 'zone', 'hours', 'vehicle', 'age', 'use', 'time'];
  for (const field of required) {
    if (!payload || typeof payload[field] !== 'string' || !payload[field].trim()) {
      const error = new Error('Completa todos los campos de la calculadora.');
      error.statusCode = 400;
      throw error;
    }
  }
  return {
    country: payload.country.trim(),
    zone: payload.zone.trim(),
    hours: payload.hours.trim(),
    vehicle: payload.vehicle.trim(),
    age: payload.age.trim(),
    use: payload.use.trim(),
    time: payload.time.trim()
  };
}

module.exports = { calculateRisk, validateSelectionPayload };
