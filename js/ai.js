// ============================================================
// MAYOLISTA — AI Engine  v1.0
// Integración con Google Gemini para NLP inteligente
// ============================================================

const AI = {

  // ── La clave API se guarda en localStorage ─────────────────
  KEY_STORE: 'ml_gemini_key',
  _enabled:  false,

  getKey()      { return localStorage.getItem(this.KEY_STORE) || ''; },
  setKey(k)     { localStorage.setItem(this.KEY_STORE, k.trim()); this._enabled = !!k.trim(); },
  isEnabled()   { return !!this.getKey(); },

  // ── Endpoint Gemini Flash (gratis) ─────────────────────────
  _url(key) {
    return `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${key}`;
  },

  // ── Prompt de sistema ──────────────────────────────────────
  _prompt(text) {
    return `Sos un asistente de pedidos mayoristas en Argentina.
El vendedor dictó o escribió: "${text}"

Tu tarea: extraer la CANTIDAD y el NOMBRE DEL PRODUCTO de esa frase.

Reglas:
- La cantidad es un número entero positivo (si no se menciona, devolvé 1).
- El nombre del producto es todo lo que describe el artículo, SIN la cantidad ni palabras de unidad (unidades, kg, cajas, etc.).
- Ignorá palabras como: poneme, dame, quiero, necesito, agregar, un pedido de.
- Si hay una marca, tamaño o presentación, incluilos en el nombre del producto.
- Respondé ÚNICAMENTE con un objeto JSON válido, sin explicaciones, sin markdown.

Ejemplos:
- "azucar chango 500g 77 unidades" → {"cantidad":77,"producto":"azucar chango 500g"}
- "poneme doce harinas de kilo tres ceros" → {"cantidad":12,"producto":"harina 000 1kg"}
- "tres cajas aceite girasol cocinero 1.5 litros" → {"cantidad":3,"producto":"aceite girasol cocinero 1.5l"}
- "dame cincuenta fideos spaghetti lucchetti" → {"cantidad":50,"producto":"fideos spaghetti lucchetti"}
- "leche la serenisima entera" → {"cantidad":1,"producto":"leche entera la serenisima"}

JSON de respuesta:`;
  },

  // ── Parsear con IA ─────────────────────────────────────────
  async parse(text) {
    const key = this.getKey();
    if (!key) return null;

    try {
      const res = await fetch(this._url(key), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: this._prompt(text) }] }],
          generationConfig: {
            temperature: 0,
            maxOutputTokens: 80,
            responseMimeType: 'application/json',
          },
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        const msg = err?.error?.message || res.status;
        console.warn('[AI] API error:', msg);
        throw new Error(msg); // Lanzamos error para atajarlo
      }

      const data = await res.json();
      const raw  = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';

      // Limpiar posibles backticks de markdown
      const clean = raw.replace(/```json|```/g, '').trim();
      const parsed = JSON.parse(clean);

      if (parsed && typeof parsed.cantidad === 'number' && typeof parsed.producto === 'string') {
        return {
          cantidad: Math.max(1, Math.round(parsed.cantidad)),
          producto: parsed.producto.trim(),
        };
      }
      return null;
    } catch (e) {
      console.warn('[AI] Parse error:', e);
      return { _error: e.message }; // Devolvemos el error en texto
    }
  },

  // ── Estado visual para el botón del mic ───────────────────
  badgeHTML() {
    return this.isEnabled()
      ? '<span id="aiBadge" style="position:absolute;top:-4px;right:-4px;background:#10B981;color:white;font-size:.55rem;font-weight:800;padding:2px 5px;border-radius:999px;letter-spacing:.04em;pointer-events:none">AI</span>'
      : '';
  },
};
