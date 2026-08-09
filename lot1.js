import {
  addSupport,
  listSupports,
  getSupport,
  deleteSupport
} from './db.js';

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
          <button type="button" data-open-support="${item.id}">
            Ouvrir
          </button>

          <button type="button" class="danger" data-delete-support="${item.id}">
            Supprimer
          </button>
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
    supportViewerBody.innerHTML = `<iframe class="support-viewer-frame" src="${viewerUrl}" title="${esc(support.title || 'PDF')}"></iframe>`;
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
