'use strict';
// Only stimulus images and visual selectivity change. The rig's acquisition,
// filtering, threshold detection, audio, raw recording and export are reused.
const removedAssets=new Map(),facePortrait=new Image();facePortrait.src=FACE_ASSET;
const instructorSamples=new Set();
const assets=new Map(),inputBuffer=document.createElement('canvas');
inputBuffer.width=120;inputBuffer.height=80;
const inputContext=inputBuffer.getContext('2d',{willReadFrequently:true});
const curveFilters=buildCurveFilters(120,80);
let model='color',lastInput=-Infinity,faceLast=-Infinity,imageRotation=0,inputIdentity=null;
function isImageAvailable(name){return assets.has(name)&&(!instructorSamples.has(assets.get(name))||$('showCameraRF').checked);}
// Invalidate only discontinuous input changes. Position/size/rotation updates
// form a continuous stream and must not clear drive or discard face results.
function invalidateMysteryInput(){faceEpoch++;lastInput=faceLast=-Infinity;send('mysteryEpoch',{epoch:faceEpoch});}
const example=`# Images × positions × repetitions.
import random

filenames = ["grating_1.png", "grating_2.png"]
step = 0.6
size = 0.6
repetitions = 2

x_positions = [round(-1.2 + i * step, 3) for i in range(int(2.4 / step) + 1)]
y_positions = [round(-0.6 + i * step, 3) for i in range(int(1.2 / step) + 1)]
positions = [(x, y) for y in y_positions for x in x_positions]

for repeat in range(repetitions):
    order = [(name, x, y) for x, y in positions for name in filenames]
    random.shuffle(order)  # Comment out for an ordered scan.
    for filename, x, y in order:
        blank(duration=0.25)
        image(filename, duration=0.6, x=x, y=y, size=size)

blank(duration=1.0)`;
protocolExamples.three=example;protocolExercise='three';loadProtocolForExercise('three');
$('code').value=$('code').value.replace(/(["'])Grating 1\1/g,'"grating_1.png"').replace(/(["'])Grating 2\1/g,'"grating_2.png"');
// Keep both built-in files in an existing grating-only example, preserving its
// other settings and any protocols using student-uploaded files.
$('code').value=$('code').value.replace(/^filenames\s*=\s*\[([^\]\n]*)\]/m,(line,items)=>{const names=[...items.matchAll(/["']([^"']+)["']/g)].map(m=>m[1]);return names.length&&names.every(name=>['grating_1.png','grating_2.png'].includes(name))?'filenames = ["grating_1.png", "grating_2.png"]':line;});
function rebuildGallery(){const select=$('imageChoice'),gallery=$('imageGallery'),chosen=select.value;select.replaceChildren();gallery.replaceChildren();for(const [name,a]of assets){if(!isImageAvailable(name))continue;const o=document.createElement('option');o.value=name;o.textContent=name;select.append(o);const b=document.createElement('button');b.type='button';b.title=name;const img=document.createElement('img');img.src=a.src;img.alt='';const label=document.createElement('div');label.textContent=name;b.append(img,label);b.onclick=()=>{select.value=name;select.onchange();};b.oncontextmenu=e=>{e.preventDefault();openFileMenu(name,e.clientX,e.clientY);};b.onkeydown=e=>{if(e.key==='Delete'){e.preventDefault();removeAsset(name);}};gallery.append(b);}if(isImageAvailable(chosen))select.value=chosen;syncGallery();$('fileCount').textContent=select.options.length+' images';$('restoreImages').disabled=recording||!removedAssets.size;$('present').disabled=!select.options.length;}
function syncGallery(){[...$('imageGallery').children].forEach(b=>b.setAttribute('aria-pressed',String(b.title===$('imageChoice').value)));}
function addAsset(name,img){let unique=name,index=2;while(assets.has(unique))unique=name.replace(/(\.[^.]+)?$/,(_,ext)=>'_'+index+++(ext||''));assets.set(unique,img);return unique;}
async function sample(name,paint){const c=document.createElement('canvas');c.width=c.height=256;const ctx=c.getContext('2d');ctx.fillStyle='#808080';ctx.fillRect(0,0,256,256);paint(ctx);const img=new Image();img.src=c.toDataURL('image/png');await img.decode();addAsset(name,img);if(!/^grating_[12]\.png$/.test(name))instructorSamples.add(img);}
async function samples(){
  for(const [name,angle]of [['grating_1.png',0],['grating_2.png',120]])await sample(name,c=>{c.save();c.beginPath();c.arc(128,128,110,0,Math.PI*2);c.clip();c.translate(128,128);c.rotate(angle*Math.PI/180);for(let y=-190;y<190;y++){const v=Math.round(127.5+127.5*Math.cos(y/256*10*Math.PI));c.fillStyle=`rgb(${v},${v},${v})`;c.fillRect(-190,y,380,1);}c.restore();});
  for(const [name,color]of [['yellow','#ffdf00'],['blue','#2560ef'],['red','#ef3030'],['green','#25d655'],['cyan','#00dede'],['magenta','#e930db']])await sample(name+'_disk.png',c=>{c.fillStyle=color;c.beginPath();c.arc(128,128,78,0,Math.PI*2);c.fill();});
  for(const kind of ['arch','line','circle'])await sample('dark_'+kind+'.png',c=>{c.strokeStyle='#141414';c.lineWidth=18;c.lineCap='round';c.beginPath();if(kind==='line'){c.moveTo(42,128);c.lineTo(214,128);}else c.arc(128,kind==='arch'?160:128,78,Math.PI,kind==='arch'?Math.PI*2:Math.PI*3);c.stroke();});
  await facePortrait.decode();addAsset('face_1.png',facePortrait);instructorSamples.add(facePortrait);updateField();
  rebuildGallery();$('present').disabled=false;$('run').disabled=false;
}
$('imageFiles').onchange=async e=>{if(recording){$('imageStatus').textContent='Stop recording before adding images.';return;}for(const file of e.target.files){try{if(assets.size>=50)throw Error('Maximum 50 images.');if(!['image/png','image/jpeg','image/webp'].includes(file.type)||file.size>20e6)throw Error('Use PNG, JPEG or WebP below 20 MB.');const url=URL.createObjectURL(file),img=new Image();try{img.src=url;await img.decode();if(img.width*img.height>32e6)throw Error('Image exceeds 32 megapixels.');addAsset(file.name,img);}catch(err){URL.revokeObjectURL(url);throw err;}}catch(err){$('imageStatus').textContent=file.name+': '+err.message;}}rebuildGallery();e.target.value='';};
window.mysteryManual=()=>isImageAvailable($('imageChoice').value)?({type:'image',filename:$('imageChoice').value,x:position.x,y:position.y,size:Number($('imageSize').value),rotation:imageRotation}):({type:'blank'});
$('imageChoice').onchange=()=>{syncGallery();manual();};
for(const id of ['imageSize','imageX','imageY'])$(id).oninput=()=>{const x=Number($('imageX').value),y=Number($('imageY').value);if(!Number.isFinite(x)||!Number.isFinite(y))return;position={x:Math.max(-1.5,Math.min(1.5,x)),y:Math.max(-1,Math.min(1,y))};$('imageSizeOut').textContent=$('imageSize').value;if(stim.type!=='blank')manual();};
window.mysteryStimulusChanged=s=>{const nextIdentity=s.type==='image'?'image:'+s.filename:s.type;if(nextIdentity!==inputIdentity&&$('inputSource').value==='direct')invalidateMysteryInput();inputIdentity=nextIdentity;if(s.type==='image'){imageRotation=s.rotation??0;position={x:s.x,y:s.y};$('imageX').value=Number(s.x.toFixed(2));$('imageY').value=Number(s.y.toFixed(2));$('imageSize').value=s.size;$('imageSizeOut').textContent=s.size;$('imageChoice').value=s.filename;syncGallery();}};
window.mysteryDrawMonitor=()=>{ic.fillStyle='#808080';ic.fillRect(0,0,180,120);if(stim.type==='image'&&isImageAvailable(stim.filename)){const a=assets.get(stim.filename);if(a){const side=stim.size*60,scale=Math.min(side/a.width,side/a.height),w=a.width*scale,h=a.height*scale;ic.save();ic.translate((stim.x+1.5)*60,(stim.y+1)*60);ic.rotate((stim.rotation||0)*Math.PI/180);ic.drawImage(a,-w/2,-h/2,w,h);ic.restore();}}mc.drawImage(imageCanvas,0,0,600,400);if($('inputSource').value==='direct')window.mysteryInput(imageCanvas);};
function sendDrive(value,timing={}){send('mysteryDrive',{value,epoch:faceEpoch,timing});}
window.mysteryInput=async(canvas,timing={})=>{const now=performance.now();if(now-lastInput<30)return;lastInput=now;
  if(model==='face'){if(!faceReady||faceBusy||now-faceLast<100)return;faceBusy=true;faceLast=now;const epoch=faceEpoch;const c=document.createElement('canvas');c.width=600;c.height=400;c.getContext('2d').drawImage(canvas,0,0,600,400);try{const bitmap=await createImageBitmap(c);if(!faceWorker||epoch!==faceEpoch||model!=='face'){bitmap.close();faceBusy=false;return;}faceWorker.postMessage({type:'frame',epoch,capturedAt:now,captureWallMs:Date.now(),bitmap},[bitmap]);}catch(err){faceBusy=false;faceStatus(err.message,true);}return;}
  inputContext.drawImage(canvas,0,0,120,80);const data=inputContext.getImageData(0,0,120,80).data;sendDrive(model==='color'?colorDrive(data,120,80):curveDrive(data,curveFilters),timing);
};
// Draw model sensitivity over a clean input copy; never feed this overlay back.
const field=document.createElement('canvas');field.width=120;field.height=80;
function updateField(){
  const m=MODEL[model];
  if(model==='face'){
    field.width=600;field.height=400;const ctx=field.getContext('2d');
    if(facePortrait.complete&&facePortrait.naturalWidth){
      const portrait=document.createElement('canvas');portrait.width=portrait.height=256;const p=portrait.getContext('2d');
      p.drawImage(facePortrait,0,0,256,256);p.globalCompositeOperation='destination-in';
      const fade=p.createRadialGradient(128,128,46,128,128,128);fade.addColorStop(0,'rgba(0,0,0,1)');fade.addColorStop(1,'rgba(0,0,0,0)');p.fillStyle=fade;p.fillRect(0,0,256,256);
      const radius=m.sx*200,cx=(m.x+1.5)*200,cy=(m.y+1)*200;ctx.drawImage(portrait,cx-radius,cy-radius,radius*2,radius*2);
    }
    return;
  }
  field.width=120;field.height=80;const ctx=field.getContext('2d'),im=ctx.createImageData(120,80),weights=new Float32Array(9600);
  if(model==='curve'){for(const f of curveFilters)for(const [i,c]of f.entries)weights[i]-=c;const max=Math.max(...weights.map(Math.abs));for(let i=0;i<weights.length;i++)weights[i]/=max||1;}
  for(let j=0;j<80;j++)for(let i=0;i<120;i++){const n=j*120+i,x=(i+.5)/120*3-1.5,y=(j+.5)/80*2-1,value=model==='curve'?weights[n]:Math.exp(-.5*(((x-m.x)/m.sx)**2+((y-m.y)/m.sy)**2)),strength=Math.abs(value),rgb=model==='color'?[255,220,0]:[0,0,0];im.data.set([...rgb,strength<.07?0:Math.round(strength*255)],n*4);}ctx.putImageData(im,0,0);
}
window.mysteryOverlay=ctx=>{if(!$('showCameraRF').checked)return;ctx.save();ctx.imageSmoothingEnabled=true;ctx.drawImage(field,0,0,600,400);if(model!=='face'){ctx.fillStyle='#07121ae6';ctx.fillRect(8,8,570,24);ctx.fillStyle='#d9f6ed';ctx.font='12px system-ui';ctx.textAlign='left';ctx.fillText(model==='color'?'RF: yellow preference · Gaussian spatial sensitivity':'RF: dark-sensitive arc',15,24);}ctx.restore();};
function chooseModel(){if(recording){$('mysteryType').value=model;return;}if(compiling)cancelCompile();send('stop',{preserveStimulus:true});model=$('mysteryType').value;faceEpoch++;lastInput=faceLast=-Infinity;send('mysteryModel',{model,parameters:MODEL[model],epoch:faceEpoch});$('session').value='MysteryNeuron'+(['color','curve','face'].indexOf(model)+1);updateField();updateMysteryLabels();window.refreshVisualInput?.();if(model==='face')ensureFace().then(()=>{if(model==='face')faceStatus('Face detector ready. Upload human face images to test.');}).catch(e=>faceStatus(e.message,true));else faceStatus('Pixel-driven '+model+' model. Triple-R toggles reveal mode.');}
$('mysteryType').onchange=chooseModel;
const originalWorkerMessage=worker.onmessage;worker.onmessage=e=>{originalWorkerMessage(e);if(e.data.type==='recording'){const locked=e.data.active;$('mysteryType').disabled=locked;$('imageFiles').disabled=locked;$('uploadImages').disabled=locked;$('restoreImages').disabled=locked||!removedAssets.size;closeFileMenu();$('inputSource').disabled=locked;}};
const sourceChanged=$('inputSource').onchange;$('inputSource').onchange=()=>{invalidateMysteryInput();sourceChanged();};
// Reveal is a mode: changing neurons does not turn it off.
const originalSetRFRevealed=setRFRevealed;
setRFRevealed=value=>{originalSetRFRevealed(value);closeFileMenu();if(!value&&stim.type==='image'&&!isImageAvailable(stim.filename)){if(compiling)cancelCompile();send('stop');}else if(!value&&protocolRunning){send('stop',{preserveStimulus:true});}rebuildGallery();updateMysteryLabels();try{sessionStorage.setItem('mystery-reveal',String(value));}catch{}};
function updateMysteryLabels(){const revealed=$('showCameraRF').checked;for(const [i,o]of [...$('mysteryType').options].entries())o.textContent=revealed?['Color selective','Curvature selective','Face selective'][i]:'MysteryNeuron'+(i+1);faceStatus(revealed?('Pixel-driven '+model+' model. Triple-R toggles reveal mode.'):'Mystery neuron ready.');}
let menuImage=null;
function closeFileMenu(){$('fileMenu').hidden=true;menuImage=null;}
function openFileMenu(name,x,y){if(recording){$('imageStatus').textContent='Stop recording before removing images.';return;}menuImage=name;const menu=$('fileMenu');menu.hidden=false;menu.style.left=Math.max(4,Math.min(x,innerWidth-180))+'px';menu.style.top=Math.max(4,Math.min(y,innerHeight-50))+'px';$('removeImage').focus();}
function removeAsset(name){if(recording||!assets.has(name))return;if(compiling)cancelCompile();send('stop');removedAssets.set(name,assets.get(name));assets.delete(name);closeFileMenu();rebuildGallery();$('imageStatus').textContent=name+' removed from this library. Restore files will bring it back.';}
$('removeImage').onclick=()=>removeAsset(menuImage);
document.addEventListener('pointerdown',e=>{if(!$('fileMenu').contains(e.target))closeFileMenu();});
document.addEventListener('keydown',e=>{if(e.key==='Escape')closeFileMenu();});
$('restoreImages').onclick=()=>{if(recording)return;for(const [name,img]of removedAssets){if(!assets.has(name))assets.set(name,img);else addAsset(name,img);}removedAssets.clear();rebuildGallery();$('imageStatus').textContent='Removed files restored, including uploaded images.';};
$('uploadImages').onclick=()=>$('imageFiles').click();
$('protocolInfo').onclick=()=>{const open=$('protocolHelp').hidden;$('protocolHelp').hidden=!open;$('protocolInfo').setAttribute('aria-expanded',String(open));};
$('exerciseSelect').onchange=()=>{if(recording||saved){if(!confirm('Leave this exercise? Download your recording first.')){$('exerciseSelect').value='four';return;}}const number={one:1,two:2,three:3,four:4}[$('exerciseSelect').value];if(number!==4)location.href='./index.html#exercise-'+number;};
// Start with exactly the spatial exercise's scope settings and direct input.
scope.setFilter({highpass:300,lowpass:6000});scope.setThreshold(-70);$('threshold').value=-70;
$('cameraMirror').checked=false;$('inputSource').value='direct';$('inputSource').onchange();
chooseModel();try{setRFRevealed(sessionStorage.getItem('mystery-reveal')==='true');}catch{}$('present').disabled=true;$('run').disabled=true;
samples().catch(e=>{$('imageStatus').textContent=e.message;});
