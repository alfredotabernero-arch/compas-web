/* Compás — detección de altura (algoritmo YIN) y utilidades de notas */
(function (A) {
  'use strict';

  const NOMBRES = ['Do', 'Do♯', 'Re', 'Mi♭', 'Mi', 'Fa', 'Fa♯', 'Sol', 'Sol♯', 'La', 'Si♭', 'Si'];
  const NOMBRES_AM = ['C', 'C♯', 'D', 'E♭', 'E', 'F', 'F♯', 'G', 'G♯', 'A', 'B♭', 'B'];

  /** Frecuencia de una nota MIDI con el La4 dado */
  const frecMidi = (m, la) => la * Math.pow(2, (m - 69) / 12);
  const midiDeFrec = (f, la) => 69 + 12 * Math.log2(f / la);

  /** "La4" → 69. Admite sostenidos/bemoles: "Fa#3", "Sib2", "Mi♭4" */
  function midiDeNombre(txt) {
    const m = txt.trim().match(/^(Do|Re|Mi|Fa|Sol|La|Si)\s*([#♯b♭]?)\s*(-?\d)$/i);
    if (!m) return null;
    const base = { do: 0, re: 2, mi: 4, fa: 5, sol: 7, la: 9, si: 11 }[m[1].toLowerCase()];
    const alt = /[#♯]/.test(m[2]) ? 1 : /[b♭]/.test(m[2]) ? -1 : 0;
    return (Number(m[3]) + 1) * 12 + base + alt;
  }
  /* Nombres de las notas: tradicionales (Do, Re, Mi…) o anglosajones (C, D, E…). Se elige en Ajustes. */
  let latina = true;
  const ponerNotacion = v => { latina = v !== 'anglosajona'; };
  const notacion = () => (latina ? 'latina' : 'anglosajona');
  const nombres = () => (latina ? NOMBRES : NOMBRES_AM);
  /** «La» o «A», para textos como «La = 442 Hz» */
  const nombreLa = () => (latina ? 'La' : 'A');
  /** "Fa#3" (como se escriben las cuerdas) → nombre en la notación elegida, con octava */
  const nombreTexto = txt => { const m = midiDeNombre(txt); return m === null ? txt : nombreMidi(m); };

  function nombreMidi(m, latino = latina) {
    const n = Math.round(m);
    return (latino ? NOMBRES : NOMBRES_AM)[((n % 12) + 12) % 12] + (Math.floor(n / 12) - 1);
  }
  function soloNombre(m, latino = latina) {
    const n = Math.round(m);
    return (latino ? NOMBRES : NOMBRES_AM)[((n % 12) + 12) % 12];
  }

  /**
   * YIN: devuelve {f, claridad} o null.
   * buf: Float32Array de muestras, sr: frecuencia de muestreo.
   */
  function yin(buf, sr, fmin = 40, fmax = 1600, umbral = 0.12) {
    const n = buf.length;
    // energía mínima para no reaccionar al ruido de fondo
    let rms = 0;
    for (let i = 0; i < n; i++) rms += buf[i] * buf[i];
    rms = Math.sqrt(rms / n);
    if (rms < 0.008) return null;

    const tauMin = Math.max(2, Math.floor(sr / fmax));
    const tauMax = Math.min(Math.floor(n / 2), Math.floor(sr / fmin));
    const W = n - tauMax;
    const d = new Float32Array(tauMax + 1);
    for (let tau = 1; tau <= tauMax; tau++) {
      let s = 0;
      for (let i = 0; i < W; i++) { const x = buf[i] - buf[i + tau]; s += x * x; }
      d[tau] = s;
    }
    // diferencia normalizada acumulada
    const cmnd = new Float32Array(tauMax + 1);
    cmnd[0] = 1;
    let acum = 0;
    for (let tau = 1; tau <= tauMax; tau++) {
      acum += d[tau];
      cmnd[tau] = acum > 0 ? d[tau] * tau / acum : 1;
    }
    let tau = -1;
    for (let t = tauMin; t <= tauMax; t++) {
      if (cmnd[t] < umbral) {
        while (t + 1 <= tauMax && cmnd[t + 1] < cmnd[t]) t++;
        tau = t; break;
      }
    }
    if (tau < 0) return null;
    // interpolación parabólica
    let tf = tau;
    if (tau > 1 && tau < tauMax) {
      const a = cmnd[tau - 1], b = cmnd[tau], c = cmnd[tau + 1];
      const den = a + c - 2 * b;
      if (den !== 0) tf = tau + (a - c) / (2 * den);
    }
    return { f: sr / tf, claridad: 1 - cmnd[tau] };
  }

  /* ------------------------------------------------------------------
   * Afinaciones de instrumentos (de la cuerda más aguda a la más grave)
   * ------------------------------------------------------------------ */
  const INSTRUMENTOS = {
    cromatico: { nombre: 'Cromático (cualquier nota)', cuerdas: [] },
    // la sexta, en Sol natural (lo habitual hoy); quien la afine en Sol♯ tiene un atajo en el afinador
    bandurria: { nombre: 'Bandurria', cuerdas: ['La4', 'Mi4', 'Si3', 'Fa#3', 'Do#3', 'Sol2'], atajos: [{ nombre: 'Sexta en Sol♯', cuerda: 5, semitonos: 1 }] },
    laud: { nombre: 'Laúd español', cuerdas: ['La3', 'Mi3', 'Si2', 'Fa#2', 'Do#2', 'Sol1'], atajos: [{ nombre: 'Sexta en Sol♯', cuerda: 5, semitonos: 1 }] },
    guitarra: { nombre: 'Guitarra', cuerdas: ['Mi4', 'Si3', 'Sol3', 'Re3', 'La2', 'Mi2'] },
    mandolina: { nombre: 'Mandolina', cuerdas: ['Mi5', 'La4', 'Re4', 'Sol3'] },
    violin: { nombre: 'Violín', cuerdas: ['Mi5', 'La4', 'Re4', 'Sol3'] },
    viola: { nombre: 'Viola', cuerdas: ['La4', 'Re4', 'Sol3', 'Do3'] },
    cello: { nombre: 'Violonchelo', cuerdas: ['La3', 'Re3', 'Sol2', 'Do2'] },
    contrabajo: { nombre: 'Contrabajo', cuerdas: ['Sol2', 'Re2', 'La1', 'Mi1'] },
    ukelele: { nombre: 'Ukelele', cuerdas: ['La4', 'Mi4', 'Do4', 'Sol4'] }
  };

  /** Diezma por 2 (con un filtro paso bajo sencillo) para abaratar YIN */
  function diezmar(buf) {
    const out = new Float32Array(buf.length >> 1);
    for (let i = 0; i < out.length; i++) {
      const j = i * 2;
      out[i] = 0.25 * (buf[j - 1] || 0) + 0.5 * buf[j] + 0.25 * (buf[j + 1] || 0);
    }
    return out;
  }

  /**
   * Afinación de un instrumento en notas MIDI (de la cuerda más aguda a la más grave).
   * personal: { instrumento: [midi, …] } con las afinaciones cambiadas por el usuario.
   */
  const habitual = id => (INSTRUMENTOS[id] ? INSTRUMENTOS[id].cuerdas.map(midiDeNombre) : []);
  function afinacion(id, personal) {
    const base = habitual(id), p = personal && personal[id];
    return Array.isArray(p) && p.length === base.length ? p.slice() : base;
  }
  const esPersonal = (id, personal) => { const a = afinacion(id, personal), b = habitual(id); return a.some((m, i) => m !== b[i]); };

  A.pitch = { diezmar, yin, frecMidi, midiDeFrec, midiDeNombre, nombreMidi, soloNombre, INSTRUMENTOS, NOMBRES,
    ponerNotacion, notacion, nombres, nombreLa, nombreTexto, habitual, afinacion, esPersonal };
})(window.Compas);
