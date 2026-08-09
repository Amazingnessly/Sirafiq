import { countSupports, countRecordings, countWritings } from './db.js?v=5';

const $ = id => document.getElementById(id);

async function refreshHomeMetrics() {
  try {
    const [supports, recordings, writings] = await Promise.all([
      countSupports(), countRecordings(), countWritings()
    ]);
    const practices = recordings + writings;
    if ($('todaySupports')) $('todaySupports').textContent = supports;
    if ($('todayPractices')) $('todayPractices').textContent = practices;
    if ($('todayMinutes')) $('todayMinutes').textContent = supports || practices ? '12' : '8';
    if ($('todayLead')) {
      $('todayLead').textContent = supports
        ? 'Commencez par rappeler ce que vous avez déjà travaillé, puis vérifiez seulement après.'
        : 'Importez un premier support, puis transformez-le en une courte séance active.';
    }
  } catch (error) {
    console.warn('Métriques accueil indisponibles', error);
  }
}

$('startTodaySession')?.addEventListener('click', () => {
  location.hash = '#memoriser';
});

document.querySelectorAll('[data-focus]').forEach(button => {
  button.addEventListener('click', () => {
    const focus = button.dataset.focus;
    location.hash = '#memoriser';
    setTimeout(() => {
      const target = focus === 'quran' ? $('quranHub') : focus === 'vocab' ? $('vocabHub') : $('mindmapHub');
      target?.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' });
    }, 120);
  });
});

document.querySelectorAll('[data-preset-category]').forEach(button => {
  button.addEventListener('click', () => {
    const filter = $('supportCategoryFilter');
    if (filter) {
      filter.value = button.dataset.presetCategory || '';
      filter.dispatchEvent(new Event('change', { bubbles: true }));
      document.querySelector('.library-toolbar')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  });
});

const writingLessons = {
  gestes: ['Boucles régulières : 𝓁 𝓁 𝓁', 'Gardez une hauteur stable et un mouvement continu. Cherchez la régularité avant la vitesse.'],
  lettres: ['Famille des boucles : e · l · b · h · k', 'Construisez des formes proches avant de changer de famille. Travaillez lentement, sans crispation.'],
  liaisons: ['Lier sans lever : le · elle · belle', 'Conservez la continuité du mouvement et des espacements réguliers.'],
  mots: ['Écrire : calme · lumière · apprendre', 'Visez une taille cohérente et des espaces clairement perceptibles entre les mots.'],
  phrases: ['« Je progresse avec régularité. »', 'Préservez la lisibilité tout au long de la ligne, y compris en fin de phrase.'],
  fluidite: ['Écrire 30 secondes sans sacrifier la lisibilité', 'Augmentez progressivement la vitesse seulement quand la forme et l’espacement restent stables.']
};

document.querySelectorAll('[data-writing-lesson]').forEach(button => {
  button.addEventListener('click', () => {
    document.querySelectorAll('[data-writing-lesson]').forEach(b => b.classList.toggle('active', b === button));
    const [prompt, tip] = writingLessons[button.dataset.writingLesson] || writingLessons.gestes;
    if ($('writingPracticePrompt')) $('writingPracticePrompt').textContent = prompt;
    if ($('writingPracticeTip')) $('writingPracticeTip').textContent = tip;
  });
});

const pronunciationLessons = {
  sons: ['Tu — tout — rue — roue', 'Distinguez /y/ et /u/. Cherchez d’abord une différence nette et intelligible, sans accélérer.'],
  contrastes: ['peu — peur · beau — bord · été — était', 'Travaillez les contrastes par paires. Une seule différence sonore à la fois.'],
  rythme: ['Je voudrais / vous présenter / mon travail.', 'Découpez la phrase en groupes de sens. Gardez des syllabes claires et évitez un débit précipité.'],
  liaisons: ['les amis · vous avez · un grand arbre', 'Écoutez la continuité entre les mots et ne forcez que les liaisons réellement attendues.'],
  expression: ['« Aujourd’hui, je vais expliquer une idée importante. »', 'Travaillez l’accentuation, la mélodie et les pauses pour rendre le message facile à comprendre.']
};

document.querySelectorAll('[data-pron-lesson]').forEach(button => {
  button.addEventListener('click', () => {
    document.querySelectorAll('[data-pron-lesson]').forEach(b => b.classList.toggle('active', b === button));
    const [prompt, tip] = pronunciationLessons[button.dataset.pronLesson] || pronunciationLessons.sons;
    if ($('pronunciationPrompt')) $('pronunciationPrompt').textContent = prompt;
    if ($('pronunciationTip')) $('pronunciationTip').textContent = tip;
    const title = $('recordTitle');
    if (title && !title.value.trim()) title.value = `Exercice — ${button.textContent.trim()}`;
  });
});

function splitSentences(text) {
  return String(text || '')
    .replace(/\s+/g, ' ')
    .split(/(?<=[.!?;:])\s+/)
    .map(s => s.trim())
    .filter(Boolean)
    .slice(0, 7);
}

function shortLabel(sentence, max = 42) {
  const clean = sentence.replace(/^[-–—•\s]+/, '').trim();
  if (clean.length <= max) return clean;
  const cut = clean.slice(0, max);
  return `${cut.replace(/\s+\S*$/, '')}…`;
}

function renderMindmap(text) {
  const canvas = $('mindmapCanvas');
  if (!canvas) return;
  const sentences = splitSentences(text);
  if (!sentences.length) {
    canvas.innerHTML = '<p class="mindmap-placeholder">Ajoutez quelques phrases pour créer une carte.</p>';
    return;
  }
  const root = shortLabel(sentences[0], 34);
  const branches = (sentences.length > 1 ? sentences.slice(1) : sentences).slice(0, 6);
  canvas.innerHTML = `
    <svg class="mindmap-lines" aria-hidden="true"></svg>
    <button class="mind-node root-node" type="button" data-node="0">${root}</button>
    ${branches.map((s, i) => `<button class="mind-node branch-node" type="button" data-node="${i + 1}">${shortLabel(s)}</button>`).join('')}
  `;
  const nodes = [...canvas.querySelectorAll('.mind-node')];
  const cx = canvas.clientWidth / 2;
  const cy = Math.max(180, canvas.clientHeight / 2);
  nodes.forEach((node, i) => {
    if (i === 0) {
      node.style.left = `${cx - 90}px`;
      node.style.top = `${cy - 34}px`;
    } else {
      const angle = (Math.PI * 2 * (i - 1)) / Math.max(1, nodes.length - 1) - Math.PI / 2;
      const rx = Math.min(260, Math.max(130, canvas.clientWidth * .30));
      const ry = Math.min(170, Math.max(105, canvas.clientHeight * .28));
      node.style.left = `${cx + Math.cos(angle) * rx - 85}px`;
      node.style.top = `${cy + Math.sin(angle) * ry - 30}px`;
    }
    makeDraggable(node, canvas);
  });
  drawMindmapLines();
}

function drawMindmapLines() {
  const canvas = $('mindmapCanvas');
  const svg = canvas?.querySelector('.mindmap-lines');
  const root = canvas?.querySelector('.root-node');
  if (!canvas || !svg || !root) return;
  const cr = canvas.getBoundingClientRect();
  const rr = root.getBoundingClientRect();
  const x1 = rr.left - cr.left + rr.width / 2;
  const y1 = rr.top - cr.top + rr.height / 2;
  svg.setAttribute('viewBox', `0 0 ${canvas.clientWidth} ${canvas.clientHeight}`);
  svg.innerHTML = [...canvas.querySelectorAll('.branch-node')].map(node => {
    const nr = node.getBoundingClientRect();
    const x2 = nr.left - cr.left + nr.width / 2;
    const y2 = nr.top - cr.top + nr.height / 2;
    return `<path d="M ${x1} ${y1} C ${(x1+x2)/2} ${y1}, ${(x1+x2)/2} ${y2}, ${x2} ${y2}" />`;
  }).join('');
}

function makeDraggable(node, canvas) {
  let active = false, dx = 0, dy = 0;
  node.addEventListener('pointerdown', e => {
    active = true;
    node.setPointerCapture?.(e.pointerId);
    const r = node.getBoundingClientRect();
    dx = e.clientX - r.left;
    dy = e.clientY - r.top;
    e.preventDefault();
  });
  node.addEventListener('pointermove', e => {
    if (!active) return;
    const cr = canvas.getBoundingClientRect();
    const x = Math.max(6, Math.min(canvas.clientWidth - node.offsetWidth - 6, e.clientX - cr.left - dx));
    const y = Math.max(6, Math.min(canvas.clientHeight - node.offsetHeight - 6, e.clientY - cr.top - dy));
    node.style.left = `${x}px`;
    node.style.top = `${y}px`;
    drawMindmapLines();
  });
  const stop = () => { active = false; };
  node.addEventListener('pointerup', stop);
  node.addEventListener('pointercancel', stop);
}

$('generateMindmap')?.addEventListener('click', () => renderMindmap($('mindmapSource')?.value));
$('clearMindmap')?.addEventListener('click', () => {
  if ($('mindmapSource')) $('mindmapSource').value = '';
  if ($('mindmapCanvas')) $('mindmapCanvas').innerHTML = '<p class="mindmap-placeholder">Votre carte apparaîtra ici. Les nœuds pourront être déplacés au doigt ou au stylet.</p>';
});
window.addEventListener('resize', drawMindmapLines);
window.addEventListener('sirafiq:data-changed', refreshHomeMetrics);
refreshHomeMetrics();
