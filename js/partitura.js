/* Compás — la partitura: carga el MusicXML con OpenSheetMusicDisplay, la dibuja y saca las notas que hay que tocar */
(function (A) {
  'use strict';
  const OSMD = window.opensheetmusicdisplay;

  /** Convierte un ArrayBuffer en «cadena binaria» (así OSMD reconoce el .mxl comprimido) */
  function binaria(buf) {
    const b = new Uint8Array(buf);
    let s = '';
    for (let i = 0; i < b.length; i += 0x8000) s += String.fromCharCode.apply(null, b.subarray(i, i + 0x8000));
    return s;
  }

  /** Crea el visor en un contenedor y carga la partitura. Devuelve { osmd, info } */
  async function cargar(contenedor, datos, opc = {}) {
    const osmd = new OSMD.OpenSheetMusicDisplay(contenedor, {
      autoResize: false, backend: 'svg', drawTitle: false, drawSubtitle: false, drawComposer: false, drawLyricist: false,
      drawPartNames: false, drawCredits: false, followCursor: false, drawingParameters: 'compacttight'
    });
    await osmd.load(datos);
    osmd.Zoom = opc.zoom || 1;
    return { osmd, info: info(osmd) };
  }

  /** Datos generales: título, compositor, partes (instrumento + pentagrama), compases, tempo y compás */
  function info(osmd) {
    const sh = osmd.Sheet;
    const partes = [];
    let g = 0;
    sh.Instruments.forEach((ins, i) => {
      ins.Staves.forEach((st, j) => {
        partes.push({ inst: i, staff: j, global: g++, nombre: (ins.Name || 'Parte ' + (i + 1)) + (ins.Staves.length > 1 ? ' · pentagrama ' + (j + 1) : '') });
      });
    });
    const sm0 = sh.SourceMeasures[0];
    const ts = sm0 && sm0.ActiveTimeSignature;
    return {
      titulo: (sh.TitleString || '').trim(), compositor: (sh.ComposerString || '').trim(),
      partes,
      compases: sh.SourceMeasures.length ? sh.SourceMeasures[sh.SourceMeasures.length - 1].MeasureNumber : 0,
      primerCompas: sm0 ? sm0.MeasureNumber : 1,
      bpm: Math.round(sh.DefaultStartTempoInBpm || (sh.userStartTempoInBPM) || 80) || 80,
      num: ts ? ts.Numerator : 4, den: ts ? ts.Denominator : 4
    };
  }

  /** Enseña solo el instrumento elegido y vuelve a dibujar */
  function dibujar(osmd, parte) {
    osmd.Sheet.Instruments.forEach((ins, i) => { ins.Visible = !parte || i === parte.inst; });
    osmd.render();
  }

  /**
   * Notas que hay que tocar en una parte, entre dos compases: la voz principal del pentagrama
   * (si hay acordes, la nota más aguda), sin adornos y con las ligaduras de prolongación unidas.
   * Cada nota: { k, compas, t (en redondas desde el principio), dur (redondas), midi|null (silencio), gnotes }
   */
  function notas(osmd, parte, desde, hasta) {
    const sh = osmd.Sheet;
    const g = parte ? parte.global : 0;
    let voz = null;
    const out = [];
    for (const sm of sh.SourceMeasures) {
      if (sm.MeasureNumber < desde || sm.MeasureNumber > hasta) continue;
      for (const c of sm.VerticalSourceStaffEntryContainers) {
        const se = c.StaffEntries[g];
        if (!se || !se.VoiceEntries.length) continue;
        if (voz === null) voz = se.VoiceEntries[0].ParentVoice.VoiceId;
        const ve = se.VoiceEntries.find(v => v.ParentVoice.VoiceId === voz);
        if (!ve || ve.IsGrace || !ve.Notes.length) continue;
        const sonoras = ve.Notes.filter(n => !n.isRest());
        const t = sm.AbsoluteTimestamp.RealValue + c.Timestamp.RealValue;
        const len = ve.Notes[0].Length.RealValue;
        if (!sonoras.length) {
          out.push({ compas: sm.MeasureNumber, t, dur: len, midi: null, gnotes: [] });
          continue;
        }
        const n = sonoras.reduce((a, b) => (b.halfTone > a.halfTone ? b : a));
        const gn = osmd.rules.GNote ? osmd.rules.GNote(n) : null;
        // continuación de una ligadura: se alarga la nota anterior
        if (n.NoteTie && n.NoteTie.StartNote && n.NoteTie.StartNote !== n && out.length && out[out.length - 1].midi === n.halfTone + 12) {
          const prev = out[out.length - 1];
          prev.dur = t + len - prev.t;
          if (gn) prev.gnotes.push(gn);
          continue;
        }
        out.push({ compas: sm.MeasureNumber, t, dur: len, midi: n.halfTone + 12, gnotes: gn ? [gn] : [] });
      }
    }
    out.forEach((n, i) => (n.k = i));
    return out;
  }

  /** Elementos SVG de una nota (para pintarla) */
  function elementos(n) {
    return n.gnotes.map(gn => { try { return gn.getSVGGElement && gn.getSVGGElement(); } catch (e) { return null; } }).filter(Boolean);
  }
  const CLASES = ['n-actual', 'n-bien', 'n-tiempo', 'n-mal', 'n-falta'];
  function pintar(n, clase) {
    elementos(n).forEach(el => { CLASES.forEach(c => el.classList.remove(c)); if (clase) el.classList.add(clase); });
  }
  function limpiar(lista) { lista.forEach(n => pintar(n, null)); }

  /**
   * Renglón (sistema) de la partitura en que está una nota: { arriba, abajo, siguiente } en píxeles desde
   * lo alto del dibujo; siguiente es el renglón de debajo (o null). null si no se puede saber.
   */
  function renglon(osmd, n) {
    try {
      const gn = n.gnotes[0];
      if (!gn) return null;
      const sys = gn.parentVoiceEntry.parentStaffEntry.parentMeasure.ParentStaffLine.ParentMusicSystem;
      const z = 10 * osmd.Zoom;
      const caja = s => { const ps = s.PositionAndShape; return { arriba: (ps.AbsolutePosition.y + ps.BorderMarginTop) * z, abajo: (ps.AbsolutePosition.y + ps.BorderMarginBottom) * z }; };
      const todos = [];
      osmd.GraphicSheet.MusicPages.forEach(pg => pg.MusicSystems.forEach(s => todos.push(s)));
      const i = todos.indexOf(sys);
      const r = caja(sys);
      r.siguiente = i >= 0 && i + 1 < todos.length ? caja(todos[i + 1]) : null;
      return r;
    } catch (e) { return null; }
  }

  /** Compás (número) en el que se ha tocado un punto de la partitura, o null */
  function compasEn(osmd, x, y) {
    try {
      const gs = osmd.GraphicSheet;
      for (const ml of gs.MeasureList) for (const m of ml) {
        if (!m || !m.PositionAndShape) continue;
        const bb = m.PositionAndShape;
        const ux = bb.AbsolutePosition.x + bb.BorderLeft, uy = bb.AbsolutePosition.y + bb.BorderTop;
        const w = bb.BorderRight - bb.BorderLeft, hh = bb.BorderBottom - bb.BorderTop;
        if (x >= ux && x <= ux + w && y >= uy - 2 && y <= uy + hh + 2) return m.MeasureNumber;
      }
    } catch (e) {}
    return null;
  }

  A.partitura = { binaria, cargar, info, dibujar, notas, elementos, pintar, limpiar, compasEn, renglon };
})(window.Compas);
