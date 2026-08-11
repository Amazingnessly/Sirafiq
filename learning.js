import {
  countSupports, countRecordings, countWritings,
  listSupports, getSupport,
  listReviewItems, upsertReviewItem,
  addLearningEvent, listLearningEvents
} from './db.js?v=90';

const $ = id => document.getElementById(id);
const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
const prefersReducedMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
const isoDay = days => { const d = new Date(); d.setDate(d.getDate()+days); d.setHours(8,0,0,0); return d.toISOString(); };
const masteryPlan = {
  again:{days:1,label:'à revoir'},
  fragile:{days:2,label:'fragile'},
  acquis:{days:7,label:'acquis'},
  solide:{days:21,label:'maîtrisé'}
};

let dueItems = [];
let currentAgentPriority = null;

function routeForDomain(domain='') {
  const d=String(domain).toLowerCase();
  if(d.includes('écri')||d.includes('ecri')) return '#ecrire';
  if(d.includes('pron')||d.includes('oral')||d.includes('franc')) return '#prononcer';
  if(d.includes('carte')) return '#cartes';
  return '#memoriser';
}

async function refreshHomeMetrics() {
  try {
    const [supports, recordings, writings, reviews, events] = await Promise.all([
      countSupports(), countRecordings(), countWritings(), listReviewItems(), listLearningEvents().catch(()=>[])
    ]);
    const now = Date.now();
    dueItems = reviews
      .filter(r => !r.nextReview || new Date(r.nextReview).getTime() <= now)
      .sort((a,b)=>new Date(a.nextReview||0)-new Date(b.nextReview||0));
    const fragile = reviews.filter(r => ['fragile','à revoir'].includes(String(r.mastery||'').toLowerCase()));
    const mastered = reviews.filter(r => ['acquis','maîtrisé','solide'].includes(String(r.mastery||'').toLowerCase()));
    const practices = recordings + writings + events.length;
    const next = dueItems[0] || fragile[0] || reviews[0] || null;
    currentAgentPriority = next;

    if ($('todayPractices')) $('todayPractices').textContent = practices;
    if ($('todayDue')) $('todayDue').textContent = dueItems.length;
    if ($('todayMinutes')) $('todayMinutes').textContent = dueItems.length >= 5 ? '20' : dueItems.length >= 2 ? '15' : dueItems.length ? '10' : '8';
    if ($('coachNextTitle')) $('coachNextTitle').textContent = next?.title || (supports ? 'Consolider un support déjà présent' : 'Importer un premier support');
    if ($('coachNextReason')) $('coachNextReason').textContent = next
      ? (dueItems.includes(next) ? `Cette notion revient aujourd’hui car son prochain rappel est arrivé · ${next.mastery || 'à revoir'}.` : `Cette notion est encore ${next.mastery || 'en apprentissage'} : une courte reprise est prioritaire.`)
      : supports ? 'Aucune notion n’est urgente : une courte pratique suffit pour nourrir le programme.' : 'Sirāfiq a besoin d’un premier contenu ou d’une première pratique pour commencer à organiser vos révisions.';
    if ($('todayLead')) $('todayLead').textContent = dueItems.length
      ? `${dueItems.length} révision${dueItems.length>1?'s':''} à échéance. Sirāfiq les place avant le nouveau contenu.`
      : fragile.length ? `${fragile.length} notion${fragile.length>1?'s':''} reste${fragile.length>1?'nt':''} fragile${fragile.length>1?'s':''}. Une reprise courte est suffisante aujourd’hui.`
      : mastered.length ? 'Vos acquis sont stables pour l’instant. Sirāfiq prépare une séance d’entretien légère.'
      : 'Commencez quelques pratiques : la séance quotidienne deviendra de plus en plus précise.';

    if ($('agentHomeSummary')) {
      $('agentHomeSummary').textContent = reviews.length
        ? `${dueItems.length} à revoir maintenant · ${fragile.length} fragile${fragile.length>1?'s':''} · ${mastered.length} acquis ou maîtrisé${mastered.length>1?'s':''}. ${next ? `Priorité : ${next.title}.` : ''}`
        : `Sirāfiq n’invente pas votre niveau. Il attend vos premières restitutions, enregistrements ou séances d’écriture pour distinguer ce qui est acquis de ce qui doit revenir.`;
    }
  } catch (error) { console.warn('Programme de révision indisponible', error); }
}

$('startTodaySession')?.addEventListener('click', () => { location.hash = routeForDomain(currentAgentPriority?.domain); });
$('agentStartRecommendation')?.addEventListener('click', () => { location.hash = routeForDomain(currentAgentPriority?.domain); });

document.querySelectorAll('[data-focus]').forEach(button => {
  button.addEventListener('click', () => {
    const focus = button.dataset.focus; location.hash = '#memoriser';
    setTimeout(() => { const target = focus === 'quran' ? $('quranHub') : focus === 'vocab' ? $('vocabHub') : null; target?.scrollIntoView({ behavior: prefersReducedMotion()?'auto':'smooth', block:'start' }); },120);
  });
});
document.querySelectorAll('[data-preset-category]').forEach(button => button.addEventListener('click',()=>{
  const filter=$('supportCategoryFilter'); if(!filter)return; filter.value=button.dataset.presetCategory||''; filter.dispatchEvent(new Event('change',{bubbles:true})); document.querySelector('.library-toolbar')?.scrollIntoView({behavior:'smooth',block:'start'});
}));

// ===== Techniques de mémorisation =====
const memoryTechniques = {
  recall:{title:'Rappel libre + vérification',reason:'Retrouvez d’abord l’essentiel sans consulter le support. La vérification vient seulement après la tentative.',steps:['Masquez ou fermez le support.','Restituez tout ce dont vous vous souvenez, dans l’ordre qui vous vient.','Rouvrez le support et repérez précisément les oublis, ajouts ou hésitations.']},
  mask:{title:'Masquage progressif',reason:'Conservez d’abord quelques indices, puis réduisez-les à mesure que la restitution devient plus stable.',steps:['Lisez une unité courte avec le texte visible.','Masquez certains mots ou débuts de phrases et restituez.','Réduisez encore les indices jusqu’à pouvoir restituer sans aide.']},
  questions:{title:'Questions → rappel',reason:'Transformez le contenu en questions qui obligent à retrouver l’information, plutôt qu’à simplement la reconnaître.',steps:['Repérez une idée ou définition importante.','Formulez une question dont la réponse est dans le support.','Répondez sans regarder, puis vérifiez mot à mot si la précision est importante.']},
  oral:{title:'Restitution orale',reason:'Expliquez ou récitez à voix haute sans support, puis revenez au texte original pour vérifier les écarts.',steps:['Choisissez une unité courte.','Restituez-la à voix haute sans regarder.','Enregistrez-vous si utile, puis comparez avec le support original.']},
  written:{title:'Restitution écrite',reason:'Réécrire de mémoire rend immédiatement visibles les lacunes, l’ordre oublié et les formulations incertaines.',steps:['Fermez le support.','Écrivez de mémoire dans le grand cahier Sirāfiq.','Comparez ensuite ligne par ligne avec le support original.']},
  map:{title:'Carte de mémoire',reason:'Reconstruisez les relations entre les idées sans recopier le texte. La carte sert ensuite d’indice de rappel.',steps:['Placez le thème central.','Ajoutez les idées principales de mémoire.','Rouvrez le support uniquement pour corriger ou compléter la structure.']}
};
let selectedMemoryTechnique='recall';
let selectedMemorySupport=null;
let memorySupports=[];

function renderMemoryTechnique(key=selectedMemoryTechnique){
  selectedMemoryTechnique=memoryTechniques[key]?key:'recall';
  const t=memoryTechniques[selectedMemoryTechnique];
  document.querySelectorAll('[data-memory-technique]').forEach(b=>b.classList.toggle('active',b.dataset.memoryTechnique===selectedMemoryTechnique));
  if($('memoryTechniqueTitle')) $('memoryTechniqueTitle').textContent=t.title;
  if($('memoryTechniqueReason')) $('memoryTechniqueReason').textContent=t.reason;
  if($('memoryTechniqueSteps')) $('memoryTechniqueSteps').innerHTML=t.steps.map(x=>`<li>${esc(x)}</li>`).join('');
  if($('memoryEvaluation')) $('memoryEvaluation').hidden=true;
  if($('memoryStatus')) $('memoryStatus').textContent='';
}
document.querySelectorAll('[data-memory-technique]').forEach(b=>b.addEventListener('click',()=>renderMemoryTechnique(b.dataset.memoryTechnique)));

function recommendTechnique(support){
  const category=String(support?.category||'').toLowerCase();
  const kind=String(support?.kind||'').toLowerCase();
  if(category.includes('qour')||category.includes('qur')) return 'oral';
  if(category.includes('arabe')) return 'questions';
  if(kind.includes('audio')) return 'oral';
  if(kind.includes('text')||kind==='txt'||kind==='md') return 'recall';
  return 'recall';
}

async function refreshMemorySupportPicker(){
  const select=$('memorySupportSelect'); if(!select)return;
  try{
    memorySupports=(await listSupports()).sort((a,b)=>new Date(b.createdAt)-new Date(a.createdAt));
    const previous=select.value;
    select.innerHTML='<option value="">Choisir un support…</option>'+memorySupports.map(s=>`<option value="${s.id}">${esc(s.title||'Support')} · ${esc(s.category||'Autre')}</option>`).join('');
    if(previous && memorySupports.some(s=>String(s.id)===previous)) select.value=previous;
  }catch(error){console.warn('Supports indisponibles pour le laboratoire',error);}
}
async function renderSupportIdeas(support){
  const box=$('memorySupportIdeas'); if(!box)return;
  if(!support){box.innerHTML='<small>Idées proposées pour ce support</small><div><span>Choisissez un support pour obtenir des actions de révision.</span></div>';return;}
  const category=String(support.category||'').toLowerCase();
  let ideas=[];
  if(category.includes('qour')||category.includes('qur')){
    ideas=['Découper le passage en unités courtes sans modifier le texte','Réciter sans regarder puis vérifier sur le support original','Masquer progressivement les unités déjà stables','Enregistrer une restitution puis la réécouter'];
  }else if(category.includes('arabe')){
    ideas=['Mot arabe → retrouver le sens','Sens → produire le mot arabe','Mélanger les mots fragiles avec quelques mots acquis','Restituer oralement puis vérifier la liste originale'];
  }else{
    ideas=['Rappel libre de l’idée principale','Transformer les points importants en questions','Restituer une partie par écrit dans le grand cahier','Reconstruire les relations dans une carte mentale'];
    try{
      const full=await getSupport(support.id); const mime=String(full?.mimeType||full?.type||'');
      if(full?.blob && mime.startsWith('text/')){
        const text=(await full.blob.text()).replace(/\s+/g,' ').trim();
        const snippets=text.split(/[.!?;:]+/).map(x=>cleanIdea(x,78)).filter(x=>x.length>12).slice(0,2);
        if(snippets[0])ideas[0]=`Rappeler sans regarder : « ${snippets[0]} »`;
        if(snippets[1])ideas[1]=`Formuler une question à partir de : « ${snippets[1]} »`;
      }
    }catch{}
  }
  box.innerHTML='<small>Idées proposées pour ce support</small><div>'+ideas.map(x=>`<span>${esc(x)}</span>`).join('')+'</div>';
}
$('memorySupportSelect')?.addEventListener('change',async e=>{
  selectedMemorySupport=memorySupports.find(s=>String(s.id)===e.target.value)||null;
  await renderSupportIdeas(selectedMemorySupport);
  if(selectedMemorySupport){renderMemoryTechnique(recommendTechnique(selectedMemorySupport));$('memoryStatus').textContent=`Technique proposée pour « ${selectedMemorySupport.title} ». Vous pouvez en choisir une autre.`;}
});
$('memoryStartTechnique')?.addEventListener('click',async()=>{
  if(!selectedMemorySupport){$('memoryStatus').textContent='Choisissez d’abord un support à travailler.';return;}
  const t=memoryTechniques[selectedMemoryTechnique];
  $('memoryEvaluation').hidden=false;
  $('memoryStatus').textContent=`Séance commencée : ${t.title}. Faites la tentative avant de vous évaluer.`;
  await addLearningEvent({domain:'memorisation',kind:'technique-start',supportId:selectedMemorySupport.id,title:selectedMemorySupport.title,technique:selectedMemoryTechnique}).catch(()=>{});
});
$('memorySendToMap')?.addEventListener('click',async()=>{
  if(!selectedMemorySupport){$('memoryStatus').textContent='Choisissez d’abord un support.';return;}
  try{
    const support=await getSupport(selectedMemorySupport.id);
    let source='';
    if(support?.blob && String(support.mimeType||support.type||'').startsWith('text/')) source=await support.blob.text();
    if(source) localStorage.setItem('sirafiq-map-transfer',source.slice(0,12000));
    localStorage.setItem('sirafiq-map-transfer-title',selectedMemorySupport.title||'Support');
  }catch{}
  location.hash='#cartes';
});
$('memorySendToWriting')?.addEventListener('click',()=>{
  if(selectedMemorySupport) localStorage.setItem('sirafiq-writing-session-title',`Restitution — ${selectedMemorySupport.title}`);
  location.hash='#ecrire';
});
document.querySelectorAll('[data-memory-mastery]').forEach(button=>button.addEventListener('click',async()=>{
  if(!selectedMemorySupport)return;
  const plan=masteryPlan[button.dataset.memoryMastery]; if(!plan)return;
  await upsertReviewItem({key:`support:${selectedMemorySupport.id}:${selectedMemoryTechnique}`,title:selectedMemorySupport.title,domain:'memorisation',area:selectedMemoryTechnique,mastery:plan.label,nextReview:isoDay(plan.days),intervalDays:plan.days,lastResult:button.dataset.memoryMastery,supportId:selectedMemorySupport.id});
  await addLearningEvent({domain:'memorisation',kind:'self-evaluation',supportId:selectedMemorySupport.id,title:selectedMemorySupport.title,technique:selectedMemoryTechnique,result:button.dataset.memoryMastery}).catch(()=>{});
  $('memoryStatus').textContent=`État enregistré : ${plan.label}. Prochaine révision dans ${plan.days} jour${plan.days>1?'s':''}.`;
  $('memoryEvaluation').hidden=true;
  window.dispatchEvent(new CustomEvent('sirafiq:data-changed'));
}));
renderMemoryTechnique('recall');
refreshMemorySupportPicker();

// ===== Parcours français oral =====
const oralPath={
  sons:{meta:'Étape 1 · Sons',title:'Installer /y/ sans glisser vers /u/.',goal:'Travaillez lentement la position des lèvres puis augmentez la longueur de l’énoncé.',model:'tu · rue · tu as vu · une rue tranquille',drills:['tu — tout','rue — roue','Tu as vu une rue tranquille.'],checks:['Les lèvres restent arrondies sans reculer excessivement la langue.','/y/ et /u/ restent nettement distincts.','La voyelle reste stable du début à la fin du mot.']},
  contrastes:{meta:'Étape 2 · Contrastes',title:'Entendre et produire des oppositions utiles.',goal:'Un contraste à la fois : la netteté passe avant la vitesse.',model:'peu · peur · été · était · beau · bord',drills:['peu — peur','été — était','beau — bord'],checks:['La différence entre les deux mots reste audible.','Vous ne changez qu’un paramètre à la fois.','Le mot reste naturel, sans sur-articulation.']},
  rythme:{meta:'Étape 3 · Rythme',title:'Parler en groupes de sens.',goal:'Le français avance par groupes plutôt que mot par mot.',model:'Aujourd’hui / je vais vous présenter / une idée importante.',drills:['Je voudrais / vous expliquer / ce point.','Dans ce passage / retenez surtout / deux idées.','Nous allons d’abord observer / puis comparer.'],checks:['Les mots d’un même groupe restent liés.','La dernière syllabe du groupe porte davantage le relief.','Les pauses correspondent au sens, pas à chaque mot.']},
  liaisons:{meta:'Étape 4 · Enchaînements',title:'Relier sans fabriquer de liaisons.',goal:'Travaillez la continuité et les enchaînements réellement utiles.',model:'vous avez · les amis · un grand arbre · il arrive',drills:['vous avez','les amis','un grand arbre'],checks:['La continuité ne crée pas de coupure artificielle.','Aucune liaison n’est ajoutée au hasard.','Le débit reste confortable et intelligible.']},
  lecture:{meta:'Étape 5 · Lecture à voix haute',title:'Faire entendre la structure d’un texte.',goal:'Préparez les groupes de sens avant de chercher l’expressivité.',model:'Pour comprendre cette notion, il faut d’abord distinguer deux idées. Ensuite, nous verrons comment elles se complètent.',drills:['Marquez les groupes de sens.','Lisez une première fois lentement.','Relisez sans perdre les pauses ni l’articulation.'],checks:['La ponctuation est audible sans devenir théâtrale.','Les mots importants ressortent naturellement.','Le débit ne détruit pas l’articulation.']},
  expliquer:{meta:'Étape 6 · Parole pédagogique',title:'Expliquer comme devant un élève.',goal:'Annoncez l’idée, donnez un exemple, puis reformulez.',model:'L’idée principale est simple : nous cherchons à distinguer ce qui est certain de ce qui reste à vérifier. Prenons un exemple.',drills:['Donnez une consigne en une phrase.','Définissez un terme sans lire.','Expliquez une idée puis reformulez-la autrement.'],checks:['L’objectif est annoncé rapidement.','Les phrases restent assez courtes pour être suivies.','La reformulation apporte de la clarté, pas seulement une répétition.']},
  aisance:{meta:'Étape 7 · Aisance',title:'Tenir un mini-cours sans perdre la clarté.',goal:'Parlez 60 à 90 secondes avec un plan simple et des transitions naturelles.',model:'Aujourd’hui, nous allons voir trois points. D’abord le principe, ensuite un exemple, et enfin la manière de vérifier que nous avons bien compris.',drills:['Introduction de 20 secondes.','Explication structurée de 60 secondes.','Conclusion et reformulation en 15 secondes.'],checks:['Le plan reste perceptible du début à la fin.','Le débit est stable même quand vous cherchez vos mots.','Les transitions aident l’auditeur à suivre.']}
};
let currentOralStage='sons';
function speakFrench(text){
  if(!('speechSynthesis' in window)){return false;}
  speechSynthesis.cancel();
  const u=new SpeechSynthesisUtterance(String(text).replace(/·/g,',').replace(/\//g,',')); u.lang='fr-FR'; u.rate=.86; u.pitch=1;
  const voices=speechSynthesis.getVoices(); const fr=voices.find(v=>/^fr[-_]?FR/i.test(v.lang))||voices.find(v=>/^fr/i.test(v.lang)); if(fr)u.voice=fr;
  speechSynthesis.speak(u); return true;
}
function renderOralStage(stage=currentOralStage){
  currentOralStage=oralPath[stage]?stage:'sons'; const d=oralPath[currentOralStage];
  document.querySelectorAll('[data-oral-stage]').forEach(b=>b.classList.toggle('active',b.dataset.oralStage===currentOralStage));
  $('oralLessonMeta').textContent=d.meta; $('oralLessonTitle').textContent=d.title; $('oralLessonGoal').textContent=d.goal; $('oralModelText').textContent=d.model;
  $('oralDrillGrid').innerHTML=d.drills.map((x,i)=>`<button type="button" class="oral-drill" data-oral-drill="${i}"><span>${String(i+1).padStart(2,'0')}</span><strong>${esc(x)}</strong><small>Écouter puis répéter</small></button>`).join('');
  $('oralCoachChecklist').innerHTML=d.checks.map(x=>`<li>${esc(x)}</li>`).join('');
}
document.querySelectorAll('[data-oral-stage]').forEach(b=>b.addEventListener('click',()=>renderOralStage(b.dataset.oralStage)));
$('playOralModel')?.addEventListener('click',()=>{if(!speakFrench(oralPath[currentOralStage].model)) alert('La synthèse vocale française n’est pas disponible sur cet appareil.');});
$('oralDrillGrid')?.addEventListener('click',e=>{const b=e.target.closest('[data-oral-drill]');if(!b)return; speakFrench(oralPath[currentOralStage].drills[Number(b.dataset.oralDrill)]||oralPath[currentOralStage].model);});
$('openPronunciationStudio')?.addEventListener('click',()=>{
  const d=oralPath[currentOralStage]; localStorage.setItem('sirafiq-pronunciation-prompt',d.model); localStorage.setItem('sirafiq-pronunciation-observation',d.checks.join(' · ')); location.hash='#prononcer';
});
renderOralStage('sons');

// Synchronise les petites leçons du studio d’enregistrement.
const pronunciationLessons = {
  sons:['Tu — tout — rue — roue','Position des lèvres, netteté de /y/ et /u/, stabilité de la voyelle.'],
  contrastes:['peu — peur · beau — bord · été — était','Conservez une différence sonore nette sans sur-articuler.'],
  rythme:['Je voudrais / vous présenter / mon travail.','Écoutez les groupes de sens, les syllabes légères et les pauses.'],
  liaisons:['les amis · vous avez · un grand arbre','Travaillez la continuité sans ajouter de liaison artificielle.'],
  expression:['Aujourd’hui, je vais expliquer une idée importante.','Travaillez la mélodie, les pauses et la mise en relief des mots utiles.']
};
function setPronunciationPrompt(key='sons'){
  const [prompt,tip]=pronunciationLessons[key]||pronunciationLessons.sons;
  if($('pronunciationPrompt')) $('pronunciationPrompt').textContent=prompt;
  if($('pronunciationTip')) $('pronunciationTip').textContent=tip;
  if($('compareModelText')) $('compareModelText').textContent=prompt;
  if($('pronunciationObservation')) $('pronunciationObservation').textContent=tip;
  localStorage.setItem('sirafiq-pronunciation-prompt',prompt); localStorage.setItem('sirafiq-pronunciation-observation',tip);
  window.dispatchEvent(new CustomEvent('sirafiq:pronunciation-prompt',{detail:{prompt,tip}}));
}
document.querySelectorAll('[data-pron-lesson]').forEach(button=>button.addEventListener('click',()=>{
  document.querySelectorAll('[data-pron-lesson]').forEach(b=>b.classList.toggle('active',b===button)); setPronunciationPrompt(button.dataset.pronLesson);
  const title=$('recordTitle'); if(title&&!title.value.trim()) title.value=`Exercice — ${button.textContent.trim()}`;
}));
$('playPronunciationModel')?.addEventListener('click',()=>speakFrench($('compareModelText')?.textContent||$('pronunciationPrompt')?.textContent||''));

// ===== Écriture : français / arabe =====
const writingCurriculum={
  fr:{
    gestes:{title:'Boucles régulières et continues',tip:'Gardez une hauteur stable. Le mouvement vient du bras et de la main sans cassure.',steps:['Observer le mouvement.','Repasser lentement 3 fois.','Copier 2 lignes.','Écrire seul sans modèle.'],svg:'<path d="M35 105 C55 25 95 25 105 105 C115 135 145 130 150 82 C158 25 200 24 210 103 C220 135 250 129 257 80 C266 25 309 24 318 104 C327 133 359 128 365 78"/><path d="M35 118 H585" class="guide-baseline"/>'},
    familles:{title:'Familles de gestes : boucle, étrécie, pont, ovale',tip:'Travaillez le geste commun avant de chercher la lettre complète.',steps:['Boucles régulières.','Étrécies de même hauteur.','Ponts sans angle dur.','Ovales fermés puis sortie fluide.'],svg:'<path d="M38 110 C55 35 92 35 105 110 M145 110 C145 48 175 42 184 105 M225 108 C240 55 268 55 286 108 M330 105 C342 52 391 52 399 102 C403 126 362 136 340 112"/><path d="M30 120 H590" class="guide-baseline"/>'},
    liaisons:{title:'Lier sans écraser les lettres',tip:'La sortie d’une forme prépare l’entrée de la suivante.',steps:['Deux formes liées.','Trois formes sans lever inutile.','Même hauteur sur toute la série.','Réduire progressivement la vitesse de correction.'],svg:'<path d="M35 105 C55 25 95 25 105 105 C120 128 138 128 151 88 C163 48 191 48 204 105 C220 128 242 125 252 88 C263 50 293 49 304 106"/><path d="M30 120 H590" class="guide-baseline"/>'},
    mots:{title:'Mots : régularité, taille, espacements',tip:'Visez une écriture lisible et stable avant toute accélération.',steps:['Copier un mot lentement.','Observer les hauteurs.','Réécrire sans modèle.','Comparer les espacements.'],svg:'<path d="M35 116 H585" class="guide-baseline"/><path d="M35 75 H585" class="guide-midline"/>'},
    lignes:{title:'Tenir une ligne complète',tip:'Gardez la même inclinaison et la même pression d’un bout à l’autre.',steps:['Une courte phrase avec modèle.','Même phrase sans modèle.','Deux lignes continues.','Relire uniquement la forme, pas le contenu.'],svg:'<path d="M35 116 H585" class="guide-baseline"/><path d="M35 72 H585" class="guide-midline"/><path d="M35 30 H585" class="guide-topline"/>'},
    fluidite:{title:'Fluidité sans perdre la forme',tip:'Accélérez seulement si les proportions et l’espacement restent stables.',steps:['30 secondes très lisibles.','45 secondes avec rythme régulier.','60 secondes sans crispation.','Comparer début et fin du passage.'],svg:'<path d="M35 116 H585" class="guide-baseline"/><path d="M35 72 H585" class="guide-midline"/>'}
  },
  ar:{
    gestes:{title:'اتجاه الكتابة والحركة الأساسية',tip:'Commencez par le mouvement droite → gauche, la ligne de base et les courbes simples.',steps:['Tracer de droite à gauche.','Courbes courtes et régulières.','Revenir proprement vers la ligne de base.','Répéter sans accélérer.'],svg:'<path d="M570 78 C525 110 470 108 430 88 C395 70 350 72 315 98 C280 122 225 117 190 92 C155 67 110 68 55 103"/><path d="M35 118 H585" class="guide-baseline"/>'},
    familles:{title:'عائلات الأشكال قبل الحروف',tip:'Regroupez les lettres qui partagent un même squelette ; les points viennent après le corps du geste.',steps:['Même squelette sans points.','Ajouter les points ensuite.','Comparer hauteur et largeur.','Répéter la famille entière.'],svg:'<path d="M565 90 C530 120 468 120 440 92 C418 70 385 70 360 99 M330 90 C300 120 245 120 215 92 M185 90 C150 120 95 120 60 92"/><path d="M35 118 H585" class="guide-baseline"/>'},
    liaisons:{title:'Connexions initiale · médiane · finale',tip:'Travaillez comment la forme entre dans la lettre suivante et comment elle en sort.',steps:['Deux formes connectées.','Trois formes sur la ligne de base.','Identifier les lettres non connectantes.','Copier puis refaire sans modèle.'],svg:'<path d="M570 95 C540 118 510 112 485 95 C455 74 430 73 402 98 C376 120 343 115 319 96 C291 74 260 74 235 97 C205 123 170 115 145 94 C122 75 92 77 55 102"/><path d="M35 118 H585" class="guide-baseline"/>'},
    mots:{title:'كلمات قصيرة : تناسق واتصال',tip:'Conservez une ligne de base claire et des espaces cohérents entre les mots.',steps:['Copier un mot lentement.','Observer les connexions.','Réécrire sans modèle.','Comparer longueur et équilibre.'],svg:'<path d="M35 118 H585" class="guide-baseline"/><path d="M35 70 H585" class="guide-midline"/>'},
    lignes:{title:'سطر كامل : ثبات الشكل',tip:'La régularité doit rester visible du début à la fin de la ligne.',steps:['Une courte ligne avec modèle.','Même ligne sans modèle.','Contrôler la ligne de base.','Corriger un seul point à la fois.'],svg:'<path d="M35 118 H585" class="guide-baseline"/><path d="M35 70 H585" class="guide-midline"/>'},
    fluidite:{title:'طلاقة مع وضوح الخط',tip:'Augmentez le rythme sans perdre la lisibilité ni la forme des connexions.',steps:['30 secondes très lentement.','45 secondes régulières.','60 secondes sans crispation.','Comparer le début et la fin.'],svg:'<path d="M35 118 H585" class="guide-baseline"/><path d="M35 70 H585" class="guide-midline"/>'}
  }
};
let writingLanguage='fr', writingStage='gestes';
function renderWritingLesson(){
  const bank=writingCurriculum[writingLanguage]; if(!bank[writingStage]) writingStage='gestes'; const d=bank[writingStage];
  document.querySelectorAll('[data-writing-language]').forEach(b=>b.classList.toggle('active',b.dataset.writingLanguage===writingLanguage));
  document.querySelectorAll('[data-writing-lesson]').forEach(b=>b.classList.toggle('active',b.dataset.writingLesson===writingStage));
  $('writingDailyMeta').textContent=writingLanguage==='fr'?'Français · entraînement du geste':'العربية · تدريب الخط';
  $('writingPracticePrompt').textContent=d.title; $('writingPracticeTip').textContent=d.tip; $('writingDailySteps').innerHTML=d.steps.map(x=>`<li>${esc(x)}</li>`).join(''); $('writingGestureModel').innerHTML=d.svg;
  $('writingGestureModel').setAttribute('dir',writingLanguage==='ar'?'rtl':'ltr');
}
document.querySelectorAll('[data-writing-language]').forEach(b=>b.addEventListener('click',()=>{writingLanguage=b.dataset.writingLanguage;renderWritingLesson();}));
document.querySelectorAll('[data-writing-lesson]').forEach(b=>b.addEventListener('click',()=>{writingStage=b.dataset.writingLesson;renderWritingLesson();}));
renderWritingLesson();

// ===== Studio de cartes mentales =====
let mapMode='manual', mindZoom=1, selectedMindNode=null, nodeCounter=0;
const mapScene=()=>$('mindmapScene'); const mapCanvas=()=>$('mindmapCanvas');
function cleanIdea(text,max=64){ const c=String(text||'').replace(/^[-–—•👉☝️\s]+/u,'').replace(/\s+/g,' ').trim(); if(c.length<=max)return c; return `${c.slice(0,max).replace(/\s+\S*$/,'')}…`; }
function sourceIdeas(text){
  const raw=String(text||'').replace(/([.!?;:])\s+/g,'$1\n').split(/\n+/).map(x=>cleanIdea(x,76)).filter(x=>x.length>3);
  const seen=new Set(); return raw.filter(x=>{const k=x.toLocaleLowerCase('fr');if(seen.has(k))return false;seen.add(k);return true;}).slice(0,10);
}
function nodeHtml(id,label,parent,kind='branch'){ return `<button class="mind-node ${kind==='root'?'root-node':'branch-node'}" type="button" data-node-id="${id}" data-parent-id="${parent||''}" dir="${/[\u0600-\u06FF]/.test(label)?'rtl':'auto'}">${esc(label)}</button>`; }
function selectMindNode(node){ document.querySelectorAll('.mind-node.selected').forEach(n=>n.classList.remove('selected')); selectedMindNode=node||null; node?.classList.add('selected'); const editor=$('mindmapNodeLabel'); if(editor){editor.value=node?.textContent?.trim()||'';editor.disabled=!node;} }
function sceneReset(){ const scene=mapScene(); if(!scene)return; scene.innerHTML='<svg class="mindmap-lines" aria-hidden="true"></svg>'; nodeCounter=0; selectedMindNode=null; }
function addNode(label,parentId='',kind='branch',x=null,y=null){
  const scene=mapScene(), canvas=mapCanvas(); if(!scene||!canvas)return null;
  const id=`n${++nodeCounter}`; scene.insertAdjacentHTML('beforeend',nodeHtml(id,cleanIdea(label)||'Nouvelle idée',parentId,kind));
  const node=scene.querySelector(`[data-node-id="${id}"]`); const idx=scene.querySelectorAll('.mind-node').length-1;
  const parentNode=parentId ? scene.querySelector(`[data-node-id="${parentId}"]`) : null; const depth=kind==='root'?0:(Number(parentNode?.dataset.depth||0)+1); node.dataset.depth=String(depth); if(depth>1) node.classList.add('depth-2'); const siblings=[...scene.querySelectorAll('.mind-node')].filter(n=>n.dataset.parentId===parentId); const tone=kind==='root'?-1:(parentNode?.dataset.tone ?? String(Math.max(0,(siblings.length-1)%5))); node.dataset.tone=String(tone); if(tone>=0) node.classList.add(`tone-${tone}`);
  node.style.left=`${x ?? (kind==='root'?canvas.clientWidth/2-95:55+(idx%3)*205)}px`; node.style.top=`${y ?? (kind==='root'?canvas.clientHeight/2-38:90+Math.floor(idx/3)*110)}px`;
  makeDraggable(node,canvas); bindNode(node); return node;
}
function newManualMap(){ sceneReset(); const canvas=mapCanvas(); if(!canvas)return; const root=addNode('Idée centrale','', 'root', Math.max(20,canvas.clientWidth/2-95),Math.max(70,canvas.clientHeight/2-38)); selectMindNode(root); drawMindmapLines(); $('mindmapSaveStatus').textContent='Carte créée. Sélectionnez le centre puis ajoutez des branches.'; }
function renderAutoMap(text){
  const ideas=sourceIdeas(text); if(!ideas.length){$('mindmapSaveStatus').textContent='Ajoutez un texte un peu plus long.';return;}
  sceneReset(); const canvas=mapCanvas(); const root=addNode(ideas[0],'','root',canvas.clientWidth/2-95,canvas.clientHeight/2-38);
  const branchIdeas=ideas.slice(1,Math.min(5,ideas.length)); const branches=branchIdeas.map(idea=>addNode(idea,root.dataset.nodeId,'branch'));
  ideas.slice(5,10).forEach((idea,i)=>{const parent=branches[i%Math.max(1,branches.length)]||root;addNode(idea,parent.dataset.nodeId,'branch');});
  selectMindNode(root); layoutMindmap('radial'); $('mindmapSaveStatus').textContent='Structure créée localement à partir de votre texte. Tout reste modifiable.';
}
function bindNode(node){ node.addEventListener('click',e=>{e.stopPropagation();selectMindNode(node);}); }
function renameSelected(){ if(!selectedMindNode)return; const next=$('mindmapNodeLabel')?.value?.trim(); if(next){selectedMindNode.textContent=cleanIdea(next,100);selectedMindNode.setAttribute('dir',/[\u0600-\u06FF]/.test(next)?'rtl':'auto');drawMindmapLines();$('mindmapSaveStatus').textContent='Nœud renommé.';} }
function drawMindmapLines(){
  const canvas=mapCanvas(), scene=mapScene(), svg=scene?.querySelector('.mindmap-lines'); if(!canvas||!scene||!svg)return;
  const cr=canvas.getBoundingClientRect(); svg.setAttribute('viewBox',`0 0 ${canvas.clientWidth} ${canvas.clientHeight}`);
  svg.innerHTML=[...scene.querySelectorAll('.mind-node[data-parent-id]')].filter(n=>n.dataset.parentId).map(node=>{const parent=scene.querySelector(`[data-node-id="${node.dataset.parentId}"]`);if(!parent)return'';const pr=parent.getBoundingClientRect(),nr=node.getBoundingClientRect();const x1=pr.left-cr.left+pr.width/2,y1=pr.top-cr.top+pr.height/2,x2=nr.left-cr.left+nr.width/2,y2=nr.top-cr.top+nr.height/2;return `<path class="tone-${node.dataset.tone||'0'}" d="M ${x1} ${y1} C ${(x1+x2)/2} ${y1}, ${(x1+x2)/2} ${y2}, ${x2} ${y2}"/>`;}).join('');
}
function makeDraggable(node,canvas){let active=false,dx=0,dy=0;node.addEventListener('pointerdown',e=>{active=true;node.setPointerCapture?.(e.pointerId);const r=node.getBoundingClientRect();dx=e.clientX-r.left;dy=e.clientY-r.top;e.preventDefault();});node.addEventListener('pointermove',e=>{if(!active)return;const cr=canvas.getBoundingClientRect();const x=Math.max(8,Math.min(canvas.clientWidth-node.offsetWidth-8,e.clientX-cr.left-dx));const y=Math.max(8,Math.min(canvas.clientHeight-node.offsetHeight-8,e.clientY-cr.top-dy));node.style.left=`${x}px`;node.style.top=`${y}px`;drawMindmapLines();});const stop=()=>active=false;node.addEventListener('pointerup',stop);node.addEventListener('pointercancel',stop);}
function layoutMindmap(mode='radial'){
  const canvas=mapCanvas(), scene=mapScene(); if(!canvas||!scene)return; const nodes=[...scene.querySelectorAll('.mind-node')],root=scene.querySelector('.root-node');if(!root)return;
  document.querySelectorAll('[data-map-layout]').forEach(b=>b.classList.toggle('active',b.dataset.mapLayout===mode)); if(mode==='free'){drawMindmapLines();return;}
  const direct=nodes.filter(n=>n.dataset.parentId===root.dataset.nodeId), childrenOf=id=>nodes.filter(n=>n.dataset.parentId===id);
  if(mode==='tree'){root.style.left='36px';root.style.top=`${Math.max(60,canvas.clientHeight/2-root.offsetHeight/2)}px`;direct.forEach((node,i)=>{const y=70+i*Math.max(110,(canvas.clientHeight-140)/Math.max(1,direct.length));node.style.left=`${Math.min(canvas.clientWidth-210,canvas.clientWidth*.36)}px`;node.style.top=`${Math.min(canvas.clientHeight-80,y)}px`;childrenOf(node.dataset.nodeId).forEach((child,j)=>{child.style.left=`${Math.min(canvas.clientWidth-200,canvas.clientWidth*.69)}px`;child.style.top=`${Math.min(canvas.clientHeight-78,y-35+j*76)}px`;});});}
  else {root.style.left=`${canvas.clientWidth/2-root.offsetWidth/2}px`;root.style.top=`${canvas.clientHeight/2-root.offsetHeight/2}px`;const rx=Math.min(350,canvas.clientWidth*.34),ry=Math.min(245,canvas.clientHeight*.31);direct.forEach((node,i)=>{const a=Math.PI*2*i/Math.max(1,direct.length)-Math.PI/2;const px=canvas.clientWidth/2+Math.cos(a)*rx-node.offsetWidth/2,py=canvas.clientHeight/2+Math.sin(a)*ry-node.offsetHeight/2;node.style.left=`${Math.max(8,Math.min(canvas.clientWidth-node.offsetWidth-8,px))}px`;node.style.top=`${Math.max(8,Math.min(canvas.clientHeight-node.offsetHeight-8,py))}px`;childrenOf(node.dataset.nodeId).forEach((child,j,kids)=>{const spread=(j-(kids.length-1)/2)*68;const ox=canvas.clientWidth/2+Math.cos(a)*(rx+175)-child.offsetWidth/2,oy=canvas.clientHeight/2+Math.sin(a)*(ry+120)-child.offsetHeight/2+spread;child.style.left=`${Math.max(8,Math.min(canvas.clientWidth-child.offsetWidth-8,ox))}px`;child.style.top=`${Math.max(8,Math.min(canvas.clientHeight-child.offsetHeight-8,oy))}px`;});});}
  drawMindmapLines();
}
function serializeMap(){return [...mapScene().querySelectorAll('.mind-node')].map(n=>({id:n.dataset.nodeId,parentId:n.dataset.parentId||'',label:n.textContent,left:n.style.left,top:n.style.top,root:n.classList.contains('root-node')}));}
function saveMap(){localStorage.setItem('sirafiq-mindmap-v9',JSON.stringify({nodes:serializeMap(),source:$('mindmapSource')?.value||'',mode:mapMode,savedAt:new Date().toISOString()}));$('mindmapSaveStatus').textContent='Carte enregistrée localement ✓';}
function restoreMap(){try{const data=JSON.parse(localStorage.getItem('sirafiq-mindmap-v9')||localStorage.getItem('sirafiq-mindmap-v7')||'null');if(!data?.nodes?.length)return false;sceneReset();data.nodes.forEach(item=>{const node=addNode(item.label,item.parentId,item.root?'root':'branch');node.dataset.nodeId=item.id;node.style.left=item.left;node.style.top=item.top;nodeCounter=Math.max(nodeCounter,Number(item.id.replace(/\D/g,''))||0);});if($('mindmapSource'))$('mindmapSource').value=data.source||'';drawMindmapLines();return true;}catch{return false;}}
function setMapMode(mode){mapMode=mode;document.querySelectorAll('[data-map-mode]').forEach(b=>b.classList.toggle('active',b.dataset.mapMode===mode));$('mapAutoPanel').hidden=mode!=='auto';$('mapModeHelp').textContent=mode==='auto'?'Collez votre texte : Sirāfiq structure seulement ce que vous fournissez.':'Commencez par une idée centrale, puis ajoutez des branches et sous-branches.';if(mode==='manual'&&!mapScene()?.querySelector('.mind-node'))newManualMap();}
function ensureMapReady(){
  const transfer=localStorage.getItem('sirafiq-map-transfer'); if(transfer){setMapMode('auto');$('mindmapSource').value=transfer;localStorage.removeItem('sirafiq-map-transfer');$('mindmapSaveStatus').textContent=`Texte reçu depuis « ${localStorage.getItem('sirafiq-map-transfer-title')||'un support'} ». Touchez « Générer une première structure ».`;}
  if(!mapScene()?.querySelector('.mind-node') && mapMode==='manual') newManualMap();
  requestAnimationFrame(()=>layoutMindmap('radial'));
}
document.querySelectorAll('[data-map-mode]').forEach(b=>b.addEventListener('click',()=>setMapMode(b.dataset.mapMode)));
$('newManualMap')?.addEventListener('click',()=>{newManualMap();requestAnimationFrame(()=>layoutMindmap('radial'));});
$('generateMindmap')?.addEventListener('click',()=>renderAutoMap($('mindmapSource')?.value));
$('addMindNode')?.addEventListener('click',()=>{if(!mapScene().querySelector('.mind-node'))newManualMap();const root=mapScene().querySelector('.root-node');const node=addNode('Nouvelle branche',root?.dataset.nodeId||'','branch');selectMindNode(node);layoutMindmap('radial');});
$('addMindChild')?.addEventListener('click',()=>{if(!selectedMindNode){$('mindmapSaveStatus').textContent='Sélectionnez d’abord un nœud.';return;}const node=addNode('Sous-idée',selectedMindNode.dataset.nodeId,'branch',Math.min(mapCanvas().clientWidth-190,selectedMindNode.offsetLeft+190),Math.min(mapCanvas().clientHeight-70,selectedMindNode.offsetTop+95));selectMindNode(node);drawMindmapLines();});
$('renameMindNode')?.addEventListener('click',renameSelected);$('mindmapNodeLabel')?.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();renameSelected();}});
document.querySelectorAll('[data-map-layout]').forEach(b=>b.addEventListener('click',()=>layoutMindmap(b.dataset.mapLayout)));
$('mindFullscreen')?.addEventListener('click',()=>{const ws=document.querySelector('.mindmap-workspace-v7');ws?.classList.toggle('map-fullscreen');document.body.classList.toggle('mindmap-fullscreen-open');$('mindFullscreen').textContent=ws?.classList.contains('map-fullscreen')?'Réduire':'Plein écran';setTimeout(()=>layoutMindmap('radial'),80);});
$('deleteMindNode')?.addEventListener('click',()=>{if(!selectedMindNode||selectedMindNode.classList.contains('root-node'))return;const id=selectedMindNode.dataset.nodeId;[...mapScene().querySelectorAll(`[data-parent-id="${id}"]`)].forEach(n=>n.dataset.parentId=selectedMindNode.dataset.parentId||'');selectedMindNode.remove();selectedMindNode=null;drawMindmapLines();});
$('saveMindmap')?.addEventListener('click',saveMap);$('clearMindmap')?.addEventListener('click',()=>{if(confirm('Réinitialiser la carte actuelle ?')){localStorage.removeItem('sirafiq-mindmap-v9');sceneReset();newManualMap();}});
function setMindZoom(v){mindZoom=Math.max(.6,Math.min(1.6,v));if(mapScene())mapScene().style.transform=`scale(${mindZoom})`;$('mindZoomLabel').textContent=`${Math.round(mindZoom*100)} %`;}
$('mindZoomIn')?.addEventListener('click',()=>setMindZoom(mindZoom+.1));$('mindZoomOut')?.addEventListener('click',()=>setMindZoom(mindZoom-.1));$('mindCenter')?.addEventListener('click',()=>{setMindZoom(1);layoutMindmap('radial');});mapCanvas()?.addEventListener('click',()=>selectMindNode(null));
setMapMode('manual');restoreMap();
window.addEventListener('hashchange',()=>{if(location.hash==='#cartes')setTimeout(ensureMapReady,50);});
window.addEventListener('resize',()=>{if(location.hash==='#cartes')drawMindmapLines();});

// ===== Progression / agent local =====
async function refreshLearningProgress(){
  try{
    const [reviews,events]=await Promise.all([listReviewItems(),listLearningEvents().catch(()=>[])]);const now=Date.now();
    const due=reviews.filter(r=>!r.nextReview||new Date(r.nextReview).getTime()<=now);
    const fragile=reviews.filter(r=>['fragile','à revoir'].includes(String(r.mastery||'').toLowerCase()));
    const acquired=reviews.filter(r=>String(r.mastery||'').toLowerCase()==='acquis');
    const solid=reviews.filter(r=>['solide','maîtrisé'].includes(String(r.mastery||'').toLowerCase()));
    if($('reviewDueMetric'))$('reviewDueMetric').textContent=due.length;if($('reviewFragileMetric'))$('reviewFragileMetric').textContent=fragile.length;if($('reviewAcquiredMetric'))$('reviewAcquiredMetric').textContent=acquired.length;if($('reviewSolidMetric'))$('reviewSolidMetric').textContent=solid.length;
    const priority=due[0]||fragile[0]||reviews[0]||null;currentAgentPriority=priority||currentAgentPriority;
    if($('agentProgressSummary')) $('agentProgressSummary').textContent = reviews.length
      ? `${reviews.length} élément${reviews.length>1?'s':''} suivi${reviews.length>1?'s':''}. ${due.length?`${due.length} doit revenir aujourd’hui.`:'Rien n’est en retard.'} ${fragile.length?`${fragile.length} reste${fragile.length>1?'nt':''} fragile${fragile.length>1?'s':''}.`:''}`
      : `Aucune maîtrise n’est encore enregistrée. Sirāfiq attend vos auto-évaluations et vos pratiques au lieu de fabriquer un score.`;
    if($('agentRecommendations')){
      const rec=[];if(priority)rec.push(`Priorité : ${priority.title} — ${priority.mastery||'à revoir'}.`);if(!priority&&events.length)rec.push(`${events.length} pratique${events.length>1?'s':''} enregistrée${events.length>1?'s':''} : continuez une courte séance.`);if(!rec.length)rec.push('Commencez par une technique de mémorisation, un exercice oral ou une séance de geste.');
      $('agentRecommendations').innerHTML=rec.map(x=>`<span>${esc(x)}</span>`).join('');
    }
    const queue=$('reviewQueue');if(queue){const ordered=[...reviews].sort((a,b)=>new Date(a.nextReview||0)-new Date(b.nextReview||0)).slice(0,8);const fmt=d=>!d||new Date(d).getTime()<=now?'Aujourd’hui':new Date(d).toLocaleDateString('fr-FR',{day:'2-digit',month:'short'});queue.innerHTML=ordered.length?ordered.map(item=>`<article class="review-item"><span class="review-dot"></span><div><strong>${esc(item.title||'Révision')}</strong><small>${esc(item.area||item.domain||'')} · ${esc(item.mastery||'à revoir')}</small></div><span class="review-date">${fmt(item.nextReview)}</span></article>`).join(''):'<p class="review-empty">Aucune révision planifiée. Commencez une pratique et évaluez votre maîtrise.</p>';}
  }catch(error){console.warn('Progression pédagogique indisponible',error);}
}

window.addEventListener('sirafiq:data-changed',()=>{refreshHomeMetrics();refreshLearningProgress();refreshMemorySupportPicker();});
window.addEventListener('hashchange',()=>{if(location.hash==='#memoriser')refreshMemorySupportPicker();});
refreshHomeMetrics();refreshLearningProgress();
