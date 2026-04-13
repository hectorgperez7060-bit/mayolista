// ============================================================
// MAYOLISTA — Pedido Screen Logic  v1.1
// Voice capture → fuzzy search → order grid → export
// ============================================================

// ── DOM helpers ───────────────────────────────────────────────
const $ = id => document.getElementById(id);

// ── State ──────────────────────────────────────────────────────
let orderItems   = [];
let catalog      = [];
let session      = {};
let currentQty   = 1;
let fuseInstance = null;
let lastResults  = [];
let voice        = null;

// ── Init ───────────────────────────────────────────────────────
async function init() {
  session = APP.getSession() || {};

  // Guard: redirect if no session
  if (!session.vendedor) {
    window.location.href = 'index.html';
    return;
  }

  // Header info
  setText('headerMayorista', session.mayorista || 'Mayolista');
  setText('headerComercio',  session.comercio  || 'Sin cliente');
  setText('headerVendedor',  session.vendedor   || '');

  // Load catalog (storage → default JSON fallback)
  catalog = APP.getCatalog();
  if (!catalog.length) {
    catalog = await APP.loadDefaultCatalog();
  }
  initFuse();

  // Load saved order
  orderItems = APP.getOrder();
  renderTable();

  // Voice engine
  initVoice();

  // Event listeners
  bindEvents();
}

function setText(id, val) {
  const el = $(id); if (el) el.textContent = val;
}

// ── Fuse.js fuzzy search init ──────────────────────────────────
function initFuse() {
  if (typeof Fuse === 'undefined' || !catalog.length) return;
  
  // Precomputar descripción sin acentos para mejor coincidencia
  catalog.forEach(p => p._searchDesc = APP._norm(p.descripcion || ''));

  fuseInstance = new Fuse(catalog, {
    keys: [
      { name: 'descripcion', weight: 0.7 },
      { name: '_searchDesc', weight: 0.8 },
      { name: 'codigo',      weight: 0.2 },
      { name: 'categoria',   weight: 0.1 },
    ],
   threshold: 0.6,
includeScore: true,
ignoreLocation: true,
minMatchCharLength: 2,
distance: 200,
  });
}

// ── Voice ──────────────────────────────────────────────────────
function initVoice() {
  voice = new VoiceEngine(
    transcript => processTranscript(transcript),
    (state, text) => updateMicUI(state, text),
  );
  if (!voice.supported) {
    const btn = $('micBtn');
    if (btn) { btn.style.opacity = '0.45'; btn.title = 'Voz no disponible — usá el campo de texto'; }
    setText('captureStatusText', 'Usá el campo de texto para buscar');
  }
}

function updateMicUI(state, text) {
  const btn  = $('micBtn');
  const lbl  = $('captureStatusLabel');
  const txt  = $('captureStatusText');
  const r1   = $('micRipple');
  const r2   = $('micRipple2');
  if (!btn) return;

  btn.className = 'mic-button';
  if (r1) r1.style.display = 'none';
  if (r2) r2.style.display = 'none';
  if (txt) { txt.textContent = text; txt.className = 'capture-status-text'; }

  if (state === 'listening') {
    btn.classList.add('listening');
    btn.innerHTML = '⏸ <div class="mic-ripple" id="micRipple"></div><div class="mic-ripple-2" id="micRipple2"></div>';
    if (lbl) { lbl.textContent = '● GRABANDO'; lbl.style.color = 'var(--danger)'; }
  } else if (state === 'paused') {
    btn.classList.add('paused');
    btn.innerHTML = '🎙️';
    if (lbl) { lbl.textContent = '⏸ PAUSADO'; lbl.style.color = 'var(--warning)'; }
  } else if (state === 'interim' || state === 'processing') {
    btn.classList.add('listening');
    btn.innerHTML = '⏸ <div class="mic-ripple" id="micRipple"></div><div class="mic-ripple-2" id="micRipple2"></div>';
    if (txt) txt.className = 'capture-status-text interim';
    if (lbl) { lbl.textContent = '◉ PROCESANDO'; lbl.style.color = 'var(--primary)'; }
  } else {
    btn.innerHTML = '🎙️';
    if (lbl) { lbl.textContent = 'MICRÓFONO'; lbl.style.color = 'var(--text-muted)'; }
  }
}

// ── Process voice transcript (AI-first, local fallback) ──────────
// Returns a promise — result applied when ready
async function processTranscript(text) {
  // Show interim text immediately
  const input = $('manualInput');
  if (input) input.value = text;

  let cantidad = 1, producto = text;

  // Try AI first
  if (typeof AI !== 'undefined' && AI.isEnabled()) {
    setText('captureStatusText', '✨ IA procesando...');
    const aiResult = await AI.parse(text);
    if (aiResult) {
      cantidad = aiResult.cantidad;
      producto = aiResult.producto;
      setText('captureStatusText', `✨ IA: ${cantidad}x "${producto}"`);
    } else {
      // Fallback to local
      const local = APP.parseQtyAndProduct(text);
      cantidad = local.cantidad;
      producto = local.producto;
    }
  } else {
    const local = APP.parseQtyAndProduct(text);
    cantidad = local.cantidad;
    producto = local.producto;
  }

  currentQty = cantidad;
  if (input) input.value = producto;
  doSearch(producto);
}

// ── Smart parse: AI or local ─────────────────────────────
async function smartParse(text) {
  if (typeof AI !== 'undefined' && AI.isEnabled()) {
    const aiResult = await AI.parse(text);
    if (aiResult) return aiResult;
  }
  return APP.parseQtyAndProduct(text);
}

// ── Product search ─────────────────────────────────────────────
function doSearch(query) {
  if (!query || query.trim().length < 2) { hideResults(); return; }

  const qNorm = APP._norm(query.trim());
  const words = qNorm.split(/\s+/).filter(w => w.length > 0);

  // 1. Token search (strict but ignores order, e.g. "aceite girasol" == "Girasol aceite")
  let results = catalog.filter(p => {
    const combined = (p._searchDesc || '') + ' ' + APP._norm(p.categoria || '') + ' ' + (p.codigo || '');
    return words.every(w => combined.includes(w));
  });

  // 2. Fallback to Fuse (fuzzy) if we have very few results (handles typos like "azcr" -> "azucar")
  if (results.length < 3 && fuseInstance) {
   const fuseRes = fuseInstance.search(qNorm, { limit: 20 }).map(r => r.item);
    fuseRes.forEach(item => {
      if (!results.includes(item)) results.push(item);
    });
  }

  lastResults = results.slice(0, 10);
  showResults();
}

function showResults() {
  const panel = $('resultsPanel');
  const list  = $('resultsList');
  const count = $('resultsCount');
  if (!panel) return;

  if (!lastResults.length) {
    if (count) count.textContent = 'Sin coincidencias';
    if (list)  list.innerHTML = `<div style="padding:18px;text-align:center;color:var(--text-muted);font-size:.875rem">No se encontraron productos<br><small>Intentá con otro término</small></div>`;
    panel.classList.add('visible');
    return;
  }

  if (count) count.textContent = `${lastResults.length} resultado${lastResults.length > 1 ? 's' : ''} — Cantidad: ${currentQty}`;
  if (list) {
    list.innerHTML = lastResults.map((item, idx) => `
      <div class="result-item" onclick="addProduct(${idx})" id="res_${idx}">
        <div class="result-item-info">
          <div class="result-item-desc">${APP.esc(item.descripcion)}</div>
          <div class="result-item-code">${APP.esc(item.codigo || '')} · ${APP.esc(item.categoria || '')}</div>
        </div>
        <div class="result-item-price">${APP.formatCurrency(item.precio)}</div>
      </div>
    `).join('');
  }
  panel.classList.add('visible');
}

function hideResults() {
  const panel = $('resultsPanel');
  if (panel) panel.classList.remove('visible');
}

// ── Add product to order ───────────────────────────────────────
function addProduct(idx) {
  const item = lastResults[idx];
  if (!item) return;

  // If already in order (same codigo), increment qty
  const existing = item.codigo
    ? orderItems.find(o => o.codigo && o.codigo === item.codigo)
    : null;

  if (existing) {
    existing.cantidad += currentQty;
    existing.total = calcTotal(existing.cantidad, existing.precio, existing.descuento, existing.promoType, existing.promoN);
    APP.showToast(`+${currentQty} → ${item.descripcion.slice(0,28)}…`, 'success');
  } else {
    orderItems.push({
      id:          Date.now(),
      codigo:      item.codigo      || '',
      descripcion: item.descripcion || '',
      cantidad:    currentQty,
      precio:      item.precio      || 0,
      descuento:   0,
      promoType:   'pct',
      promoN:      0,
      total:       calcTotal(currentQty, item.precio || 0, 0, 'pct', 0),
    });
    APP.showToast(`✓ ${item.descripcion.slice(0,28)}… agregado`, 'success');
  }

  APP.saveOrder(orderItems);
  renderTable();
  hideResults();

  const input = $('manualInput');
  if (input) input.value = '';
  currentQty = 1;

  // Resume listening if was paused by selection
  if (voice && voice.state === 'paused') voice.resume();
}

// ── Calculation ────────────────────────────────────────────────
// promoType: 'pct' = percentage discount, 'nplus' = N+1 bonification
function calcTotal(qty, price, discount, promoType, promoN) {
  if (promoType === 'nplus' && promoN > 0) {
    // N+1: for every (promoN+1) units ordered, only promoN are charged
    // e.g. promoN=11 means buy 12, pay 11 (classic "11+1")
    const groups    = Math.floor(qty / (promoN + 1));
    const remainder = qty % (promoN + 1);
    return (groups * promoN + remainder) * price;
  }
  return (qty * price) * (1 - (discount || 0) / 100);
}

// ── Render order table ─────────────────────────────────────────
function renderTable() {
  const tbody = $('orderTableBody');
  const empty = $('orderEmpty');
  const cnt   = $('itemCount');

  if (!tbody) return;

  if (!orderItems.length) {
    if (empty) empty.style.display = 'block';
    tbody.innerHTML = '';
    if (cnt) cnt.textContent = '0 productos';
    updateFooterTotal();
    return;
  }
  if (empty) empty.style.display = 'none';

  tbody.innerHTML = orderItems.map(item => {
    const isNplus = item.promoType === 'nplus';
    const promoVal = isNplus ? (item.promoN || 11) : (item.descuento || 0);
    const promoField = isNplus ? 'promoN' : 'descuento';
    return `
    <tr data-id="${item.id}">
      <td>
        <div class="cell-desc" title="${APP.esc(item.descripcion)}">${APP.esc(item.descripcion)}</div>
        <div class="cell-code">${APP.esc(item.codigo)}</div>
      </td>
      <td>
        <input class="cell-input" type="number" min="1"
          value="${item.cantidad}"
          onchange="updateItem(${item.id},'cantidad',this.value)"
          aria-label="Cantidad">
      </td>
      <td>
        <input class="cell-input" type="number" min="0" step="1"
          value="${item.precio}"
          onchange="updateItem(${item.id},'precio',this.value)"
          aria-label="Precio">
      </td>
      <td>
        <div class="promo-cell">
          <button class="promo-type-btn ${isNplus ? 'nplus' : ''}"
            onclick="updatePromoType(${item.id})"
            title="${isNplus ? 'Modo N+1 (bonificación) — tocá para cambiar a descuento %' : 'Modo descuento % — tocá para cambiar a N+1'}">
            ${isNplus ? 'N+1' : 'DTO'}
          </button>
          <input class="cell-input" type="number" min="0"
            style="width:44px"
            value="${promoVal}"
            onchange="updateItem(${item.id},'${promoField}',this.value)"
            title="${isNplus ? 'Unidades base del grupo N+1 (ej: 11 = lleva 12 paga 11)' : 'Descuento en %'}"
            aria-label="Promo">
        </div>
      </td>
      <td class="cell-total" id="tot_${item.id}">${APP.formatCurrency(item.total)}</td>
      <td><button class="btn-delete" onclick="removeItem(${item.id})" aria-label="Eliminar">✕</button></td>
    </tr>
  `;}).join('');

  if (cnt) cnt.textContent = `${orderItems.length} prod.`;
  updateFooterTotal();
}

// ── Update single item ─────────────────────────────────────────
function updateItem(id, field, value) {
  const item = orderItems.find(i => i.id === id);
  if (!item) return;
  if      (field === 'cantidad')  item.cantidad  = Math.max(1, parseInt(value) || 1);
  else if (field === 'precio')    item.precio    = parseFloat(value) || 0;
  else if (field === 'descuento') item.descuento = Math.min(100, Math.max(0, parseFloat(value) || 0));
  else if (field === 'promoN')    item.promoN    = Math.max(0, parseInt(value) || 0);
  item.total = calcTotal(item.cantidad, item.precio, item.descuento, item.promoType, item.promoN);
  const cell = $(`tot_${id}`);
  if (cell) cell.textContent = APP.formatCurrency(item.total);
  APP.saveOrder(orderItems);
  updateFooterTotal();
}

// ── Toggle promo type for item ─────────────────────────────────
function updatePromoType(id) {
  const item = orderItems.find(i => i.id === id);
  if (!item) return;
  if (item.promoType === 'nplus') {
    item.promoType = 'pct';
    item.promoN = 0;
  } else {
    item.promoType = 'nplus';
    item.promoN = item.promoN || 11; // default 11+1
    item.descuento = 0;
  }
  item.total = calcTotal(item.cantidad, item.precio, item.descuento, item.promoType, item.promoN);
  APP.saveOrder(orderItems);
  renderTable();
  APP.showToast(item.promoType === 'nplus' ? '✓ Bonificación N+1 activada' : '✓ Descuento % activado', 'success');
}

// ── Remove item ────────────────────────────────────────────────
function removeItem(id) {
  orderItems = orderItems.filter(i => i.id !== id);
  APP.saveOrder(orderItems);
  renderTable();
}

// ── Footer total ───────────────────────────────────────────────
function updateFooterTotal() {
  const total = orderItems.reduce((s, i) => s + i.total, 0);
  setText('totalAmount', APP.formatCurrency(total));
}

// ── Bind events ────────────────────────────────────────────────
function bindEvents() {
  // Mic toggle
  const micBtn = $('micBtn');
  if (micBtn) micBtn.addEventListener('click', () => voice && voice.toggle());

  // Manual search input — debounced live search
  const input = $('manualInput');
  if (input) {
    input.addEventListener('input', e => {
      clearTimeout(input._tid);
      const q = e.target.value.trim();
      if (!q) { hideResults(); currentQty = 1; return; }
      // Local-only debounce (don't call AI on every keystroke)
      input._tid = setTimeout(() => {
        const { cantidad, producto } = APP.parseQtyAndProduct(q);
        currentQty = cantidad;
        doSearch(producto || q);
      }, 280);
    });
    input.addEventListener('keypress', async e => {
      if (e.key === 'Enter') {
        clearTimeout(input._tid);
        const q = input.value.trim();
        if (q) {
          // AI on Enter key
          const { cantidad, producto } = await smartParse(q);
          currentQty = cantidad;
          input.value = producto;
          doSearch(producto || q);
        }
      }
    });
  }

  // Search button — always uses AI if available
  const btnSearch = $('btnManualSearch');
  if (btnSearch) {
    btnSearch.addEventListener('click', async () => {
      const q = ($('manualInput')?.value || '').trim();
      if (!q) return;
      // Show spinner
      const orig = btnSearch.innerHTML;
      btnSearch.innerHTML = '⏳';
      btnSearch.disabled = true;
      try {
        const { cantidad, producto } = await smartParse(q);
        currentQty = cantidad;
        const input2 = $('manualInput');
        if (input2) input2.value = producto;
        doSearch(producto || q);
      } finally {
        btnSearch.innerHTML = orig;
        btnSearch.disabled = false;
      }
    });
  }

  // Close results
  const btnClose = $('btnCloseResults');
  if (btnClose) btnClose.addEventListener('click', hideResults);

  // Export buttons (closeExportMenu is defined in pedido.html <script>)
  on('btnExportWhatsApp', () => { EXPORTER.sendWhatsApp(orderItems, session); closeExportMenu(); });
  on('btnExportEmail',    () => { EXPORTER.sendEmail(orderItems, session);    closeExportMenu(); });
  on('btnExportExcel',    () => { EXPORTER.toExcel(orderItems, session);      closeExportMenu(); });
  on('btnExportPDF',      () => { EXPORTER.toPDF(orderItems, session);        closeExportMenu(); });

  // Save to history
  on('btnSave', () => {
    if (!orderItems.length) { APP.showToast('El pedido está vacío', 'error'); return; }
    APP.saveToHistory({
      id:        Date.now(),
      session:   { ...session },
      items:     JSON.parse(JSON.stringify(orderItems)),
      total:     orderItems.reduce((s,i) => s+i.total, 0),
      date:      APP.formatDate(),
      timestamp: Date.now(),
    });
    closeExportMenu();
    APP.showToast('✓ Pedido guardado en historial', 'success');
  });

  // Clear order
  on('btnClearOrder', () => {
    if (!orderItems.length) return;
    const doConfirm = window.CONFIRM || ((t, m, fn) => { if (confirm(m)) fn(); });
    doConfirm('¿Borrar pedido?', 'Se eliminarán todos los productos del pedido actual.', () => {
      orderItems = [];
      APP.clearOrder();
      renderTable();
      APP.showToast('Pedido borrado', 'warning');
    });
  });

  // Load template from last history items
  on('btnLoadTemplate', () => {
    const history = APP.getHistory();
    if (!history.length) { APP.showToast('No hay pedidos guardados', 'warning'); return; }
    const opts = history.slice(0,5).map((o, i) =>
      `${i+1}. ${o.session?.comercio || 'Sin comercio'} — ${o.date} (${o.items?.length||0} items)`
    ).join('\n');
    const choice = prompt(`Cargar productos de:\n${opts}\n\nEscribí el número (1-${Math.min(5,history.length)}):`);
    const idx = parseInt(choice) - 1;
    if (isNaN(idx) || idx < 0 || idx >= history.length) return;
    const src = history[idx];
    if (!src.items?.length) { APP.showToast('Ese pedido está vacío', 'warning'); return; }
    const doMerge = () => {
      src.items.forEach(srcItem => {
        const ex = orderItems.find(o => o.codigo && o.codigo === srcItem.codigo);
        if (ex) {
          ex.cantidad += srcItem.cantidad;
          ex.total = calcTotal(ex.cantidad, ex.precio, ex.descuento, ex.promoType, ex.promoN);
        } else {
          orderItems.push({ ...srcItem, id: Date.now() + Math.random() });
        }
      });
      APP.saveOrder(orderItems);
      renderTable();
      APP.showToast(`✓ ${src.items.length} productos cargados`, 'success');
    };
    if (orderItems.length) {
      const doConfirm = window.CONFIRM || ((t, m, fn) => { if (confirm(m)) fn(); });
      doConfirm('Cargar plantilla', `Se agregarán los ${src.items.length} productos al pedido actual. ¿Continuar?`, doMerge);
    } else {
      doMerge();
    }
  });
}

function on(id, fn) {
  const el = $(id);
  if (el) el.addEventListener('click', fn);
}

// ── Start ──────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', init);
