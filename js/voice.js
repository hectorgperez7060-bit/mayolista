// ============================================================
// MAYOLISTA — Voice Engine  v1.2
// Toggle-based voice recognition - sin repetición de palabras
// ============================================================

class VoiceEngine {
  constructor(onResult, onStatus) {
    this.onResult = onResult;
    this.onStatus = onStatus;
    this._recognition = null;
    this._state = 'idle';
    this._finalText = ''; // solo texto confirmado como final
    this.supported = !!(window.SpeechRecognition || window.webkitSpeechRecognition);
  }

  _init() {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    const rec = new SR();
    rec.continuous      = false;
    rec.interimResults  = true;
    rec.lang            = 'es-AR';
    rec.maxAlternatives = 1;

    rec.onstart = () => {
      this._state = 'listening';
      this.onStatus('listening', '🔴 Escuchando… hablá ahora');
    };

    rec.onresult = (evt) => {
      // Reconstruir todo desde cero en cada evento
      let interimText = '';
      let newFinal = '';

      for (let i = 0; i < evt.results.length; i++) {
        const t = evt.results[i][0].transcript;
        if (evt.results[i].isFinal) {
          newFinal += t + ' ';
        } else {
          interimText += t;
        }
      }

      // Actualizar el texto final acumulado
      if (newFinal.trim()) {
        this._finalText = newFinal.trim();
      }

      // Mostrar interim combinado con final
      const display = (this._finalText + ' ' + interimText).trim();
      if (interimText) {
        this.onStatus('interim', display);
      }
    };

    rec.onerror = (evt) => {
      if (evt.error === 'not-allowed' || evt.error === 'service-not-allowed') {
        this._state = 'idle';
        this.onStatus('error', '⚠️ Permiso de micrófono denegado');
        return;
      }
      if (evt.error === 'no-speech') return;
      console.warn('[Voice] error:', evt.error);
    };

    rec.onend = () => {
      if (this._state === 'listening') {
        // Enviar lo que hay y reiniciar
        if (this._finalText.trim()) {
          this.onResult(this._finalText.trim());
          this.onStatus('processing', this._finalText.trim());
          this._finalText = '';
        }
        try { rec.start(); } catch (e) {}
      } else {
        if (this._finalText.trim()) {
          this.onResult(this._finalText.trim());
          this._finalText = '';
        }
        this.onStatus('idle', 'Presioná el micrófono para hablar');
      }
    };

    this._recognition = rec;
  }

  start() {
    if (!this.supported) {
      this.onStatus('error', '⚠️ Micrófono no disponible en este navegador');
      return;
    }
    if (!this._recognition) this._init();
    this._finalText = '';
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
    if (this._finalText.trim()) {
      this.onResult(this._finalText.trim());
      this._finalText = '';
    }
    try { this._recognition.stop(); } catch (e) {}
    this.onStatus('idle', 'Presioná el micrófono para hablar');
  }

  toggle() {
    if (this._state === 'idle')      return this.start();
    if (this._state === 'listening') return this.pause();
    if (this._state === 'paused')    return this.resume();
  }

  get state() { return this._state; }
  get isListening() { return this._state === 'listening'; }
}
