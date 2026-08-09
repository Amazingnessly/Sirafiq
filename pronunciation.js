import { addRecording, listRecordings, getRecording, deleteRecording } from './db.js?v=4';
const $=id=>document.getElementById(id);
const startButton=$('recordStart'), pauseButton=$('recordPause'), stopButton=$('recordStop'), saveButton=$('recordSave'), discardButton=$('recordDiscard'), titleInput=$('recordTitle'), timer=$('recordTimer'), status=$('recordStatus'), preview=$('recordPreview'), library=$('recordingLibrary');
let stream=null, recorder=null, chunks=[], currentBlob=null, currentUrl=null, startedAt=0, pausedAt=0, pausedTotal=0, timerId=0, currentDurationMs=0, libraryUrls=[];
const setStatus=m=>{if(status)status.textContent=m;};
function fmt(ms=0){const t=Math.max(0,Math.round(ms/1000)),m=Math.floor(t/60),s=t%60;return `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;}
function duration(){if(!startedAt)return currentDurationMs;const now=recorder?.state==='paused'?pausedAt:performance.now();return Math.max(0,now-startedAt-pausedTotal);}
function tick(){currentDurationMs=duration();if(timer)timer.textContent=fmt(currentDurationMs);} function startTimer(){clearInterval(timerId);timerId=setInterval(tick,250);tick();} function stopTimer(){clearInterval(timerId);timerId=0;if(timer)timer.textContent=fmt(currentDurationMs);}
function release(){stream?.getTracks().forEach(t=>t.stop());stream=null;}
function buttons(mode){const recording=mode==='recording',paused=mode==='paused',ready=mode==='ready';if(startButton)startButton.disabled=recording||paused;if(pauseButton){pauseButton.disabled=!(recording||paused);pauseButton.textContent=paused?'Reprendre':'Pause';}if(stopButton)stopButton.disabled=!(recording||paused);if(saveButton)saveButton.disabled=!ready;if(discardButton)discardButton.disabled=!ready;}
function clearPreview(){if(currentUrl)URL.revokeObjectURL(currentUrl);currentUrl=null;if(preview)preview.innerHTML='';} function renderPreview(){clearPreview();if(!currentBlob||!preview)return;currentUrl=URL.createObjectURL(currentBlob);preview.innerHTML=`<audio controls preload="metadata" src="${currentUrl}"></audio>`;}
async function startRecording(){
  if(!navigator.mediaDevices?.getUserMedia||!window.MediaRecorder){setStatus('L’enregistrement audio n’est pas disponible dans ce navigateur.');return;}
  if(currentBlob&&!confirm('Une prise est encore affichée. Commencer une nouvelle prise ?'))return;
  try{clearPreview();currentBlob=null;currentDurationMs=0;chunks=[];if(timer)timer.textContent='00:00';stream=await navigator.mediaDevices.getUserMedia({audio:true});recorder=new MediaRecorder(stream);
    recorder.addEventListener('dataavailable',e=>{if(e.data?.size)chunks.push(e.data);});
    recorder.addEventListener('stop',()=>{const mime=recorder.mimeType||chunks[0]?.type||'audio/webm';currentBlob=new Blob(chunks,{type:mime});chunks=[];startedAt=0;pausedAt=0;pausedTotal=0;stopTimer();release();renderPreview();buttons('ready');setStatus('Prise terminée. Réécoutez-la puis conservez-la localement.');if(titleInput&&!titleInput.value.trim())titleInput.value=`Enregistrement ${new Date().toLocaleString('fr-FR')}`;});
    recorder.start(250);startedAt=performance.now();pausedAt=0;pausedTotal=0;startTimer();buttons('recording');setStatus('Enregistrement en cours…');
  }catch(error){console.error(error);release();buttons(currentBlob?'ready':'idle');setStatus(error?.name==='NotAllowedError'?'Accès au microphone refusé. Autorisez le microphone dans Safari puis réessayez.':`Impossible de démarrer le microphone : ${error.message}`);}
}
function pauseResume(){if(!recorder)return;if(recorder.state==='recording'){recorder.pause();pausedAt=performance.now();buttons('paused');setStatus('Enregistrement en pause.');tick();}else if(recorder.state==='paused'){pausedTotal+=performance.now()-pausedAt;pausedAt=0;recorder.resume();buttons('recording');setStatus('Enregistrement repris.');}}
function stopRecording(){if(!recorder||!['recording','paused'].includes(recorder.state))return;currentDurationMs=duration();recorder.stop();setStatus('Finalisation de la prise…');if(pauseButton)pauseButton.disabled=true;if(stopButton)stopButton.disabled=true;}

function discardCurrentTake(){
  if(!currentBlob)return;
  clearPreview();
  currentBlob=null;
  currentDurationMs=0;
  if(timer)timer.textContent='00:00';
  if(titleInput)titleInput.value='';
  buttons('idle');
  setStatus('Prise supprimée. Aucun fichier n’a été conservé.');
}

async function saveRecording(){if(!currentBlob)return;const title=titleInput?.value.trim()||`Enregistrement ${new Date().toLocaleString('fr-FR')}`;saveButton.disabled=true;setStatus('Enregistrement local…');try{await addRecording({title,blob:currentBlob,mimeType:currentBlob.type||'audio/webm',size:currentBlob.size,durationMs:currentDurationMs});setStatus('Enregistrement conservé localement.');window.dispatchEvent(new CustomEvent('sirafiq:data-changed'));await refresh();}catch(error){console.error(error);setStatus(`Échec de l’enregistrement local : ${error.message}`);}finally{saveButton.disabled=false;}}
const esc=v=>String(v||'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'})[c]);
async function refresh(){if(!library)return;libraryUrls.forEach(URL.revokeObjectURL);libraryUrls=[];try{const items=(await listRecordings()).sort((a,b)=>new Date(b.createdAt)-new Date(a.createdAt));if(!items.length){library.innerHTML='<p class="empty-inline">Aucun enregistrement conservé.</p>';return;}library.innerHTML=items.map(item=>{const url=URL.createObjectURL(item.blob);libraryUrls.push(url);const date=new Date(item.createdAt).toLocaleString('fr-FR');return `<article class="recording-card"><div class="recording-card-head"><div><strong>${esc(item.title||'Enregistrement')}</strong><small>${date} · ${fmt(item.durationMs||0)}</small></div><button type="button" class="danger-link" data-delete-recording="${item.id}">Supprimer</button></div><audio controls preload="metadata" src="${url}"></audio></article>`;}).join('');}catch(error){console.error(error);library.innerHTML='<p class="empty-inline">Impossible de lire les enregistrements locaux.</p>';}}
async function remove(id){const item=await getRecording(id);if(!item)return;if(!confirm(`Supprimer définitivement « ${item.title||'cet enregistrement'} » de cet appareil ?`))return;await deleteRecording(id);window.dispatchEvent(new CustomEvent('sirafiq:data-changed'));await refresh();}
startButton?.addEventListener('click',startRecording);pauseButton?.addEventListener('click',pauseResume);stopButton?.addEventListener('click',stopRecording);saveButton?.addEventListener('click',saveRecording);discardButton?.addEventListener('click',discardCurrentTake);library?.addEventListener('click',e=>{const b=e.target.closest('[data-delete-recording]');if(b)remove(Number(b.dataset.deleteRecording));});window.addEventListener('hashchange',()=>{if(location.hash==='#prononcer')refresh();});window.addEventListener('pagehide',()=>{if(recorder&&['recording','paused'].includes(recorder.state)){try{recorder.stop();}catch{}}release();});buttons('idle');refresh();
