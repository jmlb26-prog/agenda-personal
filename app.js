/* =========================================================
   Agenda Personal – app.js
   Post-it por día + calendario festivos Andalucía/Sevilla
   Sin dependencias. Se ejecuta abriendo index.html en el navegador.
   ========================================================= */
'use strict';

/* ---------------------------------------------------------
   0. Utilidades generales
   --------------------------------------------------------- */
const $  = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));

let _uid = 0;
function uid(){
  _uid++;
  return 'id' + Date.now().toString(36) + '_' + _uid + '_' + Math.random().toString(36).slice(2, 7);
}
function esc(s){
  return String(s ?? '').replace(/[&<>"']/g, c => (
    { '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]
  ));
}
function clone(o){ return JSON.parse(JSON.stringify(o)); }

/* --------- Fechas en calendario LOCAL (sin desfases UTC) --------- */
const DIAS  = ['domingo','lunes','martes','miércoles','jueves','viernes','sábado'];
const MESES = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];

function toKey(d){
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}
function todayKey(){ return toKey(new Date()); }
function isKey(v){ return typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v); }
function parseKey(k){ const [y,m,d] = k.split('-').map(Number); return new Date(y, m-1, d); }
function addDaysKey(k, n){ const d = parseKey(k); d.setDate(d.getDate() + n); return toKey(d); }
function diffDays(fromK, toK){ return Math.round((parseKey(toK) - parseKey(fromK)) / 86400000); }
function longDate(k){
  const d = parseKey(k);
  return `${DIAS[d.getDay()]} ${d.getDate()} de ${MESES[d.getMonth()]} de ${d.getFullYear()}`;
}
function shortDate(k){
  if (!isKey(k)) return '';
  const d = parseKey(k);
  return `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}/${d.getFullYear()}`;
}
function nowHora(){
  const d = new Date();
  return `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
}

/* ---------------------------------------------------------
   1. Modelo de datos
   --------------------------------------------------------- */
const STORE_KEY = 'miAgenda.datos.v1';
const COLORES   = ['amarillo','rosa','verde','azul','rojo','naranja'];
const TIPOS     = {
  tarea : { label:'Tarea',  icon:'☑' },
  cita  : { label:'Cita',   icon:'📅' },
  evento: { label:'Evento', icon:'👥' },
  nota  : { label:'Nota',   icon:'📝' }
};
const PRIORIDADES = { alta:0, media:1, baja:2 };

/* Calendario escolar de Andalucía – provincia y ciudad de Sevilla
   Curso 2026/2027 (festivos nacionales/autonómicos + locales de Sevilla
   + días no lectivos). Todo editable desde la pantalla «Festivos». */
const FESTIVOS_SEED = [
  { fecha:'2026-01-01', nombre:'Año Nuevo',                          ambito:'nacional' },
  { fecha:'2026-01-06', nombre:'Epifanía del Señor',                 ambito:'nacional' },
  { fecha:'2026-02-28', nombre:'Día de Andalucía',                   ambito:'autonómico' },
  { fecha:'2026-04-02', nombre:'Jueves Santo',                       ambito:'nacional' },
  { fecha:'2026-04-03', nombre:'Viernes Santo',                      ambito:'nacional' },
  { fecha:'2026-04-22', nombre:'Miércoles de Feria (Sevilla)',       ambito:'local' },
  { fecha:'2026-05-01', nombre:'Fiesta del Trabajo',                 ambito:'nacional' },
  { fecha:'2026-06-04', nombre:'Jueves del Corpus (Sevilla)',        ambito:'local' },
  { fecha:'2026-08-15', nombre:'Asunción de la Virgen',              ambito:'nacional' },
  { fecha:'2026-10-12', nombre:'Fiesta Nacional de España',          ambito:'nacional' },
  { fecha:'2026-11-02', nombre:'Día siguiente a Todos los Santos',   ambito:'autonómico' },
  { fecha:'2026-12-07', nombre:'Día siguiente a la Constitución',    ambito:'autonómico' },
  { fecha:'2026-12-08', nombre:'Inmaculada Concepción',              ambito:'nacional' },
  { fecha:'2026-12-25', nombre:'Natividad del Señor',                ambito:'nacional' },
  { fecha:'2027-01-01', nombre:'Año Nuevo',                          ambito:'nacional' },
  { fecha:'2027-01-06', nombre:'Epifanía del Señor',                 ambito:'nacional' },
  { fecha:'2027-01-08', nombre:'No lectivo provincial (Sevilla)',    ambito:'no lectivo' },
  { fecha:'2027-02-26', nombre:'Día de la Comunidad Educativa',      ambito:'no lectivo' },
  { fecha:'2027-03-01', nombre:'Día de Andalucía (trasladado)',      ambito:'autonómico' },
  { fecha:'2027-03-25', nombre:'Jueves Santo',                       ambito:'nacional' },
  { fecha:'2027-03-26', nombre:'Viernes Santo',                      ambito:'nacional' },
  { fecha:'2027-04-14', nombre:'Miércoles de Feria (Sevilla)',       ambito:'local' },
  { fecha:'2027-05-01', nombre:'Fiesta del Trabajo',                 ambito:'nacional' },
  { fecha:'2027-05-27', nombre:'Jueves del Corpus (Sevilla)',        ambito:'local' },
  { fecha:'2027-08-16', nombre:'Asunción (trasladada al lunes)',     ambito:'nacional' },
  { fecha:'2027-10-12', nombre:'Fiesta Nacional de España',          ambito:'nacional' },
  { fecha:'2027-11-01', nombre:'Todos los Santos',                   ambito:'nacional' },
  { fecha:'2027-12-06', nombre:'Día de la Constitución',             ambito:'nacional' },
  { fecha:'2027-12-08', nombre:'Inmaculada Concepción',              ambito:'nacional' },
  { fecha:'2027-12-25', nombre:'Natividad del Señor',                ambito:'nacional' }
];

const VACACIONES_SEED = [
  { desde:'2026-07-01', hasta:'2026-08-31', nombre:'Verano' },
  { desde:'2026-12-24', hasta:'2027-01-10', nombre:'Navidad' },
  { desde:'2027-03-20', hasta:'2027-03-28', nombre:'Semana Santa' },
  { desde:'2027-04-12', hasta:'2027-04-18', nombre:'Feria de Sevilla' },
  { desde:'2027-07-01', hasta:'2027-08-31', nombre:'Verano' }
];

function normAct(a){
  a = a || {};
  const dias = (Array.isArray(a.dias) ? a.dias : []).filter(isKey);
  return {
    id            : a.id || uid(),
    tipo          : TIPOS[a.tipo] ? a.tipo : 'tarea',
    titulo        : String(a.titulo || ''),
    descripcion   : String(a.descripcion || ''),
    prioridad     : PRIORIDADES[a.prioridad] !== undefined ? a.prioridad : 'media',
    color         : COLORES.includes(a.color) ? a.color : 'amarillo',
    dias          : [...new Set(dias.length ? dias : [todayKey()])].sort(),
    fechaCreacion : isKey(a.fechaCreacion) ? a.fechaCreacion : todayKey(),
    fechaPrevista : isKey(a.fechaPrevista) ? a.fechaPrevista : null,
    fechaFinReal  : isKey(a.fechaFinReal) ? a.fechaFinReal : null,
    finalizada    : !!a.finalizada,
    hora          : String(a.hora || ''),
    duracionMin   : Number(a.duracionMin) || 0,
    lugar         : String(a.lugar || ''),
    participantes : String(a.participantes || ''),
    comentarios   : Array.isArray(a.comentarios) ? a.comentarios.map(c => ({
                      id: c.id || uid(),
                      fecha: isKey(c.fecha) ? c.fecha : todayKey(),
                      hora : String(c.hora || ''),
                      texto: String(c.texto || '')
                    })) : [],
    orden         : Number(a.orden) || 0
  };
}

function normalize(raw){
  const d = (raw && typeof raw === 'object') ? raw : {};
  const cal = d.calendario || {};
  return {
    version    : 1,
    actualizado: d.actualizado || new Date().toISOString(),
    config     : Object.assign({ inicioSemana:'lunes' }, d.config || {}),
    actividades: Array.isArray(d.actividades) ? d.actividades.map(normAct) : [],
    notasDia   : Array.isArray(d.notasDia)
                   ? d.notasDia.filter(n => n && isKey(n.fecha)).map(n => ({
                       fecha: n.fecha, texto: String(n.texto || ''),
                       actualizado: String(n.actualizado || '')
                     }))
                   : [],
    calendario : {
      festivos  : Array.isArray(cal.festivos)
                    ? cal.festivos.filter(f => f && isKey(f.fecha)).map(f => ({
                        id: f.id || uid(), fecha: f.fecha,
                        nombre: String(f.nombre || 'Festivo'),
                        ambito: String(f.ambito || 'local')
                      }))
                    : FESTIVOS_SEED.map(f => Object.assign({ id: uid() }, f)),
      vacaciones: Array.isArray(cal.vacaciones)
                    ? cal.vacaciones.filter(v => v && isKey(v.desde) && isKey(v.hasta)).map(v => ({
                        id: v.id || uid(), desde: v.desde, hasta: v.hasta,
                        nombre: String(v.nombre || 'Vacaciones')
                      }))
                    : VACACIONES_SEED.map(v => Object.assign({ id: uid() }, v))
    }
  };
}

let state = normalize(null);          // arranca con el calendario de Sevilla

const ui = { fecha: todayKey(), calMonth: null };

/* ---------------------------------------------------------
   2. Clasificación de los días
   --------------------------------------------------------- */
function dayType(k){
  const f = state.calendario.festivos.find(x => x.fecha === k);
  if (f) return {
    key:'festivo', color:'var(--c-festivo)',
    badge:'Festivo · ' + f.nombre,
    banner:'FESTIVO', sub:f.nombre,
    leyenda:'Festivo' + (f.ambito ? ' · ' + f.ambito : '')
  };
  const v = state.calendario.vacaciones.find(x => k >= x.desde && k <= x.hasta);
  if (v) return {
    key:'vacaciones', color:'var(--c-vacaciones)',
    badge:'Vacaciones · ' + v.nombre,
    banner:'VACACIONES', sub:v.nombre,
    leyenda:'Período de vacaciones · ' + v.nombre
  };
  const dw = parseKey(k).getDay();
  if (dw === 0 || dw === 6) return {
    key:'finde', color:'var(--c-finde)',
    badge:'Fin de semana',
    banner:'FIN DE SEMANA', sub:'no lectivo',
    leyenda:'Sábado / domingo'
  };
  return {
    key:'lectivo', color:'var(--c-lectivo)',
    badge:'Día lectivo',
    banner:'DÍA LECTIVO', sub:'jornada escolar',
    leyenda:'Día lectivo'
  };
}

/* ---------------------------------------------------------
   3. Consultas del modelo
   --------------------------------------------------------- */
function findAct(id){ return state.actividades.find(a => a.id === id) || null; }

function activitiesOfDay(k){
  return state.actividades
    .filter(a => a.dias.includes(k))
    .sort((a, b) => {
      if (a.finalizada !== b.finalizada) return a.finalizada ? 1 : -1;
      if (!!a.hora !== !!b.hora) return a.hora ? -1 : 1;
      if (a.hora && b.hora && a.hora !== b.hora) return a.hora.localeCompare(b.hora);
      if (PRIORIDADES[a.prioridad] !== PRIORIDADES[b.prioridad])
        return PRIORIDADES[a.prioridad] - PRIORIDADES[b.prioridad];
      return (a.orden || 0) - (b.orden || 0);
    });
}

function getNota(k){
  const n = state.notasDia.find(x => x.fecha === k);
  return n ? n.texto : '';
}
function setNota(k, texto){
  let n = state.notasDia.find(x => x.fecha === k);
  if (!n){ n = { fecha:k, texto:'', actualizado:'' }; state.notasDia.push(n); }
  n.texto = texto;
  n.actualizado = new Date().toISOString();
  scheduleSave();
}
function nextOrden(){
  return state.actividades.reduce((m, a) => Math.max(m, a.orden || 0), 0) + 1;
}

/* ---------------------------------------------------------
   4. Persistencia
   --------------------------------------------------------- */
let fileHandle   = null;   // File System Access API (Chrome/Edge)
let origen       = 'navegador';
let saveTimer    = null;
let writeChain   = Promise.resolve();
let datosCargados = false; // no se guarda nada hasta haber leído los datos

function setStatus(text, cls){
  const el = $('#saveStatus');
  if (!el) return;
  el.textContent = text;
  el.className = 'status' + (cls ? ' ' + cls : '');
  if (fileHandle) el.title = 'Guardado automático en datos.json (vinculado)';
  else el.title = 'Guardado en el navegador. Vincula o crea datos.json para dejarlo en la carpeta.';
}

function scheduleSave(){
  if (!datosCargados) return;          // protección: nada de guardados a medias
  setStatus('● guardando…');
  clearTimeout(saveTimer);
  saveTimer = setTimeout(commit, 300);
}
function refresh(){ scheduleSave(); render(); }

function commit(){
  if (!datosCargados) return;          // no pisar datos.json/local si aún no se han leído
  state.actualizado = new Date().toISOString();
  const json = JSON.stringify(state);
  try {
    localStorage.setItem(STORE_KEY, json);
  } catch (e){
    setStatus('⚠ sin espacio en el navegador', 'err');
    return;
  }
  if (fileHandle){
    writeChain = writeChain
      .then(() => writeToFile(json))
      .catch(err => {
        console.error(err);
        setStatus('⚠ error al escribir datos.json', 'err');
      });
  } else if (origen === 'datos.json'){
    setStatus('● navegador · datos.json sin actualizar');
    $('#saveStatus').title =
      'Los cambios se guardan en el navegador. Vincula datos.json o exporta para dejarlos en la carpeta.';
  } else {
    setStatus('● navegador', 'ok');
  }
}
async function writeToFile(json){
  const w = await fileHandle.createWritable();
  await w.write(json);
  await w.close();
  setStatus('● datos.json', 'ok');
}
function loadLocal(){
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e){ console.warn('Lectura local fallida', e); }
  return null;
}

/* Arranque: se lee el datos.json vecino (si la app se sirve por HTTP)
   y se compara con la copia local; gana el más reciente.
   Salvaguardas: si la copia local está vacía pero el archivo tiene
   actividades, se recupera el archivo; y si el archivo no se puede
   leer, se avisa en lugar de arrancar en silencio. */
function nActividades(d){
  return (d && Array.isArray(d.actividades)) ? d.actividades.length : 0;
}
function fusionarNotas(local, fileData){
  const out = Array.isArray(fileData.notasDia) ? fileData.notasDia.slice() : [];
  (Array.isArray(local.notasDia) ? local.notasDia : []).forEach(n => {
    const i = out.findIndex(x => x && x.fecha === n.fecha);
    if (i < 0) out.push(n);
    else if (String(n.actualizado || '') > String(out[i].actualizado || '')) out[i] = n;
  });
  fileData.notasDia = out;
}

async function loadStartup(){
  const local = loadLocal();
  let fileData = null;
  let fileError = null;

  if (location.protocol !== 'file:'){
    try {
      const res = await fetch('./datos.json?_=' + Date.now(), { cache:'no-store' });
      if (res.ok) fileData = await res.json();
      else if (res.status !== 404) fileError = 'HTTP ' + res.status;
    } catch (e){ fileError = e.message || 'error de red'; }
  }

  const tLocal = local && local.actualizado ? Date.parse(local.actualizado) || 0 : 0;
  const tFile  = fileData && fileData.actualizado ? Date.parse(fileData.actualizado) || 0 : 0;
  const localVacio = !!local && nActividades(local) === 0 && nActividades(fileData) > 0;

  if (fileData && (!local || tFile >= tLocal || localVacio)){
    if (localVacio) fusionarNotas(local, fileData);
    state = normalize(fileData);
    origen = 'datos.json';
    setStatus('● datos.json', 'ok');
    if (localVacio){
      toast('Recuperadas ' + nActividades(fileData) + ' actividades de datos.json: ' +
            'la copia local del navegador estaba vacía. ' +
            '(Si prefieres la agenda vacía, vincula datos.json o bórralo también).', 'ok', 8000);
    } else {
      toast('Datos leídos de datos.json', 'ok');
    }
  } else if (local){
    state = normalize(local);
    origen = 'navegador';
    setStatus('● navegador', 'ok');
    if (tLocal > tFile) toast('Se ha usado la copia local (más reciente que datos.json)', 'ok');
  } else if (fileError){
    state = normalize(null);
    setStatus('⚠ sin datos', 'err');
    toast('No se ha podido leer datos.json (' + fileError + '). ' +
          'Se empieza con datos nuevos; vuelve a intentarlo cuando haya conexión.', 'err', 8000);
  } else {
    state = normalize(null);
    setStatus('● navegador', 'ok');
    if (location.protocol === 'file:'){
      const soporta = hasFSAccess();
      $('#modal').className = 'modal small';
      $('#modal').innerHTML = `
        <div class="modal-head"><h3>Cargar datos.json</h3><span class="spacer"></span>
          <button class="icon-btn" data-close>✕</button></div>
        <div class="modal-body">
          <p>Has abierto la aplicación en <b>modo local</b> (doble clic sobre <code>index.html</code>).
             Los navegadores no permiten leer <code>datos.json</code> del disco automáticamente,
             así que todavía no se han cargado tus datos.</p>
          <p class="hint">El calendario de festivos de Sevilla ya está incluido; lo que faltan son tus actividades.</p>
          ${soporta ? `<p><b>Para ver y editar tu agenda:</b> pulsa «Vincular datos.json» y elige ese archivo
             (está en esta misma carpeta). A partir de ese momento se leerá y se guardará solo cada vez que arranques.</p>`
           : `<p class="hint">Este navegador no admite vincular archivos. Abre la aplicación servida por HTTP
             o usa <b>Exportar / Importar JSON</b> desde el menú Datos.</p>`}
        </div>
        <div class="modal-foot">
          <span class="spacer"></span>
          <button class="btn" data-close>Seguir sin datos</button>
          ${soporta ? '<button class="btn btn-primary" id="btnIrVincular">🔗 Vincular datos.json</button>' : ''}
        </div>`;
      $('#overlay').hidden = false;
      document.body.classList.add('modal-open');
      const b = $('#btnIrVincular');
      if (b) b.addEventListener('click', () => { closeModal(); vincularAbrir(); });
    } else if (!fileData){
      const esWebPublica = location.hostname !== 'localhost' && location.hostname !== '127.0.0.1' && location.hostname !== '';
      if (esWebPublica){
        toast('Arranco sin datos.json: solo calendario y sin actividades. ' +
              'Tus datos se guardan en este dispositivo; usa 📤 Compartir o Datos → Importar JSON ' +
              'para traer tu agenda desde otro equipo.', 'ok', 9000);
      } else {
        toast('No encuentro datos.json junto a index.html: se empieza con datos nuevos. ' +
              'Si deberían estar tus datos, revisa la carpeta o importa un JSON.', 'ok', 7000);
      }
    }
  }
  ui.fecha = todayKey();
  ui.calMonth = { y: parseKey(ui.fecha).getFullYear(), m: parseKey(ui.fecha).getMonth() };
  datosCargados = true;   // a partir de aquí se puede guardar con seguridad
}

/* --------- Vincular / crear datos.json --------- */
const hasFSAccess = () => ('showOpenFilePicker' in window) && ('showSaveFilePicker' in window);

async function vincularAbrir(){
  if (!hasFSAccess()){
    infoDialog(
      'Tu navegador no admite vincular el archivo.<br><br>' +
      'Usa <b>Exportar / Importar JSON</b> para mover los datos, o ábrelo en ' +
      '<b>Chrome</b> o <b>Edge</b> para tener el guardado automático en datos.json.'
    );
    return;
  }
  try {
    const [h] = await window.showOpenFilePicker({
      multiple: false,
      types: [{ description:'Archivo de datos', accept:{ 'application/json':['.json'] } }]
    });
    const file = await h.getFile();
    const txt  = await file.text();
    let data;
    try { data = JSON.parse(txt); }
    catch (e){ toast('El archivo no es JSON válido', 'err'); return; }
    fileHandle = h;
    state = normalize(data);
    datosCargados = true;
    commit(); render();
    toast('datos.json vinculado', 'ok');
  } catch (e){
    if (e && e.name === 'AbortError') return;
    toast('No se pudo vincular: ' + (e.message || e), 'err');
  }
}

async function vincularCrear(){
  if (!hasFSAccess()){ vincularAbrir(); return; }
  try {
    fileHandle = await window.showSaveFilePicker({
      suggestedName: 'datos.json',
      types: [{ description:'Archivo de datos', accept:{ 'application/json':['.json'] } }]
    });
    commit();
    toast('datos.json creado y vinculado', 'ok');
  } catch (e){
    if (e && e.name === 'AbortError') return;
    toast('No se pudo crear: ' + (e.message || e), 'err');
  }
}

function exportar(){
  const blob = new Blob([JSON.stringify(state, null, 2)], { type:'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `agenda_${todayKey()}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 3000);
  toast('JSON exportado', 'ok');
}

/* --------- Compartir el JSON (móvil: WhatsApp, correo, Drive…) --------- */
async function compartirJSON(){
  const json = JSON.stringify(state, null, 2);
  const nombre = `agenda_${todayKey()}.json`;
  try {
    const file = new File([json], nombre, { type:'application/json' });
    if (navigator.canShare && navigator.canShare({ files:[file] })){
      await navigator.share({ files:[file], title:'Agenda Personal', text:'Datos de la agenda' });
      toast('Datos compartidos', 'ok');
      return;
    }
  } catch (e){
    if (e && e.name === 'AbortError') return;
    console.warn(e);
  }
  toast('Este navegador no admite compartir archivos. Usa «Exportar JSON».', 'err');
}

/* ---------------------------------------------------------
   4.bis PWA: instalación y trabajo sin conexión
   --------------------------------------------------------- */
let deferredPrompt = null;

function esStandalone(){
  return window.matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
}
function esIOS(){
  return /iPad|iPhone|iPod/.test(navigator.userAgent) ||
         (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
}

function bindPWA(){
  window.addEventListener('beforeinstallprompt', e => {
    e.preventDefault();
    deferredPrompt = e;
    $('#btnInstall').hidden = false;
  });
  window.addEventListener('appinstalled', () => {
    deferredPrompt = null;
    $('#btnInstall').hidden = true;
    toast('App instalada en el dispositivo ✓', 'ok');
  });
  window.addEventListener('offline', () =>
    toast('Sin conexión: trabajando con la copia guardada en el dispositivo', 'ok', 5000));

  /* En iOS no existe beforeinstallprompt: se explica cómo añadirla */
  if (esIOS() && !esStandalone()) $('#btnInstall').hidden = false;
}

function clickInstall(){
  if (deferredPrompt){
    deferredPrompt.prompt();
    deferredPrompt.userChoice.then(res => {
      deferredPrompt = null;
      $('#btnInstall').hidden = res && res.outcome === 'accepted';
    }).catch(() => { deferredPrompt = null; });
    return;
  }
  if (esIOS()){
    infoDialog(
      '<b>Instalar la agenda en iPhone / iPad</b><br><br>' +
      '1. Abre esta página en <b>Safari</b>.<br>' +
      '2. Pulsa el botón <b>Compartir</b> (cuadrado con la flecha).<br>' +
      '3. Elige <b>«Añadir a pantalla de inicio»</b>.<br><br>' +
      'Se abrirá como una app propia y <b>sin conexión</b>: los datos se guardan en el dispositivo.'
    );
    return;
  }
  infoDialog(
    'Para instalarla, abre la aplicación en <b>Chrome o Edge</b> y usa el menú ' +
    '<b>⋮ → Instalar aplicación</b>, o espera a que aparezca el botón «📱 Instalar».'
  );
}

function registrarServiceWorker(){
  if (!('serviceWorker' in navigator)) return;
  if (location.protocol !== 'http:' && location.protocol !== 'https:') return;
  navigator.serviceWorker.register('./sw.js', { scope:'./' })
    .then(() => console.log('Service worker registrado (PWA lista para funcionar sin conexión)'))
    .catch(err => console.warn('No se pudo registrar el service worker:', err));
}

/* ---------------------------------------------------------
   5. Render – cabecera, hojas y calendario
   --------------------------------------------------------- */
function render(){
  renderHeader();
  renderSheets();
  renderCalPop();
}

function renderHeader(){
  $('#dayPicker').value = ui.fecha;
  $('#dayLabel').textContent = longDate(ui.fecha);
  $('#calBtnLabel').textContent =
    `${MESES[ui.calMonth.m]} ${ui.calMonth.y}`;
}

function postitHTML(a, fecha){
  const t = TIPOS[a.tipo];
  const meta = [];
  if (a.hora) meta.push('🕐 ' + a.hora);
  if (a.tipo === 'evento' && a.duracionMin) meta.push('⏱ ' + a.duracionMin + ' min');
  if (a.lugar) meta.push('📍 ' + a.lugar);
  if (a.participantes) meta.push('👥 ' + a.participantes);

  let due = '', cls = '';
  if (a.tipo === 'tarea' && a.fechaPrevista){
    const d = diffDays(todayKey(), a.fechaPrevista);
    if (d < 0){ due = 'vencida hace ' + Math.abs(d) + ' d'; cls = 'over'; }
    else if (d === 0){ due = 'vence hoy'; cls = 'today'; }
    else due = 'prevista ' + shortDate(a.fechaPrevista);
  } else if (a.fechaPrevista && a.fechaPrevista !== fecha){
    due = (a.tipo === 'nota' ? '' : '📅 ') + shortDate(a.fechaPrevista);
  }

  const flags = [];
  if (a.finalizada) flags.push('<span class="pi-done-mark">✓ finalizada</span>');
  else if (a.dias.length > 1) flags.push(a.dias.length + ' días');

  return `
  <div class="pi c-${a.color}${a.finalizada ? ' done' : ''}" data-id="${a.id}" draggable="true"
       title="${esc(a.titulo)} — botón derecho para más opciones">
    <div class="pi-head">
      <span class="prio p-${a.prioridad}" title="Prioridad ${a.prioridad}"></span>
      <span class="pi-type">${t.icon} ${esc(t.label)}</span>
      ${a.fechaFinReal ? `<span class="pi-flag" title="Finalizada el ${shortDate(a.fechaFinReal)}">✓</span>` : ''}
      <button class="pi-more" data-more="${a.id}" draggable="false"
              title="Opciones (también con el botón derecho)">⋯</button>
    </div>
    <div class="pi-title">${esc(a.titulo) || '<i>(sin título)</i>'}</div>
    ${a.descripcion ? `<div class="pi-desc">${esc(a.descripcion)}</div>` : ''}
    ${meta.length ? `<div class="pi-meta">${meta.map(m => `<span>${esc(m)}</span>`).join('')}</div>` : ''}
    <div class="pi-foot">
      <span class="pi-due ${cls}">${esc(due)}</span>
      <span>${flags.join(' · ')}</span>
    </div>
  </div>`;
}

function sheetHTML(k, page){
  const d = parseKey(k);
  const t = dayType(k);
  const acts = activitiesOfDay(k);
  const nota = getNota(k);
  const esHoy = k === todayKey();

  return `
  <article class="sheet page-${page + 1}${esHoy ? ' is-hoy' : ''}">
    <div class="sheet-head">
      <div class="sheet-date">
        <span class="sh-dow">${DIAS[d.getDay()]}</span>
        <span class="sh-num" style="color:${t.color}">${d.getDate()}</span>
        <span class="sh-my">${MESES[d.getMonth()]} ${d.getFullYear()}</span>
      </div>
      <span class="spacer"></span>
      <button class="btn btn-sm" data-add-day="${k}">＋ Añadir</button>
      <span class="day-badge ${t.key}">${esc(t.badge)}</span>
    </div>

    <div class="sheet-banner ${t.key}">${esc(t.banner)} <span class="sub">${esc(t.sub)}</span></div>

    <div class="sheet-body" data-fecha="${k}">
      ${acts.length
        ? acts.map(a => postitHTML(a, k)).join('')
        : `<div class="sheet-empty">Sin actividades para este día.<br>
             Pulsa «＋ Añadir» o arrastra un post-it hasta aquí.<br>
             <small>Con <b>Shift</b> al soltar se añade sin quitarlo del día de origen.</small></div>`}
    </div>

    <div class="sheet-notes">
      <h4>📝 Notas del día <span class="hint">se guardan solas</span></h4>
      <textarea class="day-notes" data-fecha="${k}"
        placeholder="Comentarios, incidencias o apuntes de este día…">${esc(nota)}</textarea>
    </div>

    <div class="sheet-foot">
      <span>${acts.length} actividad(es) · ${acts.filter(a => a.finalizada).length} finalizada(s)</span>
      <span>${esc(t.leyenda)}</span>
    </div>
  </article>`;
}

function renderSheets(){
  const a = ui.fecha, b = addDaysKey(ui.fecha, 1);
  $('#sheets').innerHTML = sheetHTML(a, 0) + sheetHTML(b, 1);
}

function renderCalPop(){
  const { y, m } = ui.calMonth;
  $('#calTitle').textContent = `${MESES[m]} ${y}`;
  $('#calDow').innerHTML = ['L','M','X','J','V','S','D']
    .map(x => `<span>${x}</span>`).join('');

  const first = new Date(y, m, 1);
  const offset = (first.getDay() + 6) % 7;          // lunes = 0
  const start  = addDaysKey(toKey(first), -offset);
  const hoy    = todayKey();
  let html = '';

  for (let i = 0; i < 42; i++){
    const k = addDaysKey(start, i);
    const d = parseKey(k);
    const t = dayType(k);
    const cls = [
      'cal-cell', t.key,
      d.getMonth() !== m ? 'other' : '',
      k === ui.fecha ? 'sel' : '',
      k === hoy ? 'today' : '',
      activitiesOfDay(k).length ? 'has' : ''
    ].filter(Boolean).join(' ');
    const n = activitiesOfDay(k).length;
    html += `<button class="${cls}" data-fecha="${k}" title="${esc(t.badge)}">` +
            `${d.getDate()}${n ? `<span class="cnt">${n}</span>` : ''}</button>`;
  }
  $('#calGrid').innerHTML = html;
}

/* ---------------------------------------------------------
   6. Operaciones sobre actividades
   --------------------------------------------------------- */
function markDone(id, done){
  const a = findAct(id);
  if (!a) return;
  a.finalizada = !!done;
  a.fechaFinReal = done ? todayKey() : null;
  refresh();
  toast(done ? 'Tarea marcada como finalizada ✓' : 'Tarea reabierta', 'ok');
}

function moveActivity(id, fromKey, toKey, addMode){
  const a = findAct(id);
  if (!a || !isKey(toKey) || fromKey === toKey) return;
  if (addMode){
    if (!a.dias.includes(toKey)) a.dias.push(toKey);
  } else {
    const i = a.dias.indexOf(fromKey);
    if (i >= 0) a.dias[i] = toKey;
    else if (!a.dias.includes(toKey)) a.dias.push(toKey);
    a.dias = [...new Set(a.dias)];
  }
  a.dias.sort();
  refresh();
  toast(addMode ? 'Añadido al ' + shortDate(toKey)
                : 'Movido al ' + shortDate(toKey), 'ok');
}

function removeDayOfActivity(id, fecha){
  const a = findAct(id);
  if (!a || a.dias.length <= 1) return;
  a.dias = a.dias.filter(d => d !== fecha);
  refresh();
  toast('Quitado del ' + shortDate(fecha), 'ok');
}

function deleteActivity(id){
  const a = findAct(id);
  if (!a) return;
  if (!confirm(`¿Eliminar «${a.titulo || 'esta actividad'}»?\n\nSe borran también sus comentarios.`)) return;
  state.actividades = state.actividades.filter(x => x.id !== id);
  refresh();
  toast('Actividad eliminada', 'ok');
}

/* ---------------------------------------------------------
   7. Modal: alta / edición / consulta
   --------------------------------------------------------- */
let editing  = null;   // copia en edición
let editFrom = '';     // fecha de la hoja desde la que se abrió

/* Reemplaza el nodo del modal para no acumular listeners al reabrirlo */
function resetModal(){
  const old = $('#modal');
  const neu = old.cloneNode(false);
  old.replaceWith(neu);
}

function openEditor(id, fecha){
  resetModal();
  const src = id ? findAct(id) : null;
  editFrom  = fecha || ui.fecha;

  editing = src ? clone(src) : {
    id: null, tipo:'tarea', titulo:'', descripcion:'',
    prioridad:'media', color:'amarillo',
    dias:[editFrom], fechaCreacion:todayKey(),
    fechaPrevista:null, fechaFinReal:null, finalizada:false,
    hora:'', duracionMin:0, lugar:'', participantes:'',
    comentarios:[], orden:nextOrden()
  };

  $('#modal').className = 'modal';
  $('#modal').innerHTML = editorHTML(editing, editFrom);
  $('#overlay').hidden = false;
  document.body.classList.add('modal-open');

  bindEditor();
  syncTypeFields();
  renderComments();
  const f = $('[name="titulo"]', $('#modal'));
  if (f) f.focus();
}

function editorHTML(a, fecha){
  const isNew = !a.id;
  const tipoOpts = Object.entries(TIPOS)
    .map(([k, v]) => `<option value="${k}" ${a.tipo === k ? 'selected' : ''}>${v.icon} ${v.label}</option>`)
    .join('');
  const colores = COLORES.map(c =>
    `<button type="button" class="col-opt ${a.color === c ? 'sel' : ''}" data-val="${c}"
       style="background:var(--pi-${c})" title="${c}"></button>`).join('');
  const prios = [['baja','Baja'],['media','Media'],['alta','Alta']].map(([v, l]) =>
    `<button type="button" class="prio-opt p-${v} ${a.prioridad === v ? 'sel' : ''}"
       data-val="${v}" title="${l}"></button>`).join('');

  const chips = a.dias.slice().sort().map(d =>
    `<span class="chip-dia">${shortDate(d)}${d === fecha ? ' <b title="Hoja abierta">•</b>' : ''}
       <button type="button" data-del-dia="${d}" title="Quitar este día">✕</button></span>`).join('')
    || '<span class="hint">Sin días asignados</span>';

  return `
  <div class="modal-head">
    <h3>${isNew ? 'Nueva actividad' : 'Consulta de la actividad'}</h3>
    <span class="spacer"></span>
    <button class="icon-btn" data-close title="Cerrar">✕</button>
  </div>

  <div class="modal-body">
    <div class="form-grid">

      <label class="fl">Tipo
        <select name="tipo">${tipoOpts}</select>
      </label>

      <label class="fl">Prioridad
        <span class="pick" data-pick="prioridad">${prios}</span>
        <span class="pick-labels"><span>● verde = baja</span><span>● naranja = media</span><span>● rojo = alta</span></span>
      </label>

      <div class="fl f-full">Color del post-it
        <span class="pick" data-pick="color">${colores}</span>
      </div>

      <label class="fl f-full">Título (se ve en el post-it)
        <input type="text" name="titulo" maxlength="120" value="${esc(a.titulo)}"
               placeholder="Ej.: Reunión de seguimiento con Fran">
      </label>

      <label class="fl f-full">Descripción / comentarios generales
        <textarea name="descripcion" placeholder="Detalles, enlaces, puntos a tratar…">${esc(a.descripcion)}</textarea>
      </label>

      <label class="fl only-tarea">Fecha prevista de finalización
        <input type="date" name="fechaPrevista" value="${a.fechaPrevista || ''}">
      </label>

      <label class="fl only-citaevento">Hora
        <input type="time" name="hora" value="${esc(a.hora)}">
      </label>

      <label class="fl only-evento">Duración (minutos)
        <input type="number" name="duracionMin" min="0" step="5" value="${a.duracionMin || ''}">
      </label>

      <label class="fl only-citaevento">Lugar
        <input type="text" name="lugar" value="${esc(a.lugar)}" placeholder="Sala, dirección…">
      </label>

      <label class="fl only-citaevento">Participantes
        <input type="text" name="participantes" value="${esc(a.participantes)}" placeholder="Personas o equipo">
      </label>

      <div class="fl f-full">
        <span style="font-weight:700">Días asignados en la agenda</span>
        <div class="chips-dias">${chips}</div>
        <div class="f-row">
          <input type="date" id="nuevoDia" value="${isKey(fecha) ? fecha : todayKey()}">
          <button type="button" class="btn btn-sm" id="addDia">＋ Añadir día</button>
        </div>
        <span class="hint">Arrastra el post-it entre hojas para moverlo; con <b>Shift</b> se añade el día sin quitarlo.</span>
      </div>

      <label class="fl f-full f-check">
        <input type="checkbox" name="finalizada" ${a.finalizada ? 'checked' : ''}>
        Finalizada
        <span class="hint" id="finHint">${a.fechaFinReal ? 'Se finalizó el ' + shortDate(a.fechaFinReal) : 'Se pintará en gris en todos sus días'}</span>
      </label>

    </div>

    <section class="comments">
      <h4>🗂 Historial de comentarios</h4>
      ${isNew
        ? `<p class="com-empty">Guarda la actividad y podrás añadir aquí comentarios fechados
             (se conservan como historial de la cita o tarea).</p>`
        : `<ul class="com-list" id="comList"></ul>
           <div class="f-row">
             <input type="text" id="nuevoComentario" placeholder="Añadir comentario… (se guarda con la fecha de hoy)">
             <button type="button" class="btn btn-sm" id="addComentario">Añadir</button>
           </div>`}
    </section>
  </div>

  <div class="modal-foot">
    ${isNew ? '' : '<button class="btn btn-danger" id="btnDelAct">🗑 Eliminar</button>'}
    <span class="spacer"></span>
    <button class="btn" data-close>Cancelar</button>
    <button class="btn btn-primary" id="btnSaveAct">Guardar</button>
  </div>`;
}

function renderComments(){
  const list = $('#comList');
  if (!list || !editing) return;
  const items = editing.comentarios.slice().sort((x, y) =>
    (y.fecha + (y.hora || '')).localeCompare(x.fecha + (x.hora || '')));

  list.innerHTML = items.length
    ? items.map(c => `
      <li class="com-item">
        <span class="com-when">${shortDate(c.fecha)}${c.hora ? ' · ' + esc(c.hora) : ''}</span>
        <span class="com-text">${esc(c.texto)}</span>
        <button type="button" class="com-del" data-del-com="${c.id}" title="Borrar comentario">✕</button>
      </li>`).join('')
    : '<p class="com-empty">Todavía no hay comentarios. El historial se conserva por fecha.</p>';
}

function syncTypeFields(){
  const sel = $('[name="tipo"]', $('#modal'));
  if (!sel) return;
  const tipo = sel.value;
  const show = (s, on) => $$(s, $('#modal')).forEach(el => { el.hidden = !on; });
  show('.only-tarea', tipo === 'tarea');
  show('.only-citaevento', tipo === 'cita' || tipo === 'evento');
  show('.only-evento', tipo === 'evento');
}

function bindEditor(){
  const modal = $('#modal');

  $('[name="tipo"]', modal).addEventListener('change', () => {
    editing.tipo = $('[name="tipo"]', modal).value;
    syncTypeFields();
  });

  $$('.pick button', modal).forEach(btn => {
    btn.addEventListener('click', () => {
      const group = btn.closest('.pick');
      $$('button', group).forEach(b => b.classList.remove('sel'));
      btn.classList.add('sel');
      if (group.dataset.pick === 'color') editing.color = btn.dataset.val;
      else editing.prioridad = btn.dataset.val;
    });
  });

  const chk = $('[name="finalizada"]', modal);
  chk.addEventListener('change', () => {
    $('#finHint').textContent = chk.checked
      ? 'Se guardará con fecha de hoy y quedará en gris en todos sus días'
      : 'Se pintará en gris en todos sus días';
  });

  /* Días asignados */
  $('#addDia', modal).addEventListener('click', () => {
    const v = $('#nuevoDia', modal).value;
    if (!isKey(v)) return;
    if (!editing.dias.includes(v)) editing.dias.push(v);
    editing.dias.sort();
    refreshChips();
  });
  modal.addEventListener('click', e => {
    const del = e.target.closest('[data-del-dia]');
    if (!del) return;
    editing.dias = editing.dias.filter(d => d !== del.dataset.delDia);
    refreshChips();
  });

  /* Comentarios */
  const addCom = $('#addComentario', modal);
  if (addCom){
    const inp = $('#nuevoComentario', modal);
    const doAdd = () => {
      const txt = inp.value.trim();
      if (!txt) return;
      editing.comentarios.push({ id:uid(), fecha:todayKey(), hora:nowHora(), texto:txt });
      inp.value = '';
      renderComments();
    };
    addCom.addEventListener('click', doAdd);
    inp.addEventListener('keydown', e => { if (e.key === 'Enter'){ e.preventDefault(); doAdd(); } });
    $('#comList', modal).addEventListener('click', e => {
      const del = e.target.closest('[data-del-com]');
      if (!del) return;
      editing.comentarios = editing.comentarios.filter(c => c.id !== del.dataset.delCom);
      renderComments();
    });
  }

  /* Pie */
  const save = $('#btnSaveAct', modal);
  save.addEventListener('click', saveEditor);
  const del = $('#btnDelAct', modal);
  if (del) del.addEventListener('click', () => {
    const id = editing.id;
    closeModal();
    deleteActivity(id);
  });
}

function refreshChips(){
  const wrap = $('.chips-dias', $('#modal'));
  if (!wrap) return;
  wrap.innerHTML = editing.dias.slice().sort().map(d =>
    `<span class="chip-dia">${shortDate(d)}
       <button type="button" data-del-dia="${d}" title="Quitar este día">✕</button></span>`).join('')
    || '<span class="hint">Sin días asignados</span>';
}

function saveEditor(){
  const modal = $('#modal');
  const val = n => { const el = $(`[name="${n}"]`, modal); return el ? el.value.trim() : ''; };

  const titulo = val('titulo');
  if (!titulo){ toast('Escribe un título para la actividad', 'err'); $('[name="titulo"]', modal).focus(); return; }

  const a = {
    id            : editing.id || uid(),
    tipo          : val('tipo'),
    titulo,
    descripcion   : val('descripcion'),
    prioridad     : editing.prioridad,
    color         : editing.color,
    dias          : editing.dias.length ? [...new Set(editing.dias)].sort() : [editFrom || ui.fecha],
    fechaCreacion : editing.fechaCreacion || todayKey(),
    fechaPrevista : val('fechaPrevista') || null,
    fechaFinReal  : editing.fechaFinReal,
    finalizada    : $('[name="finalizada"]', modal).checked,
    hora          : val('hora'),
    duracionMin   : Number(val('duracionMin')) || 0,
    lugar         : val('lugar'),
    participantes : val('participantes'),
    comentarios   : editing.comentarios,
    orden         : editing.orden || nextOrden()
  };
  if (a.finalizada && !a.fechaFinReal) a.fechaFinReal = todayKey();
  if (!a.finalizada) a.fechaFinReal = null;

  const i = state.actividades.findIndex(x => x.id === a.id);
  if (i >= 0) state.actividades[i] = a;
  else state.actividades.push(a);

  closeModal();
  refresh();
  toast(i >= 0 ? 'Actividad actualizada' : 'Actividad creada', 'ok');
}

function closeModal(){
  $('#overlay').hidden = true;
  $('#modal').innerHTML = '';
  document.body.classList.remove('modal-open');
  editing = null;
}

function infoDialog(html){
  resetModal();
  $('#modal').className = 'modal small';
  $('#modal').innerHTML = `
    <div class="modal-head"><h3>Información</h3><span class="spacer"></span>
      <button class="icon-btn" data-close>✕</button></div>
    <div class="modal-body"><p>${html}</p></div>
    <div class="modal-foot"><span class="spacer"></span>
      <button class="btn btn-primary" data-close>Entendido</button></div>`;
  $('#overlay').hidden = false;
  document.body.classList.add('modal-open');
}

/* --------- Mover / copiar a otra fecha --------- */
function openMoveDialog(id, fecha){
  const a = findAct(id);
  if (!a) return;
  resetModal();
  $('#modal').className = 'modal small';
  $('#modal').innerHTML = `
    <div class="modal-head"><h3>Mover / copiar actividad</h3><span class="spacer"></span>
      <button class="icon-btn" data-close>✕</button></div>
    <div class="modal-body">
      <p><b>${esc(a.titulo)}</b></p>
      <p class="hint">Actualmente en: ${a.dias.map(shortDate).join(', ')}</p>
      <label class="fl">Fecha de destino
        <input type="date" id="moverFecha" value="${isKey(fecha) ? fecha : ui.fecha}">
      </label>
    </div>
    <div class="modal-foot">
      <span class="spacer"></span>
      <button class="btn" data-close>Cancelar</button>
      <button class="btn" id="btnAddFecha">＋ Añadir al día</button>
      <button class="btn btn-primary" id="btnMoverFecha">⇄ Mover</button>
    </div>`;
  $('#overlay').hidden = false;
  document.body.classList.add('modal-open');

  $('#btnMoverFecha').addEventListener('click', () => {
    const v = $('#moverFecha').value;
    if (!isKey(v)) return;
    const from = a.dias.includes(fecha) ? fecha : a.dias[0];
    closeModal(); moveActivity(id, from, v, false);
  });
  $('#btnAddFecha').addEventListener('click', () => {
    const v = $('#moverFecha').value;
    if (!isKey(v)) return;
    closeModal(); moveActivity(id, null, v, true);
  });
}

/* ---------------------------------------------------------
   8. Menú contextual (botón derecho)
   --------------------------------------------------------- */
let ctxHandler = null, ctxGlobalOff = null, ctxKeyOff = null;

function closeCtx(){
  const menu = $('#ctxMenu');
  if (ctxHandler)  menu.removeEventListener('click', ctxHandler);
  if (ctxGlobalOff) document.removeEventListener('click', ctxGlobalOff);
  if (ctxKeyOff)    document.removeEventListener('keydown', ctxKeyOff);
  ctxHandler = ctxGlobalOff = ctxKeyOff = null;
  menu.hidden = true;
}

function openCtx(e, id, fecha){
  e.preventDefault();
  const a = findAct(id);
  if (!a) return;

  closeCtx();                       // nunca quedan escuchas de la apertura anterior
  const menu = $('#ctxMenu');
  menu.innerHTML = `
    <div class="ctx-title">${esc(a.titulo)}</div>
    <button data-act="done">${a.finalizada ? '↩ Reabrir' : '✓ Marcar finalizada (gris)'}</button>
    <button data-act="edit">✏️ Editar / ver detalle</button>
    <button data-act="move">📅 Mover o copiar a otra fecha…</button>
    ${a.dias.length > 1 ? `<button data-act="out">✖ Quitar de este día</button>` : ''}
    <hr>
    <button class="danger" data-act="del">🗑 Eliminar</button>`;
  menu.hidden = false;

  const w = menu.offsetWidth, h = menu.offsetHeight;
  menu.style.left = Math.min(e.clientX, window.innerWidth - w - 8) + 'px';
  menu.style.top  = Math.min(e.clientY, window.innerHeight - h - 8) + 'px';

  ctxHandler = ev => {
    const b = ev.target.closest('button');
    if (!b) return;
    const act = b.dataset.act;
    closeCtx();
    if (act === 'done')  markDone(id, !a.finalizada);
    if (act === 'edit')  openEditor(id, fecha);
    if (act === 'move')  openMoveDialog(id, fecha);
    if (act === 'out')   removeDayOfActivity(id, fecha);
    if (act === 'del')   deleteActivity(id);
  };
  menu.addEventListener('click', ctxHandler);

  ctxGlobalOff = ev => { if (!menu.contains(ev.target)) closeCtx(); };
  ctxKeyOff    = ev => { if (ev.key === 'Escape') closeCtx(); };
  setTimeout(() => {
    if (!ctxGlobalOff) return;
    document.addEventListener('click', ctxGlobalOff);
    document.addEventListener('keydown', ctxKeyOff);
  }, 0);
}

function closeMenus(){
  closeCtx();
  $('#dataMenu').hidden = true;
  $('#calPop').hidden = true;
  $('#btnCal').setAttribute('aria-expanded', 'false');
  $('#btnData').setAttribute('aria-expanded', 'false');
}

/* ---------------------------------------------------------
   9. Pantalla de festivos y vacaciones
   --------------------------------------------------------- */
const AMBITOS = ['nacional','autonómico','local','no lectivo'];

function openCalendario(){
  resetModal();
  $('#modal').className = 'modal';
  $('#modal').innerHTML = calendarioHTML();
  $('#overlay').hidden = false;
  document.body.classList.add('modal-open');

  const modal = $('#modal');

  $('#addFestivo').addEventListener('click', () => {
    state.calendario.festivos.push({ id:uid(), fecha:todayKey(), nombre:'Nuevo festivo', ambito:'local' });
    scheduleSave(); openCalendario();
  });
  $('#addVacacion').addEventListener('click', () => {
    state.calendario.vacaciones.push({ id:uid(), desde:todayKey(), hasta:addDaysKey(todayKey(), 7), nombre:'Vacaciones' });
    scheduleSave(); openCalendario();
  });

  modal.addEventListener('click', e => {
    const del = e.target.closest('[data-del-festivo]');
    if (del){
      state.calendario.festivos = state.calendario.festivos.filter(f => f.id !== del.dataset.delFestivo);
      scheduleSave(); openCalendario(); render();
      return;
    }
    const delv = e.target.closest('[data-del-vac]');
    if (delv){
      state.calendario.vacaciones = state.calendario.vacaciones.filter(v => v.id !== delv.dataset.delVac);
      scheduleSave(); openCalendario(); render();
    }
  });

  modal.addEventListener('change', e => {
    const row = e.target.closest('.cal-row');
    if (!row) return;
    const f = e.target.dataset.f;
    if (!f) return;

    if (row.dataset.tipo === 'festivo'){
      const obj = state.calendario.festivos.find(x => x.id === row.dataset.id);
      if (!obj) return;
      obj[f] = e.target.value;
      if (f === 'fecha' && !isKey(obj.fecha)) return;
    } else {
      const obj = state.calendario.vacaciones.find(x => x.id === row.dataset.id);
      if (!obj) return;
      obj[f] = e.target.value;
    }
    scheduleSave(); render();
  });
}

function calendarioHTML(){
  const fest = state.calendario.festivos.slice().sort((a, b) => a.fecha.localeCompare(b.fecha));
  const vac  = state.calendario.vacaciones.slice().sort((a, b) => a.desde.localeCompare(b.desde));

  const rowsF = fest.length ? fest.map(f => `
    <div class="cal-row" data-tipo="festivo" data-id="${f.id}">
      <input type="date" value="${f.fecha}" data-f="fecha">
      <input type="text" value="${esc(f.nombre)}" data-f="nombre" placeholder="Nombre del festivo">
      <select data-f="ambito">${AMBITOS.map(o =>
        `<option value="${o}" ${f.ambito === o ? 'selected' : ''}>${o}</option>`).join('')}</select>
      <button class="del" data-del-festivo="${f.id}" title="Eliminar">✕</button>
    </div>`).join('') : '<p class="cal-empty">No hay festivos definidos.</p>';

  const rowsV = vac.length ? vac.map(v => `
    <div class="cal-row" data-tipo="vacacion" data-id="${v.id}">
      <input type="date" value="${v.desde}" data-f="desde">
      <input type="date" value="${v.hasta}" data-f="hasta">
      <input type="text" value="${esc(v.nombre)}" data-f="nombre" placeholder="Nombre del tramo">
      <button class="del" data-del-vac="${v.id}" title="Eliminar">✕</button>
    </div>`).join('') : '<p class="cal-empty">No hay tramos de vacaciones definidos.</p>';

  return `
  <div class="modal-head">
    <h3>Festivos y vacaciones</h3>
    <span class="spacer"></span>
    <button class="icon-btn" data-close>✕</button>
  </div>
  <div class="modal-body">
    <p class="hint" style="margin-top:0">
      Los cambios se guardan en el mismo <b>datos.json</b> y se exportan con el resto de la agenda.<br>
      Codificación: <b style="color:var(--c-festivo)">rojo</b> festivo (manda sobre vacaciones) ·
      <b style="color:var(--c-vacaciones)">azul</b> vacaciones ·
      <b style="color:var(--c-finde)">verde</b> fin de semana ·
      <b style="color:var(--c-lectivo)">negro</b> día lectivo.
    </p>

    <section class="cal-sec">
      <h4>Días festivos <button class="btn btn-sm" id="addFestivo">＋ Añadir</button></h4>
      <div class="cal-head"><span>Fecha</span><span>Nombre</span><span>Ámbito</span><span></span></div>
      <div class="cal-rows">${rowsF}</div>
    </section>

    <section class="cal-sec">
      <h4>Tramos de vacaciones <button class="btn btn-sm" id="addVacacion">＋ Añadir</button></h4>
      <div class="cal-head"><span>Desde</span><span>Hasta</span><span>Nombre</span><span></span></div>
      <div class="cal-rows">${rowsV}</div>
      <p class="hint">Incluidos: Navidad, Semana Santa, Feria de Sevilla y Verano (01/07 – 31/08).</p>
    </section>
  </div>
  <div class="modal-foot">
    <span class="spacer"></span>
    <button class="btn btn-primary" data-close>Cerrar</button>
  </div>`;
}

/* ---------------------------------------------------------
   10. Buscador
   --------------------------------------------------------- */
function renderSearch(){
  const box = $('#searchResults');
  const q = $('#search').value.trim().toLowerCase();
  if (q.length < 2){ box.hidden = true; box.innerHTML = ''; return; }

  const hit = a => [a.titulo, a.descripcion, a.lugar, a.participantes,
                    TIPOS[a.tipo].label, ...a.comentarios.map(c => c.texto)]
                    .join(' ').toLowerCase().includes(q);

  const res = state.actividades.filter(hit).slice(0, 10);
  box.innerHTML = res.length
    ? res.map(a => {
        const k = a.dias[0] || ui.fecha;
        return `<div class="sr-item" data-id="${a.id}" data-fecha="${k}">
          <span class="sr-dot" style="background:var(--pi-${a.color})"></span>
          <span class="sr-main">
            <span class="sr-title">${a.finalizada ? '✓ ' : ''}${esc(a.titulo)}</span>
            <span class="sr-sub">${TIPOS[a.tipo].icon} ${TIPOS[a.tipo].label} · ${shortDate(k)}${
              a.dias.length > 1 ? ' (+' + (a.dias.length - 1) + ' días)' : ''}</span>
          </span></div>`;
      }).join('')
    : '<div class="sr-empty">Sin resultados para «' + esc(q) + '»</div>';
  box.hidden = false;
}

function gotoFecha(k){
  ui.fecha = k;
  ui.calMonth = { y: parseKey(k).getFullYear(), m: parseKey(k).getMonth() };
  render();
}

/* ---------------------------------------------------------
   11. Arrastrar y soltar
   --------------------------------------------------------- */
let hoverBody = null;
function clearHover(){
  if (hoverBody){ hoverBody.classList.remove('drop-hover'); hoverBody = null; }
}

function bindDnD(){
  const sheets = $('#sheets');

  sheets.addEventListener('dragstart', e => {
    const pi = e.target.closest('.pi');
    if (!pi) return;
    const body = pi.closest('.sheet-body');
    e.dataTransfer.setData('text/plain',
      JSON.stringify({ id: pi.dataset.id, from: body ? body.dataset.fecha : ui.fecha }));
    e.dataTransfer.effectAllowed = 'move';
    pi.classList.add('dragging');
  });

  sheets.addEventListener('dragend', e => {
    const pi = e.target.closest('.pi');
    if (pi) pi.classList.remove('dragging');
    clearHover();
  });

  sheets.addEventListener('dragover', e => {
    const body = e.target.closest('.sheet-body');
    if (!body) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = e.shiftKey ? 'copy' : 'move';
    if (hoverBody !== body){ clearHover(); hoverBody = body; body.classList.add('drop-hover'); }
  });

  sheets.addEventListener('dragleave', e => {
    const body = e.target.closest('.sheet-body');
    if (body && !body.contains(e.relatedTarget) && body === hoverBody) clearHover();
  });

  sheets.addEventListener('drop', e => {
    const body = e.target.closest('.sheet-body');
    if (!body) return;
    e.preventDefault();
    clearHover();
    let data;
    try { data = JSON.parse(e.dataTransfer.getData('text/plain')); }
    catch (err){ return; }
    if (!data || !data.id) return;
    moveActivity(data.id, data.from, body.dataset.fecha, e.shiftKey);
  });
}

/* ---------------------------------------------------------
   12. Avisos
   --------------------------------------------------------- */
function toast(msg, kind, ms){
  const el = document.createElement('div');
  el.className = 'toast' + (kind ? ' ' + kind : '');
  el.textContent = msg;
  $('#toasts').appendChild(el);
  setTimeout(() => { el.style.opacity = '0'; el.style.transition = 'opacity .3s'; }, ms || 3400);
  setTimeout(() => el.remove(), (ms || 3400) + 320);
}

/* ---------------------------------------------------------
   13. Eventos e inicio
   --------------------------------------------------------- */
function bindEvents(){
  /* Navegación por días */
  $('#btnPrevDay').addEventListener('click', () => gotoFecha(addDaysKey(ui.fecha, -1)));
  $('#btnNextDay').addEventListener('click', () => gotoFecha(addDaysKey(ui.fecha, 1)));
  $('#btnToday').addEventListener('click', () => gotoFecha(todayKey()));
  $('#dayPicker').addEventListener('change', e => { if (isKey(e.target.value)) gotoFecha(e.target.value); });

  /* Calendario mensual */
  $('#btnCal').addEventListener('click', e => {
    e.stopPropagation();
    const pop = $('#calPop');
    const open = pop.hidden;
    closeMenus();
    pop.hidden = !open;
    $('#btnCal').setAttribute('aria-expanded', String(open));
  });
  $('#calPrev').addEventListener('click', () => {
    const d = new Date(ui.calMonth.y, ui.calMonth.m - 1, 1);
    ui.calMonth = { y:d.getFullYear(), m:d.getMonth() }; renderCalPop();
  });
  $('#calNext').addEventListener('click', () => {
    const d = new Date(ui.calMonth.y, ui.calMonth.m + 1, 1);
    ui.calMonth = { y:d.getFullYear(), m:d.getMonth() }; renderCalPop();
  });
  $('#calToday').addEventListener('click', () => { closeMenus(); gotoFecha(todayKey()); });
  $('#calClose').addEventListener('click', closeMenus);
  $('#calGrid').addEventListener('click', e => {
    const cell = e.target.closest('.cal-cell');
    if (!cell) return;
    closeMenus();
    gotoFecha(cell.dataset.fecha);
  });

  /* Botones de acción */
  $('#btnNew').addEventListener('click', () => openEditor(null, ui.fecha));
  $('#btnCalend').addEventListener('click', openCalendario);

  /* Menú de datos */
  $('#btnData').addEventListener('click', e => {
    e.stopPropagation();
    const m = $('#dataMenu');
    const open = m.hidden;
    closeMenus();
    m.hidden = !open;
    $('#btnData').setAttribute('aria-expanded', String(open));
  });
  $('#btnVincular').addEventListener('click', () => { closeMenus(); vincularAbrir(); });
  $('#btnCrearJson').addEventListener('click', () => { closeMenus(); vincularCrear(); });
  $('#btnExport').addEventListener('click', () => { closeMenus(); exportar(); });
  $('#btnImport').addEventListener('click', () => { closeMenus(); $('#fileInput').click(); });
  $('#btnShare').addEventListener('click', () => { closeMenus(); compartirJSON(); });
  $('#btnInstall').addEventListener('click', clickInstall);
  bindPWA();
  $('#fileInput').addEventListener('change', e => {
    const f = e.target.files && e.target.files[0];
    if (!f) return;
    const r = new FileReader();
    r.onload = () => {
      try {
        const data = JSON.parse(r.result);
        const nuevas = nActividades(data);
        if (nuevas === 0 && state.actividades.length > 0){
          const seguro = confirm(
            'El archivo seleccionado no contiene actividades.\n\n' +
            'La agenda actual tiene ' + state.actividades.length + ' y se perderían.\n\n' +
            '¿Sustituir la agenda igualmente?');
          if (!seguro){ e.target.value = ''; return; }
        }
        state = normalize(data);
        datosCargados = true;
        commit(); render();
        toast('Datos importados correctamente', 'ok');
      } catch (err){
        toast('El archivo no es JSON válido', 'err');
      }
      e.target.value = '';
    };
    r.readAsText(f);
  });

  /* Hojas: clic, menú contextual, notas, arrastrar */
  const sheets = $('#sheets');
  sheets.addEventListener('click', e => {
    const add = e.target.closest('[data-add-day]');
    if (add){ openEditor(null, add.dataset.addDay); return; }

    /* Botón «⋯»: mismo menú del botón derecho, accesible con el dedo */
    const more = e.target.closest('[data-more]');
    if (more){
      const body = more.closest('.sheet-body');
      const r = more.getBoundingClientRect();
      const ev = new MouseEvent('contextmenu', { bubbles:false, cancelable:true,
                                                 clientX:r.left, clientY:r.bottom });
      openCtx(ev, more.dataset.more, body ? body.dataset.fecha : ui.fecha);
      return;
    }

    const pi = e.target.closest('.pi');
    if (pi){
      const body = pi.closest('.sheet-body');
      openEditor(pi.dataset.id, body ? body.dataset.fecha : ui.fecha);
    }
  });
  sheets.addEventListener('contextmenu', e => {
    const pi = e.target.closest('.pi');
    if (!pi) return;
    const body = pi.closest('.sheet-body');
    openCtx(e, pi.dataset.id, body ? body.dataset.fecha : ui.fecha);
  });
  sheets.addEventListener('input', e => {
    const ta = e.target.closest('.day-notes');
    if (ta) setNota(ta.dataset.fecha, ta.value);
  });
  bindDnD();

  /* Buscador */
  $('#search').addEventListener('input', renderSearch);
  $('#search').addEventListener('focus', renderSearch);
  $('#searchResults').addEventListener('mousedown', e => {
    const it = e.target.closest('.sr-item');
    if (!it) return;
    e.preventDefault();
    $('#searchResults').hidden = true;
    $('#search').value = '';
    gotoFecha(it.dataset.fecha);
    openEditor(it.dataset.id, it.dataset.fecha);
  });

  /* Modal */
  $('#overlay').addEventListener('click', e => {
    if (e.target === $('#overlay') || e.target.closest('[data-close]')) closeModal();
  });
  document.addEventListener('click', e => {
    if (!e.target.closest('.dropdown')) $('#dataMenu').hidden = true;
    if (!e.target.closest('.cal-wrap')) $('#calPop').hidden = true;
  });

  /* Teclado */
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape'){
      closeMenus();
      if (!$('#overlay').hidden) closeModal();
      return;
    }
    if (e.target.matches('input,textarea,select')) return;
    if (e.key === 'ArrowLeft')  gotoFecha(addDaysKey(ui.fecha, -1));
    if (e.key === 'ArrowRight') gotoFecha(addDaysKey(ui.fecha, 1));
  });

  window.addEventListener('beforeunload', commit);
}

async function init(){
  bindEvents();
  await loadStartup();
  render();
  registrarServiceWorker();
}
init();
