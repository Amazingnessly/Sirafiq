import { addWriting, listWritings, deleteWriting } from './db.js?v=7';

const $ = id => document.getElementById(id);
const canvas = $('writingCanvas');
const clearButton = $('clearWriting');
const undoButton = $('undoWriting');
const saveButton = $('saveWriting');
const deleteLastButton = $('deleteLastWriting');
const boardButton = $('toggleWritingBoard');
const penButton = $('penTool');
const highlighterButton = $('highlighterTool');
const eraserButton = $('eraserTool');
const status = $('writingStatus');
const gallery = $('writingGallery');
const studio = $('writingStudio');
const view = $('view-ecrire');
let ctx = canvas?.getContext('2d') || null;
let drawing = false, pointerId = null, currentStroke = null, strokes = [], resizeFrame = 0;
let galleryUrls = [];
let tool = 'pen', ink = '#7d0c2b', width = 4;

const setStatus = message => { if (status) status.textContent = message; };
const rect = () => canvas?.getBoundingClientRect() || { width: 0, height: 0, left: 0, top: 0 };
function point(event) {
  const r = rect();
  if (!r.width || !r.height) return null;
  return { x: Math.max(0, Math.min(1, (event.clientX-r.left)/r.width)), y: Math.max(0, Math.min(1, (event.clientY-r.top)/r.height)) };
}
function drawStroke(stroke) {
  if (!ctx || !stroke?.points?.length) return;
  const r = rect(); if (!r.width || !r.height) return;
  ctx.save();
  ctx.beginPath();
  if (stroke.tool === 'eraser') {
    ctx.globalCompositeOperation = 'destination-out';
    ctx.strokeStyle = '#000';
    ctx.lineWidth = Math.max(18, stroke.width * 4);
    ctx.globalAlpha = 1;
  } else {
    ctx.globalCompositeOperation = 'source-over';
    ctx.strokeStyle = stroke.color || '#7d0c2b';
    ctx.lineWidth = stroke.tool === 'highlighter' ? Math.max(12, stroke.width * 3) : stroke.width;
    ctx.globalAlpha = stroke.tool === 'highlighter' ? .22 : 1;
  }
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  stroke.points.forEach((p,i) => { const x=p.x*r.width, y=p.y*r.height; i ? ctx.lineTo(x,y) : ctx.moveTo(x,y); });
  if (stroke.points.length === 1) { const p=stroke.points[0]; const x=p.x*r.width,y=p.y*r.height; ctx.lineTo(x+.01,y+.01); }
  ctx.stroke();
  ctx.restore();
}
function redraw() { if (!ctx) return; const r=rect(); ctx.clearRect(0,0,r.width,r.height); strokes.forEach(drawStroke); }
function resizeCanvas() {
  if (!canvas || !ctx) return;
  cancelAnimationFrame(resizeFrame); resizeFrame=requestAnimationFrame(() => {
    const r=rect(); if (r.width < 10 || r.height < 10) return;
    const ratio=Math.max(1,window.devicePixelRatio||1), w=Math.round(r.width*ratio), h=Math.round(r.height*ratio);
    if (canvas.width!==w || canvas.height!==h) { canvas.width=w; canvas.height=h; ctx.setTransform(ratio,0,0,ratio,0,0); }
    redraw();
    setStatus(strokes.length ? `${strokes.length} trait${strokes.length>1?'s':''} sur le tableau.` : 'Tableau prêt pour le doigt ou le stylet.');
  });
}
function start(event) {
  if (event.isPrimary===false || (event.pointerType==='mouse' && event.button!==0)) return;
  const p=point(event); if (!p) return;
  event.preventDefault(); drawing=true; pointerId=event.pointerId;
  currentStroke={ tool, color:ink, width, points:[p] };
  strokes.push(currentStroke);
  try { canvas.setPointerCapture(event.pointerId); } catch {}
  redraw();
}
function move(event) {
  if (!drawing || !currentStroke || event.pointerId!==pointerId) return;
  event.preventDefault();
  const items=typeof event.getCoalescedEvents==='function' ? event.getCoalescedEvents() : [event];
  (items.length?items:[event]).forEach(item=>{ const p=point(item); if(p) currentStroke.points.push(p); });
  redraw();
}
function stop(event) {
  if (!drawing || event.pointerId!==pointerId) return;
  event.preventDefault(); drawing=false; pointerId=null; currentStroke=null;
  try{canvas.releasePointerCapture(event.pointerId);}catch{}
  setStatus(`${strokes.length} trait${strokes.length>1?'s':''}.`);
}
function canvasBlob() { return new Promise((resolve,reject)=>canvas.toBlob(blob=>blob?resolve(blob):reject(new Error('Impossible de créer l’image')),'image/png')); }
async function saveWriting() {
  if (!strokes.length) { setStatus('Tracez quelque chose avant d’enregistrer.'); return; }
  saveButton.disabled=true; setStatus('Enregistrement local…');
  try {
    const blob=await canvasBlob();
    await addWriting({
      blob, mimeType:'image/png', size:blob.size,
      strokes:strokes.map(s => ({ tool:s.tool, color:s.color, width:s.width, points:s.points.map(p => ({ x:p.x, y:p.y })) })),
      title:`Tracé du ${new Date().toLocaleString('fr-FR')}`
    });
    setStatus('Tracé enregistré localement.');
    window.dispatchEvent(new CustomEvent('sirafiq:data-changed'));
    await refreshGallery();
  } catch(error){ console.error(error); setStatus(`Échec de l’enregistrement : ${error.message}`); }
  finally { saveButton.disabled=false; }
}
async function refreshGallery() {
  if (!gallery) return;
  galleryUrls.forEach(URL.revokeObjectURL); galleryUrls=[];
  try {
    const items=(await listWritings()).sort((a,b)=>new Date(b.createdAt)-new Date(a.createdAt));
    if(!items.length){gallery.innerHTML='<p class="empty-inline">Aucun tracé enregistré.</p>';return;}
    gallery.innerHTML=items.map(item=>{
      const url=URL.createObjectURL(item.blob); galleryUrls.push(url);
      const date=new Date(item.createdAt).toLocaleString('fr-FR');
      return `<article class="writing-card"><img src="${url}" alt="Tracé enregistré le ${date}"><div><strong>${date}</strong><button type="button" class="danger-link" data-delete-writing="${item.id}">🗑 Supprimer</button></div></article>`;
    }).join('');
  } catch(error){ console.error(error); gallery.innerHTML='<p class="empty-inline">Impossible de lire les tracés locaux.</p>'; }
}
async function removeWriting(id){ if(!confirm('Supprimer définitivement ce tracé de cet appareil ?'))return; await deleteWriting(id); window.dispatchEvent(new CustomEvent('sirafiq:data-changed')); await refreshGallery(); }
async function deleteLastWriting(){
  const items=(await listWritings()).sort((a,b)=>new Date(b.createdAt)-new Date(a.createdAt));
  if(!items.length){setStatus('Aucun tracé enregistré à supprimer.');return;}
  if(!confirm('Supprimer le dernier tracé enregistré ?'))return;
  await deleteWriting(items[0].id); window.dispatchEvent(new CustomEvent('sirafiq:data-changed')); setStatus('Dernier tracé supprimé.'); await refreshGallery();
}
function setTool(next){
  tool=next;
  [penButton,highlighterButton,eraserButton].forEach(b=>b?.classList.remove('active'));
  (next==='pen'?penButton:next==='highlighter'?highlighterButton:eraserButton)?.classList.add('active');
  setStatus(next==='eraser'?'Gomme active.':next==='highlighter'?'Surligneur actif.':'Stylo actif.');
}

if (canvas && ctx) {
  canvas.style.touchAction='none';
  canvas.addEventListener('pointerdown',start,{passive:false});
  canvas.addEventListener('pointermove',move,{passive:false});
  canvas.addEventListener('pointerup',stop,{passive:false});
  canvas.addEventListener('pointercancel',stop,{passive:false});
  canvas.addEventListener('lostpointercapture',()=>{drawing=false;pointerId=null;currentStroke=null;});
}
penButton?.addEventListener('click',()=>setTool('pen'));
highlighterButton?.addEventListener('click',()=>setTool('highlighter'));
eraserButton?.addEventListener('click',()=>setTool('eraser'));
document.querySelectorAll('[data-ink]').forEach(button=>button.addEventListener('click',()=>{
  ink=button.dataset.ink || ink;
  document.querySelectorAll('[data-ink]').forEach(b=>b.classList.toggle('active',b===button));
  if(tool==='eraser') setTool('pen');
}));
document.querySelectorAll('[data-width]').forEach(button=>button.addEventListener('click',()=>{
  width=Number(button.dataset.width)||4;
  document.querySelectorAll('[data-width]').forEach(b=>b.classList.toggle('active',b===button));
}));
clearButton?.addEventListener('click',()=>{ strokes=[]; redraw(); setStatus('Tableau vidé.'); });
undoButton?.addEventListener('click',()=>{ if(!strokes.length)return; strokes.pop(); redraw(); setStatus(strokes.length?'Dernier trait annulé.':'Tableau vide.'); });
saveButton?.addEventListener('click',saveWriting);
deleteLastButton?.addEventListener('click',()=>deleteLastWriting().catch(console.error));
boardButton?.addEventListener('click',()=>{
  studio?.classList.toggle('board-fullscreen');
  document.body.classList.toggle('writing-board-open',studio?.classList.contains('board-fullscreen'));
  boardButton.querySelector('span') && (boardButton.querySelector('span').textContent=studio?.classList.contains('board-fullscreen')?'Réduire':'Grand tableau');
  setTimeout(resizeCanvas,80);
});
gallery?.addEventListener('click',e=>{const b=e.target.closest('[data-delete-writing]');if(b)removeWriting(Number(b.dataset.deleteWriting));});
function activate(){ if(location.hash==='#ecrire'||view?.classList.contains('active')){requestAnimationFrame(()=>requestAnimationFrame(resizeCanvas));refreshGallery();} }
window.addEventListener('hashchange',activate); window.addEventListener('resize',resizeCanvas); window.addEventListener('orientationchange',resizeCanvas); activate();
