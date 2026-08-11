import { addWriting, listWritings, deleteWriting, addLearningEvent } from './db.js?v=111';

const $=id=>document.getElementById(id);
const notebook=$('writingNotebook'), scroll=$('writingNotebookScroll'), studio=$('writingStudio');
const clearButton=$('clearWriting'), undoButton=$('undoWriting'), saveButton=$('saveWriting'), deleteLastButton=$('deleteLastWriting'), boardButton=$('toggleWritingBoard'), addPageButton=$('addWritingPage'), deletePageButton=$('deleteWritingPage');
const penButton=$('penTool'), highlighterButton=$('highlighterTool'), eraserButton=$('eraserTool'), moveButton=$('moveTool');
const status=$('writingStatus'), gallery=$('writingGallery'), view=$('view-ecrire');
let pages=[{strokes:[]}], activePage=0, drawing=false, pointerId=null, currentStroke=null;
let tool='pen', ink='#7d0c2b', width=4, galleryUrls=[];
let paperMode=localStorage.getItem('sirafiq-writing-paper')||'lined';

const setStatus=m=>{if(status)status.textContent=m;};
const canvases=()=>[...document.querySelectorAll('[data-writing-canvas]')];
const pageEls=()=>[...document.querySelectorAll('[data-writing-page]')];

function ensurePagesData(count){while(pages.length<count)pages.push({strokes:[]});}
function pageIndexForCanvas(canvas){return Number(canvas?.dataset.writingCanvas||0);}
function rect(canvas){return canvas?.getBoundingClientRect()||{width:0,height:0,left:0,top:0};}
function point(event,canvas){const r=rect(canvas);if(!r.width||!r.height)return null;return{x:Math.max(0,Math.min(1,(event.clientX-r.left)/r.width)),y:Math.max(0,Math.min(1,(event.clientY-r.top)/r.height))};}
function contextFor(canvas){return canvas?.getContext('2d')||null;}

function drawStroke(ctx,canvas,stroke){
  if(!ctx||!stroke?.points?.length)return;const r=rect(canvas);if(!r.width||!r.height)return;
  ctx.save();ctx.beginPath();
  if(stroke.tool==='eraser'){ctx.globalCompositeOperation='destination-out';ctx.strokeStyle='#000';ctx.lineWidth=Math.max(18,stroke.width*4);ctx.globalAlpha=1;}
  else{ctx.globalCompositeOperation='source-over';ctx.strokeStyle=stroke.color||'#7d0c2b';ctx.lineWidth=stroke.tool==='highlighter'?Math.max(12,stroke.width*3):stroke.width;ctx.globalAlpha=stroke.tool==='highlighter'?.22:1;}
  ctx.lineCap='round';ctx.lineJoin='round';
  stroke.points.forEach((p,i)=>{const x=p.x*r.width,y=p.y*r.height;i?ctx.lineTo(x,y):ctx.moveTo(x,y);});
  if(stroke.points.length===1){const p=stroke.points[0];ctx.lineTo(p.x*r.width+.01,p.y*r.height+.01);}ctx.stroke();ctx.restore();
}
function redrawPage(index){const canvas=document.querySelector(`[data-writing-canvas="${index}"]`),ctx=contextFor(canvas);if(!canvas||!ctx)return;const r=rect(canvas);ctx.clearRect(0,0,r.width,r.height);(pages[index]?.strokes||[]).forEach(s=>drawStroke(ctx,canvas,s));}
function resizePage(canvas){const ctx=contextFor(canvas),r=rect(canvas);if(!ctx||r.width<10||r.height<10)return;const ratio=Math.min(2,Math.max(1,window.devicePixelRatio||1)),w=Math.round(r.width*ratio),h=Math.round(r.height*ratio);if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h;ctx.setTransform(ratio,0,0,ratio,0,0);}redrawPage(pageIndexForCanvas(canvas));}
function resizeAll(){requestAnimationFrame(()=>canvases().forEach(resizePage));}

function bindCanvas(canvas){
  canvas.style.touchAction=tool==='move'?'pan-y':'none';
  canvas.addEventListener('pointerdown',event=>{
    activePage=pageIndexForCanvas(canvas);markActivePage();
    if(tool==='move'||event.isPrimary===false||(event.pointerType==='mouse'&&event.button!==0))return;
    const p=point(event,canvas);if(!p)return;event.preventDefault();activePage=pageIndexForCanvas(canvas);ensurePagesData(activePage+1);drawing=true;pointerId=event.pointerId;currentStroke={tool,color:ink,width,points:[p]};pages[activePage].strokes.push(currentStroke);try{canvas.setPointerCapture(event.pointerId);}catch{}redrawPage(activePage);
  },{passive:false});
  canvas.addEventListener('pointermove',event=>{
    if(tool==='move'||!drawing||!currentStroke||event.pointerId!==pointerId)return;event.preventDefault();const items=typeof event.getCoalescedEvents==='function'?event.getCoalescedEvents():[event];(items.length?items:[event]).forEach(item=>{const p=point(item,canvas);if(p)currentStroke.points.push(p);});redrawPage(activePage);
  },{passive:false});
  const stop=event=>{if(!drawing||event.pointerId!==pointerId)return;event.preventDefault();drawing=false;pointerId=null;currentStroke=null;try{canvas.releasePointerCapture(event.pointerId);}catch{}setStatus(`Page ${activePage+1} · ${(pages[activePage]?.strokes||[]).length} trait${(pages[activePage]?.strokes||[]).length>1?'s':''}.`);};
  canvas.addEventListener('pointerup',stop,{passive:false});canvas.addEventListener('pointercancel',stop,{passive:false});canvas.addEventListener('lostpointercapture',()=>{drawing=false;pointerId=null;currentStroke=null;});
}

function markActivePage(){pageEls().forEach((page,i)=>page.classList.toggle('active-writing-page',i===activePage));}
function applyPaper(){pageEls().forEach(page=>{page.classList.remove('paper-lined','paper-grid','paper-dots','paper-blank');page.classList.add(`paper-${paperMode}`);});document.querySelectorAll('[data-writing-paper]').forEach(b=>b.classList.toggle('active',b.dataset.writingPaper===paperMode));localStorage.setItem('sirafiq-writing-paper',paperMode);markActivePage();}
function addPage(strokes=[]){
  const index=pages.length;pages.push({strokes:Array.isArray(strokes)?strokes:[]});const article=document.createElement('article');article.className=`writing-page paper-${paperMode}`;article.dataset.writingPage=String(index);article.innerHTML=`<span class="page-number">${index+1}</span><canvas data-writing-canvas="${index}" aria-label="Page ${index+1} du cahier tactile"></canvas>`;notebook.appendChild(article);const canvas=article.querySelector('canvas');bindCanvas(canvas);resizePage(canvas);return article;
}
function rebuildNotebook(data=[{strokes:[]}]){
  pages=(data?.length?data:[{strokes:[]}]).map(p=>({strokes:Array.isArray(p?.strokes)?p.strokes:[]}));notebook.innerHTML='';pages.forEach((p,index)=>{const article=document.createElement('article');article.className=`writing-page paper-${paperMode}`;article.dataset.writingPage=String(index);article.innerHTML=`<span class="page-number">${index+1}</span><canvas ${index===0?'id="writingCanvas" ':''}data-writing-canvas="${index}" aria-label="Page ${index+1} du cahier tactile"></canvas>`;notebook.appendChild(article);const canvas=article.querySelector('canvas');bindCanvas(canvas);});activePage=0;applyPaper();resizeAll();
}
function setTool(next){tool=next;[penButton,highlighterButton,eraserButton,moveButton].forEach(b=>b?.classList.remove('active'));(next==='pen'?penButton:next==='highlighter'?highlighterButton:next==='eraser'?eraserButton:moveButton)?.classList.add('active');canvases().forEach(c=>c.style.touchAction=next==='move'?'pan-y':'none');setStatus(next==='move'?'Mode Déplacer : faites défiler le cahier avec le doigt.':next==='eraser'?'Gomme active.':next==='highlighter'?'Surligneur actif.':'Stylo actif.');}

function canvasBlob(canvas){return new Promise((resolve,reject)=>canvas.toBlob(blob=>blob?resolve(blob):reject(new Error('Impossible de créer l’aperçu')),'image/png'));}
async function saveWriting(){
  const nonEmpty=pages.findIndex(p=>p.strokes.length);if(nonEmpty<0){setStatus('Écrivez quelque chose avant d’enregistrer.');return;}saveButton.disabled=true;setStatus('Enregistrement du cahier local…');
  try{const previewCanvas=document.querySelector(`[data-writing-canvas="${nonEmpty}"]`);const blob=await canvasBlob(previewCanvas);const transferred=localStorage.getItem('sirafiq-writing-session-title');const title=transferred||`Cahier du ${new Date().toLocaleString('fr-FR')}`;localStorage.removeItem('sirafiq-writing-session-title');await addWriting({blob,mimeType:'image/png',size:blob.size,title,pageCount:pages.length,paperMode,notebookPages:pages.map(p=>({strokes:p.strokes.map(s=>({tool:s.tool,color:s.color,width:s.width,points:s.points.map(pt=>({x:pt.x,y:pt.y}))}))}))});await addLearningEvent({domain:'ecriture',kind:'notebook-save',title,pageCount:pages.length}).catch(()=>{});setStatus(`Cahier enregistré · ${pages.length} page${pages.length>1?'s':''}.`);window.dispatchEvent(new CustomEvent('sirafiq:data-changed'));await refreshGallery();}
  catch(error){console.error(error);setStatus(`Échec de l’enregistrement : ${error.message}`);}finally{saveButton.disabled=false;}
}
async function refreshGallery(){
  if(!gallery)return;galleryUrls.forEach(URL.revokeObjectURL);galleryUrls=[];
  try{const items=(await listWritings()).sort((a,b)=>new Date(b.createdAt)-new Date(a.createdAt));if(!items.length){gallery.innerHTML='<p class="empty-inline">Aucun cahier enregistré.</p>';return;}gallery.innerHTML=items.map(item=>{const url=URL.createObjectURL(item.blob);galleryUrls.push(url);const date=new Date(item.createdAt).toLocaleString('fr-FR');const pagesCount=item.pageCount||item.notebookPages?.length||1;return `<article class="writing-card"><img src="${url}" alt="Aperçu du cahier enregistré"><div class="writing-card-copy"><strong>${item.title||date}</strong><small>${date} · ${pagesCount} page${pagesCount>1?'s':''}</small><div><button type="button" class="secondary-button mini" data-resume-writing="${item.id}">Reprendre</button><button type="button" class="danger-link" data-delete-writing="${item.id}">🗑 Supprimer</button></div></div></article>`;}).join('');}
  catch(error){console.error(error);gallery.innerHTML='<p class="empty-inline">Impossible de lire les cahiers locaux.</p>';}
}
async function removeWriting(id){if(!confirm('Supprimer définitivement ce cahier de cet appareil ?'))return;await deleteWriting(id);window.dispatchEvent(new CustomEvent('sirafiq:data-changed'));await refreshGallery();}
async function deleteLastWriting(){const items=(await listWritings()).sort((a,b)=>new Date(b.createdAt)-new Date(a.createdAt));if(!items.length){setStatus('Aucun cahier enregistré à supprimer.');return;}if(!confirm(`Supprimer définitivement « ${items[0].title||'le dernier cahier'} » ?`))return;await deleteWriting(items[0].id);window.dispatchEvent(new CustomEvent('sirafiq:data-changed'));setStatus('Dernier cahier supprimé.');await refreshGallery();}
async function resumeWriting(id){const items=await listWritings();const item=items.find(x=>Number(x.id)===Number(id));if(!item)return;paperMode=item.paperMode||paperMode;const data=item.notebookPages?.length?item.notebookPages:[{strokes:item.strokes||[]}];rebuildNotebook(data);setStatus(`Cahier repris · ${data.length} page${data.length>1?'s':''}.`);scroll?.scrollTo({top:0,behavior:'smooth'});}


function deleteActivePage(){
  if(!pages.length)return;
  const current=activePage;
  if(pages.length===1){
    if(pages[0].strokes.length && !confirm('Vider l’unique page du cahier ?')) return;
    pages[0].strokes=[]; redrawPage(0); setStatus('Page 1 vidée.'); return;
  }
  if(!confirm(`Supprimer la page ${current+1} de ce cahier ?`)) return;
  pages.splice(current,1);
  activePage=Math.max(0,Math.min(current,pages.length-1));
  rebuildNotebook(pages);
  activePage=Math.max(0,Math.min(current,pages.length-1)); markActivePage();
  setStatus(`Page supprimée · ${pages.length} page${pages.length>1?'s':''} restante${pages.length>1?'s':''}.`);
}
penButton?.addEventListener('click',()=>setTool('pen'));highlighterButton?.addEventListener('click',()=>setTool('highlighter'));eraserButton?.addEventListener('click',()=>setTool('eraser'));moveButton?.addEventListener('click',()=>setTool('move'));
document.querySelectorAll('[data-ink]').forEach(button=>button.addEventListener('click',()=>{ink=button.dataset.ink||ink;document.querySelectorAll('[data-ink]').forEach(b=>b.classList.toggle('active',b===button));if(tool==='eraser'||tool==='move')setTool('pen');}));
document.querySelectorAll('[data-width]').forEach(button=>button.addEventListener('click',()=>{width=Number(button.dataset.width)||4;document.querySelectorAll('[data-width]').forEach(b=>b.classList.toggle('active',b===button));}));
document.querySelectorAll('[data-writing-paper]').forEach(b=>b.addEventListener('click',()=>{paperMode=['lined','grid','dots','blank'].includes(b.dataset.writingPaper)?b.dataset.writingPaper:'lined';applyPaper();}));
clearButton?.addEventListener('click',()=>{pages.forEach(p=>p.strokes=[]);canvases().forEach((_,i)=>redrawPage(i));setStatus('Cahier courant vidé. Les cahiers déjà enregistrés ne sont pas touchés.');});
undoButton?.addEventListener('click',()=>{let index=activePage;if(!pages[index]?.strokes.length)index=[...pages].map((p,i)=>p.strokes.length?i:-1).filter(i=>i>=0).pop()??0;if(!pages[index]?.strokes.length)return;pages[index].strokes.pop();redrawPage(index);setStatus(`Dernier trait annulé sur la page ${index+1}.`);});
addPageButton?.addEventListener('click',()=>{const page=addPage([]);activePage=pages.length-1;markActivePage();setTool('move');page.scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth',block:'center'});setStatus(`Page ${pages.length} ajoutée. Passez au stylo pour écrire.`);});
deletePageButton?.addEventListener('click',deleteActivePage);
saveButton?.addEventListener('click',saveWriting);deleteLastButton?.addEventListener('click',()=>deleteLastWriting().catch(console.error));
boardButton?.addEventListener('click',()=>{studio?.classList.toggle('board-fullscreen');document.body.classList.toggle('writing-board-open',studio?.classList.contains('board-fullscreen'));const span=boardButton.querySelector('span');if(span)span.textContent=studio?.classList.contains('board-fullscreen')?'Réduire':'Grand cahier';setTimeout(resizeAll,80);});
gallery?.addEventListener('click',e=>{const del=e.target.closest('[data-delete-writing]'),resume=e.target.closest('[data-resume-writing]');if(del)removeWriting(Number(del.dataset.deleteWriting));if(resume)resumeWriting(Number(resume.dataset.resumeWriting));});

function activate(){if(location.hash==='#ecrire'||view?.classList.contains('active')){requestAnimationFrame(()=>requestAnimationFrame(resizeAll));refreshGallery();const transferred=localStorage.getItem('sirafiq-writing-session-title');if(transferred)setStatus(`${transferred} · cahier prêt.`);}}
window.addEventListener('hashchange',activate);window.addEventListener('resize',resizeAll);window.addEventListener('orientationchange',resizeAll);
rebuildNotebook([{strokes:[]}]);setTool('pen');activate();
