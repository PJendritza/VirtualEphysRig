'use strict';
(()=>{
  const grid=document.querySelector('.grid');
  const center=document.getElementById('columnResizer'),leftHandle=document.getElementById('leftResizer'),rightHandle=document.getElementById('rightResizer');
  if(!grid||!center||!leftHandle||!rightHandle)return;

  const read=(key,fallback)=>{try{const stored=localStorage.getItem(key),value=stored===null?NaN:Number(stored);return Number.isFinite(value)?value:fallback;}catch{return fallback;}};
  const save=(key,value)=>{try{localStorage.setItem(key,String(value));}catch{}};
  const rounded=value=>Math.round(value*10)/10;
  let split=read('visual-rig-panel-split',50);
  let left=read('visual-rig-workspace-left',1.5);
  let right=read('visual-rig-workspace-right',1.5);

  function applySplit(next,persist=true){split=Math.max(30,Math.min(70,rounded(next)));grid.style.setProperty('--left-panel-width',split+'%');center.setAttribute('aria-valuenow',String(Math.round(split)));if(persist)save('visual-rig-panel-split',split);}
  function applyOuter(side,next,persist=true){const other=side==='left'?right:left;const value=Math.max(.5,Math.min(35,45-other,rounded(next)));if(side==='left'){left=value;grid.style.setProperty('--workspace-left',left+'%');leftHandle.setAttribute('aria-valuenow',String(Math.round(left)));if(persist)save('visual-rig-workspace-left',left);}else{right=value;grid.style.setProperty('--workspace-right',right+'%');rightHandle.setAttribute('aria-valuenow',String(Math.round(right)));if(persist)save('visual-rig-workspace-right',right);}}
  applySplit(split,false);applyOuter('left',left,false);applyOuter('right',right,false);

  function bind(handle,onPointer,onReset,onKey){let dragging=false;handle.addEventListener('pointerdown',event=>{if(event.button!==0)return;dragging=true;handle.classList.add('dragging');handle.setPointerCapture(event.pointerId);onPointer(event);event.preventDefault();});handle.addEventListener('pointermove',event=>{if(dragging)onPointer(event);});const finish=event=>{if(!dragging)return;dragging=false;handle.classList.remove('dragging');if(handle.hasPointerCapture(event.pointerId))handle.releasePointerCapture(event.pointerId);};handle.addEventListener('pointerup',finish);handle.addEventListener('pointercancel',finish);handle.addEventListener('dblclick',onReset);handle.addEventListener('keydown',event=>{if(!['ArrowLeft','ArrowRight','Home'].includes(event.key))return;event.preventDefault();onKey(event.key);});}
  bind(center,event=>{const rect=grid.getBoundingClientRect(),style=getComputedStyle(grid),leftPad=Number.parseFloat(style.paddingLeft)||0,rightPad=Number.parseFloat(style.paddingRight)||0,usable=Math.max(1,rect.width-leftPad-rightPad);applySplit((event.clientX-rect.left-leftPad)/usable*100);},()=>applySplit(50),key=>applySplit(key==='Home'?50:split+(key==='ArrowLeft'?-2:2)));
  bind(leftHandle,event=>{const rect=grid.getBoundingClientRect();applyOuter('left',(event.clientX-rect.left)/Math.max(1,rect.width)*100);},()=>applyOuter('left',1.5),key=>applyOuter('left',key==='Home'?1.5:left+(key==='ArrowLeft'?-2:2)));
  bind(rightHandle,event=>{const rect=grid.getBoundingClientRect();applyOuter('right',(rect.right-event.clientX)/Math.max(1,rect.width)*100);},()=>applyOuter('right',1.5),key=>applyOuter('right',key==='Home'?1.5:right+(key==='ArrowLeft'?2:-2)));
})();
