'use strict';

const express = require('express');
const cors = require('cors');
const { OPTION_GROUPS } = require('./data');
const { calculateRisk, validateSelectionPayload } = require('./risk-engine');
const generatePdf = require('./pdf-generator');

const app = express();
const PORT = process.env.PORT || 3000;

// CORS totalmente abierto y permitiendo el header 'Accept' para el PDF
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Accept']
}));

// Límite amplio para evitar cortes de datos
app.use(express.json({ limit: '10mb' }));

app.get('/', (req, res) => res.json({ ok: true, status: 'API Activa', endpoints: ['/api/options', '/api/calculate', '/api/generate-pdf'] }));
app.get('/health', (req, res) => res.json({ ok: true, status: 'healthy' }));

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

app.post('/api/calculate', (req, res) => {
  try {
    const selections = validateSelectionPayload(req.body);
    const result = calculateRisk(selections);
    res.json({ ok: true, result });
  } catch (error) {
    res.status(400).json({ ok: false, error: error.message });
  }
});

// ENDPOINT EXCLUSIVO PARA EL PDF (Sin Zapier)
app.post('/api/generate-pdf', async (req, res) => {
  try {
    const { lead, result } = req.body;

    if (!lead || !result) {
      return res.status(400).json({ error: 'Faltan datos del lead o resultados.' });
    }

    // Genera y envía el PDF
    const pdfBuffer = await generatePdf(result, lead);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="informe-riesgo-vial-detektor.pdf"');
    return res.send(pdfBuffer);
    
  } catch (error) {
    console.error('ERROR AL GENERAR PDF:', error);
    return res.status(500).json({ error: error.message || error.toString() });
  }
});

app.listen(PORT, () => console.log(`API iniciada en el puerto ${PORT}`));
