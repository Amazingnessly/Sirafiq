import { countSupports, countRecordings, countWritings, listReviewItems, upsertReviewItem } from './db.js?v=71';

const $ = id => document.getElementById(id);
const prefersReducedMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
const isoDay = days => { const d = new Date(); d.setDate(d.getDate()+days); d.setHours(8,0,0,0); return d.toISOString(); };

let dueItems = [];
async function refreshHomeMetrics() {
  try {
    const [supports, recordings, writings, reviews] = await Promise.all([
      countSupports(), countRecordings(), countWritings(), listReviewItems()
    ]);
    const practices = recordings + writings;
    const now = Date.now();
    dueItems = reviews.filter(r => !r.nextReview || new Date(r.nextReview).getTime() <= now).sort((a,b)=>new Date(a.nextReview||0)-new Date(b.nextReview||0));
    if ($('todayPractices')) $('todayPractices').textContent = practices;
    if ($('todayDue')) $('todayDue').textContent = dueItems.length;
    if ($('todayMinutes')) $('todayMinutes').textContent = dueItems.length >= 5 ? '15' : dueItems.length ? '10' : '8';
    const next = dueItems[0];
    if ($('coachNextTitle')) $('coachNextTitle').textContent = next?.title || (supports ? 'Une courte séance de consolidation' : 'Commencer par un premier exercice');
    if ($('coachNextReason')) $('coachNextReason').textContent = next
      ? `Cette notion est prévue aujourd’hui · niveau ${next.mastery || 'à revoir'}.`
      : supports ? 'Aucune révision n’est en retard. Faites une pratique courte pour nourrir le programme.' : 'Commencez par quelques exercices de français ; Sirāfiq construira ensuite votre calendrier.';
    if ($('todayLead')) $('todayLead').textContent = dueItems.length
      ? `${dueItems.length} révision${dueItems.length>1?'s':''} arrive${dueItems.length>1?'nt':''} à échéance. Commencez par elles.`
      : 'Rien d’urgent : une petite pratique suffit pour maintenir l’élan.';
  } catch (error) { console.warn('Programme de révision indisponible', error); }
}
$('startTodaySession')?.addEventListener('click', () => {
  const next = dueItems[0];
  location.hash = next?.domain === 'francais' ? '#francais' : next?.domain === 'ecriture' ? '#ecrire' : next?.domain === 'prononciation' ? '#prononcer' : '#francais';
});

document.querySelectorAll('[data-focus]').forEach(button => {
  button.addEventListener('click', () => {
    const focus = button.dataset.focus; location.hash = '#memoriser';
    setTimeout(() => { const target = focus === 'quran' ? $('quranHub') : focus === 'vocab' ? $('vocabHub') : null; target?.scrollIntoView({ behavior: prefersReducedMotion()?'auto':'smooth', block:'start' }); },120);
  });
});
document.querySelectorAll('[data-preset-category]').forEach(button => button.addEventListener('click',()=>{
  const filter=$('supportCategoryFilter'); if(!filter)return; filter.value=button.dataset.presetCategory||''; filter.dispatchEvent(new Event('change',{bubbles:true})); document.querySelector('.library-toolbar')?.scrollIntoView({behavior:'smooth',block:'start'});
}));

const writingLessons = {
  gestes:['Boucles régulières : 𝓁 𝓁 𝓁','Gardez une hauteur stable et un mouvement continu. Cherchez la régularité avant la vitesse.'],
  lettres:['Famille des boucles : e · l · b · h · k','Travaillez des familles de gestes proches avant de changer de forme.'],
  liaisons:['Lier sans lever : le · elle · belle','Conservez la continuité du mouvement et des espacements réguliers.'],
  mots:['Écrire : calme · lumière · apprendre','Visez une taille cohérente et des espaces perceptibles entre les mots.'],
  phrases:['« Je progresse avec régularité. »','Préservez la lisibilité du début à la fin de la ligne.'],
  fluidite:['Écrire 30 secondes sans sacrifier la lisibilité','Accélérez seulement si la forme et l’espacement restent stables.']
};
document.querySelectorAll('[data-writing-lesson]').forEach(button=>button.addEventListener('click',()=>{
  document.querySelectorAll('[data-writing-lesson]').forEach(b=>b.classList.toggle('active',b===button));
  const [prompt,tip]=writingLessons[button.dataset.writingLesson]||writingLessons.gestes;
  $('writingPracticePrompt').textContent=prompt; $('writingPracticeTip').textContent=tip;
}));

const pronunciationLessons = {
  sons:['Tu — tout — rue — roue','Distinguez /y/ et /u/. Cherchez une différence nette et intelligible, sans accélérer.'],
  contrastes:['peu — peur · beau — bord · été — était','Travaillez une opposition sonore à la fois.'],
  rythme:['Je voudrais / vous présenter / mon travail.','Découpez la phrase en groupes de sens et gardez des syllabes claires.'],
  liaisons:['les amis · vous avez · un grand arbre','Travaillez la continuité sans ajouter de liaisons artificielles.'],
  expression:['« Aujourd’hui, je vais expliquer une idée importante. »','Travaillez l’accentuation, la mélodie et les pauses pour rendre le message clair.']
};
document.querySelectorAll('[data-pron-lesson]').forEach(button=>button.addEventListener('click',()=>{
  document.querySelectorAll('[data-pron-lesson]').forEach(b=>b.classList.toggle('active',b===button));
  const [prompt,tip]=pronunciationLessons[button.dataset.pronLesson]||pronunciationLessons.sons;
  $('pronunciationPrompt').textContent=prompt; $('pronunciationTip').textContent=tip;
  const title=$('recordTitle'); if(title&&!title.value.trim()) title.value=`Exercice — ${button.textContent.trim()}`;
}));

// ===== Studio de cartes mentales =====
let mapMode='manual', mindZoom=1, selectedMindNode=null, nodeCounter=0;
const mapScene=()=>$('mindmapScene'); const mapCanvas=()=>$('mindmapCanvas');
function cleanIdea(text,max=64){ const c=String(text||'').replace(/^[-–—•👉☝️\s]+/u,'').replace(/\s+/g,' ').trim(); if(c.length<=max)return c; return `${c.slice(0,max).replace(/\s+\S*$/,'')}…`; }
function sourceIdeas(text){
  const raw=String(text||'').split(/\n+|(?<=[.!?;:])\s+/).map(x=>cleanIdea(x,76)).filter(x=>x.length>3);
  const seen=new Set(); return raw.filter(x=>{const k=x.toLocaleLowerCase('fr');if(seen.has(k))return false;seen.add(k);return true;}).slice(0,9);
}
function nodeHtml(id,label,parent,kind='branch'){ return `<button class="mind-node ${kind==='root'?'root-node':'branch-node'}" type="button" data-node-id="${id}" data-parent-id="${parent||''}" dir="${/[\u0600-\u06FF]/.test(label)?'rtl':'auto'}">${label}</button>`; }
function selectMindNode(node){ document.querySelectorAll('.mind-node.selected').forEach(n=>n.classList.remove('selected')); selectedMindNode=node||null; node?.classList.add('selected'); }
function sceneReset(){ const scene=mapScene(); if(!scene)return; scene.innerHTML='<svg class="mindmap-lines" aria-hidden="true"></svg>'; nodeCounter=0; selectedMindNode=null; }
function addNode(label,parentId='',kind='branch',x=null,y=null){
  const scene=mapScene(), canvas=mapCanvas(); if(!scene||!canvas)return null;
  const id=`n${++nodeCounter}`; scene.insertAdjacentHTML('beforeend',nodeHtml(id,cleanIdea(label)||'Nouvelle idée',parentId,kind));
  const node=scene.querySelector(`[data-node-id="${id}"]`); const idx=scene.querySelectorAll('.mind-node').length-1;
  const parentNode=parentId ? scene.querySelector(`[data-node-id=\"${parentId}\"]`) : null; const depth=kind==='root'?0:(Number(parentNode?.dataset.depth||0)+1); node.dataset.depth=String(depth); if(depth>1) node.classList.add('depth-2');
  node.style.left=`${x ?? (kind==='root'?canvas.clientWidth/2-95:55+(idx%3)*205)}px`; node.style.top=`${y ?? (kind==='root'?canvas.clientHeight/2-38:90+Math.floor(idx/3)*110)}px`;
  makeDraggable(node,canvas); bindNode(node); return node;
}
function newManualMap(){ sceneReset(); const root=addNode('Idée centrale','', 'root', Math.max(20,mapCanvas().clientWidth/2-95),Math.max(70,mapCanvas().clientHeight/2-38)); selectMindNode(root); drawMindmapLines(); }
function renderAutoMap(text){
  const ideas=sourceIdeas(text); if(!ideas.length){$('mindmapSaveStatus').textContent='Ajoutez un texte un peu plus long.';return;}
  sceneReset(); const canvas=mapCanvas(); const root=addNode(ideas[0],'','root',canvas.clientWidth/2-95,canvas.clientHeight/2-38);
  const branches=ideas.slice(1,8); const rx=Math.min(360,canvas.clientWidth*.34), ry=Math.min(245,canvas.clientHeight*.31);
  branches.forEach((idea,i)=>{const a=Math.PI*2*i/Math.max(1,branches.length)-Math.PI/2; addNode(idea,root.dataset.nodeId,'branch',canvas.clientWidth/2+Math.cos(a)*rx-90,canvas.clientHeight/2+Math.sin(a)*ry-32);});
  selectMindNode(root); drawMindmapLines(); $('mindmapSaveStatus').textContent='Structure créée. Tout reste modifiable.';
}
function bindNode(node){
  node.addEventListener('click',e=>{e.stopPropagation();selectMindNode(node);});
  node.addEventListener('dblclick',()=>renameSelected());
}
function renameSelected(){ if(!selectedMindNode)return; const next=prompt('Renommer cette idée',selectedMindNode.textContent.trim()); if(next?.trim()){selectedMindNode.textContent=cleanIdea(next,90);selectedMindNode.setAttribute('dir',/[\u0600-\u06FF]/.test(next)?'rtl':'auto');drawMindmapLines();} }
function drawMindmapLines(){
  const canvas=mapCanvas(), scene=mapScene(), svg=scene?.querySelector('.mindmap-lines'); if(!canvas||!scene||!svg)return;
  const cr=canvas.getBoundingClientRect(); svg.setAttribute('viewBox',`0 0 ${canvas.clientWidth} ${canvas.clientHeight}`);
  svg.innerHTML=[...scene.querySelectorAll('.mind-node[data-parent-id]')].filter(n=>n.dataset.parentId).map(node=>{
    const parent=scene.querySelector(`[data-node-id="${node.dataset.parentId}"]`); if(!parent)return'';
    const pr=parent.getBoundingClientRect(), nr=node.getBoundingClientRect(); const x1=pr.left-cr.left+pr.width/2,y1=pr.top-cr.top+pr.height/2,x2=nr.left-cr.left+nr.width/2,y2=nr.top-cr.top+nr.height/2;
    return `<path d="M ${x1} ${y1} C ${(x1+x2)/2} ${y1}, ${(x1+x2)/2} ${y2}, ${x2} ${y2}"/>`;
  }).join('');
}
function makeDraggable(node,canvas){let active=false,dx=0,dy=0;node.addEventListener('pointerdown',e=>{active=true;node.setPointerCapture?.(e.pointerId);const r=node.getBoundingClientRect();dx=e.clientX-r.left;dy=e.clientY-r.top;e.preventDefault();});node.addEventListener('pointermove',e=>{if(!active)return;const cr=canvas.getBoundingClientRect();const x=Math.max(8,Math.min(canvas.clientWidth-node.offsetWidth-8,e.clientX-cr.left-dx));const y=Math.max(8,Math.min(canvas.clientHeight-node.offsetHeight-8,e.clientY-cr.top-dy));node.style.left=`${x}px`;node.style.top=`${y}px`;drawMindmapLines();});const stop=()=>active=false;node.addEventListener('pointerup',stop);node.addEventListener('pointercancel',stop);}
function serializeMap(){ return [...mapScene().querySelectorAll('.mind-node')].map(n=>({id:n.dataset.nodeId,parentId:n.dataset.parentId||'',label:n.textContent,left:n.style.left,top:n.style.top,root:n.classList.contains('root-node')})); }
function saveMap(){ const payload={nodes:serializeMap(),source:$('mindmapSource')?.value||'',mode:mapMode,savedAt:new Date().toISOString()}; localStorage.setItem('sirafiq-mindmap-v7',JSON.stringify(payload)); $('mindmapSaveStatus').textContent='Carte enregistrée localement ✓'; }
function restoreMap(){ try{const data=JSON.parse(localStorage.getItem('sirafiq-mindmap-v7')||'null');if(!data?.nodes?.length)return false;sceneReset();data.nodes.forEach(item=>{const node=addNode(item.label,item.parentId,item.root?'root':'branch');node.dataset.nodeId=item.id;node.style.left=item.left;node.style.top=item.top;nodeCounter=Math.max(nodeCounter,Number(item.id.replace(/\D/g,''))||0);}); if($('mindmapSource'))$('mindmapSource').value=data.source||''; drawMindmapLines();return true;}catch{return false;} }
function setMapMode(mode){mapMode=mode;document.querySelectorAll('[data-map-mode]').forEach(b=>b.classList.toggle('active',b.dataset.mapMode===mode));$('mapAutoPanel').hidden=mode!=='auto';$('mapModeHelp').textContent=mode==='auto'?'Collez votre texte : Sirāfiq crée une première structure sans inventer de contenu.':'Commencez par une idée centrale, puis ajoutez des branches et sous-branches.';if(mode==='manual'&&!mapScene()?.querySelector('.mind-node'))newManualMap();}
document.querySelectorAll('[data-map-mode]').forEach(b=>b.addEventListener('click',()=>setMapMode(b.dataset.mapMode)));
$('newManualMap')?.addEventListener('click',newManualMap); $('generateMindmap')?.addEventListener('click',()=>renderAutoMap($('mindmapSource')?.value));
$('addMindNode')?.addEventListener('click',()=>{if(!mapScene().querySelector('.mind-node'))newManualMap();const root=mapScene().querySelector('.root-node');const node=addNode('Nouvelle branche',root?.dataset.nodeId||'', 'branch');selectMindNode(node);drawMindmapLines();});
$('addMindChild')?.addEventListener('click',()=>{if(!selectedMindNode){$('mindmapSaveStatus').textContent='Sélectionnez d’abord un nœud.';return;}const node=addNode('Sous-idée',selectedMindNode.dataset.nodeId,'branch',Math.min(mapCanvas().clientWidth-190,selectedMindNode.offsetLeft+190),Math.min(mapCanvas().clientHeight-70,selectedMindNode.offsetTop+95));selectMindNode(node);drawMindmapLines();});
$('renameMindNode')?.addEventListener('click',renameSelected); $('deleteMindNode')?.addEventListener('click',()=>{if(!selectedMindNode||selectedMindNode.classList.contains('root-node'))return;const id=selectedMindNode.dataset.nodeId;[...mapScene().querySelectorAll(`[data-parent-id="${id}"]`)].forEach(n=>n.dataset.parentId=selectedMindNode.dataset.parentId||'');selectedMindNode.remove();selectedMindNode=null;drawMindmapLines();});
$('saveMindmap')?.addEventListener('click',saveMap); $('clearMindmap')?.addEventListener('click',()=>{if(confirm('Réinitialiser la carte actuelle ?')){localStorage.removeItem('sirafiq-mindmap-v7');mapScene().innerHTML='<p class="mindmap-placeholder">Touchez « Nouvelle carte » pour commencer librement.</p>';selectedMindNode=null;}});
function setMindZoom(v){mindZoom=Math.max(.6,Math.min(1.6,v));mapScene()&&(mapScene().style.transform=`scale(${mindZoom})`);$('mindZoomLabel').textContent=`${Math.round(mindZoom*100)} %`;}
$('mindZoomIn')?.addEventListener('click',()=>setMindZoom(mindZoom+.1));$('mindZoomOut')?.addEventListener('click',()=>setMindZoom(mindZoom-.1));$('mindCenter')?.addEventListener('click',()=>setMindZoom(1));window.addEventListener('resize',drawMindmapLines);mapCanvas()?.addEventListener('click',()=>selectMindNode(null));
setMapMode('manual'); restoreMap();

// ===== Français : banque d'exercices + auto-planification =====
const F=(title,prompt,answer,why)=>({title,prompt,answer,why});
const frenchBank={
 fondations:{
  lecture:[
   F('Repérer l’essentiel','Lisez : « Le matin, Nora prépare son sac avant de prendre le bus. » Sans relire, que fait Nora et quand ?','Nora prépare son sac le matin avant de prendre le bus.','On vérifie ici la compréhension explicite et la capacité à reformuler brièvement.'),
   F('Trouver l’ordre des actions','« Sami ferme son cahier, range son stylo puis quitte la salle. » Remettez les trois actions dans l’ordre.','1. ferme son cahier ; 2. range son stylo ; 3. quitte la salle.','Repérer les connecteurs aide à reconstruire la chronologie d’un texte.'),
   F('Comprendre un pronom','« Léa retrouve Inès. Elle lui rend son livre. » À qui renvoie « elle » ?','« Elle » renvoie à Léa.','Identifier les reprises pronominales évite les contresens.')],
  vocabulaire:[
   F('Choisir le mot précis','Complétez : « Après plusieurs essais, son geste devient plus ____ et régulier. »','fluide','Un mot précis améliore la compréhension et évite les formulations vagues.'),
   F('Comprendre par le contexte','Dans « Le chemin est étroit : deux personnes passent difficilement côte à côte », que signifie « étroit » ?','Peu large.','Le contexte permet souvent d’inférer le sens d’un mot inconnu.'),
   F('Construire une famille','Donnez deux mots de la même famille que « lire ».','lecture, lecteur, relire, lisible…','Les familles de mots renforcent le lexique et l’orthographe.')],
  orthographe:[
   F('Formes fréquentes','Écrivez correctement : « aujourd hui » et « beaucoup ».','aujourd’hui ; beaucoup','Certaines formes très fréquentes gagnent à être mémorisées directement.'),
   F('Accord simple','Corrigez : « les petite maison ».','les petites maisons','Le déterminant, le nom et l’adjectif s’accordent dans le groupe nominal.'),
   F('Homophones fréquents','Complétez : « Il ___ un livre ___ la main. » avec a/à.','Il a un livre à la main.','« a » est une forme du verbe avoir ; « à » est une préposition.')],
  grammaire:[
   F('Sujet et verbe','Dans « Les élèves relisent leur phrase », identifiez le sujet et le verbe.','Sujet : les élèves. Verbe : relisent.','Repérer le noyau sujet-verbe aide à comprendre la structure de la phrase.'),
   F('Type de phrase','« Ferme la porte, s’il te plaît. » est-elle déclarative, interrogative ou injonctive ?','Injonctive.','Le type de phrase dépend de l’intention de communication.'),
   F('Temps verbal','Dans « Demain, nous partirons tôt », à quel temps est « partirons » ?','Futur simple.','Le temps verbal situe l’action dans le temps.')],
  expression:[
   F('Phrase complète','Écrivez une phrase complète pour expliquer une habitude qui vous aide à apprendre.','Réponse personnelle : majuscule, idée complète, verbe conjugué, ponctuation.','Une phrase claire exprime une idée complète et grammaticalement structurée.'),
   F('Enrichir une phrase','Enrichissez : « Le chat dort. » avec un lieu et un moment.','Ex. « Le chat dort sur le canapé cet après-midi. »','Les compléments précisent les circonstances sans alourdir inutilement.'),
   F('Relier deux idées','Reliez : « Je relis mon cours. Je vérifie ce que j’ai oublié. » avec un connecteur.','Ex. « Je relis mon cours puis je vérifie ce que j’ai oublié. »','Les connecteurs rendent la progression du texte plus lisible.')]
 },
 consolidation:{
  lecture:[
   F('Reformuler sans copier','Reformulez : « La répétition espacée consiste à revenir sur une connaissance après un délai. »','Ex. « On revoit une notion après avoir laissé passer un certain temps. »','Reformuler montre que le sens est compris, pas simplement reconnu.'),
   F('Faire une inférence','« Le sol est mouillé et des parapluies sèchent dans l’entrée. » Que peut-on raisonnablement déduire ?','Il a probablement plu.','Une inférence relie plusieurs indices sans inventer au-delà du texte.'),
   F('Identifier l’idée directrice','« Lire vite n’est utile que si l’on comprend. Un bon lecteur adapte donc sa vitesse à la difficulté du texte. » Quelle est l’idée principale ?','La vitesse de lecture doit être adaptée pour préserver la compréhension.','L’idée directrice résume la relation entre les informations du passage.')],
  vocabulaire:[
   F('Nuancer un verbe','Donnez un synonyme adapté de « améliorer » dans « améliorer un texte ».','corriger, enrichir, perfectionner…','Le meilleur synonyme dépend toujours du contexte.'),
   F('Distinguer des nuances','Quelle différence faites-vous entre « regarder » et « observer » ?','Observer suppose une attention plus soutenue et méthodique.','Les nuances lexicales rendent l’expression plus précise.'),
   F('Mot abstrait','Transformez « quelqu’un qui est patient » en un nom abstrait.','la patience','Passer d’une qualité à un nom abstrait enrichit les possibilités de formulation.')],
  orthographe:[
   F('Accord du groupe nominal','Corrigez : « des phrase claire et précise ».','des phrases claires et précises','Les adjectifs s’accordent avec le nom qu’ils qualifient.'),
   F('Participe passé avec être','Corrigez : « Elles sont arrivé tôt. »','Elles sont arrivées tôt.','Avec être, le participe passé s’accorde avec le sujet.'),
   F('Infinitif ou participe','Choisissez : « Il a décidé de réviser / révisé ce soir. »','réviser','Après « décider de », on emploie l’infinitif.')],
  grammaire:[
   F('Négation','Transformez « Il relit son texte. » à la forme négative.','Il ne relit pas son texte.','La négation encadre généralement le verbe conjugué.'),
   F('Expansion du nom','Dans « un livre passionnant sur les volcans », relevez deux expansions de « livre ».','passionnant ; sur les volcans','Les expansions enrichissent le nom et apportent des précisions.'),
   F('Coordination','Dans « Il lit mais il ne prend pas de notes », quel mot coordonne les deux propositions ?','mais','Les conjonctions de coordination expriment une relation logique.')],
  expression:[
   F('Justifier une idée','En 2 ou 3 phrases, expliquez pourquoi se tester peut être plus utile que relire passivement.','Réponse attendue : une idée + une raison + formulation claire.','Justifier oblige à expliciter le lien entre une affirmation et sa raison.'),
   F('Paragraphe cohérent','Écrivez trois phrases sur une méthode de travail en utilisant « d’abord », « ensuite », « enfin ».','Réponse personnelle structurée par les trois connecteurs.','Les connecteurs organisent la progression d’un paragraphe.'),
   F('Réécrire pour préciser','Améliorez : « J’ai fait un truc pour mieux apprendre. »','Ex. « J’ai préparé des cartes de révision pour mieux mémoriser le vocabulaire. »','Remplacer les mots vagues rend le texte plus informatif.')]
 },
 maitrise:{
  lecture:[
   F('Idée et preuve','Écrivez une idée principale puis un élément qui pourrait la justifier dans un texte argumentatif sur les révisions.','Séparez clairement l’affirmation de l’élément qui la soutient.','Une argumentation solide distingue thèse, argument et preuve ou exemple.'),
   F('Point de vue implicite','« Encore une réunion qui aurait pu tenir en trois lignes. » Quel jugement le locuteur porte-t-il ?','Il juge la réunion inutilement longue ou inefficace.','Le sens implicite se construit à partir du choix des mots et du ton.'),
   F('Synthèse de deux idées','Résumez en une phrase : « La pratique régulière consolide les automatismes. Des pauses espacées évitent aussi la saturation. »','Une pratique régulière et espacée consolide les acquis sans saturer l’apprenant.','La synthèse combine plusieurs informations sans les juxtaposer mécaniquement.')],
  vocabulaire:[
   F('Précision lexicale','Remplacez « faire » : « faire une analyse », « faire un résumé ».','mener/réaliser une analyse ; rédiger/produire un résumé','Les verbes précis rendent le style plus professionnel et plus lisible.'),
   F('Registre adapté','Remplacez « c’est nul » par une formulation adaptée à une critique argumentée.','Ex. « Cette solution présente plusieurs limites. »','Adapter le registre permet d’exprimer un jugement sans perdre en précision.'),
   F('Polysémie','Expliquez deux sens du mot « clé ».','Objet qui ouvre une serrure ; élément essentiel permettant de comprendre/résoudre.','Identifier la polysémie aide à interpréter le mot selon son contexte.')],
  orthographe:[
   F('Accords complexes','Corrigez : « Les notions qu’il a réviser sont rester fragiles. »','Les notions qu’il a révisées sont restées fragiles.','Il faut distinguer l’accord du participe avec être et les règles du participe avec avoir.'),
   F('Quelque / quel que','Complétez : « ___ soit la difficulté, continuez. »','Quelle que soit la difficulté…','« Quel que » s’accorde avec le nom auquel il se rapporte lorsqu’il précède être.'),
   F('Ponctuation du discours','Ponctuez : « Il répondit je reviendrai demain ».','Il répondit : « Je reviendrai demain. »','La ponctuation structure le discours rapporté et facilite la lecture.')],
  grammaire:[
   F('Subordonnée circonstancielle','Dans « Lorsque la séance se termine, je note ce qui reste fragile », identifiez la subordonnée circonstancielle.','Lorsque la séance se termine.','Elle situe dans le temps l’action de la proposition principale.'),
   F('Valeur du conditionnel','Dans « Je pourrais relire ce passage », quelle nuance apporte « pourrais » ?','Une possibilité ou une suggestion atténuée.','Le mode verbal participe au sens pragmatique de l’énoncé.'),
   F('Transformation passive','Mettez au passif : « Le professeur corrige les copies. »','Les copies sont corrigées par le professeur.','La transformation modifie le point de vue sans changer les rôles sémantiques.')],
  expression:[
   F('Mini-argumentation','Rédigez 4 phrases : thèse, argument, exemple, conclusion sur une méthode de révision.','Vérifiez la progression logique et les connecteurs.','Une argumentation courte reste convaincante si chaque phrase remplit une fonction claire.'),
   F('Condenser sans appauvrir','Réduisez cette idée en une phrase : « Je relis, puis je ferme le livre et j’essaie de restituer, car cela me montre ce que je ne sais pas encore. »','Ex. « Après la relecture, je restitue sans support afin d’identifier mes lacunes. »','La condensation conserve les relations logiques tout en supprimant les répétitions.'),
   F('Réviser son style','Réécrivez : « Il y a beaucoup de choses qui font que le texte est difficile à comprendre. »','Ex. « Plusieurs facteurs rendent le texte difficile à comprendre. »','La révision stylistique réduit les tournures lourdes et renforce la précision.')]
 }};
let frenchLevel='fondations', frenchSkill='lecture', frenchIndex=0, currentFrenchKey='';
function levelLabel(v){return v==='fondations'?'Fondations':v==='consolidation'?'Consolidation':'Maîtrise';}
function currentFrench(){return frenchBank[frenchLevel]?.[frenchSkill]?.[frenchIndex%frenchBank[frenchLevel][frenchSkill].length];}
function renderFrenchExercise(){const arr=frenchBank[frenchLevel]?.[frenchSkill]||[];const ex=currentFrench();if(!ex)return;currentFrenchKey=`fr:${frenchLevel}:${frenchSkill}:${frenchIndex%arr.length}`;$('frenchExerciseMeta').textContent=`${levelLabel(frenchLevel)} · ${frenchSkill[0].toUpperCase()+frenchSkill.slice(1)}`;$('frenchExerciseNumber').textContent=`${frenchIndex%arr.length+1} / ${arr.length}`;$('frenchExerciseTitle').textContent=ex.title;$('frenchExercisePrompt').textContent=ex.prompt;$('frenchAnswer').value='';$('frenchFeedback').textContent='';$('frenchMastery').hidden=true;}
document.querySelectorAll('[data-french-level]').forEach(b=>b.addEventListener('click',()=>{frenchLevel=b.dataset.frenchLevel;document.querySelectorAll('[data-french-level]').forEach(x=>x.classList.toggle('active',x===b));frenchIndex=0;renderFrenchExercise();}));
document.querySelectorAll('[data-french-skill]').forEach(b=>b.addEventListener('click',()=>{frenchSkill=b.dataset.frenchSkill;document.querySelectorAll('[data-french-skill]').forEach(x=>x.classList.toggle('active',x===b));frenchIndex=0;renderFrenchExercise();}));
$('checkFrenchExercise')?.addEventListener('click',()=>{const ex=currentFrench();$('frenchFeedback').innerHTML=`<strong>Repère de correction</strong><p>${ex.answer}</p><small>${ex.why}</small>`;$('frenchMastery').hidden=false;});
$('nextFrenchExercise')?.addEventListener('click',()=>{frenchIndex++;renderFrenchExercise();});
const masteryPlan={again:{days:1,label:'à revoir'},fragile:{days:2,label:'fragile'},acquis:{days:7,label:'acquis'},solide:{days:21,label:'solide'}};
document.querySelectorAll('[data-mastery]').forEach(button=>button.addEventListener('click',async()=>{
  const plan=masteryPlan[button.dataset.mastery]; const ex=currentFrench(); if(!plan||!ex)return;
  await upsertReviewItem({key:currentFrenchKey,title:ex.title,domain:'francais',area:frenchSkill,level:frenchLevel,mastery:plan.label,nextReview:isoDay(plan.days),intervalDays:plan.days,lastResult:button.dataset.mastery});
  $('frenchFeedback').insertAdjacentHTML('beforeend',`<div class="scheduled-note">Reprogrammé dans ${plan.days} jour${plan.days>1?'s':''} ✓</div>`); $('frenchMastery').hidden=true; window.dispatchEvent(new CustomEvent('sirafiq:data-changed')); setTimeout(()=>{$('nextFrenchExercise').click();},650);
}));
renderFrenchExercise();


async function refreshLearningProgress(){
  try {
    const reviews = await listReviewItems();
    const now = Date.now();
    const due = reviews.filter(r => !r.nextReview || new Date(r.nextReview).getTime() <= now);
    const fragile = reviews.filter(r => String(r.mastery||'').toLowerCase() === 'fragile' || String(r.mastery||'').toLowerCase() === 'à revoir');
    const acquired = reviews.filter(r => String(r.mastery||'').toLowerCase() === 'acquis');
    const solid = reviews.filter(r => String(r.mastery||'').toLowerCase() === 'solide');
    if($('reviewDueMetric')) $('reviewDueMetric').textContent=due.length;
    if($('reviewFragileMetric')) $('reviewFragileMetric').textContent=fragile.length;
    if($('reviewAcquiredMetric')) $('reviewAcquiredMetric').textContent=acquired.length;
    if($('reviewSolidMetric')) $('reviewSolidMetric').textContent=solid.length;
    const queue=$('reviewQueue'); if(!queue)return;
    const ordered=[...reviews].sort((a,b)=>new Date(a.nextReview||0)-new Date(b.nextReview||0)).slice(0,6);
    if(!ordered.length){ queue.innerHTML='<p class="review-empty">Aucune révision planifiée pour l’instant. Commencez par quelques exercices de français.</p>'; return; }
    const fmt=d=>{ if(!d)return "Aujourd’hui"; const date=new Date(d); if(date.getTime()<=now)return "Aujourd’hui"; return date.toLocaleDateString('fr-FR',{day:'2-digit',month:'short'}); };
    queue.innerHTML=ordered.map(item=>`<article class="review-item"><span class="review-dot" aria-hidden="true"></span><div><strong>${String(item.title||'Révision').replace(/[<>&]/g,c=>({'<':'&lt;','>':'&gt;','&':'&amp;'}[c]))}</strong><small>${item.area ? String(item.area).replace(/^./,c=>c.toUpperCase())+' · ' : ''}${item.mastery||'à revoir'}</small></div><span class="review-date">${fmt(item.nextReview)}</span></article>`).join('');
  } catch(error){ console.warn('Progression pédagogique indisponible',error); }
}

window.addEventListener('sirafiq:data-changed',()=>{refreshHomeMetrics();refreshLearningProgress();}); refreshHomeMetrics(); refreshLearningProgress();
