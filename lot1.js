import {
  addSupport,
  listSupports,
  getSupport,
  deleteSupport
} from './db.js?v=111';

const $ = id => document.getElementById(id);

const importDialog = $('importDialog');
const filePicker = $('filePicker');
const photoPicker = $('photoPicker');
const importSourceStep = $('importSourceStep');
const importReviewStep = $('importReviewStep');
const selectedFiles = $('selectedFiles');
const previewStage = $('previewStage');
const importTitle = $('importTitle');
const importCategory = $('importCategory');
const fileMetadata = $('fileMetadata');
const importFeedback = $('importFeedback');
const supportGrid = $('supportGrid');
const libraryEmpty = $('libraryEmpty');
const supportSearch = $('supportSearch');
const categoryFilter = $('supportCategoryFilter');
const supportViewerDialog = $('supportViewerDialog');
const supportViewerBody = $('supportViewerBody');
const supportViewerTitle = $('supportViewerTitle');
let viewerUrl = null;
let pdfDoc = null;
let pdfPageNumber = 1;
let pdfScale = 1.15;
let pdfRenderTask = null;

let queue = [];
let selectedIndex = 0;
let previewUrl = null;
let appendNextSelection = false;

function esc(value = '') {
  return String(value).replace(/[&<>"']/g, c => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  })[c]);
}

function formatBytes(bytes = 0) {
  if (bytes < 1024) return `${bytes} o`;

  const units = ['Ko', 'Mo', 'Go'];
  let value = bytes / 1024;
  let i = 0;

  while (value >= 1024 && i < units.length - 1) {
    value /= 1024;
    i++;
  }

  return `${value.toFixed(value >= 10 ? 0 : 1).replace('.', ',')} ${units[i]}`;
}

function supportKind(file) {
  const type = (file?.type || '').toLowerCase();
  const name = (file?.name || '').toLowerCase();

  if (type === 'application/pdf' || name.endsWith('.pdf')) return 'pdf';
  if (type.startsWith('image/')) return 'image';
  if (type.startsWith('audio/')) return 'audio';
  if (
    type.startsWith('text/') ||
    /\.(txt|md|csv|json)$/i.test(name)
  ) return 'text';

  return 'file';
}

function clearPreview() {
  if (previewUrl) {
    URL.revokeObjectURL(previewUrl);
    previewUrl = null;
  }

  if (previewStage) previewStage.innerHTML = '';
}

function renderPreview(file) {
  if (!previewStage || !file) return;

  clearPreview();

  const kind = supportKind(file);
  previewUrl = URL.createObjectURL(file);

  if (kind === 'image') {
    previewStage.innerHTML =
      `<img src="${previewUrl}" alt="Aperçu de ${esc(file.name)}">`;
    return;
  }

  if (kind === 'audio') {
    previewStage.innerHTML =
      `<audio controls src="${previewUrl}"></audio>`;
    return;
  }

  if (kind === 'pdf') {
    previewStage.innerHTML =
      `<iframe src="${previewUrl}" title="Aperçu PDF"></iframe>`;
    return;
  }

  previewStage.innerHTML =
    `<div class="file-preview">
      <strong>${esc(file.name)}</strong>
      <small>${formatBytes(file.size)}</small>
    </div>`;
}

function resetImport() {
  queue = [];
  selectedIndex = 0;
  clearPreview();

  if (selectedFiles) selectedFiles.innerHTML = '';
  if (importTitle) importTitle.value = '';
  if (fileMetadata) fileMetadata.textContent = '';
  if (importFeedback) importFeedback.textContent = '';

  if (importSourceStep) importSourceStep.hidden = false;
  if (importReviewStep) importReviewStep.hidden = true;

  if (filePicker) filePicker.value = '';
  if (photoPicker) photoPicker.value = '';
}

function showSelectedFile(index = 0) {
  if (!queue.length) return;

  selectedIndex = Math.max(0, Math.min(index, queue.length - 1));
  const file = queue[selectedIndex];

  if (importTitle) {
    importTitle.value = file.name.replace(/\.[^.]+$/, '');
  }

  if (fileMetadata) {
    fileMetadata.textContent =
      `${file.name} · ${formatBytes(file.size)} · ${supportKind(file)}`;
  }

  if (selectedFiles) {
    selectedFiles.innerHTML = queue.map((item, i) => `
      <button
        type="button"
        class="selected-file${i === selectedIndex ? ' active' : ''}"
        data-file-index="${i}">
        <strong>${esc(item.name)}</strong>
        <small>${formatBytes(item.size)}</small>
      </button>
    `).join('');
  }

  renderPreview(file);
}

function receiveFiles(fileList, append = false) {
  const files = Array.from(fileList || []);
  if (!files.length) return;
  if (append && queue.length) {
    const firstNewIndex = queue.length;
    queue = [...queue, ...files];
    selectedIndex = firstNewIndex;
  } else {
    queue = files;
    selectedIndex = 0;
  }

  if (importSourceStep) importSourceStep.hidden = true;
  if (importReviewStep) importReviewStep.hidden = false;

  showSelectedFile(0);
}

filePicker?.addEventListener('change', event => {
  receiveFiles(event.target.files, appendNextSelection);
  appendNextSelection = false;
});

photoPicker?.addEventListener('change', event => {
  receiveFiles(event.target.files, false);
});

selectedFiles?.addEventListener('click', event => {
  const button = event.target.closest('[data-file-index]');
  if (!button) return;

  showSelectedFile(Number(button.dataset.fileIndex));
});

async function saveSelectedSupports() {
  if (!queue.length) {
    if (importFeedback) {
      importFeedback.textContent = 'Aucun fichier sélectionné.';
    }
    return;
  }

  const saveButton = $('saveSelectedFiles');

  if (saveButton) saveButton.disabled = true;
  if (importFeedback) {
    importFeedback.textContent = 'Enregistrement local en cours…';
  }

  try {
    for (let index = 0; index < queue.length; index++) {
      const file = queue[index];

      const customTitle =
        index === selectedIndex
          ? (importTitle?.value || '').trim()
          : file.name.replace(/\.[^.]+$/, '');

      if (!customTitle) {
        throw new Error(`Le titre de « ${file.name} » est vide.`);
      }

      await addSupport({
        title: customTitle,
        category: importCategory?.value || 'Autre',
        kind: supportKind(file),
        originalName: file.name,
        mimeType: file.type || 'application/octet-stream',
        size: file.size,
        lastModified: file.lastModified || null,
        blob: file,
        lockedOriginal: true,
        source: 'user-import'
      });
    }

    const total = queue.length;

    if (importFeedback) {
      importFeedback.textContent =
        `${total} support${total > 1 ? 's' : ''} enregistré${total > 1 ? 's' : ''}.`;
    }

    resetImport();

    if (typeof importDialog?.close === 'function') {
      importDialog.close();
    } else {
      importDialog?.removeAttribute('open');
    }

    await refreshLibrary();
    window.dispatchEvent(new CustomEvent('sirafiq:data-changed'));

  } catch (error) {
    console.error(error);

    if (importFeedback) {
      importFeedback.textContent =
        `Échec de l’enregistrement : ${error.message}`;
    }
  } finally {
    if (saveButton) saveButton.disabled = false;
  }
}

$('saveSelectedFiles')?.addEventListener(
  'click',
  saveSelectedSupports
);

function supportLabel(kind) {
  return {
    pdf: 'PDF',
    image: 'Image',
    audio: 'Audio',
    text: 'Texte',
    file: 'Fichier'
  }[kind] || 'Fichier';
}

function renderSupportCard(item) {
  const date = new Date(item.createdAt).toLocaleDateString('fr-FR');

  return `
    <article class="lot1-support-card">
      <div class="lot1-support-icon">${supportLabel(item.kind)}</div>

      <div class="lot1-support-body">
        <div class="lot1-support-top">
          <span class="lot1-category">${esc(item.category || 'Autre')}</span>
          <small>${formatBytes(item.size || 0)}</small>
        </div>

        <h3>${esc(item.title || item.originalName)}</h3>
        <p>${supportLabel(item.kind)} · ${date}</p>

        <div class="lot1-support-actions">
          <button type="button" class="review" data-review-support="${item.id}">Réviser</button>
          <button type="button" data-open-support="${item.id}">Ouvrir</button>
          <button type="button" class="danger" data-delete-support="${item.id}">Supprimer</button>
        </div>
      </div>
    </article>
  `;
}

async function refreshLibrary() {
  if (!supportGrid) return;

  try {
    const supports = await listSupports();

    const query =
      (supportSearch?.value || '')
        .trim()
        .toLocaleLowerCase('fr');

    const category = categoryFilter?.value || '';

    const filtered = supports
      .filter(item => {
        const title =
          String(item.title || item.originalName || '')
            .toLocaleLowerCase('fr');

        return !query || title.includes(query);
      })
      .filter(item => !category || item.category === category)
      .sort((a, b) =>
        new Date(b.createdAt) - new Date(a.createdAt)
      );

    const totalBytes = supports.reduce(
      (sum, item) => sum + (Number(item.size) || 0),
      0
    );

    if ($('libraryCount')) {
      $('libraryCount').textContent =
        `${supports.length} support${supports.length > 1 ? 's' : ''}`;
    }

    if ($('libraryBytes')) {
      $('libraryBytes').textContent = formatBytes(totalBytes);
    }

    if (libraryEmpty) {
      libraryEmpty.hidden = supports.length > 0;
    }

    supportGrid.innerHTML = filtered.length
      ? filtered.map(renderSupportCard).join('')
      : supports.length
        ? '<div class="lot1-no-result">Aucun support ne correspond à la recherche.</div>'
        : '';

  } catch (error) {
    console.error(error);

    supportGrid.innerHTML =
      `<div class="lot1-no-result">
        Impossible de lire la bibliothèque locale.
      </div>`;
  }
}

async function renderPdfPage() {
  const canvas = document.getElementById('pdfCanvas');
  const counter = document.getElementById('pdfPageCounter');
  const prev = document.getElementById('pdfPrev');
  const next = document.getElementById('pdfNext');
  const zoomLabel = document.getElementById('pdfZoomLabel');
  if (!pdfDoc || !canvas) return;

  if (pdfRenderTask) {
    try { pdfRenderTask.cancel(); } catch {}
    pdfRenderTask = null;
  }

  const page = await pdfDoc.getPage(pdfPageNumber);
  const viewport = page.getViewport({ scale: pdfScale });
  const ratio = Math.max(1, window.devicePixelRatio || 1);
  const ctx = canvas.getContext('2d', { alpha: false });
  canvas.width = Math.floor(viewport.width * ratio);
  canvas.height = Math.floor(viewport.height * ratio);
  canvas.style.width = `${Math.floor(viewport.width)}px`;
  canvas.style.height = `${Math.floor(viewport.height)}px`;
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, viewport.width, viewport.height);

  pdfRenderTask = page.render({ canvasContext: ctx, viewport });
  try { await pdfRenderTask.promise; } catch (error) {
    if (error?.name !== 'RenderingCancelledException') throw error;
  } finally { pdfRenderTask = null; }

  if (counter) counter.textContent = `Page ${pdfPageNumber} / ${pdfDoc.numPages}`;
  if (prev) prev.disabled = pdfPageNumber <= 1;
  if (next) next.disabled = pdfPageNumber >= pdfDoc.numPages;
  if (zoomLabel) zoomLabel.textContent = `${Math.round(pdfScale * 100)} %`;
}

async function openPdfSupport(support) {
  supportViewerBody.innerHTML = `
    <div class="pdf-reader" aria-label="Lecteur PDF multipage">
      <div class="pdf-toolbar">
        <button type="button" class="secondary-button pdf-control" id="pdfPrev">← Page précédente</button>
        <strong id="pdfPageCounter">Chargement…</strong>
        <button type="button" class="secondary-button pdf-control" id="pdfNext">Page suivante →</button>
        <span class="pdf-toolbar-spacer"></span>
        <button type="button" class="secondary-button pdf-control" id="pdfZoomOut" aria-label="Dézoomer">−</button>
        <span id="pdfZoomLabel">115 %</span>
        <button type="button" class="secondary-button pdf-control" id="pdfZoomIn" aria-label="Zoomer">+</button>
        <a class="secondary-button pdf-control" id="pdfOpenNative" href="#" target="_blank" rel="noopener">Plein écran</a>
      </div>
      <div class="pdf-stage"><canvas id="pdfCanvas"></canvas></div>
      <p class="pdf-hint">Glissez horizontalement ou utilisez les boutons pour changer de page. Le bouton « Plein écran » ouvre aussi le lecteur PDF de Safari.</p>
    </div>`;

  const openNative = document.getElementById('pdfOpenNative');
  if (openNative) openNative.href = viewerUrl;

  const lib = window.pdfjsLib;
  if (!lib?.getDocument) {
    supportViewerBody.innerHTML = `
      <div class="pdf-fallback">
        <p>Le lecteur multipage n’a pas pu être chargé. Ouvrez le PDF dans le lecteur Safari pour parcourir toutes les pages.</p>
        <a class="primary-button" href="${viewerUrl}" target="_blank" rel="noopener">Ouvrir le PDF en plein écran</a>
      </div>`;
    return;
  }

  lib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
  const data = await support.blob.arrayBuffer();
  pdfDoc = await lib.getDocument({ data }).promise;
  pdfPageNumber = 1;
  pdfScale = 1.15;

  document.getElementById('pdfPrev')?.addEventListener('click', async () => {
    if (pdfPageNumber > 1) { pdfPageNumber -= 1; await renderPdfPage(); }
  });
  document.getElementById('pdfNext')?.addEventListener('click', async () => {
    if (pdfPageNumber < pdfDoc.numPages) { pdfPageNumber += 1; await renderPdfPage(); }
  });
  document.getElementById('pdfZoomOut')?.addEventListener('click', async () => {
    pdfScale = Math.max(.65, +(pdfScale - .15).toFixed(2)); await renderPdfPage();
  });
  document.getElementById('pdfZoomIn')?.addEventListener('click', async () => {
    pdfScale = Math.min(2.4, +(pdfScale + .15).toFixed(2)); await renderPdfPage();
  });

  let touchStartX = null;
  const stage = supportViewerBody.querySelector('.pdf-stage');
  stage?.addEventListener('touchstart', event => { touchStartX = event.touches[0]?.clientX ?? null; }, { passive: true });
  stage?.addEventListener('touchend', async event => {
    if (touchStartX == null) return;
    const endX = event.changedTouches[0]?.clientX ?? touchStartX;
    const delta = endX - touchStartX;
    touchStartX = null;
    if (Math.abs(delta) < 55) return;
    if (delta < 0 && pdfPageNumber < pdfDoc.numPages) pdfPageNumber += 1;
    if (delta > 0 && pdfPageNumber > 1) pdfPageNumber -= 1;
    await renderPdfPage();
  }, { passive: true });

  await renderPdfPage();
}

async function openStoredSupport(id) {
  const support = await getSupport(id);
  if (!support?.blob || !supportViewerBody) return;
  if (viewerUrl) URL.revokeObjectURL(viewerUrl);
  viewerUrl = URL.createObjectURL(support.blob);
  if (supportViewerTitle) supportViewerTitle.textContent = support.title || support.originalName || 'Support';
  const kind = support.kind || 'file';
  if (kind === 'image') {
    supportViewerBody.innerHTML = `<img class="support-viewer-media" src="${viewerUrl}" alt="${esc(support.title || support.originalName || 'Support')}">`;
  } else if (kind === 'audio') {
    supportViewerBody.innerHTML = `<audio class="support-viewer-audio" controls preload="metadata" src="${viewerUrl}"></audio>`;
  } else if (kind === 'pdf') {
    await openPdfSupport(support);
  } else if (kind === 'text') {
    const text = await support.blob.text();
    supportViewerBody.innerHTML = `<pre class="support-viewer-text">${esc(text)}</pre>`;
  } else {
    supportViewerBody.innerHTML = `<div class="file-preview"><strong>${esc(support.originalName || support.title || 'Fichier')}</strong><p>Ce format est conservé localement mais ne peut pas être prévisualisé ici.</p><a class="secondary-button" href="${viewerUrl}" download="${esc(support.originalName || 'support')}">Exporter ce fichier</a></div>`;
  }
  if (typeof supportViewerDialog?.showModal === 'function') supportViewerDialog.showModal();
  else supportViewerDialog?.setAttribute('open', '');
}

function closeSupportViewer() {
  if (pdfRenderTask) { try { pdfRenderTask.cancel(); } catch {} pdfRenderTask = null; }
  if (pdfDoc) { try { pdfDoc.destroy(); } catch {} pdfDoc = null; }
  pdfPageNumber = 1; pdfScale = 1.15;
  if (typeof supportViewerDialog?.close === 'function') supportViewerDialog.close();
  else supportViewerDialog?.removeAttribute('open');
  if (supportViewerBody) supportViewerBody.innerHTML = '';
  if (viewerUrl) URL.revokeObjectURL(viewerUrl);
  viewerUrl = null;
}

async function removeStoredSupport(id) {
  const support = await getSupport(id);

  if (!support) return;

  const confirmed = confirm(
    `Supprimer définitivement « ${support.title || support.originalName} » de cet appareil ?`
  );

  if (!confirmed) return;

  await deleteSupport(id);
  await refreshLibrary();
  window.dispatchEvent(new CustomEvent('sirafiq:data-changed'));
}

supportSearch?.addEventListener(
  'input',
  refreshLibrary
);

categoryFilter?.addEventListener(
  'change',
  refreshLibrary
);

supportGrid?.addEventListener('click', event => {
  const reviewButton = event.target.closest('[data-review-support]');
  if (reviewButton) {
    window.dispatchEvent(new CustomEvent('sirafiq:review-support', { detail: { id: Number(reviewButton.dataset.reviewSupport) } }));
    document.getElementById('memoryLabTitle')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    return;
  }

  const openButton =
    event.target.closest('[data-open-support]');

  if (openButton) {
    openStoredSupport(
      Number(openButton.dataset.openSupport)
    );
    return;
  }

  const deleteButton =
    event.target.closest('[data-delete-support]');

  if (deleteButton) {
    removeStoredSupport(
      Number(deleteButton.dataset.deleteSupport)
    );
  }
});

window.addEventListener('hashchange', () => {
  if (location.hash === '#memoriser') {
    refreshLibrary();
  }
});

refreshLibrary();

function openImportDialog() {
  resetImport();

  if (typeof importDialog?.showModal === 'function') {
    importDialog.showModal();
  } else {
    importDialog?.setAttribute('open', '');
  }
}

function closeImportDialog() {
  clearPreview();

  if (typeof importDialog?.close === 'function') {
    importDialog.close();
  } else {
    importDialog?.removeAttribute('open');
  }
}

$('libraryImportButton')?.addEventListener(
  'click',
  openImportDialog
);

$('emptyImportButton')?.addEventListener(
  'click',
  openImportDialog
);

$('closeImportDialog')?.addEventListener(
  'click',
  closeImportDialog
);

$('chooseFilesButton')?.addEventListener(
  'click',
  () => filePicker?.click()
);

$('choosePhotosButton')?.addEventListener(
  'click',
  () => photoPicker?.click()
);

$('addMoreFiles')?.addEventListener(
  'click',
  () => { appendNextSelection = true; filePicker?.click(); }
);

$('closeSupportViewer')?.addEventListener('click', closeSupportViewer);
supportViewerDialog?.addEventListener('close', () => {
  if (supportViewerBody) supportViewerBody.innerHTML = '';
  if (viewerUrl) URL.revokeObjectURL(viewerUrl);
  viewerUrl = null;
});
