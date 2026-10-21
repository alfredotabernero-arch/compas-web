/* Compás — funciona sin conexión */
const CACHE = 'compas-v0.1.10';
const ARCHIVOS = ['./', 'index.html', 'manifest.webmanifest', 'css/app.css', 'css/compas.css',
  'js/vendor/capacitor.js', 'js/vendor/opensheetmusicdisplay.min.js', 'js/util.js', 'js/iconos.js', 'js/nativo.js', 'js/pitch.js', 'js/db.js',
  'js/partitura.js', 'js/practica.js', 'js/app.js',
  'sonidos/pua.js', 'sonidos/guitarra.js', 'sonidos/violin.js', 'sonidos/viola.js', 'sonidos/violonchelo.js', 'sonidos/flauta.js', 'sonidos/clarinete.js', 'sonidos/piano.js', 'icons/icono.svg', 'icons/icono-192.png', 'icons/icono-512.png',
  'fonts/nunito-latin-wght-normal.woff2', 'fonts/nunito-latin-ext-wght-normal.woff2',
  'ejemplos/01 - Escala de Re mayor.musicxml', 'ejemplos/02 - Arpegios en Sol mayor.musicxml', 'ejemplos/03 - Campanero (tradicional).musicxml',
  'ejemplos/04 - Oda a la alegria (Beethoven).musicxml', 'ejemplos/05 - Ritmos en La mayor.musicxml',
  'ejemplos/06 - Violonchelo - Cuerdas al aire.musicxml', 'ejemplos/07 - Violonchelo - Escala de Do mayor (2 octavas).musicxml', 'ejemplos/08 - Violonchelo - Escala de Re mayor (corcheas).musicxml',
  'ejemplos/09 - Violonchelo - Arpegios en Sol mayor.musicxml', 'ejemplos/10 - Violonchelo - Oda a la alegria (Beethoven).musicxml',
  'ejemplos/11 - Violonchelo - Dotzauer, estudio 4.musicxml', 'ejemplos/12 - Violonchelo - Dotzauer, estudio 5.musicxml',
  'ejemplos/13 - Violonchelo - Lee, op. 31 n. 1.musicxml', 'ejemplos/14 - Violonchelo - Lee, op. 31 n. 4 (Scherzo).musicxml'];
self.addEventListener('install', e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(ARCHIVOS.map(a => encodeURI(a)))).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  e.respondWith(caches.match(e.request).then(r => r || fetch(e.request)));
});
