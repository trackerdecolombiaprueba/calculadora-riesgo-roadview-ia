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
  
  // Paleta de colores ajustada
  const RED = [227, 6, 19], WINE = [143, 20, 5], BLK = [10, 10, 10];
  const WHT = [255, 255, 255], GRY = [85, 85, 85], LGRY = [242, 242, 242], LNE = [220, 220, 220];
  
  const country = result.country || {}, selections = result.selections || {};
  
  function safeTxt(v) { return String(v == null ? '' : v); }
  function fmtNum(v) { return Math.round(Number(v || 0)).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.'); }
  let page = 0;

  function addFooter() {
    doc.setFillColor(BLK[0], BLK[1], BLK[2]); doc.rect(0, PH - 14, PW, 14, 'F');
    doc.setFillColor(RED[0], RED[1], RED[2]); doc.rect(0, PH - 14, 55, 14, 'F');
    doc.setFont('helvetica', 'bold'); doc.setFontSize(8); doc.setTextColor(255, 255, 255); doc.text('DETEKTOR', 18, PH - 5.5);
    doc.setFont('helvetica', 'normal'); doc.text('Roadview IA  ·  Seguridad para tu flota en carretera', PW - MX, PH - 5.5, { align: 'right' });
  }
  
  function newPage() { if (page > 0) doc.addPage(); page++; addFooter(); }
  function ensureSpace(h, cY) { if (cY + h > PH - 20) { newPage(); return 30; } return cY; }

  function sectionTitle(txt, cY) {
    cY = ensureSpace(16, cY); 
    doc.setFillColor(RED[0], RED[1], RED[2]); doc.rect(MX, cY - 4, 3, 6, 'F');
    doc.setFont('helvetica', 'bold'); doc.setFontSize(12); doc.setTextColor(BLK[0], BLK[1], BLK[2]);
    doc.text(safeTxt(txt).toUpperCase(), MX + 7, cY + 0.8); cY += 4; 
    doc.setDrawColor(LNE[0], LNE[1], LNE[2]); doc.setLineWidth(0.3);
    doc.line(MX, cY, PW - MX, cY); return cY + 7;
  }

  // HEADER COMERCIAL
  newPage();
  doc.setFillColor(BLK[0], BLK[1], BLK[2]); doc.rect(0, 0, PW, 38, 'F');
  doc.setFillColor(RED[0], RED[1], RED[2]); doc.rect(0, 0, PW, 4, 'F');
  doc.setFont('helvetica', 'bold'); doc.setFontSize(22); doc.setTextColor(255, 255, 255); 
  doc.text('DETEKTOR ROADVIEW IA', MX, 20);
  doc.setFont('helvetica', 'normal'); doc.setFontSize(10); doc.setTextColor(200, 200, 200); 
  doc.text('INFORME DE EXPOSICIÓN AL RIESGO VIAL', MX, 28);
  const dTxt = new Date().toLocaleDateString('es-CO', { day: '2-digit', month: '2-digit', year: 'numeric' });
  doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.setTextColor(255, 255, 255); 
  doc.text('Generado el: ' + dTxt, PW - MX, 28, { align: 'right' });

  // DATOS DEL LEAD (Estructura más limpia B2B)
  let y = 48;
  doc.setFillColor(LGRY[0], LGRY[1], LGRY[2]); doc.roundedRect(MX, y, CW, 22, 2, 2, 'F');
  doc.setFont('helvetica', 'bold'); doc.setFontSize(8.5); doc.setTextColor(GRY[0], GRY[1], GRY[2]); doc.text('PREPARADO PARA', MX + 6, y + 8);
  doc.setFontSize(13); doc.setTextColor(BLK[0], BLK[1], BLK[2]); doc.text(safeTxt(lead.nombre), MX + 6, y + 15);
  doc.setFont('helvetica', 'normal'); doc.setFontSize(10); doc.setTextColor(GRY[0], GRY[1], GRY[2]); doc.text(safeTxt(lead.empresa), MX + 55, y + 15);
  
  doc.setFont('helvetica', 'bold'); doc.setFontSize(9); doc.setTextColor(BLK[0], BLK[1], BLK[2]); doc.text('Operación: ' + safeTxt(country.name || selections.country), PW - MX - 6, y + 9, { align: 'right' });
  doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.setTextColor(GRY[0], GRY[1], GRY[2]);
  doc.text([lead.correo, lead.celular].filter(Boolean).join('  |  '), PW - MX - 6, y + 15, { align: 'right' });
  y += 32;

  // SECCIÓN DE SCORE
  const gX = MX + 26, gY = y + 24, gR = 24;
  drawPdfGauge(doc, gX, gY, gR, 0, 100, [230, 230, 230], 7);
  drawPdfGauge(doc, gX, gY, gR, 0, Number(result.score || 0), RED, 7);
  doc.setFont('helvetica', 'bold'); doc.setFontSize(26); doc.setTextColor(RED[0], RED[1], RED[2]); doc.text(safeTxt(result.score), gX, gY + 3, { align: 'center' });

  const rX = gX + gR + 18;
  doc.setFillColor(RED[0], RED[1], RED[2]); doc.roundedRect(rX, y + 2, 50, 9, 2, 2, 'F');
  doc.setFont('helvetica', 'bold'); doc.setFontSize(10); doc.setTextColor(255, 255, 255); doc.text('RIESGO ' + safeTxt(result.level).toUpperCase(), rX + 25, y + 8.5, { align: 'center' });
  doc.setFontSize(14); doc.setTextColor(BLK[0], BLK[1], BLK[2]); doc.text(safeTxt(result.title || result.headline), rX, y + 19);
  doc.setFont('helvetica', 'normal'); doc.setFontSize(9.5); doc.setTextColor(GRY[0], GRY[1], GRY[2]);
  doc.text(doc.splitTextToSize("En la vía, toda operación exige prevención continua. La tasa estimada de mortalidad vial usada como variable en esta región es de " + (country.rate || '16.0') + " por cada 100k habitantes.", CW - (rX - MX)), rX, y + 27);
  y += 58;

  // NUEVA SECCIÓN VENDEDORA: ROADVIEW IA AL RESCATE
  y = ensureSpace(60, y);
  doc.setFillColor(15, 15, 15); // Fondo oscuro premium
  doc.roundedRect(MX, y, CW, 65, 3, 3, 'F');
  doc.setFont('helvetica', 'bold'); doc.setFontSize(14); doc.setTextColor(RED[0], RED[1], RED[2]);
  doc.text('ASÍ TE PROTEGE DETEKTOR ROADVIEW IA', MX + 8, y + 10);
  doc.setFont('helvetica', 'normal'); doc.setFontSize(10); doc.setTextColor(200, 200, 200);
  doc.text('Cámara con Inteligencia Artificial que previene accidentes por fatiga y distracción.', MX + 8, y + 16);
  
  // Viñetas a dos columnas
  doc.setFontSize(9.5); doc.setTextColor(255, 255, 255);
  const col1 = [
      '• Doble lente (Alta def. y nocturna).',
      '• Grabación interior/exterior con audio.',
      '• IA: Detecta distracciones y fatiga.',
      '• Alarmas de voz automáticas ante riesgo.'
  ];
  const col2 = [
      '• Video guardado a los 15 seg. del evento.',
      '• 128 GB SD (46 hrs) + 3 GB en nube.',
      '• SIM hasta 40 GB para streaming en vivo.',
      '• Notificaciones inmediatas (App/Correo).'
  ];
  
  let listY = y + 28;
  col1.forEach((item, i) => {
      doc.text(item, MX + 8, listY + (i * 7));
      doc.text(col2[i], MX + 95, listY + (i * 7));
  });

  // ********** ESPACIO PARA IMAGEN **********
  // Aquí debes colocar la imagen Base64 (PNG/JPEG).
  // doc.addImage(base64CameraImage, 'PNG', PW - MX - 40, y + 25, 35, 35);
  y += 75;

  // ESTADÍSTICAS DEL PAÍS
  y = sectionTitle('Panorama de Siniestralidad Operativa (' + safeTxt(country.name || selections.country) + ')', y);
  const stats = [['Accidentes', fmtNum(country.accidents)], ['Lesionados', fmtNum(country.injured)], ['Muertes', fmtNum(country.deaths)], ['Tasa / 100k hab.', Number(country.rate || 0).toFixed(1)]];
  const gap = 4, cW = (CW - gap * 3) / 4;
  stats.forEach(function (s, i) {
    const x = MX + i * (cW + gap); doc.setFillColor(255, 255, 255); doc.setDrawColor(LNE[0], LNE[1], LNE[2]); doc.roundedRect(x, y, cW, 18, 2, 2, 'FD');
    doc.setFillColor(RED[0], RED[1], RED[2]); doc.rect(x, y + 16, cW, 2, 'F');
    doc.setFont('helvetica', 'bold'); doc.setFontSize(14); doc.setTextColor(BLK[0], BLK[1], BLK[2]); doc.text(s[1], x + cW / 2, y + 8, { align: 'center' });
    doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.setTextColor(GRY[0], GRY[1], GRY[2]); doc.text(s[0], x + cW / 2, y + 13, { align: 'center' });
  });
  y += 26;

  // IMPACTOS ECONÓMICOS
  y = ensureSpace(35, y);
  const impW = (CW - gap) / 2;
  
  // Caja de Impacto Económico
  doc.setFillColor(WINE[0], WINE[1], WINE[2]); doc.roundedRect(MX, y, impW, 30, 2, 2, 'F');
  doc.setFont('helvetica', 'bold'); doc.setFontSize(11); doc.setTextColor(255, 200, 200); doc.text('IMPACTO ECONÓMICO ESTIMADO', MX + 6, y + 8);
  doc.setFontSize(16); doc.setTextColor(WHT[0], WHT[1], WHT[2]); doc.text(safeTxt(result.estimatedCost?.value).replace(/₡/g, 'CRC '), MX + 6, y + 16);
  doc.setFont('helvetica', 'normal'); doc.setFontSize(8.5); doc.text('Costos de hospitalización, reparaciones e incapacidad.', MX + 6, y + 24);

  // Caja de Impacto Operativo
  const xOp = MX + impW + gap;
  doc.setFillColor(250, 250, 250); doc.setDrawColor(LNE[0], LNE[1], LNE[2]); doc.roundedRect(xOp, y, impW, 30, 2, 2, 'FD');
  doc.setFont('helvetica', 'bold'); doc.setFontSize(10); doc.setTextColor(BLK[0], BLK[1], BLK[2]); doc.text('Impacto adicional en operación', xOp + 6, y + 8);
  doc.setFontSize(8.5);
  doc.text('• Vehículo detenido:', xOp + 6, y + 15); doc.setFont('helvetica', 'normal'); doc.text('Ingresos perdidos.', xOp + 38, y + 15);
  doc.setFont('helvetica', 'bold'); doc.text('• Sanciones:', xOp + 6, y + 20); doc.setFont('helvetica', 'normal'); doc.text('Procesos y multas.', xOp + 28, y + 20);
  doc.setFont('helvetica', 'bold'); doc.text('• Pólizas:', xOp + 6, y + 25); doc.setFont('helvetica', 'normal'); doc.text('Aumento de primas.', xOp + 22, y + 25);
  y += 40;

  // CTA (Call To Action) Vendedor
  y = ensureSpace(25, y);
  doc.setFillColor(RED[0], RED[1], RED[2]); doc.roundedRect(MX, y, CW, 12, 2, 2, 'F');
  doc.setFont('helvetica', 'bold'); doc.setFontSize(12); doc.setTextColor(255, 255, 255);
  doc.text('COTIZAR CON UN ASESOR VÍA WHATSAPP', PW / 2, y + 8, { align: 'center' });

  // Output
  const arrayBuffer = doc.output('arraybuffer');
  return Buffer.from(arrayBuffer);
}

module.exports = generatePdf;
