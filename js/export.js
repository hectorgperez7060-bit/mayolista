// ============================================================
// MAYOLISTA — Export Engine  v1.0
// WhatsApp text | Excel (.xlsx) | PDF (jsPDF)
// ============================================================

const EXPORTER = {

  // ── WhatsApp text ──────────────────────────────────────────
  buildWhatsAppText(items, session) {
    const total = items.reduce((s, i) => s + i.total, 0);
    const lines = [
      `🛒 *PEDIDO MAYORISTA*`,
      `📅 ${APP.formatDate()}`,
      `─────────────────────────`,
      `🏪 *${session.comercio || 'Sin comercio'}*`,
      session.cuit      ? `📋 CUIT: ${session.cuit}` : null,
      session.direccion ? `📍 ${session.direccion}` : null,
      `─────────────────────────`,
      `👤 Vendedor: ${session.vendedor || '—'} | Leg. ${session.legajo || '—'}`,
      session.mayorista ? `🏭 ${session.mayorista}` : null,
      `─────────────────────────`,
    ].filter(Boolean);

    items.forEach(item => {
      const dto = item.descuento > 0 ? ` (-${item.descuento}%)` : '';
      lines.push(`• *${item.cantidad}x* ${item.descripcion}${dto}`);
      lines.push(`  ${APP.formatCurrency(item.total)}`);
    });

    lines.push(`─────────────────────────`);
    lines.push(`💰 *TOTAL: ${APP.formatCurrency(total)}*`);
    lines.push(`_${items.length} ítem${items.length !== 1 ? 's' : ''}_`);
    return lines.join('\n');
  },

  sendWhatsApp(items, session) {
    if (!items.length) { APP.showToast('El pedido está vacío', 'error'); return; }
    const text = this.buildWhatsAppText(items, session);
    const url  = `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  },

  // ── Email export ────────────────────────────────────────────
  sendEmail(items, session) {
    if (!items.length) { APP.showToast('El pedido está vacío', 'error'); return; }
    const subject = encodeURIComponent(`Pedido ${session.comercio || ''} — ${APP.formatDate()}`);
    const body    = encodeURIComponent(this.buildWhatsAppText(items, session));
    const to      = encodeURIComponent(session.emailMayorista || '');
    window.location.href = `mailto:${to}?subject=${subject}&body=${body}`;
  },

  // ── Excel export ───────────────────────────────────────────
  toExcel(items, session) {
    if (!items.length) { APP.showToast('El pedido está vacío', 'error'); return; }
    if (typeof XLSX === 'undefined') { APP.showToast('Cargando Excel...', 'warning'); return; }

    const wb  = XLSX.utils.book_new();
    const hdr = [
      [`PEDIDO — ${session.comercio || ''}`],
      [`Fecha: ${APP.formatDate()}`],
      [`Vendedor: ${session.vendedor || '—'}  |  Legajo: ${session.legajo || '—'}`],
      [`CUIT: ${session.cuit || '—'}  |  Dirección: ${session.direccion || '—'}`],
      session.mayorista ? [`Mayorista: ${session.mayorista}`] : [],
      [],
      ['Código', 'Descripción', 'Cantidad', 'Precio Unit.', 'Descuento %', 'Total'],
    ];

    const rows = items.map(i => [
      i.codigo || '—', i.descripcion, i.cantidad,
      i.precio, i.descuento || 0, i.total,
    ]);

    const total = items.reduce((s, i) => s + i.total, 0);
    const footer = [[], ['', '', '', '', 'TOTAL:', total]];

    const ws = XLSX.utils.aoa_to_sheet([...hdr, ...rows, ...footer]);
    ws['!cols'] = [
      {wch:12},{wch:46},{wch:10},{wch:14},{wch:13},{wch:16},
    ];
    XLSX.utils.book_append_sheet(wb, ws, 'Pedido');

    const name = `pedido_${(session.comercio||'Sin_cliente').replace(/\s+/g,'_')}_${new Date().toISOString().slice(0,10)}.xlsx`;
    XLSX.writeFile(wb, name);
    APP.showToast('✓ Excel descargado', 'success');
  },

  // ── PDF export ─────────────────────────────────────────────
  toPDF(items, session) {
    if (!items.length) { APP.showToast('El pedido está vacío', 'error'); return; }
    const jspdfLib = window.jspdf || window.jsPDF;
    if (!jspdfLib) { APP.showToast('Cargando PDF...', 'warning'); return; }
    const { jsPDF } = jspdfLib;

    const doc = new jsPDF({ orientation:'p', unit:'mm', format:'a4' });
    const W   = doc.internal.pageSize.getWidth();
    const M   = 14;   // margin
    let y = 0;

    // ── Header bar ──
    doc.setFillColor(30, 58, 138); // deep blue
    doc.rect(0, 0, W, 38, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(24); doc.setFont('helvetica','bold');
    doc.text('MAYOLISTA', M, 16);
    doc.setFontSize(9); doc.setFont('helvetica','normal');
    doc.text('Sistema de Pedidos Mayoristas', M, 23);
    if (session.mayorista) {
      doc.setFontSize(11); doc.setFont('helvetica','bold');
      doc.text(session.mayorista.toUpperCase(), W - M, 22, {align:'right'});
    }
    y = 48;

    // ── Session info box ──
    doc.setFillColor(243, 244, 246);
    doc.roundedRect(M, y, W - M*2, 28, 2, 2, 'F');
    doc.setTextColor(40, 40, 40);
    doc.setFontSize(9); doc.setFont('helvetica','bold');
    doc.text('CLIENTE:', M+3, y+7);
    doc.setFont('helvetica','normal');
    doc.text(session.comercio || '—', M+22, y+7);
    if (session.cuit) { doc.setFont('helvetica','bold'); doc.text('CUIT:', W/2, y+7); doc.setFont('helvetica','normal'); doc.text(session.cuit, W/2+12, y+7); }
    if (session.direccion) { doc.text(session.direccion, M+3, y+14); }
    doc.setFont('helvetica','bold'); doc.text('VENDEDOR:', M+3, y+21);
    doc.setFont('helvetica','normal');
    doc.text(`${session.vendedor || '—'}   |   Leg. ${session.legajo || '—'}`, M+26, y+21);
    doc.setFont('helvetica','bold'); doc.text('FECHA:', W/2, y+21);
    doc.setFont('helvetica','normal'); doc.text(APP.formatDate(), W/2+14, y+21);
    y += 34;

    // ── Table header ──
    const cols = { cod: M, desc: M+18, qty: M+100, prec: M+115, dto: M+133, tot: M+148 };
    doc.setFillColor(17, 24, 39);
    doc.rect(M, y, W-M*2, 9, 'F');
    doc.setTextColor(255,255,255);
    doc.setFontSize(7.5); doc.setFont('helvetica','bold');
    doc.text('CÓDIGO',     cols.cod+1,  y+6);
    doc.text('DESCRIPCIÓN',cols.desc,   y+6);
    doc.text('CANT.',       cols.qty+6,  y+6, {align:'right'});
    doc.text('PRECIO',      cols.prec+14,y+6, {align:'right'});
    doc.text('DTO%',        cols.dto+10, y+6, {align:'right'});
    doc.text('TOTAL',       cols.tot+20, y+6, {align:'right'});
    y += 11;

    // ── Table rows ──
    let grand = 0;
    items.forEach((item, idx) => {
      if (y > 262) { doc.addPage(); y = 20; }
      if (idx % 2 === 0) {
        doc.setFillColor(249,250,251);
        doc.rect(M, y-3.5, W-M*2, 9, 'F');
      }
      doc.setTextColor(30,30,30);
      doc.setFontSize(7.5); doc.setFont('helvetica','normal');
      const d = item.descripcion.length>52 ? item.descripcion.slice(0,50)+'…' : item.descripcion;
      doc.text(item.codigo||'—',              cols.cod+1,   y+2);
      doc.text(d,                             cols.desc,    y+2);
      doc.text(String(item.cantidad),         cols.qty+6,   y+2, {align:'right'});
      doc.text(APP.formatCurrency(item.precio), cols.prec+14, y+2, {align:'right'});
      doc.text(`${item.descuento||0}%`,       cols.dto+10,  y+2, {align:'right'});
      doc.setFont('helvetica','bold');
      doc.text(APP.formatCurrency(item.total),cols.tot+20,  y+2, {align:'right'});
      grand += item.total;
      y += 9;
    });

    // ── Total bar ──
    y += 3;
    doc.setFillColor(30, 58, 138);
    doc.rect(M, y, W-M*2, 12, 'F');
    doc.setTextColor(255,255,255);
    doc.setFontSize(11); doc.setFont('helvetica','bold');
    doc.text('TOTAL DEL PEDIDO:', M+3, y+8.5);
    doc.text(APP.formatCurrency(grand), W-M-3, y+8.5, {align:'right'});

    // ── Footer ──
    doc.setTextColor(160,160,160);
    doc.setFontSize(7); doc.setFont('helvetica','normal');
    doc.text('Generado por Mayolista — Sistema de Pedidos Mayoristas', W/2, 292, {align:'center'});

    const name = `pedido_${(session.comercio||'Sin_cliente').replace(/\s+/g,'_')}_${new Date().toISOString().slice(0,10)}.pdf`;
    doc.save(name);
    APP.showToast('✓ PDF descargado', 'success');
  },
};
