import { addWriting, listWritings, deleteWriting } from './db.js?v=4';

const canvas = document.getElementById('writingCanvas');
const clearButton = document.getElementById('clearWriting');
const undoButton = document.getElementById('undoWriting');
const saveButton = document.getElementById('saveWriting');
const status = document.getElementById('writingStatus');
const gallery = document.getElementById('writingGallery');
const view = document.getElementById('view-ecrire');
let ctx = canvas?.getContext('2d') || null;
let drawing = false, pointerId = null, currentStroke = null, strokes = [], resizeFrame = 0;
let galleryUrls = [];

const setStatus = message => { if (status) status.textContent = message; };
const rect = () => canvas?.getBoundingClientRect() || { width: 0, height: 0, left: 0, top: 0 };
function point(event) { const r = rect(); if (!r.width || !r.height) return null; return { x: Math.max(0, Math.min(1, (event.clientX-r.left)/r.width)), y: Math.max(0, Math.min(1, (event.clientY-r.top)/r.height)) }; }
function drawStroke(stroke) {
  if (!ctx || !stroke?.points?.length) return;
  const r = rect(); if (!r.width || !r.height) return;
  ctx.beginPath(); ctx.strokeStyle = '#A70F35'; ctx.lineWidth = 4; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  stroke.points.forEach((p,i) => { const x=p.x*r.width, y=p.y*r.height; i ? ctx.lineTo(x,y) : ctx.moveTo(x,y); });
  if (stroke.points.length === 1) { const p=stroke.points[0]; const x=p.x*r.width,y=p.y*r.height; ctx.lineTo(x+.01,y+.01); }
  ctx.stroke();
}
function redraw() { if (!ctx) return; const r=rect(); ctx.clearRect(0,0,r.width,r.height); strokes.forEach(drawStroke); }
function resizeCanvas() {
  if (!canvas || !ctx) return;
  cancelAnimationFrame(resizeFrame); resizeFrame=requestAnimationFrame(() => {
    const r=rect(); if (r.width < 10 || r.height < 10) return;
    const ratio=Math.max(1,window.devicePixelRatio||1), w=Math.round(r.width*ratio), h=Math.round(r.height*ratio);
    if (canvas.width!==w || canvas.height!==h) { canvas.width=w; canvas.height=h; ctx.setTransform(ratio,0,0,ratio,0,0); }
    redraw(); setStatus(strokes.length ? `${strokes.length} trait${strokes.length>1?'s':''} sur la surface.` : 'Surface prête pour le doigt ou le stylet.');
  });
}
function start(event) {
  if (event.isPrimary===false || (event.pointerType==='mouse' && event.button!==0)) return;
  const p=point(event); if (!p) return; event.preventDefault(); drawing=true; pointerId=event.pointerId; currentStroke={points:[p]}; strokes.push(currentStroke);
  try { canvas.setPointerCapture(event.pointerId); } catch {} redraw();
}
function move(event) {
  if (!drawing || !currentStroke || event.pointerId!==pointerId) return; event.preventDefault();
  const items=typeof event.getCoalescedEvents==='function' ? event.getCoalescedEvents() : [event];
  (items.length?items:[event]).forEach(item=>{ const p=point(item); if(p) currentStroke.points.push(p); }); redraw();
}
function stop(event) { if (!drawing || event.pointerId!==pointerId) return; event.preventDefault(); drawing=false; pointerId=null; currentStroke=null; try{canvas.releasePointerCapture(event.pointerId);}catch{} setStatus(`${strokes.length} trait${strokes.length>1?'s':''}.`); }
function canvasBlob() { return new Promise((resolve,reject)=>canvas.toBlob(blob=>blob?resolve(blob):reject(new Error('Impossible de créer l’image')),'image/png')); }
async function saveWriting() {
  if (!strokes.length) { setStatus('Tracez quelque chose avant d’enregistrer.'); return; }
  saveButton.disabled=true; setStatus('Enregistrement local…');
  try { const blob=await canvasBlob(); await addWriting({ blob, mimeType:'image/png', size:blob.size, strokes:strokes.map(stroke => ({ points: stroke.points.map(point => ({ x: point.x, y: point.y })) })), title:`Tracé du ${new Date().toLocaleString('fr-FR')}` }); setStatus('Tracé enregistré localement.'); window.dispatchEvent(new CustomEvent('sirafiq:data-changed')); await refreshGallery(); }
  catch(error){ console.error(error); setStatus(`Échec de l’enregistrement : ${error.message}`); }
  finally { saveButton.disabled=false; }
}
async function refreshGallery() {
  if (!gallery) return; galleryUrls.forEach(URL.revokeObjectURL); galleryUrls=[];
  try { const items=(await listWritings()).sort((a,b)=>new Date(b.createdAt)-new Date(a.createdAt)); if(!items.length){gallery.innerHTML='<p class="empty-inline">Aucun tracé enregistré.</p>';return;}
    gallery.innerHTML=items.map(item=>{ const url=URL.createObjectURL(item.blob); galleryUrls.push(url); const date=new Date(item.createdAt).toLocaleString('fr-FR'); return `<article class="writing-card"><img src="${url}" alt="Tracé enregistré le ${date}"><div><strong>${date}</strong><button type="button" class="danger-link" data-delete-writing="${item.id}">🗑 Supprimer</button></div></article>`; }).join('');
  } catch(error){ console.error(error); gallery.innerHTML='<p class="empty-inline">Impossible de lire les tracés locaux.</p>'; }
}
async function removeWriting(id){ if(!confirm('Supprimer définitivement ce tracé de cet appareil ?'))return; await deleteWriting(id); window.dispatchEvent(new CustomEvent('sirafiq:data-changed')); await refreshGallery(); }

if (canvas && ctx) {
  canvas.style.touchAction='none';
  canvas.addEventListener('pointerdown',start,{passive:false}); canvas.addEventListener('pointermove',move,{passive:false}); canvas.addEventListener('pointerup',stop,{passive:false}); canvas.addEventListener('pointercancel',stop,{passive:false});
  canvas.addEventListener('lostpointercapture',()=>{drawing=false;pointerId=null;currentStroke=null;});
}
clearButton?.addEventListener('click',()=>{ if(!strokes.length)return; if(!confirm('Effacer tous les traits actuellement sur la surface ?'))return; strokes=[]; redraw(); setStatus('Surface effacée.'); });
undoButton?.addEventListener('click',()=>{ if(!strokes.length)return; strokes.pop(); redraw(); setStatus(strokes.length?'Dernier trait annulé.':'Surface vide.'); });
saveButton?.addEventListener('click',saveWriting);
gallery?.addEventListener('click',e=>{const b=e.target.closest('[data-delete-writing]');if(b)removeWriting(Number(b.dataset.deleteWriting));});
function activate(){ if(location.hash==='#ecrire'||view?.classList.contains('active')){requestAnimationFrame(()=>requestAnimationFrame(resizeCanvas));refreshGallery();} }
window.addEventListener('hashchange',activate); window.addEventListener('resize',resizeCanvas); window.addEventListener('orientationchange',resizeCanvas); activate();
