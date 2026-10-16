/* Compás — el motor de práctica: cuenta previa, escucha y compara nota a nota con la partitura */
(function (A) {
  'use strict';
  const { u } = A;

  let ctx = null;
  const contexto = () => (ctx = ctx || new (window.AudioContext || window.webkitAudioContext)());

  /** Un golpe de metrónomo en el instante t (segundos del reloj de audio) */
  function clic(t, fuerte) {
    const c = contexto();
    const o = c.createOscillator(), g = c.createGain();
    o.frequency.value = fuerte ? 1760 : 1320;
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(fuerte ? 0.7 : 0.45, t + 0.002);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.05);
    o.connect(g); g.connect(c.destination);
    o.start(t); o.stop(t + 0.06);
  }

  const TOL = { flexible: 0.16, normal: 0.11, estricta: 0.07 };

  /**
   * Crea una práctica.
   * o: { notas, bpm (negras por minuto), num, den, cuentaPrevia, metronomo, tolerancia, ignorarOctava, retraso (s), la,
   *      alActual(n), alNota(n), alFin(resultado), alCuenta(numero|null) }
   */
  function crear(o) {
    const c = contexto();
    const secRedonda = 4 * 60 / o.bpm;
    const t0n = o.notas.length ? o.notas[0].t : 0;
    const tolT = TOL[o.tolerancia] || TOL.normal;
    let stream = null, fuente = null, an = null, buf = null, timer = 0, inicio = 0, fin = false;
    const marcos = [];        // { t, rms, midi|null }
    const ataques = [];
    let suelo = null, ultimoAtaque = -1, estable = null, cand = null, candN = 0;
    let offset = 0;            // lo que se adelanta o atrasa el músico (se va adaptando)
    let siguiente = 0, actual = -1;
    const notas = o.notas;

    const inicioNota = n => inicio + (n.t - t0n) * secRedonda;
    const finNota = n => inicioNota(n) + n.dur * secRedonda;

    function analizar() {
      if (!an || fin) return;
      const ahora = c.currentTime;
      an.getFloatTimeDomainData(buf);
      let s2 = 0;
      for (let i = 0; i < buf.length; i++) s2 += buf[i] * buf[i];
      const rms = Math.sqrt(s2 / buf.length);
      const t = ahora - (buf.length / c.sampleRate) / 2 - o.retraso;
      if (suelo === null) suelo = rms;
      suelo = rms < suelo ? rms : suelo * 1.002 + 1e-7;
      const umbral = Math.max(suelo * 3, 0.006);
      let midi = null;
      if (rms > umbral) {
        const r = A.pitch.yin(A.pitch.diezmar(buf), c.sampleRate / 2, 60, 1500);
        if (r && r.claridad > 0.85) midi = A.pitch.midiDeFrec(r.f, o.la);
      }
      // ataques: subida brusca del nivel…
      const prev = marcos.slice(-3);
      const minPrev = prev.length ? Math.min(...prev.map(m => m.rms)) : 0;
      if (rms > umbral * 1.3 && rms > minPrev * 1.6 && t - ultimoAtaque > 0.06) { ataques.push(t); ultimoAtaque = t; }
      // …o cambio de nota sin volver a atacar (ligado, trémolo)
      if (midi !== null) {
        if (cand !== null && Math.abs(midi - cand) < 0.5) candN++; else { cand = midi; candN = 1; }
        if (candN === 2) {
          if (estable !== null && Math.abs(cand - estable) >= 0.6 && t - ultimoAtaque > 0.06) { ataques.push(t - 0.02); ultimoAtaque = t - 0.02; }
          estable = cand;
        }
      }
      marcos.push({ t, rms, midi });

      // nota actual (para el cursor)
      while (actual + 1 < notas.length && inicioNota(notas[actual + 1]) + offset <= ahora) {
        actual++;
        if (o.alActual) o.alActual(notas[actual]);
      }
      // evaluar las notas cuyo tiempo ya ha pasado
      while (siguiente < notas.length) {
        const n = notas[siguiente];
        const margen = Math.min(0.25, n.dur * secRedonda * 0.5);
        if (ahora - o.retraso < finNota(n) + offset + Math.max(0.12, margen)) break;
        evaluar(n);
        siguiente++;
      }
      if (siguiente >= notas.length && notas.length && ahora > finNota(notas[notas.length - 1]) + offset + 0.6) terminar();
    }

    function evaluar(n) {
      if (n.midi === null) { n.estado = 'silencio'; return; }
      const ini = inicioNota(n) + offset, durS = n.dur * secRedonda;
      const desde = ini - Math.min(0.08, durS * 0.3), hasta = ini + Math.max(0.08, durS * 0.85);
      const alturas = marcos.filter(m => m.t >= desde && m.t <= hasta && m.midi !== null).map(m => m.midi).sort((a, b) => a - b);
      if (alturas.length < 2) { n.estado = 'falta'; if (o.alNota) o.alNota(n); return; }
      // altura: la mediana; con «ignorar la octava», da igual en qué octava suene
      const med = alturas[alturas.length >> 1];
      let dif = med - n.midi;
      if (o.ignorarOctava) dif = dif - 12 * Math.round(dif / 12);
      n.cents = Math.round((med - Math.round(med)) * 100);
      n.tocada = Math.round(med);
      const alturaBien = Math.abs(dif) < 0.5;
      // tiempo: el ataque más cercano al inicio previsto
      const vent = Math.max(0.2, Math.min(0.4, durS * 0.6));
      let mejor = null;
      ataques.forEach(a => { if (Math.abs(a - ini) <= vent && (mejor === null || Math.abs(a - ini) < Math.abs(mejor - ini))) mejor = a; });
      n.delta = mejor === null ? null : mejor - ini;
      if (!alturaBien) n.estado = 'mal';
      else if (n.delta !== null && Math.abs(n.delta) > tolT) n.estado = 'tiempo';
      else if (Math.abs(n.cents) > 30) n.estado = 'afin';
      else n.estado = 'bien';
      // el músico va a su aire: el reloj se adapta poco a poco a su pulso (y al retraso del micrófono)
      if (alturaBien && n.delta !== null) offset = u.clamp(offset + 0.3 * n.delta, -0.6, 0.6);
      if (o.alNota) o.alNota(n);
    }

    function resultado() {
      const ev = notas.filter(n => n.estado && n.estado !== 'silencio');
      const cuenta = e => ev.filter(n => n.estado === e).length;
      const bien = cuenta('bien'), tiempo = cuenta('tiempo'), afin = cuenta('afin'), mal = cuenta('mal'), falta = cuenta('falta');
      const deltas = ev.filter(n => n.delta != null && (n.estado === 'bien' || n.estado === 'tiempo' || n.estado === 'afin')).map(n => n.delta);
      const media = deltas.length ? deltas.reduce((a, x) => a + x, 0) / deltas.length : null;
      const porCompas = {};
      ev.forEach(n => { if (n.estado !== 'bien') porCompas[n.compas] = (porCompas[n.compas] || 0) + 1; });
      const total = ev.length;
      return {
        total, bien, tiempo, afin, mal, falta,
        notas: total ? Math.round((total - mal - falta) / total * 100) : null,
        aTiempo: total ? Math.round((bien + afin) / Math.max(1, total - mal - falta) * 100) : null,
        puntuacion: total ? Math.round((bien + 0.6 * (tiempo + afin)) / total * 100) : null,
        mediaMs: media === null ? null : Math.round(media * 1000),
        fallos: Object.entries(porCompas).map(([m, k]) => ({ compas: Number(m), n: k })).sort((a, b) => a.compas - b.compas)
      };
    }

    function soltar() {
      clearInterval(timer);
      try { fuente && fuente.disconnect(); } catch (e) {}
      if (stream) stream.getTracks().forEach(t => t.stop());
      an = null;
    }
    function terminar() {
      if (fin) return;
      fin = true;
      soltar();
      if (o.alCuenta) o.alCuenta(null);
      const r = resultado();
      if (o.alFin) o.alFin(r);
    }

    return {
      async empezar() {
        try { stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false } }); }
        catch (e) { throw new Error('No se pudo usar el micrófono: revisa los permisos'); }
        if (c.state === 'suspended') try { await c.resume(); } catch (e) {}
        fuente = c.createMediaStreamSource(stream);
        an = c.createAnalyser(); an.fftSize = 2048;
        fuente.connect(an);
        buf = new Float32Array(an.fftSize);
        const pulso = 60 / o.bpm * (4 / o.den);          // duración de un pulso del compás
        const golpes = o.cuentaPrevia ? o.num : 0;
        const t = c.currentTime + 0.4;
        for (let i = 0; i < golpes; i++) {
          clic(t + i * pulso, i === 0);
          if (o.alCuenta) setTimeout(() => !fin && o.alCuenta(golpes - i), (t + i * pulso - c.currentTime) * 1000);
        }
        inicio = t + golpes * pulso;
        setTimeout(() => !fin && o.alCuenta && o.alCuenta(null), (inicio - c.currentTime) * 1000);
        if (o.metronomo && notas.length) {
          const finT = finNota(notas[notas.length - 1]);
          for (let k = 0, tt = inicio; tt < finT; k++, tt += pulso) clic(tt, k % o.num === 0);
        }
        timer = setInterval(analizar, 20);
      },
      parar: () => terminar(),
      cancelar() { fin = true; soltar(); }
    };
  }

  /* ---------- «¿Cómo suena?»: la partitura tocada por el propio aparato ---------- */
  const frec = (midi, la) => la * Math.pow(2, (midi - 69) / 12);

  /** Una nota sintetizada. timbre 'pua' (bandurria, laúd: ataque seco que se apaga) o 'arco' (violonchelo: sostenida, con vibrato) */
  function sintetizar(c, salida, f, t, dur, timbre) {
    const g = c.createGain(), filtro = c.createBiquadFilter();
    filtro.type = 'lowpass';
    g.connect(salida); filtro.connect(g);
    const osc = [];
    if (timbre === 'arco') {
      const a = c.createOscillator(), b = c.createOscillator(), bg = c.createGain();
      a.type = 'sawtooth'; b.type = 'triangle'; a.frequency.value = f; b.frequency.value = f; bg.gain.value = 0.6;
      a.connect(filtro); b.connect(bg); bg.connect(filtro);
      filtro.frequency.value = Math.min(2600, f * 7); filtro.Q.value = 0.8;
      // vibrato suave a partir de la mitad de la nota (solo en las largas)
      if (dur > 0.35) {
        const lfo = c.createOscillator(), lg = c.createGain();
        lfo.frequency.value = 5.4; lg.gain.setValueAtTime(0, t); lg.gain.linearRampToValueAtTime(f * 0.004, t + Math.min(0.5, dur * 0.5));
        lfo.connect(lg); lg.connect(a.frequency); lg.connect(b.frequency);
        osc.push(lfo);
      }
      const fin = t + Math.max(0.08, dur * 0.94);
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(0.32, t + 0.06);
      g.gain.setValueAtTime(0.28, Math.max(t + 0.07, fin - 0.06));
      g.gain.linearRampToValueAtTime(0, fin);
      osc.push(a, b);
      osc.forEach(o => { o.start(t); o.stop(fin + 0.05); });
    } else {
      const a = c.createOscillator(), b = c.createOscillator(), bg = c.createGain();
      a.type = 'triangle'; b.type = 'sawtooth'; a.frequency.value = f; b.frequency.value = f * 1.003; bg.gain.value = 0.35;
      a.connect(filtro); b.connect(bg); bg.connect(filtro);
      filtro.frequency.setValueAtTime(Math.min(8000, f * 12), t);
      filtro.frequency.exponentialRampToValueAtTime(Math.max(400, f * 2), t + 0.25);
      const caida = Math.min(1.4, Math.max(0.25, dur * 1.1));
      const fin = t + Math.max(0.1, dur * 0.97);
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(0.45, t + 0.004);
      g.gain.exponentialRampToValueAtTime(0.12, t + Math.min(caida, dur * 0.9));
      g.gain.setTargetAtTime(0.0001, fin - 0.02, 0.03);
      osc.push(a, b);
      osc.forEach(o => { o.start(t); o.stop(fin + 0.2); });
    }
    return osc;
  }

  /* ---------- Instrumentos con sonido grabado (banco FluidR3_GM, licencia MIT; ver sonidos/) ---------- */
  // archivo: muestras en sonidos/<archivo>.js · sost: sonido sostenido (arco, viento) · oct: suena una octava por debajo de lo escrito
  const INSTRUMENTOS = {
    bandurria: { nombre: 'Bandurria', archivo: 'pua', tremolo: true },
    laud: { nombre: 'Laúd', archivo: 'pua', oct: -12, tremolo: true },
    guitarra: { nombre: 'Guitarra española', archivo: 'guitarra', oct: -12 },
    violin: { nombre: 'Violín', archivo: 'violin', sost: true },
    viola: { nombre: 'Viola', archivo: 'viola', sost: true },
    violonchelo: { nombre: 'Violonchelo', archivo: 'violonchelo', sost: true },
    flauta: { nombre: 'Flauta', archivo: 'flauta', sost: true },
    clarinete: { nombre: 'Clarinete', archivo: 'clarinete', sost: true },
    piano: { nombre: 'Piano', archivo: 'piano' }
  };
  const bancos = {};
  function cargarScript(src) {
    return new Promise((ok, mal) => {
      const s = document.createElement('script'); s.src = src;
      s.onload = ok; s.onerror = () => mal(new Error('No se encuentra ' + src));
      document.head.append(s);
    });
  }
  /** Las muestras de un instrumento, decodificadas: { midi: AudioBuffer } */
  function banco(archivo) {
    if (bancos[archivo]) return bancos[archivo];
    bancos[archivo] = (async () => {
      const todos = window.COMPAS_SONIDOS || {};
      if (!todos[archivo]) await cargarScript('sonidos/' + archivo + '.js');
      const datos = window.COMPAS_SONIDOS[archivo];
      const c = contexto(), out = {};
      await Promise.all(Object.entries(datos).map(async ([m, b64]) => {
        const bin = atob(b64), buf = new Uint8Array(bin.length);
        for (let i = 0; i < bin.length; i++) buf[i] = bin.charCodeAt(i);
        out[m] = await c.decodeAudioData(buf.buffer);
      }));
      return out;
    })();
    bancos[archivo].catch(() => { delete bancos[archivo]; });
    return bancos[archivo];
  }

  /** Una nota con la muestra más cercana, afinada con la velocidad de reproducción */
  function muestra(c, salida, b, midi, t, dur, inst, la) {
    const claves = Object.keys(b).map(Number);
    const k = claves.reduce((a, x) => Math.abs(x - midi) < Math.abs(a - midi) ? x : a, claves[0]);
    const afin = 12 * Math.log2(la / 440);
    const fuentes = [];
    const golpe = (t0, d, vol, ultimo) => {
      const src = c.createBufferSource(), g = c.createGain();
      src.buffer = b[k];
      src.playbackRate.value = Math.pow(2, (midi - k + afin) / 12);
      if (inst.sost && d > 2.4) { src.loop = true; src.loopStart = 1.0; src.loopEnd = 2.4; }
      src.connect(g); g.connect(salida);
      g.gain.setValueAtTime(vol, t0);
      const fin = t0 + d;
      if (inst.sost) { g.gain.setTargetAtTime(0, Math.max(t0 + 0.02, fin - 0.04), 0.035); src.start(t0); src.stop(fin + 0.3); }
      else { g.gain.setTargetAtTime(0, fin, ultimo ? 0.09 : 0.02); src.start(t0); src.stop(fin + (ultimo ? 0.6 : 0.1)); }
      fuentes.push(src);
    };
    if (inst.tremolo && dur >= 0.45) {
      // trémolo de púa, como se tocan en la bandurria y el laúd las notas largas
      const paso = 0.085, n = Math.max(2, Math.round(dur / paso));
      for (let i = 0; i < n; i++) golpe(t + i * (dur / n), dur / n + 0.03, i % 2 ? 0.75 : 1, i === n - 1);
    } else golpe(t, dur, 1, true);
    return fuentes;
  }

  /** Instrumento en «Automático»: por el nombre de la parte y, si no lo dice, por lo grave que vaya */
  function instrumentoAuto(nombreParte, notas) {
    const n = (nombreParte || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    if (/violonch|cello/.test(n)) return 'violonchelo';
    if (/viola\b|viola /.test(n + ' ') && !/violin/.test(n)) return 'viola';
    if (/violin/.test(n)) return 'violin';
    if (/flaut|flute/.test(n)) return 'flauta';
    if (/clarin/.test(n)) return 'clarinete';
    if (/piano/.test(n)) return 'piano';
    if (/guitar/.test(n)) return 'guitarra';
    if (/laud|lute/.test(n)) return 'laud';
    if (/bandurr|mandol/.test(n)) return 'bandurria';
    const m = notas.filter(x => x.midi !== null).map(x => x.midi).sort((a, b) => a - b);
    return m.length && m[m.length >> 1] < 55 ? 'violonchelo' : 'bandurria';
  }

  /**
   * Toca las notas al tempo indicado y avisa de la que suena.
   * o: { notas, bpm, num, den, la, instrumento, cuentaPrevia, alCuenta(k|null), alActual(n), alFin() }
   */
  function sonar(o) {
    const c = contexto();
    const secRedonda = 4 * 60 / o.bpm;
    const notas = o.notas;
    const t0n = notas.length ? notas[0].t : 0;
    const inst = INSTRUMENTOS[o.instrumento] || INSTRUMENTOS.bandurria;
    const salida = c.createGain(); salida.gain.value = 2.2;
    const comp = c.createDynamicsCompressor(); salida.connect(comp); comp.connect(c.destination);
    let fin = false, timer = 0, actual = -1, inicio = 0;
    const fuentes = [];
    const ini = n => inicio + (n.t - t0n) * secRedonda;
    function parar(avisar) {
      if (fin) return;
      fin = true; clearInterval(timer);
      const ahora = c.currentTime;
      salida.gain.cancelScheduledValues(ahora); salida.gain.setValueAtTime(salida.gain.value, ahora); salida.gain.linearRampToValueAtTime(0, ahora + 0.05);
      setTimeout(() => { fuentes.forEach(x => { try { x.stop(); } catch (e) {} }); try { comp.disconnect(); } catch (e) {} }, 120);
      if (o.alCuenta) o.alCuenta(null);
      if (avisar !== false && o.alFin) o.alFin();
    }
    return {
      async empezar() {
        if (c.state === 'suspended') try { await c.resume(); } catch (e) {}
        let b = null;
        try { b = await banco(inst.archivo); } catch (e) { console.error(e); }
        if (fin) return;
        const pulso = 60 / o.bpm * (4 / o.den);
        const golpes = o.cuentaPrevia ? o.num : 0;
        const t = c.currentTime + 0.3;
        for (let i = 0; i < golpes; i++) {
          clic(t + i * pulso, i === 0);
          if (o.alCuenta) setTimeout(() => !fin && o.alCuenta(golpes - i), (t + i * pulso - c.currentTime) * 1000);
        }
        inicio = t + golpes * pulso;
        setTimeout(() => !fin && o.alCuenta && o.alCuenta(null), (inicio - c.currentTime) * 1000);
        notas.forEach(n => {
          if (n.midi === null) return;
          const midi = n.midi + (inst.oct || 0), d = n.dur * secRedonda;
          if (b) fuentes.push(...muestra(c, salida, b, midi, ini(n), d, inst, o.la));
          else fuentes.push(...sintetizar(c, salida, frec(midi, o.la) , ini(n), d, inst.sost ? 'arco' : 'pua'));   // sin muestras: el sonido sencillo
        });
        const ultima = notas[notas.length - 1];
        const finT = ini(ultima) + ultima.dur * secRedonda;
        timer = setInterval(() => {
          const ahora = c.currentTime;
          while (actual + 1 < notas.length && ini(notas[actual + 1]) <= ahora) { actual++; if (o.alActual) o.alActual(notas[actual]); }
          if (ahora > finT + 0.3) parar();
        }, 25);
      },
      parar: () => parar(),
      cancelar: () => parar(false)
    };
  }

  A.practica = { crear, contexto, clic, sonar, instrumentoAuto, INSTRUMENTOS, banco };
})(window.Compas);
