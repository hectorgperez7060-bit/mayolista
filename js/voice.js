// ============================================================
// MAYOLISTA — Voice Engine  v1.1
// Toggle-based voice recognition con acumulación correcta
// ============================================================

class VoiceEngine {
  /**
   * @param {function} onResult      - called with final transcript string
   * @param {function} onStatus      - called with (state, displayText)
   *   state: 'idle' | 'listening' | 'paused' | 'processing' | 'interim' | 'error'
   */
  constructor(onResult, onStatus) {
    this.onResult = onResult;
    this.onStatus = onStatus;
    this._recognition = null;
    this._state = 'idle';
    this._accumulated = ''; // ← NUEVO: acumula texto entre reinicios
    this.supported = !!(window.SpeechRecognition || window.webkitSpeechRecognition);
  }

  // ── Lazy init ──────────────────────────────────────────────
  _init() {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    const rec = new SR();
    rec.continuous      = true;
    rec.interimResults  = true;
    rec.lang            = 'es-AR';
    rec.maxAlternatives = 3;

    rec.onstart = () => {
      this._state = 'listening';
      this.onStatus('listening', '🔴 Escuchando… hablá ahora');
    };

    rec.onresult = (evt) => {
      let interim = '';
      let finalText = '';

      for (let i = evt.resultIndex; i < evt.results.length; i++) {
        const t = evt.results[i][0].transcript;
        if (evt.results[i].isFinal) {
          finalText += t;
        } else {
          interim += t;
        }
      }

      // Mostrar interim combinado con lo ya acumulado
      if (interim) {
        this.onStatus('interim', (this._accumulated + ' ' + interim).trim());
      }

      // Cuando hay texto final, acumularlo
      if (finalText) {
        this._accumulated = (this._accumulated + ' ' + finalText.trim()).trim();
        this.onStatus('processing', this._accumulated);
      }
    };

    rec.onerror = (evt) => {
      if (evt.error === 'not-allowed' || evt.error === 'service-not-allowed') {
        this._state = 'idle';
        this.onStatus('error', '⚠️ Permiso de micrófono denegado');
        return;
      }
      if (evt.error === 'no-speech') {
        // Silencio — si hay texto acumulado, enviarlo
        if (this._accumulated.trim()) {
          this.onResult(this._accumulated.trim());
          this._accumulated = '';
          this.onStatus('listening', '🔴 Escuchando… hablá ahora');
        }
        return;
      }
      console.warn('[Voice] error:', evt.error);
    };

    rec.onend = () => {
      // Auto-restart si sigue escuchando (el browser paró por silencio)
      if (this._state === 'listening') {
        // Si hay texto acumulado suficiente, enviarlo antes de reiniciar
        if (this._accumulated.trim().length > 3) {
          this.onResult(this._accumulated.trim());
          this._accumulated = '';
        }
        try { rec.start(); } catch (e) {}
      } else {
        // Enviar lo que quedó acumulado al parar/pausar
        if (this._accumulated.trim()) {
          this.onResult(this._accumulated.trim());
          this._accumulated = '';
        }
        this.onStatus('idle', 'Presioná el micrófono para hablar');
      }
    };

    this._recognition = rec;
  }

  // ── Public API ─────────────────────────────────────────────
  start() {
    if (!this.supported) {
      this.onStatus('error', '⚠️ Micrófono no disponible en este navegador');
      return;
    }
    if (!this._recognition) this._init();
    this._accumulated = ''; // limpiar al iniciar nueva sesión
    this._state = 'listening';
    try { this._recognition.start(); } catch (e) {}
  }

  pause() {
    if (this._state !== 'listening') return;
    this._state = 'paused';
    try { this._recognition.stop(); } catch (e) {}
    this.onStatus('paused', '⏸ Pausado — tocá para continuar');
  }

  resume() {
    this._state = 'listening';
    try { this._recognition.start(); } catch (e) {}
    this.onStatus('listening', '🔴 Escuchando…');
  }

  stop() {
    this._state = 'idle';
    if (this._accumulated.trim()) {
      this.onResult(this._accumulated.trim());
      this._accumulated = '';
    }
    try { this._recognition.stop(); } catch (e) {}
    this.onStatus('idle', 'Presioná el micrófono para hablar');
  }

  /** Cicla: idle→listening, listening→paused, paused→listening */
  toggle() {
    if (this._state === 'idle')      return this.start();
    if (this._state === 'listening') return this.pause();
    if (this._state === 'paused')    return this.resume();
  }

  get state() { return this._state; }
  get isListening() { return this._state === 'listening'; }
}
