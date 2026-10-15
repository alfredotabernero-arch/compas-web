/* Compás — iconos SVG en línea (trazo, 24×24) */
(function (A) {
  'use strict';
  const P = {
    libro: '<path d="M4 5a2 2 0 0 1 2-2h5v17H6a2 2 0 0 0-2 2z"/><path d="M20 5a2 2 0 0 0-2-2h-5v17h5a2 2 0 0 1 2 2z"/>',
    dividir: '<path d="M12 3v18"/><path d="M8 8l-4 4 4 4M16 8l4 4-4 4"/>',
    unir: '<path d="M4 12h6M14 12h6"/><path d="M7 8l4 4-4 4M17 8l-4 4 4 4"/>',
    hoy: '<path d="M4 9h16M8 3v4M16 3v4"/><rect x="4" y="5" width="16" height="16" rx="3"/><path d="M9 14l2 2 4-4"/>',
    obras: '<path d="M9 18V5l11-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="17" cy="16" r="3"/>',
    herramientas: '<path d="M6 20h12M8 20l3.2-15h1.6L16 20"/><path d="M12 13l5-6"/><circle cx="17.5" cy="6.5" r="1.5"/>',
    estadisticas: '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>',
    ajustes: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>',
    play: '<path d="M7 4.5v15l13-7.5z" fill="currentColor" stroke="none"/>',
    stop: '<rect x="6" y="6" width="12" height="12" rx="2" fill="currentColor" stroke="none"/>',
    pausa: '<rect x="6" y="5" width="4" height="14" rx="1" fill="currentColor" stroke="none"/><rect x="14" y="5" width="4" height="14" rx="1" fill="currentColor" stroke="none"/>',
    mas: '<path d="M12 5v14M5 12h14"/>',
    menos: '<path d="M5 12h14"/>',
    atras: '<path d="M15 18l-6-6 6-6"/>',
    editar: '<path d="M4 20h4L19 9l-4-4L4 16z"/><path d="M14 6l4 4"/>',
    borrar: '<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>',
    reloj: '<circle cx="12" cy="13" r="8"/><path d="M12 9v4l2.5 2.5M10 2h4"/>',
    metronomo: '<path d="M8 21h8l-3.2-17h-1.6z"/><path d="M12 15l5.5-7"/>',
    afinador: '<path d="M4 18a8 8 0 0 1 16 0"/><path d="M12 18l4-6"/><path d="M4 21h16"/>',
    mic: '<rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/>',
    nota: '<path d="M9 18V5l8-2v4l-8 2"/><circle cx="6" cy="18" r="3"/>',
    contador: '<path d="M4 6h16M4 12h10M4 18h6"/><path d="M17 15l2 2 3-4"/>',
    check: '<path d="M5 12.5l4.5 4.5L19 7"/>',
    x: '<path d="M6 6l12 12M18 6L6 18"/>',
    descargar: '<path d="M12 4v11M7 10l5 5 5-5M5 20h14"/>',
    oido: '<path d="M7 10a5 5 0 0 1 10 0c0 3-2.5 4-3.2 6.2-.6 1.9-1.8 3.8-4 3.8a3 3 0 0 1-3-3"/><path d="M10 10a2 2 0 0 1 4 0c0 1.3-1.2 1.6-1.6 2.6"/>',
    compartir: '<circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="M8.6 10.5l6.8-4M8.6 13.5l6.8 4"/>',
    subir: '<path d="M12 20V9M7 14l5-5 5 5M5 4h14"/>',
    estrella: '<path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z"/>',
    fuego: '<path d="M12 22c4 0 7-2.7 7-6.8 0-3-1.8-5.4-3.6-7.2-.4 1.8-1.4 3-2.6 3.6.3-3.4-1.3-6.6-4.3-8.6.4 3.2-1.2 5.3-2.7 7.1C4.7 11.5 5 13.3 5 15.2 5 19.3 8 22 12 22z"/>',
    manana: '<rect x="3" y="5" width="18" height="16" rx="3"/><path d="M3 10h18M8 3v4M16 3v4"/><path d="M10 15.5h5m-2-2 2 2-2 2"/>',
    sol: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
    rayo: '<path d="M13 2L4 14h7l-1 8 9-12h-7z"/>',
    grabar: '<circle cx="12" cy="12" r="7" fill="currentColor" stroke="none"/>',
    cambiar: '<path d="M4 7h13l-3-3M20 17H7l3 3"/>',
    girar: '<path d="M20 11a8 8 0 1 0-2.3 5.7"/><path d="M20 4v7h-7"/>',
    camara: '<path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3.5"/>',
    imagen: '<rect x="3" y="4" width="18" height="16" rx="3"/><circle cx="9" cy="10" r="2"/><path d="M21 16l-5-5-9 9"/>',
    tareas: '<path d="M9 6h11M9 12h11M9 18h11"/><path d="M3.5 6l1.5 1.5L7 5M3.5 12l1.5 1.5L7 11"/><circle cx="5" cy="18" r="1.3"/>',
    atril: '<path d="M5 4h14l-1.5 9h-11z"/><path d="M12 13v8M8 21l4-3 4 3"/>',
    adelante: '<path d="M9 18l6-6-6-6"/>',
    salir: '<path d="M12 3v8"/><path d="M6.6 6.6a8 8 0 1 0 10.8 0"/>',
    deshacer: '<path d="M9 14L4 9l5-5"/><path d="M4 9h11a5 5 0 0 1 0 10h-3"/>',
    rehacer: '<path d="M15 14l5-5-5-5"/><path d="M20 9H9a5 5 0 0 0 0 10h3"/>',
    lapiz: '<path d="M4 20l1-5L16 4l4 4L9 19z"/><path d="M13.5 6.5l4 4"/>',
    resaltador: '<path d="M9 15l-3 3H3l3-3"/><path d="M8 13l7-9 5 5-9 7z"/><path d="M4 21h16"/>',
    texto: '<path d="M5 6V4h14v2M12 4v16M9 20h6"/>',
    goma: '<path d="M8 20h12"/><path d="M4.5 15.5l9-9a2 2 0 0 1 2.8 0l3.2 3.2a2 2 0 0 1 0 2.8L13 19H8.5z"/><path d="M9 11l5 5"/>',
    mano: '<path d="M8 13V5.5a1.5 1.5 0 0 1 3 0V12M11 11V4.5a1.5 1.5 0 0 1 3 0V12M14 11.5V6.5a1.5 1.5 0 0 1 3 0V15a6 6 0 0 1-6 6h-1a6 6 0 0 1-5-2.7L3.5 15a1.5 1.5 0 0 1 2.5-1.7L8 16"/>',
    hoja: '<path d="M5 21c0-9 6-15 15-16-1 9-7 15-15 16z"/><path d="M5 21l8-8"/>',
    respirar: '<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="4"/>',
    nota2: '<path d="M8 7h8M8 11h8M8 15h5"/><rect x="4" y="3" width="16" height="18" rx="3"/>'
  };
  A.icono = (n, cls) => {
    const s = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    s.setAttribute('viewBox', '0 0 24 24');
    s.setAttribute('fill', 'none');
    s.setAttribute('stroke', 'currentColor');
    s.setAttribute('stroke-width', '1.9');
    s.setAttribute('stroke-linecap', 'round');
    s.setAttribute('stroke-linejoin', 'round');
    s.setAttribute('aria-hidden', 'true');
    if (cls) s.setAttribute('class', cls);
    s.innerHTML = P[n] || '';
    return s;
  };
})(window.Compas);
