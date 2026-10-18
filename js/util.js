/* Compás — utilidades comunes (DOM, formato, avisos, diálogos) */
window.Compas = window.Compas || {};

(function (A) {
  'use strict';

  /** Crea un elemento: h('div.clase#id', {attrs}, ...hijos) */
  function h(sel, attrs, ...children) {
    const m = sel.match(/^([a-z0-9-]+)?((?:[.#][\w-]+)*)$/i);
    const el = document.createElement((m && m[1]) || 'div');
    if (m && m[2]) {
      m[2].replace(/([.#])([\w-]+)/g, (_, t, n) => {
        if (t === '.') el.classList.add(n); else el.id = n;
      });
    }
    if (attrs !== null && attrs !== undefined && (typeof attrs !== 'object' || attrs instanceof Node || Array.isArray(attrs))) {
      children.unshift(attrs); attrs = null;
    }
    let valor;
    if (attrs) {
      for (const [k, v] of Object.entries(attrs)) {
        if (v === undefined || v === null || v === false) continue;
        if (k === 'value') { valor = v; continue; }
        if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2).toLowerCase(), v);
        else if (k === 'style' && typeof v === 'object') {
          for (const [p, val] of Object.entries(v)) {
            if (p.startsWith('--')) el.style.setProperty(p, val); else el.style[p] = val;
          }
        }
        else if (k === 'html') el.innerHTML = v;
        else if (k in el && typeof v !== 'string' && k !== 'list') el[k] = v;
        else el.setAttribute(k, v === true ? '' : v);
      }
    }
    append(el, children);
    if (valor !== undefined) el.value = valor;
    return el;
  }
  function append(el, children) {
    for (const c of children.flat(Infinity)) {
      if (c === null || c === undefined || c === false) continue;
      el.appendChild(c instanceof Node ? c : document.createTextNode(String(c)));
    }
    return el;
  }
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));

  function uid() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  }

  /* ---------- Fechas ---------- */
  const DIAS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
  const DIAS_CORTOS = ['D', 'L', 'M', 'X', 'J', 'V', 'S'];
  const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

  function claveDia(d) {
    d = new Date(d);
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }
  function inicioDia(d) { d = new Date(d); d.setHours(0, 0, 0, 0); return d; }
  /** Lunes de la semana de d */
  function inicioSemana(d) {
    d = inicioDia(d);
    const wd = (d.getDay() + 6) % 7;
    d.setDate(d.getDate() - wd);
    return d;
  }
  function sumarDias(d, n) { d = new Date(d); d.setDate(d.getDate() + n); return d; }
  function fechaCorta(d) { d = new Date(d); return d.getDate() + ' ' + MESES[d.getMonth()]; }
  function fechaLarga(d) {
    d = new Date(d);
    return DIAS[d.getDay()] + ', ' + d.getDate() + ' ' + MESES[d.getMonth()] + ' ' + d.getFullYear();
  }
  function hora(d) {
    d = new Date(d);
    return String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
  }
  function diasEntre(a, b) { return Math.round((inicioDia(b) - inicioDia(a)) / 86400000); }

  /** 75 → "1 h 15 min" */
  function minutos(m) {
    m = Math.round(m || 0);
    if (m < 60) return m + ' min';
    const hh = Math.floor(m / 60), mm = m % 60;
    return hh + ' h' + (mm ? ' ' + mm + ' min' : '');
  }
  /** segundos → "mm:ss" o "h:mm:ss" */
  function reloj(s) {
    s = Math.max(0, Math.floor(s));
    const hh = Math.floor(s / 3600), mm = Math.floor((s % 3600) / 60), ss = s % 60;
    const p = n => String(n).padStart(2, '0');
    return (hh ? hh + ':' + p(mm) : p(mm)) + ':' + p(ss);
  }

  /* ---------- Avisos ---------- */
  function toast(msg, ms = 2600) {
    let box = $('#toasts');
    if (!box) { box = h('div#toasts'); document.body.appendChild(box); }
    const t = h('div.toast', msg);
    box.appendChild(t);
    requestAnimationFrame(() => t.classList.add('show'));
    setTimeout(() => { t.classList.remove('show'); setTimeout(() => t.remove(), 300); }, ms);
  }

  /**
   * Diálogo modal. contenido: Node o función(cerrar) → Node.
   * botones: [{texto, clase, accion(cerrar) → valor|false}]
   * Devuelve una promesa con el valor del botón (o null al cancelar).
   */
  function modal(titulo, contenido, botones) {
    return new Promise(resolve => {
      const fondo = h('div.modal-fondo');
      let hecho = false;
      const alSalir = () => cerrar(null);
      const cerrar = v => {
        if (hecho) return; hecho = true;
        window.removeEventListener('hashchange', alSalir);
        fondo.classList.remove('show');
        setTimeout(() => fondo.remove(), 200);
        resolve(v === undefined ? null : v);
      };
      const cuerpo = typeof contenido === 'function' ? contenido(cerrar) : contenido;
      const pie = h('div.modal-pie');
      (botones || [{ texto: 'Cerrar' }]).forEach(b => {
        pie.appendChild(h('button.btn' + (b.clase ? '.' + b.clase : ''), {
          type: 'button',
          onclick: async () => {
            const r = b.accion ? await b.accion(cerrar) : null;
            if (r !== false) cerrar(r);
          }
        }, b.texto));
      });
      const caja = h('div.modal', { role: 'dialog', 'aria-modal': 'true' },
        titulo ? h('h2.modal-titulo', titulo) : null,
        h('div.modal-cuerpo', cuerpo),
        pie);
      fondo.appendChild(caja);
      fondo.addEventListener('click', e => { if (e.target === fondo) cerrar(null); });
      // al cambiar de pantalla (Atrás, menú), el aviso se cierra solo
      window.addEventListener('hashchange', alSalir);
      document.body.appendChild(fondo);
      requestAnimationFrame(() => fondo.classList.add('show'));
      const primero = caja.querySelector('input,select,textarea');
      if (primero) setTimeout(() => primero.focus(), 50);
    });
  }

  function confirmar(texto, si = 'Aceptar', clase = 'primario') {
    return modal(null, h('p', texto), [
      { texto: 'Cancelar', accion: () => null },
      { texto: si, clase, accion: () => true }
    ]);
  }

  /** Lee los valores de un formulario creado con campos name= */
  function leerForm(raiz) {
    const o = {};
    $$('[name]', raiz).forEach(el => {
      if (el.type === 'checkbox') o[el.name] = el.checked;
      else if (el.type === 'number' || el.type === 'range') o[el.name] = el.value === '' ? null : Number(el.value);
      else o[el.name] = el.value.trim();
    });
    return o;
  }

  /** Campo etiquetado */
  function campo(etiqueta, control, ayuda) {
    return h('label.campo', h('span.campo-et', etiqueta), control, ayuda ? h('small.campo-ayuda', ayuda) : null);
  }

  function clamp(v, a, b) { return Math.min(b, Math.max(a, v)); }

  /*
   * Guarda un fichero. En el navegador y en el PC lo descarga; en la app de Android
   * lo escribe en la caché y abre el menú «Compartir» (Drive, correo, WhatsApp, Quick Share…).
   * Devuelve true si se ha descargado o compartido, false si se canceló o falló.
   */
  function blobABase64(blob) {
    return new Promise((ok, mal) => {
      const r = new FileReader();
      r.onload = () => { const s = String(r.result); ok(s.slice(s.indexOf(',') + 1)); };
      r.onerror = () => mal(r.error);
      r.readAsDataURL(blob);
    });
  }
  async function descargar(nombre, contenido, tipo = 'application/json') {
    const blob = contenido instanceof Blob ? contenido : new Blob([contenido], { type: tipo });
    const fs = A.nativo && A.nativo.Filesystem, share = A.nativo && A.nativo.Share;
    if (fs && share) {
      try {
        const r = await fs.writeFile({ path: nombre, data: await blobABase64(blob), directory: 'CACHE' });
        await share.share({ title: nombre, files: [r.uri], dialogTitle: 'Enviar ' + nombre });
        return true;
      } catch (e) {
        const msg = String((e && e.message) || e);
        if (/cancel/i.test(msg)) return false;
        toast('No se ha podido compartir: ' + msg, 4000);
        return false;
      }
    }
    // iPhone / iPad (web instalada): la descarga directa no funciona bien; se usa el menú Compartir del sistema
    const esIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    if (esIOS && navigator.canShare) {
      try {
        const f = new File([blob], nombre, { type: blob.type || 'application/octet-stream' });
        if (navigator.canShare({ files: [f] })) { await navigator.share({ files: [f], title: nombre }); return true; }
      } catch (e) {
        if (e && e.name === 'AbortError') return false;
      }
    }
    const url = URL.createObjectURL(blob);
    const a = h('a', { href: url, download: nombre });
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
    return true;
  }

  /** Mantiene la pantalla encendida mientras se use (si el navegador lo permite) */
  /*
   * Pantalla siempre encendida, por motivos: la sesión de estudio, el metrónomo, la vista «En el atril»…
   * Sigue encendida mientras quede algún motivo. pantallaEncendida(false) sin motivo los quita todos.
   * En la app de Android se usa el plugin nativo «Pantalla»; en el navegador, la Wake Lock API.
   */
  const motivosPantalla = new Set();
  let wakeLock = null;
  let estadoNativo = null, pidiendo = false;
  async function aplicarPantalla() {
    const on = motivosPantalla.size > 0;
    const nat = A.nativo && A.nativo.Pantalla;
    if (nat) {
      if (estadoNativo !== on) { estadoNativo = on; try { await nat.mantener({ encendida: on }); } catch (e) { estadoNativo = null; } }
      return;
    }
    try {
      if (on && 'wakeLock' in navigator && !wakeLock && !pidiendo && !document.hidden) {
        pidiendo = true;
        try { wakeLock = await navigator.wakeLock.request('screen'); } finally { pidiendo = false; }
        wakeLock.addEventListener('release', () => { wakeLock = null; });
        if (!motivosPantalla.size) { await wakeLock.release(); wakeLock = null; }
      } else if (!on && wakeLock) {
        await wakeLock.release(); wakeLock = null;
      }
    } catch (e) { /* no disponible */ }
  }
  function pantallaEncendida(on, motivo) {
    if (motivo === undefined && !on) motivosPantalla.clear();
    else if (on) motivosPantalla.add(motivo || 'general');
    else motivosPantalla.delete(motivo);
    return aplicarPantalla();
  }
  // el navegador suelta el bloqueo al ocultarse la página: se recupera al volver
  document.addEventListener('visibilitychange', () => { if (!document.hidden && motivosPantalla.size) aplicarPantalla(); });
  // algunos navegadores (iPhone) solo lo conceden tras tocar la pantalla
  document.addEventListener('pointerdown', () => { if (motivosPantalla.size && !wakeLock && !(A.nativo && A.nativo.Pantalla)) aplicarPantalla(); }, { passive: true });

  A.u = {
    h, append, $, $$, uid, claveDia, inicioDia, inicioSemana, sumarDias, fechaCorta, fechaLarga,
    hora, diasEntre, minutos, reloj, toast, modal, confirmar, leerForm, campo, clamp, descargar,
    pantallaEncendida, DIAS, DIAS_CORTOS, MESES
  };
})(window.Compas);
