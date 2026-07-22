'use strict';

const express = require('express');
const cors = require('cors');
const { OPTION_GROUPS } = require('./data');
const { calculateRisk, validateSelectionPayload } = require('./risk-engine');

// Importamos el generador de PDF
const generatePdf = require('./pdf-generator');

const app = express();
const PORT = process.env.PORT || 3000;

/*
  ALLOWED_ORIGINS es opcional.
  Ejemplo en Render:
  https://www.detektor.com.ni,https://detektor.webflow.io

  Si se deja vacío, la API acepta solicitudes desde cualquier origen.
*/
const allowedOrigins = String(process.env.ALLOWED_ORIGINS || '')
  .split(',')
  .map((origin) => origin.trim().replace(/\/$/, ''))
  .filter(Boolean);

app.use(cors({
  origin(origin, callback) {
    if (!origin || allowedOrigins.length === 0) {
      return callback(null, true);
    }

    const normalizedOrigin = String(origin).replace(/\/$/, '');
    if (allowedOrigins.includes(normalizedOrigin)) {
      return callback(null, true);
    }

    return callback(new Error('Origen no permitido por CORS.'));
  },
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type']
}));

// Aumenté un poco el límite (opcional) a 50kb por si el objeto del resultado es un poco más grande
app.use(express.json({ limit: '50kb' }));

app.get('/', (req, res) => {
  res.json({
    ok: true,
    service: 'API Calculadora Roadview IA',
    endpoints: ['/api/options', '/api/calculate', '/api/generate-pdf']
  });
});

app.get('/health', (req, res) => {
  res.json({ ok: true, status: 'healthy' });
});

app.get('/api/options', (req, res) => {
  const clean = (items) => items.map(({ id, name }) => ({ id, name }));

  res.json({
    ok: true,
    options: {
      countries: clean(OPTION_GROUPS.countries),
      zones: clean(OPTION_GROUPS.zones),
      hours: clean(OPTION_GROUPS.hours),
      vehicles: clean(OPTION_GROUPS.vehicles),
      ages: clean(OPTION_GROUPS.ages),
      uses: clean(OPTION_GROUPS.uses),
      times: clean(OPTION_GROUPS.times)
    }
  });
});

app.post('/api/calculate', (req, res, next) => {
  try {
    const selections = validateSelectionPayload(req.body);
    const result = calculateRisk(selections);
    res.json({ ok: true, result });
  } catch (error) {
    next(error);
  }
});

// ==========================================
// NUEVO ENDPOINT PARA EL PDF
// ==========================================
app.post('/api/generate-pdf', async (req, res, next) => {
  try {
    const { lead, result } = req.body;
    
    if (!lead || !result) {
      const error = new Error('Faltan datos del lead o resultados para generar el PDF.');
      error.statusCode = 400;
      throw error;
    }

    // Genera el buffer del PDF usando la librería jspdf en el backend
    const pdfBuffer = await generatePdf(result, lead);

    // Configura los headers para forzar la descarga del PDF en el navegador
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="informe-riesgo-vial-detektor.pdf"');
    
    // Envía el archivo binario
    res.send(pdfBuffer);
  } catch (error) {
    // Pasa el error al manejador global de errores de tu aplicación
    next(error);
  }
});

// Manejador de rutas no encontradas (404)
app.use((req, res) => {
  res.status(404).json({ ok: false, error: 'Ruta no encontrada.' });
});

// Manejador global de errores
app.use((error, req, res, next) => {
  if (error && error.message === 'Origen no permitido por CORS.') {
    return res.status(403).json({ ok: false, error: error.message });
  }

  const statusCode = Number(error.statusCode) || 500;
  const message = statusCode >= 500
    ? 'No fue posible procesar la solicitud.'
    : error.message;

  console.error(error);
  return res.status(statusCode).json({ ok: false, error: message });
});

app.listen(PORT, () => {
  console.log(`API Calculadora Roadview IA iniciada en el puerto ${PORT}`);
});
