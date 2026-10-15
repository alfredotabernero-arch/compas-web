/* Compás — pantallas: biblioteca, partitura (práctica) y ajustes */
(function (A) {
  'use strict';
  const { u, DB } = A;
  const { h } = u;
  const icono = A.icono;

  /* ======================= Ajustes ======================= */
  const AJ_DEF = { la: 442, tolerancia: 'normal', ignorarOctava: true, retraso: 80, cuentaPrevia: true, metronomo: false, tema: 'auto' };
  let aj = Object.assign({}, AJ_DEF);
  async function cargarAjustes() { aj = Object.assign({}, AJ_DEF, await DB.kvGet('ajustes', {})); aplicarTema(); }
  async function guardarAjustes() { await DB.kvSet('ajustes', aj); aplicarTema(); }
  function aplicarTema() {
    if (aj.tema === 'auto') document.documentElement.removeAttribute('data-theme');
    else document.documentElement.setAttribute('data-theme', aj.tema);
  }

  /* ======================= Navegación ======================= */
  const vistas = {};
  let limpiar = null;
  function ruta() {
    const p = (location.hash.replace(/^#\/?/, '') || '').split('/').map(decodeURIComponent);
    return { vista: p[0] || 'biblioteca', params: p.slice(1) };
  }
  async function pintar() {
    if (limpiar) { try { limpiar(); } catch (e) { console.error(e); } limpiar = null; }
    const { vista, params } = ruta();
    const v = vistas[vista] || vistas.biblioteca;
    const raiz = u.$('#app');
    raiz.innerHTML = '';
    document.body.dataset.vista = vista;
    const titulo = h('h1');
    const acciones = h('div.fila', { style: { gap: '2px' } });
    const cab = h('header.cabecera', v.atras ? h('a.btn-icono.atras', { href: v.atras, 'aria-label': 'Atrás' }, icono('atras')) : null, titulo, acciones);
    const main = h('main');
    raiz.append(cab, main);
    titulo.textContent = v.titulo || '';
    try {
      const r = await v.render({ main, titulo, acciones, params });
      limpiar = typeof r === 'function' ? r : null;
    } catch (e) {
      console.error(e);
      main.appendChild(h('div.tarjeta', h('b', 'Algo ha fallado'), h('p.mini.tenue', String(e && e.message || e))));
    }
    window.scrollTo(0, 0);
  }
  const refrescar = () => pintar();

  /* ======================= Biblioteca ======================= */
  const EJEMPLOS = {
    pua: ['01 - Escala de Re mayor', '02 - Arpegios en Sol mayor', '03 - Campanero (tradicional)', '04 - Oda a la alegria (Beethoven)', '05 - Ritmos en La mayor'],
    cello: ['06 - Violonchelo - Cuerdas al aire', '07 - Violonchelo - Escala de Do mayor (2 octavas)', '08 - Violonchelo - Escala de Re mayor (corcheas)',
      '09 - Violonchelo - Arpegios en Sol mayor', '10 - Violonchelo - Oda a la alegria (Beethoven)',
      '11 - Violonchelo - Dotzauer, estudio 4', '12 - Violonchelo - Dotzauer, estudio 5', '13 - Violonchelo - Lee, op. 31 n. 1', '14 - Violonchelo - Lee, op. 31 n. 4 (Scherzo)']
  };

  /** Lee el título y el compositor de un MusicXML sin dibujarlo */
  async function leerInfo(datos) {
    const caja = h('div', { style: { position: 'absolute', left: '-9999px', width: '800px' } });
    document.body.appendChild(caja);
    try { const { info } = await A.partitura.cargar(caja, datos); return info; }
    finally { caja.remove(); }
  }
  async function anadir(datos, nombreArchivo, formato) {
    const info = await leerInfo(datos);
    const p = await DB.put('partituras', {
      titulo: info.titulo || nombreArchivo.replace(/\.(musicxml|xml|mxl)$/i, ''), compositor: info.compositor || '',
      datos, formato, creada: Date.now(), parte: info.partes[0] || null,
      desde: info.primerCompas, hasta: Math.min(info.compases, info.primerCompas + 7), bpm: info.bpm, bpmOriginal: info.bpm, compases: info.compases
    });
    return p;
  }
  async function importar() {
    const inp = h('input', { type: 'file', accept: '.musicxml,.xml,.mxl,application/vnd.recordare.musicxml+xml,application/vnd.recordare.musicxml,application/xml,text/xml' });
    inp.addEventListener('change', async () => {
      const f = inp.files && inp.files[0];
      if (!f) return;
      try {
        let datos, formato;
        if (/\.mxl$/i.test(f.name)) { datos = A.partitura.binaria(await f.arrayBuffer()); formato = 'mxl'; }
        else { datos = await f.text(); formato = 'xml'; }
        if (formato === 'xml' && !/<score-(partwise|timewise)/.test(datos)) throw new Error('No parece un MusicXML');
        u.toast('Leyendo la partitura…');
        const p = await anadir(datos, f.name, formato);
        location.hash = '#/p/' + p.id;
      } catch (e) {
        console.error(e);
        u.toast(/pdf/i.test(f.name) ? 'Compás no lee PDF: exporta la partitura como MusicXML desde MuseScore, Sibelius o Finale' : 'No se ha podido leer: ' + (e.message || e), 5000);
      }
    });
    inp.click();
  }
  async function cargarEjemplos() {
    const r = await u.modal('Ejemplos', h('p', { style: { margin: 0 } }, '¿Para qué instrumento? Los de violonchelo van en clave de fa, desde el Do grave, e incluyen estudios de Dotzauer y Lee.'), [
      { texto: 'Cancelar', accion: () => null },
      { texto: 'Bandurria y laúd', accion: () => 'pua' },
      { texto: 'Violonchelo', clase: 'primario', accion: () => 'cello' }
    ]);
    if (!r) return;
    const yaHay = new Set((await DB.all('partituras')).map(p => p.archivo));
    for (const n of EJEMPLOS[r]) {
      if (yaHay.has(n)) continue;
      const xml = await (await fetch('ejemplos/' + encodeURIComponent(n) + '.musicxml')).text();
      const p = await anadir(xml, n + '.musicxml', 'xml');
      p.archivo = n; await DB.put('partituras', p);
    }
    u.toast('Ejemplos añadidos');
    refrescar();
  }

  vistas.biblioteca = {
    titulo: 'Compás',
    async render({ main, acciones }) {
      acciones.append(h('a.btn-icono', { href: '#/ajustes', 'aria-label': 'Ajustes', title: 'Ajustes' }, icono('ajustes')));
      if (A.nativo.puedeSalir) acciones.append(h('button.btn-icono', { 'aria-label': 'Salir', title: 'Salir de Compás', onclick: () => A.nativo.cerrar() }, icono('salir')));
      const lista = (await DB.all('partituras')).sort((a, b) => (b.usada || b.creada) - (a.usada || a.creada));
      main.appendChild(h('section.hero.c-hero',
        h('div.hero-sub', 'Practica con la partitura'),
        h('div.hero-titulo', 'Toca y Compás te dice, nota a nota, qué ha salido bien'),
        h('div.fila', { style: { marginTop: '14px', gap: '8px' } },
          h('button.btn.blanco.crece', { onclick: importar }, icono('subir'), 'Importar MusicXML'))));
      if (!lista.length) {
        main.appendChild(h('section.tarjeta.vacio',
          h('div.vacio-icono', icono('nota')),
          h('h3', 'Aún no hay partituras'),
          h('p', 'Importa un archivo MusicXML (.musicxml o .mxl), el que exportan MuseScore, Sibelius o Finale. Un PDF no vale: son dibujos, no notas.'),
          h('button.btn.primario', { onclick: cargarEjemplos }, 'Probar con los ejemplos')));
        return;
      }
      main.appendChild(h('div.seccion-titulo', h('h2', 'Mis partituras')));
      main.appendChild(h('div.c-lista', lista.map(p => h('a.c-item', { href: '#/p/' + p.id },
        h('span.c-item-ic', icono('nota')),
        h('div.crece', h('b', p.titulo), h('div.mini.tenue', [p.compositor, p.compases ? p.compases + ' compases' : null].filter(Boolean).join(' · '))),
        p.ultimo && p.ultimo.puntuacion != null ? h('span.c-nota', { style: { background: color(p.ultimo.puntuacion) } }, p.ultimo.puntuacion + '%') : null,
        icono('adelante')))));
      if (lista.filter(p => p.archivo).length < 10) {
        main.appendChild(h('p.mini.tenue', { style: { textAlign: 'center' } }, h('button.enlace', { onclick: cargarEjemplos }, 'Añadir los ejemplos')));
      }
    }
  };

  const color = v => v == null ? 'var(--tinta-3)' : v < 50 ? '#FF5A5F' : v < 75 ? '#F5B400' : '#22C27A';

  /* ======================= Partitura y práctica ======================= */
  vistas.p = {
    atras: '#/',
    async render({ main, titulo, acciones, params }) {
      const p = await DB.get('partituras', params[0]);
      if (!p) { main.appendChild(h('div.vacio', 'Esta partitura ya no existe.')); return; }
      titulo.textContent = p.titulo;
      p.usada = Date.now(); DB.put('partituras', p);
      acciones.append(h('button.btn-icono', {
        'aria-label': 'Borrar', title: 'Borrar la partitura', onclick: async () => {
          if (!(await u.confirmar('¿Borrar «' + p.titulo + '» y sus prácticas?', 'Borrar', 'peligro'))) return;
          await DB.borrarPartitura(p.id); location.hash = '#/';
        }
      }, icono('borrar')));

      // ---------- controles
      const contPart = h('div.c-partitura');
      const marco = h('div.c-marco', contPart);
      const cargando = h('p.tenue', { style: { padding: '20px' } }, 'Dibujando la partitura…');
      marco.appendChild(cargando);
      const hoja = h('section.tarjeta.c-hoja', marco);
      main.appendChild(hoja);   // el visor necesita estar en la página para saber su anchura
      const zoomIni = await DB.kvGet('zoom', window.innerWidth < 600 ? 0.75 : 1);
      const { osmd, info } = await A.partitura.cargar(contPart, p.datos, { zoom: zoomIni });
      cargando.remove();
      const parte = (p.parte && info.partes.find(x => x.global === p.parte.global)) || info.partes[0];
      A.partitura.dibujar(osmd, parte);

      const inDesde = h('input.num', { type: 'number', min: info.primerCompas, max: info.compases, value: p.desde || info.primerCompas });
      const inHasta = h('input.num', { type: 'number', min: info.primerCompas, max: info.compases, value: p.hasta || info.compases });
      const bpmEl = h('b.num.c-bpm', p.bpm || info.bpm);
      let bpm = p.bpm || info.bpm;
      const pctEl = h('small.tenue');
      const pintarBpm = () => { bpmEl.textContent = bpm; pctEl.textContent = Math.round(bpm / (p.bpmOriginal || info.bpm) * 100) + ' % del original'; };
      const setBpm = b => { bpm = u.clamp(Math.round(b), 20, 300); pintarBpm(); p.bpm = bpm; DB.put('partituras', p); };
      pintarBpm();
      const guardarTramo = () => {
        let d = u.clamp(Number(inDesde.value) || info.primerCompas, info.primerCompas, info.compases);
        let hh = u.clamp(Number(inHasta.value) || d, d, info.compases);
        inDesde.value = d; inHasta.value = hh; p.desde = d; p.hasta = hh; DB.put('partituras', p);
        marcarTramo();
      };
      inDesde.addEventListener('change', guardarTramo); inHasta.addEventListener('change', guardarTramo);
      const selParte = info.partes.length > 1 ? h('select', { 'aria-label': 'Parte' }, info.partes.map(x => h('option', { value: x.global }, x.nombre))) : null;
      if (selParte) {
        selParte.value = parte.global;
        selParte.addEventListener('change', () => { p.parte = info.partes.find(x => x.global === Number(selParte.value)); DB.put('partituras', p); refrescar(); });
      }

      const btnTocar = h('button.btn.primario.c-tocar', { onclick: () => (practica ? practica.parar() : tocar()) }, icono('play'), 'Tocar');
      const estado = h('div.c-estado');
      main.insertBefore(h('section.tarjeta.c-controles',
        selParte ? u.campo('Parte que tocas', selParte) : null,
        h('div.c-fila',
          h('div.c-tramo', h('span.mini.tenue', 'Compases'), h('div.fila', { style: { gap: '6px' } }, inDesde, h('span', '–'), inHasta)),
          h('div.c-tempo', h('span.mini.tenue', 'Negras por minuto'),
            h('div.fila', { style: { gap: '6px' } },
              h('button.btn-icono.redondo', { 'aria-label': 'Más lento', onclick: () => setBpm(bpm - 4) }, icono('menos')), bpmEl,
              h('button.btn-icono.redondo', { 'aria-label': 'Más rápido', onclick: () => setBpm(bpm + 4) }, icono('mas'))), pctEl)),
        h('p.mini.tenue', { style: { margin: '6px 0 10px' } }, 'Toca un compás de la partitura para empezar desde él; con dos toques eliges el tramo.'),
        btnTocar, estado), hoja);

      // ---------- partitura
      const leyenda = h('div.leyenda.c-ley',
        h('span', h('i', { style: { background: '#22C27A' } }), 'Bien'), h('span', h('i', { style: { background: '#F5B400' } }), 'A destiempo o desafinada'),
        h('span', h('i', { style: { background: '#FF5A5F' } }), 'Equivocada'), h('span', h('i', { style: { background: '#B4AFCB' } }), 'No sonó'));
      hoja.insertBefore(h('div.fila', { style: { marginBottom: '6px' } }, leyenda, h('span.crece'),
        h('button.btn-icono', { 'aria-label': 'Reducir', onclick: () => zoom(-0.1) }, '−'), h('button.btn-icono', { 'aria-label': 'Ampliar', onclick: () => zoom(0.1) }, '+')), marco);

      let notas = [];
      function marcarTramo() {
        u.$$('.c-fuera', contPart).forEach(x => x.classList.remove('c-fuera'));
        // atenúa las notas fuera del tramo
        const todas = A.partitura.notas(osmd, parte, info.primerCompas, info.compases);
        todas.forEach(n => { if (n.compas < p.desde || n.compas > p.hasta) A.partitura.elementos(n).forEach(el => el.classList.add('c-fuera')); });
      }
      function zoom(d) {
        osmd.Zoom = u.clamp(Math.round((osmd.Zoom + d) * 10) / 10, 0.4, 2);
        DB.kvSet('zoom', osmd.Zoom);
        osmd.render(); marcarTramo();
        notas.forEach(n => n.estado && A.partitura.pintar(n, clase(n.estado)));
      }
      marcarTramo();

      // tocar un compás de la partitura: empezar desde él (dos toques seguidos: tramo)
      let ultimoToque = null;
      contPart.addEventListener('click', ev => {
        if (practica) return;
        const svg = contPart.querySelector('svg');
        if (!svg) return;
        const bb = svg.getBoundingClientRect();
        const unidades = 10 * osmd.Zoom;       // OSMD: 1 unidad = 10 px con zoom 1
        const m = A.partitura.compasEn(osmd, (ev.clientX - bb.left) / unidades, (ev.clientY - bb.top) / unidades);
        if (!m) return;
        if (ultimoToque && Date.now() - ultimoToque.t < 6000 && m >= ultimoToque.m) { inDesde.value = ultimoToque.m; inHasta.value = m; ultimoToque = null; }
        else { inDesde.value = m; inHasta.value = Math.max(m, Math.min(info.compases, m + (Number(p.hasta) - Number(p.desde) || 3))); ultimoToque = { m, t: Date.now() }; }
        guardarTramo();
        u.toast('Compases ' + p.desde + '–' + p.hasta, 1400);
      });

      const clase = e => ({ bien: 'n-bien', tiempo: 'n-tiempo', afin: 'n-tiempo', mal: 'n-mal', falta: 'n-falta' }[e] || null);
      let practica = null;
      const cuenta = h('div.c-cuenta');
      async function tocar() {
        guardarTramo();
        A.partitura.limpiar(notas);
        notas = A.partitura.notas(osmd, parte, p.desde, p.hasta);
        if (!notas.some(n => n.midi !== null)) { u.toast('No hay notas en esos compases'); return; }
        practica = A.practica.crear({
          notas, bpm, num: info.num, den: info.den, la: aj.la, tolerancia: aj.tolerancia, ignorarOctava: aj.ignorarOctava,
          retraso: aj.retraso / 1000, cuentaPrevia: aj.cuentaPrevia, metronomo: aj.metronomo,
          alCuenta: k => { if (k) { cuenta.textContent = k; cuenta.classList.add('on'); } else cuenta.classList.remove('on'); },
          alActual: n => {
            if (n.midi === null) return;
            A.partitura.pintar(n, 'n-actual');
            const el = A.partitura.elementos(n)[0];
            if (el) {
              const r = el.getBoundingClientRect(), mr = marco.getBoundingClientRect();
              if (r.top < mr.top + 20 || r.bottom > mr.bottom - 20) marco.scrollTo({ top: marco.scrollTop + r.top - mr.top - mr.height / 3, behavior: 'smooth' });
            }
          },
          alNota: n => A.partitura.pintar(n, clase(n.estado)),
          alFin: async r => {
            practica = null;
            u.pantallaEncendida(false, 'practica');
            btnTocar.replaceChildren(icono('play'), 'Tocar'); btnTocar.classList.remove('peligro');
            estado.textContent = '';
            if (!r.total) { u.toast('No ha dado tiempo a escuchar ninguna nota'); return; }
            const reg = Object.assign({ partituraId: p.id, fecha: Date.now(), desde: p.desde, hasta: p.hasta, bpm }, r);
            await DB.put('practicas', reg);
            p.ultimo = { puntuacion: r.puntuacion, fecha: reg.fecha };
            await DB.put('partituras', p);
            informe(r, reg);
          }
        });
        try { await practica.empezar(); }
        catch (e) { u.toast(e.message, 4000); practica = null; return; }
        u.pantallaEncendida(true, 'practica');
        btnTocar.replaceChildren(icono('stop'), 'Parar');
        estado.textContent = 'Escuchando los compases ' + p.desde + '–' + p.hasta + ' a ' + bpm + '…';
        marco.scrollTo({ top: 0 });
        const el = notas.find(n => n.midi !== null) && A.partitura.elementos(notas.find(n => n.midi !== null))[0];
        if (el) el.scrollIntoView({ block: 'center' });
      }
      document.body.appendChild(cuenta);

      async function informe(r, reg) {
        const anteriores = (await DB.byIndex('practicas', 'partituraId', p.id)).filter(x => x.id !== reg.id && x.desde === reg.desde && x.hasta === reg.hasta).sort((a, b) => b.fecha - a.fecha);
        const ant = anteriores[0];
        const v = r.puntuacion;
        const fila = (txt, n, col) => n ? h('div.c-rfila', h('i', { style: { background: col } }), h('span.crece', txt), h('b', n)) : null;
        const ritmo = r.mediaMs == null ? null : Math.abs(r.mediaMs) < 40 ? 'Vas a tempo.' : r.mediaMs < 0 ? 'Tiendes a adelantarte (' + Math.abs(r.mediaMs) + ' ms de media).' : 'Tiendes a retrasarte (' + r.mediaMs + ' ms de media).';
        const fallos = r.fallos.filter(f => f.n);
        const cuerpo = h('div.c-informe',
          h('div.c-rcab', h('div.c-circulo', { style: { background: color(v) } }, v, h('small', '%')),
            h('div', h('b', v >= 90 ? '¡Muy bien!' : v >= 75 ? 'Bien' : v >= 50 ? 'Vas por buen camino' : 'Más despacio'),
              h('div.mini.tenue', 'Compases ' + reg.desde + '–' + reg.hasta + ' a ' + reg.bpm + ' negras por minuto'),
              ant ? h('div.mini.tenue', 'La vez anterior: ' + ant.puntuacion + ' %' + (v > ant.puntuacion ? ' ↗' : v < ant.puntuacion ? ' ↘' : '')) : null)),
          h('div.c-rnum',
            h('div', h('b', r.notas + '%'), h('span', 'notas correctas')),
            h('div', h('b', r.aTiempo + '%'), h('span', 'de ellas, a tiempo'))),
          fila('Bien', r.bien, '#22C27A'), fila('A destiempo', r.tiempo, '#F5B400'), fila('Desafinadas', r.afin, '#F5B400'),
          fila('Equivocadas', r.mal, '#FF5A5F'), fila('No sonaron', r.falta, '#B4AFCB'),
          ritmo ? h('p', { style: { margin: '10px 0 0' } }, ritmo) : null,
          fallos.length ? h('div', { style: { marginTop: '10px' } }, h('span.mini.tenue', 'Compases con fallos'),
            h('div.fila.envuelve', { style: { gap: '6px', marginTop: '4px' } }, fallos.map(f => h('span.chip.aviso', 'c. ' + f.compas + (f.n > 1 ? ' · ' + f.n : ''))))) : null);
        const botones = [{ texto: 'Cerrar', accion: () => null }];
        if (fallos.length && v < 90) botones.push({ texto: 'Repetir los fallos', accion: () => 'fallos' });
        if (v >= 90 && !r.falta) botones.push({ texto: 'Subir el tempo', clase: 'primario', accion: () => 'subir' });
        botones.push({ texto: 'Otra vez', clase: v >= 90 && !r.falta ? '' : 'primario', accion: () => 'otra' });
        const q = await u.modal('Cómo ha ido', cuerpo, botones);
        if (q === 'fallos') {
          const ms = fallos.map(f => f.compas);
          inDesde.value = Math.min(...ms); inHasta.value = Math.max(...ms);
          if (Number(inHasta.value) - Number(inDesde.value) > 3) inHasta.value = Number(inDesde.value) + 1;
          setBpm(Math.max(30, Math.round(bpm * 0.9)));
          guardarTramo(); u.toast('Compases ' + p.desde + '–' + p.hasta + ', un poco más despacio');
        } else if (q === 'subir') { setBpm(bpm + Math.max(2, Math.round(bpm * 0.05))); u.toast('Tempo: ' + bpm); }
        if (q === 'otra' || q === 'fallos' || q === 'subir') { A.partitura.limpiar(notas); marcarTramo(); }
      }

      return () => { if (practica) practica.cancelar(); u.pantallaEncendida(false, 'practica'); cuenta.remove(); };
    }
  };

  /* ======================= Ajustes ======================= */
  vistas.ajustes = {
    titulo: 'Ajustes',
    atras: '#/',
    async render({ main }) {
      const seg = (opciones, valor, f) => h('div.segmentado', opciones.map(([v, t]) => h('button' + (valor === v ? '.on' : ''), { type: 'button', onclick: async () => { await f(v); refrescar(); } }, t)));
      const inter = (txt, v, f) => { const c = h('input', { type: 'checkbox', checked: v }); c.addEventListener('change', async () => { await f(c.checked); }); return h('label.interruptor', h('span', txt), c); };
      const laIn = h('input.num', { type: 'number', min: 430, max: 446, step: 0.5, value: aj.la, style: { width: '90px' } });
      laIn.addEventListener('change', async () => { aj.la = u.clamp(Number(laIn.value) || 442, 430, 446); laIn.value = aj.la; await guardarAjustes(); });
      const ret = h('input', { type: 'range', min: 0, max: 300, step: 10, value: aj.retraso });
      const retTxt = h('b', aj.retraso + ' ms');
      ret.addEventListener('input', () => { retTxt.textContent = ret.value + ' ms'; });
      ret.addEventListener('change', async () => { aj.retraso = Number(ret.value); await guardarAjustes(); });
      main.append(
        h('section.tarjeta', h('h2', 'Al tocar'),
          h('div.mini', { style: { fontWeight: 800, margin: '4px 0 6px' } }, 'Exigencia con el tiempo'),
          seg([['flexible', 'Flexible'], ['normal', 'Normal'], ['estricta', 'Estricta']], aj.tolerancia, async v => { aj.tolerancia = v; await guardarAjustes(); }),
          h('p.mini.tenue', 'Cuánto te puedes adelantar o atrasar en cada nota: 160, 110 o 70 milésimas.'),
          inter('Cuenta previa de un compás', aj.cuentaPrevia, async v => { aj.cuentaPrevia = v; await guardarAjustes(); }),
          inter('Metrónomo mientras tocas', aj.metronomo, async v => { aj.metronomo = v; await guardarAjustes(); }),
          h('p.mini.tenue', { style: { margin: '0 0 8px' } }, 'Mejor con auriculares: si el móvil oye el metrónomo, puede confundirlo con tus notas.'),
          inter('No tener en cuenta la octava', aj.ignorarOctava, async v => { aj.ignorarOctava = v; await guardarAjustes(); }),
          h('p.mini.tenue', { style: { margin: 0 } }, 'Actívalo si tu instrumento suena en otra octava de la que se escribe (laúd, guitarra) o si el micrófono confunde la octava.')),
        h('section.tarjeta', h('h2', 'Afinación y micrófono'),
          h('div.fila', h('span.crece', A.pitch.nombreLa() + ' de referencia (Hz)'), laIn),
          h('div.fila', { style: { marginTop: '12px' } }, h('span.crece', 'Retraso del micrófono'), retTxt), ret,
          h('p.mini.tenue', { style: { margin: '4px 0 0' } }, 'Si Compás te dice casi siempre que te retrasas aunque vas a tiempo, súbelo; si dice que te adelantas, bájalo. Compás también se adapta solo mientras tocas.')),
        h('section.tarjeta', h('h2', 'Apariencia'), seg([['auto', 'Automático'], ['light', 'Claro'], ['dark', 'Oscuro']], aj.tema, async v => { aj.tema = v; await guardarAjustes(); })),
        h('section.tarjeta', h('h2', 'Acerca de Compás'),
          h('p', { style: { marginTop: 0 } }, 'Compás escucha cómo tocas una partitura en MusicXML y te dice, nota a nota, qué ha salido bien. Funciona sin conexión: el sonido no sale de tu aparato.'),
          h('p.mini.tenue', 'Versión ' + A.VERSION + ' (piloto) · Creado por ', h('b', 'Alfredo Tabernero Martínez')),
          h('p.mini.tenue', { style: { margin: 0 } }, 'Partituras dibujadas con OpenSheetMusicDisplay (licencia BSD).')),
        h('section.tarjeta', h('h2', 'Datos'),
          h('button.btn.peligro', { onclick: async () => {
            if (!(await u.confirmar('¿Borrar todas las partituras y prácticas de este aparato?', 'Borrar todo', 'peligro'))) return;
            for (const x of await DB.all('partituras')) await DB.borrarPartitura(x.id);
            u.toast('Borrado'); location.hash = '#/';
          } }, 'Borrar todo')));
    }
  };

  /* ======================= Arranque ======================= */
  async function arrancar() {
    await cargarAjustes();
    window.addEventListener('hashchange', pintar);
    await pintar();
    if (A.nativo && A.nativo.App) A.nativo.App.addListener('backButton', () => {
      if (u.$('.modal-fondo.show')) { u.$$('.modal-fondo.show').pop().click(); return; }
      if (ruta().vista === 'biblioteca') A.nativo.cerrar(); else history.back();
    });
    if ('serviceWorker' in navigator && location.protocol.startsWith('http') && !(A.nativo && A.nativo.es)) navigator.serviceWorker.register('sw.js').catch(() => {});
    u.pantallaEncendida(false);
  }
  A.app = { refrescar };
  arrancar();
})(window.Compas);
