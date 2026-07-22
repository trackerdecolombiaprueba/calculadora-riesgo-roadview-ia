'use strict';
const { jsPDF } = require('jspdf');

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
  const RED = [227, 6, 19], WINE = [143, 20, 5], BLK = [0, 0, 0], WHT = [255, 255, 255], GRY = [96, 96, 96], LGRY = [247, 247, 248], LNE = [222, 224, 228];
  const country = result.country || {}, selections = result.selections || {};
  
  function safeTxt(v) { return String(v == null ? '' : v); }
  function fmtNum(v) { return Math.round(Number(v || 0)).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.'); }
  let page = 0;

  function addFooter() {
    doc.setFillColor(BLK[0], BLK[1], BLK[2]); doc.rect(0, PH - 12, PW, 12, 'F');
    doc.setFillColor(RED[0], RED[1], RED[2]); doc.rect(0, PH - 12, 46, 12, 'F');
    doc.setFont('helvetica', 'bold'); doc.setFontSize(7.5); doc.setTextColor(255, 255, 255); doc.text('DETEKTOR', 14, PH - 4.6);
    doc.setFont('helvetica', 'normal'); doc.text('Roadview IA  ·  Seguridad para tu flota', PW - MX, PH - 4.6, { align: 'right' });
  }
  function newPage() { if (page > 0) doc.addPage(); page++; addFooter(); }
  function ensureSpace(h, cY) { if (cY + h > PH - 20) { newPage(); return 40; } return cY; }

  function sectionTitle(txt, cY) {
    cY = ensureSpace(16, cY); doc.setFillColor(RED[0], RED[1], RED[2]); doc.rect(MX, cY - 4, 3, 6, 'F');
    doc.setFont('helvetica', 'bold'); doc.setFontSize(12); doc.setTextColor(BLK[0], BLK[1], BLK[2]);
    doc.text(safeTxt(txt).toUpperCase(), MX + 7, cY + 0.8); cY += 4; doc.setDrawColor(LNE[0], LNE[1], LNE[2]); doc.setLineWidth(0.3);
    doc.line(MX, cY, PW - MX, cY); return cY + 7;
  }
  function paragraph(txt, cY, sz, col) {
    if (!txt) return cY; const fSz = sz || 10, fCol = col || GRY; doc.setFont('helvetica', 'normal'); doc.setFontSize(fSz);
    doc.setTextColor(fCol[0], fCol[1], fCol[2]);
    const lines = doc.splitTextToSize(safeTxt(txt).replace(/₡/g, 'CRC '), CW);
    lines.forEach(function (l) { cY = ensureSpace(6, cY); doc.text(l, MX, cY); cY += fSz * 0.52; }); return cY;
  }
  function bullets(items, cY) {
    if (!Array.isArray(items)) return cY;
    items.forEach(function (it) {
      const lines = doc.splitTextToSize(safeTxt(it), CW - 8); cY = ensureSpace((lines.length * 5) + 3, cY);
      doc.setFillColor(RED[0], RED[1], RED[2]); doc.circle(MX + 1.5, cY - 1.3, 1.1, 'F');
      doc.setFont('helvetica', 'normal'); doc.setFontSize(9.5); doc.setTextColor(BLK[0], BLK[1], BLK[2]);
      doc.text(lines, MX + 7, cY); cY += (lines.length * 5) + 3;
    }); return cY;
  }

  // PORTADA
  newPage();
  doc.setFillColor(BLK[0], BLK[1], BLK[2]); doc.rect(0, 0, PW, 34, 'F');
  doc.setFillColor(RED[0], RED[1], RED[2]); doc.rect(0, 0, PW, 3.2, 'F');
  doc.setFont('helvetica', 'bold'); doc.setFontSize(18); doc.setTextColor(255, 255, 255); doc.text('DETEKTOR ROADVIEW IA', MX, 17);
  doc.setFont('helvetica', 'normal'); doc.setFontSize(8.8); doc.setTextColor(255, 255, 255); doc.text('ROADVIEW IA', MX + 1, 26);
  doc.setFont('helvetica', 'bold'); doc.setFontSize(11); doc.text('Informe de exposición al riesgo vial', PW - MX, 15, { align: 'right' });
  const dTxt = new Date().toLocaleDateString('es-CO', { day: '2-digit', month: 'long', year: 'numeric' });
  doc.setFont('helvetica', 'normal'); doc.setFontSize(8.5); doc.text('Generado el ' + dTxt, PW - MX, 21, { align: 'right' });

  // DATOS DEL LEAD
  let y = 46;
  doc.setFillColor(LGRY[0], LGRY[1], LGRY[2]); doc.setDrawColor(LNE[0], LNE[1], LNE[2]); doc.roundedRect(MX, y, CW, 24, 2, 2, 'FD');
  doc.setFont('helvetica', 'bold'); doc.setFontSize(8.5); doc.setTextColor(GRY[0], GRY[1], GRY[2]); doc.text('PREPARADO PARA', MX + 5, y + 7);
  doc.setFontSize(12); doc.setTextColor(BLK[0], BLK[1], BLK[2]); doc.text(safeTxt(lead.nombre), MX + 5, y + 14);
  doc.setFont('helvetica', 'normal'); doc.setFontSize(9.2); doc.setTextColor(GRY[0], GRY[1], GRY[2]); doc.text(safeTxt(lead.empresa), MX + 5, y + 20);
  doc.setFont('helvetica', 'bold'); doc.setFontSize(9.5); doc.setTextColor(BLK[0], BLK[1], BLK[2]); doc.text('País: ' + safeTxt(country.name || selections.country), PW - MX - 5, y + 8, { align: 'right' });
  doc.setFont('helvetica', 'normal'); doc.setFontSize(9.2); doc.setTextColor(GRY[0], GRY[1], GRY[2]);
  doc.text([lead.correo, lead.celular].filter(Boolean).join('  ·  '), PW - MX - 5, y + 20, { align: 'right' });
  y += 34;

  // PUNTAJE
  const gX = MX + 26, gY = y + 24, gR = 22;
  drawPdfGauge(doc, gX, gY, gR, 0, 100, [230, 230, 233], 6);
  drawPdfGauge(doc, gX, gY, gR, 0, Number(result.score || 0), RED, 6);
  doc.setFont('helvetica', 'bold'); doc.setFontSize(24); doc.setTextColor(RED[0], RED[1], RED[2]); doc.text(safeTxt(result.score), gX, gY + 2, { align: 'center' });
  doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.setTextColor(GRY[0], GRY[1], GRY[2]); doc.text('/ 100', gX, gY + 9, { align: 'center' });

  const rX = gX + gR + 14;
  doc.setFillColor(RED[0], RED[1], RED[2]); doc.roundedRect(rX, y + 4, 46, 9, 4.5, 4.5, 'F');
  doc.setFont('helvetica', 'bold'); doc.setFontSize(10); doc.setTextColor(255, 255, 255); doc.text('RIESGO ' + safeTxt(result.level).toUpperCase(), rX + 23, y + 10.2, { align: 'center' });
  doc.setFontSize(11); doc.setTextColor(BLK[0], BLK[1], BLK[2]); doc.text(safeTxt(result.title || result.headline), rX, y + 20);
  doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.setTextColor(GRY[0], GRY[1], GRY[2]);
  doc.text(doc.splitTextToSize(result.description || 'Índice calculado a partir de factores operativos.', CW - (rX - MX)), rX, y + 26);
  y += 56;

  // ESTADÍSTICAS
  y = sectionTitle('Panorama de siniestralidad en ' + safeTxt(country.name || selections.country), y);
  const stats = [['Accidentes', fmtNum(country.accidents)], ['Lesionados', fmtNum(country.injured)], ['Muertes', fmtNum(country.deaths)], ['Tasa / 100k hab.', Number(country.rate || 0).toFixed(1)]];
  const gap = 4, cW = (CW - gap * 3) / 4;
  stats.forEach(function (s, i) {
    const x = MX + i * (cW + gap); doc.setFillColor(250, 250, 251); doc.setDrawColor(LNE[0], LNE[1], LNE[2]); doc.roundedRect(x, y, cW, 20, 2, 2, 'FD');
    doc.setFillColor(RED[0], RED[1], RED[2]); doc.rect(x, y, cW, 1.4, 'F');
    doc.setFont('helvetica', 'bold'); doc.setFontSize(14); doc.setTextColor(BLK[0], BLK[1], BLK[2]); doc.text(s[1], x + cW / 2, y + 11, { align: 'center' });
    doc.setFont('helvetica', 'normal'); doc.setFontSize(7.5); doc.setTextColor(GRY[0], GRY[1], GRY[2]); doc.text(s[0], x + cW / 2, y + 16.5, { align: 'center' });
  });
  y += 24; doc.setFont('helvetica', 'italic'); doc.setFontSize(7.5); doc.setTextColor(GRY[0], GRY[1], GRY[2]); doc.text('Fuente: ' + safeTxt(country.source), MX, y); y += 8;

  // FACTORES Y COSTOS
  y = sectionTitle('Principales factores que elevan tu riesgo', y);
  let pdfDrivers = result.drivers || [];
  let pdfTasaText = '';
  let pdfBulletFactors = [];
  pdfDrivers.forEach(function (d) {
    if (d.toLowerCase().indexOf('tasa estimada') !== -1) pdfTasaText = d;
    else pdfBulletFactors.push(d);
  });
  y = bullets(pdfBulletFactors.slice(0, 2), y) + 2;
  if (pdfTasaText) y = paragraph('* ' + pdfTasaText, y, 7.5, GRY) + 4;

  y = sectionTitle('Impacto económico estimado', y); y = ensureSpace(20, y);
  doc.setFillColor(WINE[0], WINE[1], WINE[2]); doc.setDrawColor(RED[0], RED[1], RED[2]); doc.setLineWidth(0.5); doc.roundedRect(MX, y, CW, 18, 2, 2, 'FD');
  doc.setFont('helvetica', 'bold'); doc.setFontSize(15); doc.setTextColor(WHT[0], WHT[1], WHT[2]); doc.text(safeTxt(result.estimatedCost?.value).replace(/₡/g, 'CRC '), MX + 6, y + 8);
  doc.setFont('helvetica', 'normal'); doc.setFontSize(7.5); doc.setTextColor(WHT[0], WHT[1], WHT[2]); doc.text(doc.splitTextToSize(safeTxt(result.estimatedCost?.note), CW - 12).slice(0, 2), MX + 6, y + 13);
  y += 24; y = paragraph('El costo estimado combina gastos hospitalarios, reparación, incapacidad y póliza.', y, 8, GRY) + 3;

  // RESTO DEL REPORTE
  y = sectionTitle('Impacto adicional en tu operación', y);
  const isPers = safeTxt(selections.use).toLowerCase().includes('personal');
  const impacts = [['Vehículo fuera de operación', 'Cada día sin vehículo genera retrasos e ingresos perdidos.'], ['Sanciones y procesos legales', 'Un siniestro puede derivar en procesos administrativos y legales.'], ['Impacto en tu póliza', 'Aumenta la prima en la renovación del seguro.'], isPers ? ['Impacto personal y familiar', 'Afecta la movilidad y la economía familiar.'] : ['Relación con tu cliente', 'Daños a la carga deterioran la confianza del cliente.']];
  const impW = (CW - gap) / 2;
  for (let i = 0; i < impacts.length; i += 2) {
    const l1 = doc.splitTextToSize(impacts[i][1], impW - 8).length;
    const l2 = i + 1 < impacts.length ? doc.splitTextToSize(impacts[i + 1][1], impW - 8).length : 0;
    const rH = 10 + Math.max(l1, l2) * 4; y = ensureSpace(rH + 3, y);
    for (let col = 0; col < 2 && i + col < impacts.length; col++) {
      const imp = impacts[i + col], x = MX + col * (impW + gap);
      doc.setFillColor(250, 250, 251); doc.setDrawColor(LNE[0], LNE[1], LNE[2]); doc.roundedRect(x, y, impW, rH, 2, 2, 'FD');
      doc.setFillColor(RED[0], RED[1], RED[2]); doc.rect(x, y, 1.4, rH, 'F');
      doc.setFont('helvetica', 'bold'); doc.setFontSize(9); doc.setTextColor(BLK[0], BLK[1], BLK[2]); doc.text(imp[0], x + 5, y + 6);
      doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.setTextColor(GRY[0], GRY[1], GRY[2]); doc.text(doc.splitTextToSize(imp[1], impW - 8), x + 5, y + 11);
    }
    y += rH + 3;
  }
  doc.setFont('helvetica', 'italic'); doc.setFontSize(7.5); doc.setTextColor(GRY[0], GRY[1], GRY[2]); y = ensureSpace(6, y);
  doc.text('Impacto ilustrativo según pólizas y normativas aplicables.', MX, y); y += 8;

  y = sectionTitle('Comparación con la industria', y); y = paragraph(result.industryComparison, y, 10, BLK) + 4;
  y = sectionTitle('Plan de mejora recomendado', y); y = bullets(result.plan || [], y) + 2;
  y = sectionTitle('Así te protege Detektor Roadview IA', y); y = bullets((result.benefits || []).slice(0, 2), y) + 2;

  y = ensureSpace(18, y); doc.setDrawColor(LNE[0], LNE[1], LNE[2]); doc.line(MX, y, PW - MX, y); y += 5;
  doc.setFont('helvetica', 'italic'); doc.setFontSize(7.5); doc.setTextColor(GRY[0], GRY[1], GRY[2]);
  doc.text(doc.splitTextToSize(result.disclaimer || 'Esta herramienta entrega un índice orientativo sin constituir asesoría legal o financiera.', CW), MX, y);
  
  // Retorna el PDF como un buffer para enviarlo en la respuesta HTTP
  const arrayBuffer = doc.output('arraybuffer');
  return Buffer.from(arrayBuffer);
}

module.exports = generatePdf;
