'use strict';
const { jsPDF } = require('jspdf');
const fs = require('fs');
const path = require('path');

function drawPdfGauge(doc, cx, cy, r, from, to, col, w) {
  doc.setDrawColor(col[0], col[1], col[2]);
  doc.setLineWidth(w);
  doc.setLineCap('round');
  const sA = -90, fA = sA + (from / 100) * 360, lA = sA + (to / 100) * 360;
  const steps = Math.max(2, Math.round(Math.abs(lA - fA) / 5));
  let prev = null;
  for (let i = 0; i <= steps; i++) {
    const a = (fA + ((lA - fA) * i / steps)) * Math.PI / 180;
    const x = cx + r * Math.cos(a), y = cy + r * Math.sin(a);
    if (prev) doc.line(prev[0], prev[1], x, y);
    prev = [x, y];
  }
}

async function generatePdf(result, lead) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const PW = 210, PH = 297, MX = 18, CW = PW - (MX * 2);
  
  // Paleta corporativa
  const RED = [227, 6, 19], WINE = [143, 20, 5], BLK = [15, 15, 15];
  const WHT = [255, 255, 255], GRY = [85, 85, 85], LGRY = [245, 245, 247], LNE = [220, 220, 225];
  
  const country = result.country || {}, selections = result.selections || {};
  
  function safeTxt(v) { return String(v == null ? '' : v); }
  function fmtNum(v) { return Math.round(Number(v || 0)).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.'); }
  let page = 0;

  function addFooter() {
    doc.setFillColor(BLK[0], BLK[1], BLK[2]); doc.rect(0, PH - 14, PW, 14, 'F');
    doc.setFillColor(RED[0], RED[1], RED[2]); doc.rect(0, PH - 14, 55, 14, 'F');
    doc.setFont('helvetica', 'bold'); doc.setFontSize(8); doc.setTextColor(255, 255, 255); doc.text('DETEKTOR', 18, PH - 5.5);
    doc.setFont('helvetica', 'normal'); doc.text('Roadview IA  ·  Seguridad para tu flota', PW - MX, PH - 5.5, { align: 'right' });
  }
  
  function newPage() { if (page > 0) doc.addPage(); page++; addFooter(); }
  function ensureSpace(h, cY) { if (cY + h > PH - 22) { newPage(); return 25; } return cY; }

  // Componentes UI reutilizables
  function sectionTitle(txt, cY) {
    cY = ensureSpace(16, cY); 
    doc.setFillColor(RED[0], RED[1], RED[2]); doc.rect(MX, cY - 4, 3, 6, 'F');
    doc.setFont('helvetica', 'bold'); doc.setFontSize(12); doc.setTextColor(BLK[0], BLK[1], BLK[2]);
    doc.text(safeTxt(txt).toUpperCase(), MX + 7, cY + 0.8); cY += 4; 
    doc.setDrawColor(LNE[0], LNE[1], LNE[2]); doc.setLineWidth(0.3);
    doc.line(MX, cY, PW - MX, cY); return cY + 7;
  }

  function paragraph(txt, cY, sz, col) {
    if (!txt) return cY; 
    const fSz = sz || 10, fCol = col || GRY; 
    doc.setFont('helvetica', 'normal'); doc.setFontSize(fSz); doc.setTextColor(fCol[0], fCol[1], fCol[2]);
    const lines = doc.splitTextToSize(safeTxt(txt), CW);
    lines.forEach(l => { cY = ensureSpace(6, cY); doc.text(l, MX, cY); cY += fSz * 0.55; }); 
    return cY + 3;
  }

  function bullets(items, cY) {
    if (!Array.isArray(items) || items.length === 0) return cY;
    items.forEach(it => {
      const lines = doc.splitTextToSize(safeTxt(it), CW - 8); 
      cY = ensureSpace((lines.length * 5) + 4, cY);
      doc.setFillColor(RED[0], RED[1], RED[2]); doc.circle(MX + 2, cY - 1.5, 1.2, 'F');
      doc.setFont('helvetica', 'normal'); doc.setFontSize(10); doc.setTextColor(BLK[0], BLK[1], BLK[2]);
      doc.text(lines, MX + 7, cY); cY += (lines.length * 5) + 3;
    }); 
    return cY + 3;
  }

  // HEADER
  newPage();
  doc.setFillColor(BLK[0], BLK[1], BLK[2]); doc.rect(0, 0, PW, 38, 'F');
  doc.setFillColor(RED[0], RED[1], RED[2]); doc.rect(0, 0, PW, 4, 'F');
  doc.setFont('helvetica', 'bold'); doc.setFontSize(22); doc.setTextColor(255, 255, 255); 
  doc.text('DETEKTOR ROADVIEW IA', MX, 20);
  doc.setFont('helvetica', 'normal'); doc.setFontSize(10); doc.setTextColor(200, 200, 200); 
  doc.text('INFORME DE EXPOSICIÓN AL RIESGO VIAL', MX, 28);
  const dTxt = new Date().toLocaleDateString('es-CO', { day: '2-digit', month: 'long', year: 'numeric' });
  doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.setTextColor(255, 255, 255); 
  doc.text('Generado el ' + dTxt, PW - MX, 28, { align: 'right' });

  // DATOS DEL LEAD
  let y = 48;
  doc.setFillColor(LGRY[0], LGRY[1], LGRY[2]); doc.roundedRect(MX, y, CW, 22, 2, 2, 'F');
  doc.setFont('helvetica', 'bold'); doc.setFontSize(8.5); doc.setTextColor(GRY[0], GRY[1], GRY[2]); doc.text('PREPARADO PARA', MX + 6, y + 8);
  doc.setFontSize(13); doc.setTextColor(BLK[0], BLK[1], BLK[2]); doc.text(safeTxt(lead.nombre), MX + 6, y + 15);
  doc.setFont('helvetica', 'normal'); doc.setFontSize(10); doc.setTextColor(GRY[0], GRY[1], GRY[2]); doc.text(safeTxt(lead.empresa), MX + 55, y + 15);
  doc.setFont('helvetica', 'bold'); doc.setFontSize(9); doc.setTextColor(BLK[0], BLK[1], BLK[2]); doc.text('Operación: ' + safeTxt(country.name || selections.country), PW - MX - 6, y + 9, { align: 'right' });
  doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.setTextColor(GRY[0], GRY[1], GRY[2]);
  doc.text([lead.correo, lead.celular].filter(Boolean).join('  |  '), PW - MX - 6, y + 15, { align: 'right' });
  y += 32;

  // SCORE
  const gX = MX + 26, gY = y + 24, gR = 24;
  drawPdfGauge(doc, gX, gY, gR, 0, 100, [230, 230, 230], 7);
  drawPdfGauge(doc, gX, gY, gR, 0, Number(result.score || 0), RED, 7);
  doc.setFont('helvetica', 'bold'); doc.setFontSize(28); doc.setTextColor(RED[0], RED[1], RED[2]); doc.text(safeTxt(result.score), gX, gY + 3, { align: 'center' });
  doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.setTextColor(GRY[0], GRY[1], GRY[2]); doc.text('/ 100', gX, gY + 11, { align: 'center' });

  const rX = gX + gR + 18;
  doc.setFillColor(RED[0], RED[1], RED[2]); doc.roundedRect(rX, y + 2, 50, 9, 2, 2, 'F');
  doc.setFont('helvetica', 'bold'); doc.setFontSize(10); doc.setTextColor(255, 255, 255); doc.text('RIESGO ' + safeTxt(result.level).toUpperCase(), rX + 25, y + 8.5, { align: 'center' });
  doc.setFontSize(14); doc.setTextColor(BLK[0], BLK[1], BLK[2]); doc.text(safeTxt(result.title || result.headline), rX, y + 19);
  doc.setFont('helvetica', 'normal'); doc.setFontSize(9.5); doc.setTextColor(GRY[0], GRY[1], GRY[2]);
  doc.text(doc.splitTextToSize(result.description || 'Perfil que combina factores que mantienen una probabilidad constante de siniestros viales que debe ser gestionada.', CW - (rX - MX)), rX, y + 27);
  y += 58;

  // PANORAMA DE PAÍS
  y = sectionTitle('Panorama de siniestralidad en ' + safeTxt(country.name || selections.country), y);
  const stats = [['Accidentes', fmtNum(country.accidents)], ['Lesionados', fmtNum(country.injured)], ['Muertes', fmtNum(country.deaths)], ['Tasa / 100k hab.', Number(country.rate || 0).toFixed(1)]];
  const gap = 4, cW = (CW - gap * 3) / 4;
  stats.forEach(function (s, i) {
    const x = MX + i * (cW + gap); doc.setFillColor(252, 252, 252); doc.setDrawColor(LNE[0], LNE[1], LNE[2]); doc.roundedRect(x, y, cW, 18, 2, 2, 'FD');
    doc.setFillColor(RED[0], RED[1], RED[2]); doc.rect(x, y + 16, cW, 2, 'F');
    doc.setFont('helvetica', 'bold'); doc.setFontSize(14); doc.setTextColor(BLK[0], BLK[1], BLK[2]); doc.text(s[1], x + cW / 2, y + 8, { align: 'center' });
    doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.setTextColor(GRY[0], GRY[1], GRY[2]); doc.text(s[0], x + cW / 2, y + 13, { align: 'center' });
  });
  y += 24; 
  doc.setFont('helvetica', 'italic'); doc.setFontSize(8); doc.setTextColor(120, 120, 120); 
  doc.text('Fuente: ' + safeTxt(country.source || 'ANSV/Observatorio Nacional de Seguridad Vial'), MX, y); 
  y += 10;

  // FACTORES DINÁMICOS DEL RIESGO
  y = sectionTitle('Principales factores que elevan tu riesgo', y);
  let pdfDrivers = result.drivers || ['El clima, el tráfico y las decisiones de terceros siguen siendo variables externas que deben gestionarse de forma preventiva.'];
  y = bullets(pdfDrivers, y);

  // IMPACTO ECONÓMICO Y OPERATIVO
  y = ensureSpace(45, y);
  doc.setFillColor(WINE[0], WINE[1], WINE[2]); doc.roundedRect(MX, y, CW, 22, 2, 2, 'F');
  doc.setFont('helvetica', 'bold'); doc.setFontSize(11); doc.setTextColor(255, 200, 200); doc.text('IMPACTO ECONÓMICO ESTIMADO', MX + 8, y + 8);
  doc.setFontSize(18); doc.setTextColor(WHT[0], WHT[1], WHT[2]); doc.text(safeTxt(result.estimatedCost?.value).replace(/₡/g, 'CRC '), MX + 8, y + 16);
  doc.setFont('helvetica', 'normal'); doc.setFontSize(9); 
  doc.text(doc.splitTextToSize(safeTxt(result.estimatedCost?.note || 'El costo estimado combina gastos hospitalarios, reparación, incapacidad y póliza.'), CW - 80), MX + 80, y + 10);
  y += 28;

  y = sectionTitle('Impacto adicional en tu operación', y);
  const isPers = safeTxt(selections.use).toLowerCase().includes('personal');
  const impacts = [
    ['Vehículo fuera de operación', 'Cada día sin vehículo genera retrasos e ingresos perdidos.'], 
    ['Sanciones y procesos legales', 'Un siniestro puede derivar en procesos administrativos y legales.'], 
    ['Impacto en tu póliza', 'Aumenta la prima en la renovación del seguro.'], 
    isPers ? ['Impacto personal y familiar', 'Afecta la movilidad y la economía familiar.'] : ['Relación con tu cliente', 'Daños a la carga deterioran la confianza comercial.']
  ];
  
  const impW = (CW - gap) / 2;
  for (let i = 0; i < impacts.length; i += 2) {
    const rH = 16; y = ensureSpace(rH + 4, y);
    for (let col = 0; col < 2 && i + col < impacts.length; col++) {
      const imp = impacts[i + col], x = MX + col * (impW + gap);
      doc.setFillColor(250, 250, 252); doc.setDrawColor(LNE[0], LNE[1], LNE[2]); doc.roundedRect(x, y, impW, rH, 2, 2, 'FD');
      // Borde rojo grueso a la izquierda
      doc.setFillColor(RED[0], RED[1], RED[2]); doc.rect(x, y, 2.5, rH, 'F');
      doc.setFont('helvetica', 'bold'); doc.setFontSize(9.5); doc.setTextColor(BLK[0], BLK[1], BLK[2]); doc.text(imp[0], x + 6, y + 6);
      doc.setFont('helvetica', 'normal'); doc.setFontSize(8.5); doc.setTextColor(GRY[0], GRY[1], GRY[2]); doc.text(imp[1], x + 6, y + 11.5);
    }
    y += rH + 4;
  }
  doc.setFont('helvetica', 'italic'); doc.setFontSize(8); doc.setTextColor(120, 120, 120); y = ensureSpace(8, y);
  doc.text('Impacto ilustrativo según pólizas y normativas aplicables.', MX, y); y += 10;

  // COMPARACIÓN Y PLAN DE MEJORA DINÁMICOS
  if (result.industryComparison) {
    y = sectionTitle('Comparación con la industria', y); 
    y = paragraph(result.industryComparison, y, 10.5, BLK) + 4;
  }
  if (result.plan && result.plan.length > 0) {
    y = sectionTitle('Plan de mejora recomendado', y); 
    y = bullets(result.plan, y) + 4;
  }

  // ==========================================
  // PÁGINA FINAL: LA SOLUCIÓN (VENTA PURA)
  // ==========================================
  newPage();
  y = 20;
  
  // Fondo oscuro corporativo
  doc.setFillColor(15, 15, 15);
  doc.roundedRect(MX, y, CW, 230, 4, 4, 'F');
  
  doc.setFont('helvetica', 'bold'); doc.setFontSize(18); doc.setTextColor(RED[0], RED[1], RED[2]);
  doc.text('ASÍ TE PROTEGE DETEKTOR ROADVIEW IA', MX + 12, y + 16);
  
  // EXPLICACIÓN SIN TECNICISMOS (Centrada en el valor de la IA)
  doc.setFontSize(11); doc.setTextColor(255, 255, 255);
  doc.text('1. Cámara de alta tecnología:', MX + 12, y + 30);
  doc.setFont('helvetica', 'normal'); doc.setFontSize(10); doc.setTextColor(200, 200, 200);
  doc.text(doc.splitTextToSize('Monitoreo continuo hacia adentro y hacia afuera. Su asistente inteligente analiza el entorno para advertir sobre peligros inminentes en la vía, previniendo riesgos antes de que ocurran.', CW - 90), MX + 12, y + 35);
  
  doc.setFont('helvetica', 'bold'); doc.setFontSize(11); doc.setTextColor(255, 255, 255);
  doc.text('2. Inteligencia Artificial:', MX + 12, y + 54);
  doc.setFont('helvetica', 'normal'); doc.setFontSize(10); doc.setTextColor(200, 200, 200);
  doc.text(doc.splitTextToSize('Vigila el rostro del conductor en tiempo real para emitir alertas automáticas de voz si detecta signos de fatiga, microsueños, distracciones o uso del celular.', CW - 90), MX + 12, y + 59);

  // LECTURA DE LA IMAGEN LOCAL
  try {
    const imgPath = path.join(__dirname, 'assets', 'camara.png');
    const imgData = fs.readFileSync(imgPath).toString('base64');
    doc.addImage(imgData, 'PNG', PW - MX - 70, y + 25, 55, 55);
  } catch (err) {
    console.error('Info: Asegúrate de guardar la imagen en /assets/camara.png para que aparezca en el PDF.');
  }

  // Línea sutil separadora
  doc.setDrawColor(45, 45, 45); doc.setLineWidth(0.5);
  doc.line(MX + 12, y + 80, PW - MX - 12, y + 80);

  // CARACTERÍSTICAS TÉCNICAS TRADUCIDAS A BENEFICIOS
  const features = [
    'Grabación optimizada en clips cortos para fácil descarga.',
    'Monitoreo GPS desde app y plataforma.',
    'Descarga del video posterior a los eventos.',
    'Monitoreo y gestión de vehículos 24/7 en tiempo real.',
    'Monitoreo del comportamiento de conducción.',
    'Espacio específico de memoria para almacenamiento de eventos (choques, giros bruscos, frenadas fuertes, fatiga, uso teléfono, fumar).',
    'Alarmas de voz cuando se comete alguna acción catalogada como riesgo.',
    'Registro de alarmas mientras el vehículo esté encendido.'
  ];

  let featY = y + 92;
  doc.setFontSize(10); doc.setTextColor(255, 255, 255);
  features.forEach(feat => {
    doc.setFillColor(RED[0], RED[1], RED[2]); 
    doc.circle(MX + 14, featY - 1.5, 1.2, 'F');
    const lines = doc.splitTextToSize(feat, CW - 30);
    doc.text(lines, MX + 20, featY);
    featY += (lines.length * 5.5) + 3;
  });

  // BOTÓN CTA DINÁMICO
  const btnW = 110, btnH = 14;
  const btnX = (PW - btnW) / 2;
  const btnY = featY + 15;
  doc.setFillColor(RED[0], RED[1], RED[2]); 
  doc.roundedRect(btnX, btnY, btnW, btnH, 3, 3, 'F');
  doc.setFont('helvetica', 'bold'); doc.setFontSize(11); doc.setTextColor(255, 255, 255);
  doc.text('COTIZAR CON UN ASESOR VÍA WHATSAPP', PW / 2, btnY + 9, { align: 'center' });
  
  // Link embebido en el PDF
  doc.link(btnX, btnY, btnW, btnH, { url: 'https://wa.link/7679nl' });

  // Disclaimer legal al final
  doc.setFont('helvetica', 'italic'); doc.setFontSize(7.5); doc.setTextColor(120, 120, 120);
  doc.text(doc.splitTextToSize(result.disclaimer || 'Resultado estimado con fines informativos y referenciales. No constituye una cotización de seguros ni garantiza la ocurrencia o el costo de futuros siniestros.', CW), MX, y + 245);

  const arrayBuffer = doc.output('arraybuffer');
  return Buffer.from(arrayBuffer);
}

module.exports = generatePdf;
