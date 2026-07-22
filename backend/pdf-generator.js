'use strict';
const { jsPDF } = require('jspdf');

// =========================================================================
// 1. FUNCIÓN PARA PROCESAR IMÁGENES MASIVAS DE FORMA SEGURA EN NODE.JS
// =========================================================================
function inyectarImagenBase64(doc, base64String, formato, x, y, w, h) {
  try {
    if (!base64String || base64String.length < 100) return;
    
    // Limpia cualquier etiqueta HTML (como <img src="...">) o saltos de línea accidentales del conversor web
    let cleanBase64 = base64String.replace(/<img src="/gi, "").replace(/">/g, "");
    cleanBase64 = cleanBase64.replace(/^data:image\/(png|jpeg|jpg|webp);base64,/, "").trim();
    
    // Transforma el string puro a un Buffer binario que jsPDF pueda procesar sin colapsar la memoria
    const buffer = Buffer.from(cleanBase64, 'base64');
    const uint8Array = new Uint8Array(buffer);
    
    // Inyecta el arreglo binario como imagen
    doc.addImage(uint8Array, formato, x, y, w, h);
  } catch (err) {
    console.error('Error inyectando imagen en jsPDF:', err);
  }
}

// =========================================================================
// 2. FUNCIÓN PARA DIBUJAR EL GRÁFICO DEL SCORE
// =========================================================================
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

// =========================================================================
// 3. FUNCIÓN PRINCIPAL DE GENERACIÓN DEL PDF (EXPORTADA)
// =========================================================================
async function generatePdf(result, lead) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const PW = 210, PH = 297, MX = 18, CW = PW - (MX * 2);
  
  // Paleta corporativa Detektor
  const RED = [227, 6, 19], WINE = [143, 20, 5], BLK = [15, 15, 15];
  const WHT = [255, 255, 255], GRY = [85, 85, 85], LGRY = [245, 245, 247], LNE = [220, 220, 225];
  
  const country = result.country || {}, selections = result.selections || {};
  
  function safeTxt(v) { return String(v == null ? '' : v); }
  function fmtNum(v) { return Math.round(Number(v || 0)).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.'); }
  let page = 0;

  // **********************************************************************************************
  // VARIABLES BASE64 MASIVAS (Usa las comillas invertidas ` ` y pega TODO tu código adentro)
  // **********************************************************************************************
  
  const imgLogo = ``; // <-- PEGA AQUÍ EL BASE64 DEL LOGO (Logo-el-cazador.png)
  const imgCamara = ``; // <-- PEGA AQUÍ EL BASE64 DE LA CÁMARA (1-roadview-ia-camara-con-inteligencia-artificial.png)

  // **********************************************************************************************

  // --- Funciones de Diagramación Internas ---
  function addFooter() {
    doc.setFillColor(BLK[0], BLK[1], BLK[2]); doc.rect(0, PH - 14, PW, 14, 'F');
    doc.setFillColor(RED[0], RED[1], RED[2]); doc.rect(0, PH - 14, 55, 14, 'F');
    
    if (imgLogo && imgLogo.length > 100) {
        inyectarImagenBase64(doc, imgLogo, 'PNG', 18, PH - 10, 28, 6);
    } else {
        doc.setFont('helvetica', 'bold'); doc.setFontSize(8); doc.setTextColor(255, 255, 255); doc.text('DETEKTOR', 18, PH - 5.5);
    }

    doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.setTextColor(255,255,255);
    doc.text('Roadview IA  ·  Seguridad para tu flota', PW - MX, PH - 5.5, { align: 'right' });
  }
  
  function newPage() { if (page > 0) doc.addPage(); page++; addFooter(); }
  function ensureSpace(h, cY) { if (cY + h > PH - 22) { newPage(); return 25; } return cY; }

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

  // ==========================================
  // INICIO DEL REPORTE: HEADER Y DATOS DEL LEAD
  // ==========================================
  newPage();
  doc.setFillColor(BLK[0], BLK[1], BLK[2]); doc.rect(0, 0, PW, 38, 'F');
  doc.setFillColor(RED[0], RED[1], RED[2]); doc.rect(0, 0, PW, 4, 'F');
  
  if (imgLogo && imgLogo.length > 100) {
      inyectarImagenBase64(doc, imgLogo, 'PNG', MX, 12, 38, 8);
  } else {
      doc.setFont('helvetica', 'bold'); doc.setFontSize(22); doc.setTextColor(255, 255, 255); doc.text('DETEKTOR', MX, 20);
  }

  doc.setFont('helvetica', 'bold'); doc.setFontSize(14); doc.setTextColor(RED[0], RED[1], RED[2]); 
  doc.text('ROADVIEW IA', MX + 42, 19.5);

  doc.setFont('helvetica', 'normal'); doc.setFontSize(10); doc.setTextColor(200, 200, 200); 
  doc.text('INFORME DE EXPOSICIÓN AL RIESGO VIAL', MX, 28);
  
  const meses = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
  const fDate = new Date();
  const dTxt = `${fDate.getDate()} de ${meses[fDate.getMonth()]} de ${fDate.getFullYear()}`;
  doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.setTextColor(255, 255, 255); 
  doc.text('Generado el ' + dTxt, PW - MX, 28, { align: 'right' });

  // DATOS DEL CLIENTE B2B
  let y = 48;
  doc.setFillColor(LGRY[0], LGRY[1], LGRY[2]); doc.roundedRect(MX, y, CW, 22, 2, 2, 'F');
  doc.setFont('helvetica', 'bold'); doc.setFontSize(8.5); doc.setTextColor(GRY[0], GRY[1], GRY[2]); doc.text('PREPARADO PARA', MX + 6, y + 8);
  doc.setFontSize(13); doc.setTextColor(BLK[0], BLK[1], BLK[2]); doc.text(safeTxt(lead.nombre), MX + 6, y + 15);
  doc.setFont('helvetica', 'normal'); doc.setFontSize(10); doc.setTextColor(GRY[0], GRY[1], GRY[2]); doc.text(safeTxt(lead.empresa), MX + 55, y + 15);
  doc.setFont('helvetica', 'bold'); doc.setFontSize(9); doc.setTextColor(BLK[0], BLK[1], BLK[2]); doc.text('Operación: ' + safeTxt(country.name || selections.country), PW - MX - 6, y + 9, { align: 'right' });
  doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.setTextColor(GRY[0], GRY[1], GRY[2]);
  doc.text([lead.correo, lead.celular].filter(Boolean).join('  |  '), PW - MX - 6, y + 15, { align: 'right' });
  y += 32;

  // SCORE GRÁFICO
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
  doc.text(doc.splitTextToSize(result.description || 'Tu perfil combina factores que mantienen una probabilidad constante de siniestros viales que debe ser gestionada.', CW - (rX - MX)), rX, y + 27);
  y += 58;

  // ESTADÍSTICAS NACIONALES
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

  // FACTORES DINÁMICOS
  y = sectionTitle('Principales factores que elevan tu riesgo', y);
  let pdfDrivers = result.drivers || ['El clima, el tráfico y las decisiones de terceros siguen siendo variables externas que deben gestionarse de forma preventiva.'];
  y = bullets(pdfDrivers, y);

  // IMPACTO ECONÓMICO (Corrección de overlap)
  y = ensureSpace(45, y);
  const ecoNoteLines = doc.splitTextToSize(safeTxt(result.estimatedCost?.note || 'El costo estimado combina gastos hospitalarios, reparación, incapacidad y póliza.'), CW - 12);
  const ecoH = 22 + (ecoNoteLines.length * 4.5); 
  
  doc.setFillColor(WINE[0], WINE[1], WINE[2]); doc.roundedRect(MX, y, CW, ecoH, 2, 2, 'F');
  doc.setFont('helvetica', 'bold'); doc.setFontSize(11); doc.setTextColor(255, 200, 200); doc.text('IMPACTO ECONÓMICO ESTIMADO', MX + 6, y + 8);
  doc.setFontSize(18); doc.setTextColor(WHT[0], WHT[1], WHT[2]); doc.text(safeTxt(result.estimatedCost?.value).replace(/₡/g, 'CRC '), MX + 6, y + 16);
  
  doc.setFont('helvetica', 'normal'); doc.setFontSize(9); 
  doc.text(ecoNoteLines, MX + 6, y + 23);
  y += ecoH + 6;

  // IMPACTO ADICIONAL (Corrección de salto de línea en las tarjetas)
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
    const lines1 = doc.splitTextToSize(impacts[i][1], impW - 10);
    const lines2 = i + 1 < impacts.length ? doc.splitTextToSize(impacts[i + 1][1], impW - 10) : [];
    const maxLines = Math.max(lines1.length, lines2.length);
    const rH = 12 + (maxLines * 4.5); 
    
    y = ensureSpace(rH + 4, y);
    for (let col = 0; col < 2 && i + col < impacts.length; col++) {
      const imp = impacts[i + col], x = MX + col * (impW + gap);
      const impLines = doc.splitTextToSize(imp[1], impW - 10); 
      
      doc.setFillColor(250, 250, 252); doc.setDrawColor(LNE[0], LNE[1], LNE[2]); doc.roundedRect(x, y, impW, rH, 2, 2, 'FD');
      doc.setFillColor(RED[0], RED[1], RED[2]); doc.rect(x, y, 2.5, rH, 'F');
      
      doc.setFont('helvetica', 'bold'); doc.setFontSize(9.5); doc.setTextColor(BLK[0], BLK[1], BLK[2]); doc.text(imp[0], x + 6, y + 6);
      doc.setFont('helvetica', 'normal'); doc.setFontSize(8.5); doc.setTextColor(GRY[0], GRY[1], GRY[2]); doc.text(impLines, x + 6, y + 11.5); 
    }
    y += rH + 4;
  }

  // COMPARACIÓN Y PLAN
  if (result.industryComparison) {
    y = sectionTitle('Comparación con la industria', y); 
    y = paragraph(result.industryComparison, y, 10.5, BLK) + 4;
  }
  if (result.plan && result.plan.length > 0) {
    y = sectionTitle('Plan de mejora recomendado', y); 
    y = bullets(result.plan, y) + 4;
  }

  // ==========================================
  // SECCIÓN COMERCIAL (AHORA FLUYE CONTINUAMENTE)
  // Sin caja oscura para que no corte la página
  // ==========================================
  
  y = sectionTitle('Así te protege Detektor Roadview IA', y);
  
  let startY = ensureSpace(45, y); 
  
  // Textos Descriptivos Izquierda
  let textW = CW - 50; // Dejamos espacio a la derecha para la cámara
  doc.setFont('helvetica', 'bold'); doc.setFontSize(10.5); doc.setTextColor(RED[0], RED[1], RED[2]);
  doc.text('1. Cámara de alta tecnología:', MX, startY + 5); 
  doc.setFont('helvetica', 'normal'); doc.setFontSize(9.5); doc.setTextColor(BLK[0], BLK[1], BLK[2]);
  let camLines = doc.splitTextToSize('Monitoreo continuo hacia adentro y hacia afuera. Su asistente inteligente vigila el comportamiento de la vía, alertando de forma oportuna para prevenir riesgos antes de que se conviertan en accidentes.', textW);
  doc.text(camLines, MX, startY + 10);
  
  let nextY = startY + 10 + (camLines.length * 4.5) + 6;
  
  doc.setFont('helvetica', 'bold'); doc.setFontSize(10.5); doc.setTextColor(RED[0], RED[1], RED[2]);
  doc.text('2. Inteligencia Artificial:', MX, nextY); 
  doc.setFont('helvetica', 'normal'); doc.setFontSize(9.5); doc.setTextColor(BLK[0], BLK[1], BLK[2]);
  let iaLines = doc.splitTextToSize('Vigila el estado del conductor al volante emitiendo alertas automáticas de voz inmediatas en caso de detectar fatiga, microsueños, uso del celular o cualquier distracción.', textW);
  doc.text(iaLines, MX, nextY + 5);
  
  // Inyección de la cámara a la derecha
  if (imgCamara && imgCamara.length > 100) {
      inyectarImagenBase64(doc, imgCamara, 'PNG', PW - MX - 45, startY + 2, 45, 45);
  }

  // Avanzamos el puntero Y debajo de los textos y la imagen
  y = Math.max(startY + 50, nextY + 5 + (iaLines.length * 4.5) + 6); 

  // Viñetas Dinámicas que soportan salto de página natural
  const features = [
    'Grabación optimizada en clips cortos para fácil descarga.',
    'Descarga del video posterior a los eventos.',
    'Monitoreo del comportamiento de conducción.',
    'Espacio específico de memoria para almacenamiento de eventos como posibles choques, giros bruscos, frenadas fuertes, fatiga, uso teléfono, fumar, no uso de cinturón.',
    'Alarmas de voz cuando se comete alguna acción catalogada como alarma.',
    'Registro de alarmas mientras el vehículo esté encendido.'
  ];

  y = bullets(features, y);

  // Call To Action (Botón de WhatsApp en PDF)
  y = ensureSpace(25, y);
  const btnW = 100, btnH = 12;
  const btnX = (PW - btnW) / 2;
  const btnY = y + 6; 
  doc.setFillColor(RED[0], RED[1], RED[2]); 
  doc.roundedRect(btnX, btnY, btnW, btnH, 2, 2, 'F');
  doc.setFont('helvetica', 'bold'); doc.setFontSize(10); doc.setTextColor(255, 255, 255);
  doc.text('COTIZAR CON UN ASESOR VÍA WHATSAPP', PW / 2, btnY + 8, { align: 'center' });
  doc.link(btnX, btnY, btnW, btnH, { url: 'https://wa.link/7679nl' });

  y = btnY + btnH + 12;

  // Disclaimer Técnico
  doc.setFont('helvetica', 'italic'); doc.setFontSize(7.5); doc.setTextColor(120, 120, 120);
  y = ensureSpace(10, y);
  doc.text(doc.splitTextToSize(result.disclaimer || 'Resultado estimado con fines informativos y referenciales. No constituye una cotización de seguros ni garantiza la ocurrencia o el costo de futuros siniestros.', CW), MX, y);

  const arrayBuffer = doc.output('arraybuffer');
  return Buffer.from(arrayBuffer);
}

module.exports = generatePdf;

module.exports = generatePdf;
