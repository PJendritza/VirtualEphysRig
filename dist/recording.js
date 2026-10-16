'use strict';
// Uncompressed ZIP keeps binary export dependency-free and inspectable.
function recordingZip(files){
  const encoder=new TextEncoder(),table=new Uint32Array(256);
  for(let n=0;n<256;n++){let c=n;for(let k=0;k<8;k++)c=(c&1)?0xedb88320^(c>>>1):c>>>1;table[n]=c;}
  const crc=bytes=>{let c=0xffffffff;for(const b of bytes)c=table[(c^b)&255]^(c>>>8);return(c^0xffffffff)>>>0;};
  const parts=[],central=[];let offset=0,totalCentral=0;
  for(const [name,bytes] of files){const fn=encoder.encode(name),checksum=crc(bytes),header=new Uint8Array(30+fn.length),v=new DataView(header.buffer);
    v.setUint32(0,0x04034b50,true);v.setUint16(4,20,true);v.setUint16(12,33,true);v.setUint32(14,checksum,true);v.setUint32(18,bytes.length,true);v.setUint32(22,bytes.length,true);v.setUint16(26,fn.length,true);header.set(fn,30);
    const dir=new Uint8Array(46+fn.length),d=new DataView(dir.buffer);d.setUint32(0,0x02014b50,true);d.setUint16(4,20,true);d.setUint16(6,20,true);d.setUint16(14,33,true);d.setUint32(16,checksum,true);d.setUint32(20,bytes.length,true);d.setUint32(24,bytes.length,true);d.setUint16(28,fn.length,true);d.setUint32(42,offset,true);dir.set(fn,46);
    parts.push(header,bytes);central.push(dir);offset+=header.length+bytes.length;totalCentral+=dir.length;
  }
  const end=new Uint8Array(22),v=new DataView(end.buffer);v.setUint32(0,0x06054b50,true);v.setUint16(8,files.length,true);v.setUint16(10,files.length,true);v.setUint32(12,totalCentral,true);v.setUint32(16,offset,true);
  return new Blob([...parts,...central,end],{type:'application/zip'});
}
if(typeof module!=='undefined')module.exports={recordingZip};

// One completed recording shared by the exercise pages on this origin.
let lastRecording=null,recordingRevision=0;
function recordingStore(mode,operation){return new Promise((resolve,reject)=>{
  const request=indexedDB.open('visual-rig-recordings',1);
  request.onupgradeneeded=()=>request.result.createObjectStore('recordings');
  request.onerror=()=>reject(request.error);
  request.onsuccess=()=>{const db=request.result,tx=db.transaction('recordings',mode),result=operation(tx.objectStore('recordings'));tx.oncomplete=()=>{db.close();resolve(result.result);};tx.onerror=tx.onabort=()=>{db.close();reject(tx.error);};};
});}
function updateLastRecording(){
  document.getElementById('lastRecording').hidden=!lastRecording;
  document.getElementById('download').disabled=recording||!lastRecording;
  document.getElementById('viewRecording').disabled=recording;
  document.getElementById('deleteRecording').disabled=recording;
  if(lastRecording){const m=lastRecording.metadata;document.getElementById('lastRecordingInfo').textContent=`Last recording: ${m.session} · ${m.duration_s.toFixed(2)} s · ${new Date(m.created_utc).toLocaleString()}`;}
}
async function storeLastRecording(m){
  recordingRevision++;
  const encoder=new TextEncoder(),json=x=>encoder.encode(JSON.stringify(x,null,2));
  // Keep a small min/max overview, not a second copy of the raw voltage.
  const view=new DataView(m.binary.buffer,m.binary.byteOffset,m.binary.byteLength),n=m.binary.byteLength/4,bins=Math.min(600,n),overview=[];
  for(let b=0;b<bins;b++){let low=Infinity,high=-Infinity;for(let i=Math.floor(b*n/bins);i<Math.floor((b+1)*n/bins);i++){const v=view.getFloat32(i*4,true);low=Math.min(low,v);high=Math.max(high,v);}overview.push([low,high]);}
  lastRecording={metadata:m.metadata,overview,zip:recordingZip([['voltage.bin',m.binary],['metadata.json',json(m.metadata)],['stimuli.json',json(m.stimuli)],['camera_frames.json',json(m.cameraFrames||[])]])};
  saved=true;document.getElementById('recordingPreview').hidden=true;document.getElementById('viewRecording').textContent='View last recording';document.getElementById('viewRecording').setAttribute('aria-expanded','false');
  let persisted=true;try{await recordingStore('readwrite',s=>s.put(lastRecording,'last'));}catch{persisted=false;}
  document.getElementById('record').disabled=false;updateLastRecording();
  document.getElementById('recStatus').textContent=persisted?'Recording ready · kept in this browser until replaced or deleted.':'Recording ready · browser storage unavailable; download before leaving this page.';
}
function downloadLastRecording(){
  if(!lastRecording||recording)return;
  const m=lastRecording.metadata,url=URL.createObjectURL(lastRecording.zip),a=document.createElement('a');a.href=url;a.download=(m.session.replace(/[^a-zA-Z0-9_-]/g,'_')||'recording')+'_'+m.created_utc.replace(/[:.]/g,'-')+'.zip';a.click();setTimeout(()=>URL.revokeObjectURL(url),60000);
}
function drawRecordingOverview(){
  const canvas=document.getElementById('recordingOverview'),ctx=canvas.getContext('2d'),values=lastRecording.overview;
  ctx.fillStyle='#08131c';ctx.fillRect(0,0,600,140);const peak=Math.max(1,...values.flat().map(Math.abs));ctx.strokeStyle='#75dcc3';ctx.beginPath();values.forEach(([lo,hi],i)=>{const x=(i+.5)/values.length*600;ctx.moveTo(x,70-hi/peak*62);ctx.lineTo(x,70-lo/peak*62);});ctx.stroke();
}
if(typeof document!=='undefined')document.addEventListener('DOMContentLoaded',async()=>{
  document.getElementById('viewRecording').onclick=()=>{const panel=document.getElementById('recordingPreview');panel.hidden=!panel.hidden;document.getElementById('viewRecording').textContent=panel.hidden?'View last recording':'Hide recording';document.getElementById('viewRecording').setAttribute('aria-expanded',String(!panel.hidden));if(!panel.hidden&&lastRecording)drawRecordingOverview();};
  document.getElementById('deleteRecording').onclick=async()=>{if(recording)return;recordingRevision++;lastRecording=null;saved=false;send('clearRecord');document.getElementById('recordingPreview').hidden=true;updateLastRecording();try{await recordingStore('readwrite',s=>s.delete('last'));document.getElementById('recStatus').textContent='Last recording deleted.';}catch{document.getElementById('recStatus').textContent='Cleared from this page; browser storage could not be cleared.';}};
  const revision=recordingRevision;try{const restored=await recordingStore('readonly',s=>s.get('last'));if(revision===recordingRevision&&!recording&&restored){lastRecording=restored;saved=true;updateLastRecording();document.getElementById('recStatus').textContent='Last recording restored from this browser.';}}catch{}
});
