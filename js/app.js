// ============================================================
// MAYOLISTA — Core App Logic  v1.1
// Shared utilities used by all pages
// ============================================================

const APP = {
  VERSION: '1.1.0',

  KEYS: {
    CURRENT_SESSION: 'ml_session',
    CURRENT_ORDER:   'ml_order',
    PROFILES:        'ml_profiles',
    CATALOG:         'ml_catalog',
    ORDERS_HISTORY:  'ml_history',
    ACTIVE_PROFILE:  'ml_active_profile',
  },

  // ── Currency formatting (ARS) ──────────────────────────────
  formatCurrency(amount) {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency', currency: 'ARS',
      minimumFractionDigits: 0, maximumFractionDigits: 0,
    }).format(amount);
  },

  // ── Date formatting ────────────────────────────────────────
  formatDate(d = new Date()) {
    return d.toLocaleDateString('es-AR', {
      day:'2-digit', month:'2-digit', year:'numeric',
      hour:'2-digit', minute:'2-digit',
    });
  },

  // ── localStorage helpers ───────────────────────────────────
  storage: {
    get(key, fallback = null) {
      try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback; }
      catch { return fallback; }
    },
    set(key, val) {
      try { localStorage.setItem(key, JSON.stringify(val)); return true; }
      catch { return false; }
    },
    remove(key) { localStorage.removeItem(key); },
  },

  // ── Session ────────────────────────────────────────────────
  getSession()        { return this.storage.get(this.KEYS.CURRENT_SESSION); },
  setSession(s)       { return this.storage.set(this.KEYS.CURRENT_SESSION, s); },
  clearSession()      { this.storage.remove(this.KEYS.CURRENT_SESSION); },

  // ── Order ──────────────────────────────────────────────────
  getOrder()          { return this.storage.get(this.KEYS.CURRENT_ORDER, []); },
  saveOrder(items)    { return this.storage.set(this.KEYS.CURRENT_ORDER, items); },
  clearOrder()        { this.storage.remove(this.KEYS.CURRENT_ORDER); },

  // ── Profiles (mayoristas) ──────────────────────────────────
  getProfiles()       { return this.storage.get(this.KEYS.PROFILES, []); },
  saveProfiles(p)     { return this.storage.set(this.KEYS.PROFILES, p); },
  getActiveProfile()  { return this.storage.get(this.KEYS.ACTIVE_PROFILE, null); },
  setActiveProfile(id){ return this.storage.set(this.KEYS.ACTIVE_PROFILE, id); },

  // ── Catalog ────────────────────────────────────────────────
  getCatalog()        { return this.storage.get(this.KEYS.CATALOG, []); },
  saveCatalog(items)  { return this.storage.set(this.KEYS.CATALOG, items); },

  // ── History ────────────────────────────────────────────────
  getHistory()        { return this.storage.get(this.KEYS.ORDERS_HISTORY, []); },
  saveToHistory(order) {
    const h = this.getHistory();
    h.unshift(order);
    if (h.length > 60) h.pop();
    return this.storage.set(this.KEYS.ORDERS_HISTORY, h);
  },

  // ── Toast notifications ────────────────────────────────────
  showToast(msg, type = '', ms = 2600) {
    let t = document.getElementById('toast');
    if (!t) {
      t = document.createElement('div');
      t.id = 'toast'; t.className = 'toast';
      document.body.appendChild(t);
    }
    t.textContent = msg;
    t.className = `toast ${type}`;
    requestAnimationFrame(() => requestAnimationFrame(() => t.classList.add('show')));
    clearTimeout(t._tid);
    t._tid = setTimeout(() => t.classList.remove('show'), ms);
  },

  // ── Spanish number-word → integer map ──────────────────────
  NUM_ES: {
    'un':1,'uno':1,'una':1,'dos':2,'tres':3,'cuatro':4,'cinco':5,
    'seis':6,'siete':7,'ocho':8,'nueve':9,'diez':10,
    'once':11,'doce':12,'trece':13,'catorce':14,'quince':15,
    'dieciseis':16,'diecisiete':17,'dieciocho':18,'diecinueve':19,
    'veinte':20,'veintiuno':21,'veintidos':22,'veintitres':23,
    'veinticuatro':24,'veinticinco':25,'veintiseis':26,
    'veintisiete':27,'veintiocho':28,'veintinueve':29,
    'treinta':30,'cuarenta':40,'cincuenta':50,'sesenta':60,
    'setenta':70,'ochenta':80,'noventa':90,'cien':100,'ciento':100,
    'cero':0,
  },
  // Tens/hundreds that combine with 'y' or units
  NUM_TENS: { 'treinta':30,'cuarenta':40,'cincuenta':50,'sesenta':60,'setenta':70,'ochenta':80,'noventa':90,'ciento':100 },
  NUM_UNITS: { 'un':1,'uno':1,'una':1,'dos':2,'tres':3,'cuatro':4,'cinco':5,'seis':6,'siete':7,'ocho':8,'nueve':9 },

  // Normalize accented chars for matching
  _norm(s) {
    return s.toLowerCase()
      .replace(/[áàä]/g,'a').replace(/[éèë]/g,'e')
      .replace(/[íìï]/g,'i').replace(/[óòö]/g,'o').replace(/[úùü]/g,'u')
      .replace(/ñ/g,'n');
  },

  // ── Resolve compound Spanish number from word array slice ────
  // Returns {value, consumed} or null
  _parseSpanishNum(words, start) {
    const w0 = this._norm(words[start] || '');
    // Try single word
    let base = this.NUM_ES[w0];
    if (base === undefined) return null;
    let consumed = 1;
    // Try "X y Y" compound (treinta y dos, cuarenta y cinco…)
    const w1 = this._norm(words[start+1] || '');
    const w2 = this._norm(words[start+2] || '');
    if (w1 === 'y' && w2 && this.NUM_UNITS[w2] !== undefined && this.NUM_TENS[w0] !== undefined) {
      base = this.NUM_TENS[w0] + this.NUM_UNITS[w2];
      consumed = 3;
    } else if (!w1 && this.NUM_TENS[w0] !== undefined) {
      // just a tens word alone
    } else if (this.NUM_UNITS[w1] !== undefined && this.NUM_TENS[w0] !== undefined) {
      // "treintaidos" via accidental concatenation — already handled by NUM_ES
    }
    return { value: base, consumed };
  },

  // ── Unit words that follow a quantity ──────────────────────
  UNIT_WORDS: new Set([
    'unidades','unidad','uds','u',
    'kilos','kilo','kg','kilogramos','kilogramo',
    'gramos','gramo','gr','g',
    'litros','litro','lt','lts','l',
    'cajas','caja','cx',
    'docenas','docena','doc',
    'paquetes','paquete','paq',
    'bolsas','bolsa',
    'latas','lata',
    'botellas','botella',
    'piezas','pieza','pzas','pza',
    'cajones','cajon',
    'fardos','fardo',
    'atados','atado',
    'rollos','rollo',
    'sachet','sachets',
  ]),

  // ── Palabras que la gente dice y no son producto ────────────
  CLEAN_PREFIXES: [
    'poneme ','pone ','dame ','quiero ','quisiera ','necesito ','agrega ','agregar ','pedime ',
    'mandame ','anotame ','anota ','por favor ','hola ','che '
  ],

  parseQtyAndProduct(raw) {
    let q = raw.toLowerCase().trim();
    
    // Limpiar saludos o frases de arranque
    let changed = true;
    while(changed) {
      changed = false;
      for (const p of this.CLEAN_PREFIXES) {
        if (q.startsWith(p)) {
          q = q.substring(p.length).trim();
          changed = true;
        }
      }
    }
    raw = q;
    
    const words = raw.split(/\s+/);

    // ── Priority 1: "producto N [unidad]" — scan from the END ──
    // Handles: "azucar 77 unidades", "harina 0000 doce kg", etc.
    for (let i = words.length - 1; i >= 0; i--) {
      const w = words[i];
      // Is this word a digit number?
      if (/^\d+$/.test(w)) {
        // All words after i must be unit words (or none)
        const after = words.slice(i + 1).map(x => this._norm(x));
        if (after.every(a => this.UNIT_WORDS.has(a))) {
          const before = words.slice(0, i).join(' ').trim();
          if (before.length >= 2) {
            return { cantidad: parseInt(w), producto: before };
          }
        }
      }
      // Is this a Spanish number word?
      const res = this._parseSpanishNum(words, i);
      if (res !== null) {
        const after = words.slice(i + res.consumed).map(x => this._norm(x));
        if (after.every(a => this.UNIT_WORDS.has(a))) {
          const before = words.slice(0, i).join(' ').trim();
          if (before.length >= 2) {
            return { cantidad: res.value, producto: before };
          }
        }
      }
    }

    // ── Priority 2: "N producto" — digit at start ──────────────
    // Handles: "12 harinas", "5 aceites girasol"
    let m = raw.match(/^(\d+(?:[.,]\d+)?)\s+(.+)$/);
    if (m) return { cantidad: Math.round(parseFloat(m[1].replace(',','.'))), producto: m[2].trim() };

    // ── Priority 3: "poneme doce harinas" — word number then product ──
    for (let i = 0; i < words.length; i++) {
      const res = this._parseSpanishNum(words, i);
      if (res !== null) {
        const rest = words.slice(i + res.consumed).join(' ').trim();
        if (rest.length > 0) return { cantidad: res.value, producto: rest };
      }
    }

    // ── Priority 4: digit anywhere ─────────────────────────────
    m = raw.match(/(\d+)\s+(.+)$/);
    if (m) return { cantidad: parseInt(m[1]), producto: m[2].trim() };

    // Fallback: no number found, search entire phrase as product
    return { cantidad: 1, producto: raw };
  },


  // ── Load default catalog from bundled JSON ─────────────────
  async loadDefaultCatalog() {
    try {
      const res = await fetch('data/catalogo_ejemplo.json');
      if (!res.ok) throw new Error('fetch error');
      const data = await res.json();
      this.saveCatalog(data);
      return data;
    } catch (e) {
      console.warn('No se pudo cargar el catálogo de ejemplo:', e);
      return [];
    }
  },

  // ── Escape HTML ────────────────────────────────────────────
  esc(str) {
    return String(str)
      .replace(/&/g,'&amp;').replace(/</g,'&lt;')
      .replace(/>/g,'&gt;').replace(/"/g,'&quot;')
      .replace(/'/g,'&#39;');
  },
};
