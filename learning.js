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
  const scene = $('mindmapScene') || canvas;
  if (!canvas || !scene) return;
  const sentences = splitSentences(text);
  if (!sentences.length) {
    scene.innerHTML = '<p class="mindmap-placeholder">Ajoutez quelques phrases pour créer une carte.</p>';
    return;
  }
  const root = shortLabel(sentences[0], 34);
  const branches = (sentences.length > 1 ? sentences.slice(1) : sentences).slice(0, 6);
  scene.innerHTML = `
    <svg class="mindmap-lines" aria-hidden="true"></svg>
    <button class="mind-node root-node" type="button" data-node="0">${root}</button>
    ${branches.map((s, i) => `<button class="mind-node branch-node" type="button" data-node="${i + 1}">${shortLabel(s)}</button>`).join('')}
  `;
  const nodes = [...scene.querySelectorAll('.mind-node')];
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
  const scene = $('mindmapScene') || canvas;
  const svg = scene?.querySelector('.mindmap-lines');
  const root = scene?.querySelector('.root-node');
  if (!canvas || !svg || !root) return;
  const cr = canvas.getBoundingClientRect();
  const rr = root.getBoundingClientRect();
  const x1 = rr.left - cr.left + rr.width / 2;
  const y1 = rr.top - cr.top + rr.height / 2;
  svg.setAttribute('viewBox', `0 0 ${canvas.clientWidth} ${canvas.clientHeight}`);
  svg.innerHTML = [...scene.querySelectorAll('.branch-node')].map(node => {
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
  const scene = $('mindmapScene') || $('mindmapCanvas'); if (scene) scene.innerHTML = '<p class="mindmap-placeholder">Votre carte apparaîtra ici. Les nœuds pourront être déplacés au doigt ou au stylet.</p>';
});
window.addEventListener('resize', drawMindmapLines);
window.addEventListener('sirafiq:data-changed', refreshHomeMetrics);
refreshHomeMetrics();

// v6 — atelier de cartes mentales + exercices de français
let mindZoom = 1;
let selectedMindNode = null;
const oldRenderMindmap = renderMindmap;
function selectMindNode(node){ document.querySelectorAll('.mind-node.selected').forEach(n=>n.classList.remove('selected')); selectedMindNode=node; node?.classList.add('selected'); }
function enhanceMindNodes(){
  document.querySelectorAll('.mind-node').forEach(node=>{
    node.setAttribute('dir', /[\u0600-\u06FF]/.test(node.textContent) ? 'rtl' : 'auto');
    node.addEventListener('click',()=>selectMindNode(node));
    node.addEventListener('dblclick',()=>{ const next=prompt('Renommer cette idée',node.textContent.trim()); if(next?.trim()){node.textContent=next.trim();node.setAttribute('dir',/[\u0600-\u06FF]/.test(next)?'rtl':'auto');drawMindmapLines();} });
  });
}
$('generateMindmap')?.addEventListener('click',()=>setTimeout(enhanceMindNodes,0));
$('addMindNode')?.addEventListener('click',()=>{
 const canvas=$('mindmapCanvas'), scene=$('mindmapScene')||canvas; if(!canvas||!scene)return;
 if(!scene.querySelector('.mindmap-lines')) scene.insertAdjacentHTML('afterbegin','<svg class="mindmap-lines" aria-hidden="true"></svg>');
 const node=document.createElement('button'); node.type='button'; node.className='mind-node branch-node'; node.textContent='Nouvelle idée'; node.style.left=`${Math.max(20,canvas.clientWidth/2-85)}px`; node.style.top=`${Math.max(90,canvas.clientHeight/2+90)}px`; scene.appendChild(node); makeDraggable(node,canvas); enhanceMindNodes(); selectMindNode(node); drawMindmapLines();
});
$('deleteMindNode')?.addEventListener('click',()=>{ if(selectedMindNode&&!selectedMindNode.classList.contains('root-node')){selectedMindNode.remove();selectedMindNode=null;drawMindmapLines();} });
function setMindZoom(v){mindZoom=Math.max(.65,Math.min(1.55,v));const scene=$('mindmapScene');if(scene)scene.style.transform=`scale(${mindZoom})`;if($('mindZoomLabel'))$('mindZoomLabel').textContent=`${Math.round(mindZoom*100)} %`;}
$('mindZoomIn')?.addEventListener('click',()=>setMindZoom(mindZoom+.1)); $('mindZoomOut')?.addEventListener('click',()=>setMindZoom(mindZoom-.1)); $('mindCenter')?.addEventListener('click',()=>setMindZoom(1));

const frenchBank={
 fondations:{
  lecture:[['Lire, puis rappeler l’idée essentielle','Lisez : « Chaque matin, Lina ouvre la fenêtre pour observer le ciel avant de partir. » Sans relire, dites ce que fait Lina et quand elle le fait.','Lina ouvre la fenêtre le matin pour observer le ciel avant de partir.']],
  vocabulaire:[['Choisir le mot précis','Complétez avec un mot précis : « Après plusieurs essais, son geste devient plus ____ et régulier. »','fluide']],
  orthographe:[['Mémoriser une forme fréquente','Écrivez correctement : « aujourd hui » et « beaucoup ».','aujourd’hui ; beaucoup']],
  grammaire:[['Repérer qui fait l’action','Dans « Les élèves relisent leur phrase », quel est le sujet et quel est le verbe ?','Sujet : les élèves. Verbe : relisent.']],
  expression:[['Produire une phrase claire','Écrivez une phrase complète pour expliquer une habitude qui vous aide à apprendre.','Vérifiez : majuscule, idée complète, verbe conjugué et ponctuation.']]
 },
 consolidation:{
  lecture:[['Reformuler sans copier','Reformulez : « La répétition espacée consiste à revenir sur une connaissance après un délai. »','Expliquez la même idée avec vos propres mots, sans changer le sens.']],
  vocabulaire:[['Nuancer le sens','Donnez un synonyme adapté de « améliorer » dans : « améliorer un texte ».','corriger, enrichir, perfectionner selon le contexte']],
  orthographe:[['Accorder dans le groupe nominal','Corrigez : « des phrase claire et précise ».','des phrases claires et précises']],
  grammaire:[['Manipuler la phrase','Transformez « Il relit son texte. » à la forme négative.','Il ne relit pas son texte.']],
  expression:[['Justifier une idée','En 2 ou 3 phrases, expliquez pourquoi se tester peut être plus utile que relire passivement.','Une réponse réussie formule une idée, donne une raison et reste concise.']]
 },
 maitrise:{
  lecture:[['Distinguer idée et preuve','Écrivez une idée principale puis un élément qui pourrait la justifier dans un texte argumentatif sur les révisions.','Séparez clairement l’affirmation de l’élément qui la soutient.']],
  vocabulaire:[['Précision lexicale','Remplacez « faire » par un verbe plus précis : « faire une analyse », « faire un résumé ».','mener/réaliser une analyse ; rédiger/produire un résumé']],
  orthographe:[['Réviser une phrase','Corrigez : « Les notions qu’il a réviser sont rester fragiles. »','Les notions qu’il a révisées sont restées fragiles.']],
  grammaire:[['Analyser une relation','Dans « Lorsque la séance se termine, je note ce qui reste fragile », identifiez la proposition subordonnée.','Lorsque la séance se termine.']],
  expression:[['Synthèse courte','Rédigez 4 phrases : thèse, argument, exemple, conclusion sur une méthode de révision.','Vérifiez la progression logique et les connecteurs.']]
 }};
let frenchLevel='fondations', frenchSkill='lecture', frenchIndex=0;
function renderFrenchExercise(){const arr=frenchBank[frenchLevel]?.[frenchSkill]||[];const ex=arr[frenchIndex%arr.length];if(!ex)return;$('frenchExerciseMeta').textContent=`${frenchLevel[0].toUpperCase()+frenchLevel.slice(1)} · ${frenchSkill[0].toUpperCase()+frenchSkill.slice(1)}`;$('frenchExerciseTitle').textContent=ex[0];$('frenchExercisePrompt').textContent=ex[1];$('frenchAnswer').value='';$('frenchFeedback').textContent='';}
document.querySelectorAll('[data-french-level]').forEach(b=>b.addEventListener('click',()=>{frenchLevel=b.dataset.frenchLevel;document.querySelectorAll('[data-french-level]').forEach(x=>x.classList.toggle('active',x===b));frenchIndex=0;renderFrenchExercise();}));
document.querySelectorAll('[data-french-skill]').forEach(b=>b.addEventListener('click',()=>{frenchSkill=b.dataset.frenchSkill;document.querySelectorAll('[data-french-skill]').forEach(x=>x.classList.toggle('active',x===b));frenchIndex=0;renderFrenchExercise();}));
$('checkFrenchExercise')?.addEventListener('click',()=>{const ex=frenchBank[frenchLevel][frenchSkill][frenchIndex%frenchBank[frenchLevel][frenchSkill].length];$('frenchFeedback').innerHTML=`<strong>Repère de correction :</strong> ${ex[2]}`;});
$('nextFrenchExercise')?.addEventListener('click',()=>{frenchIndex++;renderFrenchExercise();});
renderFrenchExercise();
