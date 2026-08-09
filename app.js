import {
  addDiagnostic, clearDiagnostics, listDiagnostics, testIndexedDbAvailability, writeLocalProbe,
  countSupports, countRecordings, countWritings
} from './db.js?v=3';

const views = [...document.querySelectorAll('[data-view]')];
const navItems = [...document.querySelectorAll('[data-nav]')];
const dialog = document.getElementById('diagnosticDialog');
const diagnosticList = document.getElementById('diagnosticList');
const diagnosticNote = document.getElementById('diagnosticNote');
const progressBar = document.getElementById('setupProgress');
const progressText = document.getElementById('setupProgressText');
const networkBadge = document.getElementById('networkBadge');
const toast = document.getElementById('toast');
let toastTimer;

const diagnosticDefinitions = [
  { key: 'secure', label: 'Contexte sécurisé', detail: 'Requis pour le microphone et la PWA' },
  { key: 'serviceWorker', label: 'Service worker', detail: 'Permet le mode hors ligne' },
  { key: 'indexedDb', label: 'Stockage IndexedDB', detail: 'Conserve les données localement' },
  { key: 'mediaDevices', label: 'Microphone', detail: 'Nécessaire à l’enregistreur local' },
  { key: 'pointerEvents', label: 'Tactile et stylet', detail: 'Nécessaire à la surface d’écriture' },
  { key: 'fileInput', label: 'Sélection de fichiers', detail: 'Nécessaire à l’import de supports' },
  { key: 'installed', label: 'Mode application', detail: 'Indique si Sirāfiq est ouvert depuis l’écran d’accueil' }
];

function showToast(message) {
  clearTimeout(toastTimer);
  toast.textContent = message;
  toast.classList.add('visible');
  toastTimer = setTimeout(() => toast.classList.remove('visible'), 2600);
}

function currentRoute() {
  const route = location.hash.replace('#', '').toLowerCase();
  return views.some(view => view.dataset.view === route) ? route : 'accueil';
}

function renderRoute() {
  const route = currentRoute();
  views.forEach(view => {
    const active = view.dataset.view === route;
    view.hidden = !active;
    view.classList.toggle('active', active);
  });
  navItems.forEach(item => item.classList.toggle('active', item.dataset.nav === route));
  document.getElementById('mainContent').focus({ preventScroll: true });
  window.scrollTo({ top: 0, behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
}

function updateNetworkStatus() {
  const online = navigator.onLine;
  networkBadge.textContent = online ? 'En ligne' : 'Hors ligne';
  networkBadge.className = `offline-badge ${online ? 'online' : 'offline'}`;
  const metric = document.getElementById('networkMetric');
  if (metric) metric.textContent = online ? 'En ligne' : 'Hors ligne';
}

function initialDiagnosticRows() {
  diagnosticList.innerHTML = diagnosticDefinitions.map(item => `
    <div class="diagnostic-item" data-test="${item.key}">
      <span class="result-dot" aria-hidden="true"></span>
      <div><strong>${item.label}</strong><div>${item.detail}</div></div>
      <small>Non testé</small>
    </div>
  `).join('');
}

function updateDiagnosticRow(key, result, value) {
  const row = diagnosticList.querySelector(`[data-test="${key}"]`);
  if (!row) return;
  row.className = `diagnostic-item ${result}`;
  row.querySelector('small').textContent = value;
}

function standaloneMode() {
  return window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
}

async function runDiagnostics() {
  diagnosticNote.textContent = 'Tests en cours…';
  const results = {
    secure: { status: window.isSecureContext ? 'pass' : 'fail', value: window.isSecureContext ? 'Oui' : 'Non' },
    serviceWorker: { status: 'serviceWorker' in navigator ? 'pass' : 'fail', value: 'serviceWorker' in navigator ? 'Disponible' : 'Absent' },
    indexedDb: { status: 'warn', value: 'Test…' },
    mediaDevices: { status: navigator.mediaDevices && typeof navigator.mediaDevices.getUserMedia === 'function' ? 'pass' : 'warn', value: navigator.mediaDevices && typeof navigator.mediaDevices.getUserMedia === 'function' ? 'Disponible' : 'Non exposé' },
    pointerEvents: { status: 'PointerEvent' in window ? 'pass' : 'warn', value: 'PointerEvent' in window ? 'Disponible' : 'Limité' },
    fileInput: { status: 'HTMLInputElement' in window ? 'pass' : 'fail', value: 'HTMLInputElement' in window ? 'Disponible' : 'Absent' },
    installed: { status: standaloneMode() ? 'pass' : 'warn', value: standaloneMode() ? 'Installée' : 'Dans Safari' }
  };

  Object.entries(results).forEach(([key, item]) => updateDiagnosticRow(key, item.status, item.value));
  const dbOk = await testIndexedDbAvailability();
  results.indexedDb = { status: dbOk ? 'pass' : 'fail', value: dbOk ? 'Lecture/écriture OK' : 'Échec' };
  updateDiagnosticRow('indexedDb', results.indexedDb.status, results.indexedDb.value);

  const passed = Object.values(results).filter(item => item.status === 'pass').length;
  const warnings = Object.values(results).filter(item => item.status === 'warn').length;
  const failed = Object.values(results).filter(item => item.status === 'fail').length;
  const record = { createdAt: new Date().toISOString(), passed, warnings, failed, results };

  try {
    await addDiagnostic(record);
  } catch {
    diagnosticNote.textContent = 'Tests terminés, mais l’historique n’a pas pu être enregistré.';
  }

  const percentage = Math.round((passed / diagnosticDefinitions.length) * 100);
  progressBar.style.width = `${percentage}%`;
  progressText.textContent = `${passed} vérification${passed > 1 ? 's' : ''} réussie${passed > 1 ? 's' : ''} sur ${diagnosticDefinitions.length}`;
  diagnosticNote.textContent = failed ? `${failed} fonction essentielle est indisponible. Consultez les lignes rouges.` : warnings ? `Socle utilisable avec ${warnings} point${warnings > 1 ? 's' : ''} à confirmer sur l’appareil.` : 'Toutes les vérifications du socle ont réussi.';
  await refreshProgress();
}

async function testLocalStorage() {
  diagnosticNote.textContent = 'Écriture puis relecture d’une donnée locale…';
  try {
    const result = await writeLocalProbe();
    updateDiagnosticRow('indexedDb', 'pass', 'Lecture/écriture OK');
    diagnosticNote.textContent = `Test réussi à ${new Date(result.updatedAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}.`;
    showToast('Le stockage local fonctionne.');
  } catch (error) {
    updateDiagnosticRow('indexedDb', 'fail', 'Échec');
    diagnosticNote.textContent = `Échec : ${error.message}`;
  }
}

async function refreshProgress() {
  try {
    const [records, supportCount, recordingCount, writingCount] = await Promise.all([
      listDiagnostics(), countSupports(), countRecordings(), countWritings()
    ]);
    const diagnosticCount = document.getElementById('diagnosticCount');
    const lastDiagnostic = document.getElementById('lastDiagnostic');
    const supportMetric = document.getElementById('supportCountMetric');
    const recordingMetric = document.getElementById('recordingCountMetric');
    const writingMetric = document.getElementById('writingCountMetric');
    if (diagnosticCount) diagnosticCount.textContent = String(records.length);
    if (supportMetric) supportMetric.textContent = String(supportCount || 0);
    if (recordingMetric) recordingMetric.textContent = String(recordingCount || 0);
    if (writingMetric) writingMetric.textContent = String(writingCount || 0);
    if (records.length) {
      const last = records.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))[0];
      if (lastDiagnostic) lastDiagnostic.textContent = new Date(last.createdAt).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' });
      progressBar.style.width = `${Math.round((last.passed / diagnosticDefinitions.length) * 100)}%`;
      progressText.textContent = `${last.passed} vérification${last.passed > 1 ? 's' : ''} réussie${last.passed > 1 ? 's' : ''} sur ${diagnosticDefinitions.length}`;
    } else {
      if (lastDiagnostic) lastDiagnostic.textContent = '—';
      progressBar.style.width = '0%';
      progressText.textContent = '0 vérification terminée';
    }
  } catch (error) {
    console.warn('Progression locale indisponible', error);
    const diagnosticCount = document.getElementById('diagnosticCount');
    if (diagnosticCount) diagnosticCount.textContent = '—';
  }
}

function openDialog() {
  initialDiagnosticRows();
  diagnosticNote.textContent = 'Aucun test exécuté dans cette fenêtre.';
  if (typeof dialog.showModal === 'function') dialog.showModal();
  else dialog.setAttribute('open', '');
}

function closeDialog() {
  if (typeof dialog.close === 'function') dialog.close();
  else dialog.removeAttribute('open');
}

async function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) return;
  try {
    await navigator.serviceWorker.register('./sw.js?v=3', { scope: './', updateViaCache: 'none' });
  } catch (error) {
    console.warn('Service worker non enregistré', error);
  }
}

window.addEventListener('hashchange', renderRoute);
window.addEventListener('online', updateNetworkStatus);
window.addEventListener('offline', updateNetworkStatus);
window.addEventListener('sirafiq:data-changed', refreshProgress);
document.getElementById('openDiagnostics').addEventListener('click', openDialog);
document.getElementById('startDiagnostic').addEventListener('click', () => { openDialog(); runDiagnostics(); });
document.querySelectorAll('[data-open-diagnostic]').forEach(button => button.addEventListener('click', openDialog));
document.getElementById('closeDiagnostics').addEventListener('click', closeDialog);
document.getElementById('runDiagnostic').addEventListener('click', runDiagnostics);
document.getElementById('saveLocalTest').addEventListener('click', testLocalStorage);
document.getElementById('clearHistory').addEventListener('click', async () => {
  if (!confirm('Effacer uniquement l’historique local des diagnostics ?')) return;
  await clearDiagnostics();
  await refreshProgress();
  showToast('Historique de diagnostic effacé.');
});
document.querySelectorAll('[data-go]').forEach(button => button.addEventListener('click', () => { location.hash = button.dataset.go; }));
dialog.addEventListener('click', event => {
  const rect = dialog.getBoundingClientRect();
  const outside = event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom;
  if (outside) closeDialog();
});

renderRoute();
updateNetworkStatus();
initialDiagnosticRows();
refreshProgress();
registerServiceWorker();
