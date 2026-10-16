'use strict';
const $=id=>document.getElementById(id);
const orientationExample=`# Orientations × repetitions.
import random

orientations = [0, 30, 60, 90, 120, 150]
size = 1.0

for repeat in range(5):
    random.shuffle(orientations)
    for angle in orientations:
        blank(duration=0.5)
        grating(orientation=angle, duration=1.0,
                spatial_frequency=5, temporal_frequency=2,
                size=size)

blank(duration=1.0)`;
const spatialExample=`# Spatial receptive-field mapping.
import random

# Replace this with the preferred orientation from Exercise 2.
orientation = 0
step = 0.4
size = 0.6
repetitions = 2

x_positions = [-1.2 + i * step for i in range(int(2.4 / step) + 1)]
y_positions = [-0.8 + i * step for i in range(int(1.6 / step) + 1)]
positions = [(x, y) for y in y_positions for x in x_positions]

for repeat in range(repetitions):
    order = positions[:]
    random.shuffle(order)  # Comment out this line for an ordered scan.
    for x, y in order:
        blank(duration=0.05)
        grating(orientation=orientation, duration=0.025,
                spatial_frequency=5,
                temporal_frequency=2, x=x, y=y,
                size=size)

blank(duration=1.0)`;
const protocolExamples={two:orientationExample,three:spatialExample};
let protocolExercise=location.hash==='#exercise-3'?'three':'two';
function protocolKey(exercise){return`visual-rig-protocol-v3-${exercise}`;}
function loadProtocolForExercise(exercise){if(!protocolExamples[exercise])return;protocolExercise=exercise;let saved='';try{saved=localStorage.getItem(protocolKey(exercise))||'';}catch{}const oldSpatial=spatialExample.replace('size = 0.6','size = 0.22').replace('blank(duration=0.05)','blank(duration=0.25)').replace('duration=0.025','duration=0.6');if(exercise==='three'&&[oldSpatial,oldSpatial.replace('orientation = 0','orientation = 120'),spatialExample.replace('orientation = 0','orientation = 120')].includes(saved))saved=spatialExample;$('code').value=(saved||protocolExamples[exercise]).replace('; no installation needed.','.');}
window.loadProtocolForExercise=loadProtocolForExercise;loadProtocolForExercise(protocolExercise);
$('code').value=$('code').value.replace('; no installation needed.','.');
$('code').addEventListener('input',()=>{try{localStorage.setItem(protocolKey(protocolExercise),$('code').value);}catch{}});
$('code').addEventListener('keydown',e=>{if(e.key==='Tab'){e.preventDefault();const p=e.target.selectionStart;e.target.setRangeText('    ',p,e.target.selectionEnd,'end');}});
const monitor=$('monitor'),mc=monitor.getContext('2d'),image=mc.createImageData(180,120),imageCanvas=document.createElement('canvas');imageCanvas.width=180;imageCanvas.height=120;const ic=imageCanvas.getContext('2d');
const trace=$('trace'),tc=trace.getContext('2d');const scope=new LiveScope(20000);
let clock=0,spikes=[],stim={type:'blank'},stimOnset=0,recording=false,saved=false,protocolRunning=false,compiling=false,pythonWorker=null,compileTimer=null,loadTimer=null,audioCtx=null,audioKeepalive=null,sound=true,audioVoice='soft',hidden=false,position={x:0,y:0};
try{const savedVoice=localStorage.getItem('visual-rig-sound');if(['classic','soft'].includes(savedVoice))audioVoice=savedVoice;}catch{}
const worker=new Worker('acquisition-worker.js');
const modelDisplay=new NeuronEngine();let cameraRFModel={...modelDisplay.model};
function send(type,data={}){worker.postMessage({type,...data});}
function message(text,error=false){$('codeStatus').textContent=text;$('codeStatus').classList.toggle('error',error);}
function manualStim(){const common={type:$('stimulusKind').value,orientation:Number($('orientation').value),contrast:1,...position};return common.type==='bar'?{...common,width:Math.max(.01,Math.min(2,Number($('barWidth').value)||.16)),length:Math.max(.05,Math.min(3,Number($('barLength').value)||1.2))}:{...common,spatial_frequency:Number($('frequency').value),temporal_frequency:Number($('speed').value),phase:0,radius:Math.max(.1,Math.min(1.4,Number($('gratingSize').value)/100||.9))};}
function updateControls(){ $('oriOut').textContent=$('orientation').value+'°';$('sizeOut').textContent=$('gratingSize').value+'%';$('sfOut').textContent=$('frequency').value+' cyc/screen';$('speedOut').textContent=$('speed').value+' Hz';document.body.dataset.stimulusKind=$('stimulusKind').value;}
function manual(){if(compiling)cancelCompile();send('stimulus',{stimulus:manualStim()});if(protocolRunning)message('Protocol stopped by manual stimulus control.');}
for(const id of ['orientation','gratingSize','frequency','speed','barWidth','barLength'])$(id).addEventListener('input',()=>{updateControls();if(stim.type!=='blank')manual();});$('stimulusKind').onchange=()=>{updateControls();if(stim.type!=='blank')manual();};
$('present').onclick=()=>{if(stim.type==='blank')manual();else{if(compiling)cancelCompile();send('stimulus',{stimulus:{type:'blank'}});}};
let stimulusDrag=false;function moveStimulus(e){const r=monitor.getBoundingClientRect();position={x:Math.max(-1.5,Math.min(1.5,(e.clientX-r.left)/r.width*3-1.5)),y:Math.max(-1,Math.min(1,(e.clientY-r.top)/r.height*2-1))};manual();}monitor.addEventListener('pointerdown',e=>{if(stim.type==='blank')return;stimulusDrag=true;monitor.setPointerCapture(e.pointerId);moveStimulus(e);});monitor.addEventListener('pointermove',e=>{if(stimulusDrag)moveStimulus(e);});monitor.addEventListener('pointerup',()=>stimulusDrag=false);monitor.addEventListener('pointercancel',()=>stimulusDrag=false);monitor.addEventListener('wheel',e=>{e.preventDefault();$('orientation').value=(Number($('orientation').value)+(e.deltaY<0?5:-5)+180)%180;updateControls();if(stim.type!=='blank')manual();},{passive:false});
$('example').onclick=()=>{const example=protocolExamples[protocolExercise]||orientationExample;$('code').value=example;try{localStorage.setItem(protocolKey(protocolExercise),example);}catch{}};
function validate(segments){if(!Array.isArray(segments)||!segments.length)throw Error('Your code did not call grating() or blank().');if(segments.length>1000)throw Error('Maximum 1,000 segments.');let duration=0;
  const number=(v,name,min,max)=>{if(typeof v!=='number'||!Number.isFinite(v)||v<min||v>max)throw Error(`${name} must be a number between ${min} and ${max}.`);return v;};
  for(const seg of segments){seg.duration=Math.round(number(seg.duration,'duration',.001,120)*1000)/1000;duration+=seg.duration;const s=seg.stimulus;if(!s||!['blank','grating','bar'].includes(s.type))throw Error('Unknown stimulus type.');
    if(s.type==='bar'){s.orientation=number(s.orientation,'orientation',-3600,3600)%180;s.contrast=number(s.contrast,'contrast',0,1);s.x=number(s.x,'x',-1.5,1.5);s.y=number(s.y,'y',-1,1);s.width=number(s.width,'width',.01,2);s.length=number(s.length,'length',.01,3);}
    if(s.type==='grating'){s.orientation=number(s.orientation,'orientation',-3600,3600)%180;s.contrast=number(s.contrast,'contrast',0,1);s.spatial_frequency=number(s.spatial_frequency,'spatial_frequency',.1,15);s.temporal_frequency=number(s.temporal_frequency,'temporal_frequency',-10,10);s.phase=number(s.phase,'phase',-36000,36000);s.x=number(s.x,'x',-1.5,1.5);s.y=number(s.y,'y',-1,1);s.radius=number(s.radius,'radius',.01,2);}}
  if(duration>300)throw Error('Protocol exceeds the 300-second limit.');return duration;
}
function updateProtocolButton(){const active=compiling||protocolRunning;$('run').textContent=active?'Stop protocol':'Run protocol';$('run').setAttribute('aria-pressed',String(active));$('run').dataset.state=compiling?'preparing':protocolRunning?'running':'idle';$('run').title=compiling?'Cancel Python startup or compilation':active?'Stop the running stimulus protocol':'Run the stimulus protocol';$('run').disabled=false;}
function finishCompile(){clearTimeout(compileTimer);clearTimeout(loadTimer);compiling=false;updateProtocolButton();}
function cancelCompile(){pythonWorker?.terminate();pythonWorker=null;finishCompile();message('Python stopped. Your code is still in the editor.');}
$('run').onclick=()=>{if(compiling){cancelCompile();return;}if(protocolRunning){$('run').disabled=true;send('stop');return;}const submittedCode=$('code').value;compiling=true;updateProtocolButton();
  message('Starting browser Python…');
  if(!pythonWorker){pythonWorker=new Worker('python-worker.js');pythonWorker.onerror=()=>{pythonWorker?.terminate();pythonWorker=null;finishCompile();message('Python could not load. Check internet access and try again; manual controls still work.',true);};}
  loadTimer=setTimeout(()=>{cancelCompile();message('Python startup timed out. Check internet access and try again.',true);},120000);
  pythonWorker.onmessage=e=>{const m=e.data;if(m.type==='status'){message(m.message);if(m.message.startsWith('Compiling')){clearTimeout(loadTimer);compileTimer=setTimeout(()=>{cancelCompile();message('Code stopped after 15 seconds. Check for an infinite loop.',true);},15000);}}
    if(m.type==='error'){finishCompile();message(m.message,true);}
    if(m.type==='result'){try{const duration=validate(m.segments);protocolRunning=true;send('protocol',{segments:m.segments,code:submittedCode});finishCompile();message(`Running ${m.segments.length} segments · ${duration.toFixed(1)} s${recording?' · recording':''}.`);}catch(err){finishCompile();message(err.message,true);}}};
  pythonWorker.postMessage({code:submittedCode});
};
$('record').onclick=()=>{if(recording){$('record').disabled=true;send('stopRecord');return;}if(saved&&!confirm('Replace the previous recording? Download it first if you want to keep it.'))return;
  $('record').disabled=true;send('record',{name:$('session').value.trim()||'orientation-tuning',code:$('code').value});};
$('download').onclick=()=>downloadLastRecording();
function setRFRevealed(value){$('reveal').checked=value;$('showCameraRF').checked=value;drawRF();window.refreshVisualInput?.();}
let rfKeyTimes=[];
document.addEventListener('keydown',e=>{const target=e.target,editing=target.matches?.('input,textarea,select')||target.isContentEditable;if(editing||e.repeat||e.ctrlKey||e.altKey||e.metaKey||e.key.toLowerCase()!=='r')return;const now=performance.now();rfKeyTimes=rfKeyTimes.filter(time=>now-time<900);rfKeyTimes.push(now);if(rfKeyTimes.length===3){setRFRevealed(!$('showCameraRF').checked);rfKeyTimes=[];}});
function classicClick(){const now=audioCtx.currentTime,osc=audioCtx.createOscillator(),gain=audioCtx.createGain();osc.frequency.value=1600;gain.gain.setValueAtTime(.09,now);gain.gain.exponentialRampToValueAtTime(.0001,now+.028);osc.connect(gain);gain.connect(audioCtx.destination);osc.onended=()=>{osc.disconnect();gain.disconnect();};osc.start(now);osc.stop(now+.03);}
function softSpike(){const fs=audioCtx.sampleRate,buffer=audioCtx.createBuffer(1,Math.round(fs*.008),fs),samples=buffer.getChannelData(0),width=.00055;for(let i=0;i<samples.length;i++){const t=i/fs;samples[i]=-Math.exp(-.5*((t-.0025)/width)**2)+.45*Math.exp(-.5*((t-.00349)/(1.4*width))**2);}const source=audioCtx.createBufferSource(),filter=audioCtx.createBiquadFilter(),gain=audioCtx.createGain();source.buffer=buffer;filter.type='lowpass';filter.frequency.value=600;gain.gain.value=.12*(.85+Math.random()*.3);source.connect(filter).connect(gain).connect(audioCtx.destination);source.onended=()=>{source.disconnect();filter.disconnect();gain.disconnect();};source.start();}
function audioClick(){if(!sound||!audioCtx||audioCtx.state!=='running')return;(audioVoice==='soft'?softSpike:classicClick)();}
function startAudioKeepalive(){if(audioKeepalive||!audioCtx)return;const osc=audioCtx.createOscillator(),gain=audioCtx.createGain();osc.frequency.value=90;gain.gain.value=.00001;osc.connect(gain);gain.connect(audioCtx.destination);osc.start();audioKeepalive={osc,gain};}
function stopAudioKeepalive(){if(!audioKeepalive)return;audioKeepalive.osc.stop();audioKeepalive.osc.disconnect();audioKeepalive.gain.disconnect();audioKeepalive=null;}
async function unlockAudio(){if(!sound)return;try{if(!audioCtx)audioCtx=new(window.AudioContext||window.webkitAudioContext)();if(audioCtx.state!=='running')await audioCtx.resume();if(sound&&audioCtx.state==='running')startAudioKeepalive();}catch{message('Sound is unavailable in this browser.',true);}}
document.addEventListener('pointerdown',()=>{if(sound&&audioCtx?.state!=='running')unlockAudio();},{capture:true});
document.addEventListener('keydown',()=>{if(sound&&audioCtx?.state!=='running')unlockAudio();},{capture:true});
const audioButton=$('audio'),audioMenu=$('audioMenu');
function closeAudioMenu(){audioMenu.hidden=true;}
function updateAudioMenu(){for(const button of audioMenu.querySelectorAll('button')){const selected=button.dataset.sound===audioVoice;button.setAttribute('aria-checked',String(selected));button.textContent=(selected?'✓ ':'')+(button.dataset.sound==='classic'?'Click':'Soft spike');}}
audioButton.onclick=async()=>{closeAudioMenu();sound=!sound;audioButton.innerHTML=sound?'<span aria-hidden="true">🔊</span> Sound on':'<span aria-hidden="true">🔇</span> Sound off';audioButton.setAttribute('aria-pressed',String(sound));if(sound)await unlockAudio();else stopAudioKeepalive();};
audioButton.addEventListener('contextmenu',e=>{e.preventDefault();updateAudioMenu();audioMenu.hidden=false;const box=audioMenu.getBoundingClientRect();audioMenu.style.left=Math.max(6,Math.min(e.clientX,innerWidth-box.width-6))+'px';audioMenu.style.top=Math.max(6,Math.min(e.clientY,innerHeight-box.height-6))+'px';});
audioMenu.onclick=async e=>{const button=e.target.closest('[data-sound]');if(!button)return;audioVoice=button.dataset.sound;try{localStorage.setItem('visual-rig-sound',audioVoice);}catch{}closeAudioMenu();if(sound){await unlockAudio();audioClick();}};
document.addEventListener('pointerdown',e=>{if(!audioMenu.hidden&&!audioMenu.contains(e.target))closeAudioMenu();});
document.addEventListener('keydown',e=>{if(e.key==='Escape')closeAudioMenu();});
// Pure black/white RF lobes; alpha follows normalized magnitude up to 100%.
// Values below 7% of peak magnitude are fully transparent.
// This affects the reveal drawing only, not the neuron's actual filter.
const rfImageCache=new Map();
function drawReceptiveFieldOverlay(context,m,width=600,height=400){
  const key=JSON.stringify([m.type,m.orientation,m.spatial_frequency,m.sigma,m.aspect,m.x,m.y]);
  let canvas=rfImageCache.get(key);
  if(!canvas){canvas=document.createElement('canvas');canvas.width=300;canvas.height=200;const c=canvas.getContext('2d'),pixels=c.createImageData(300,200),weights=new Float32Array(60000),theta=m.orientation*Math.PI/180;let peak=0;
    for(let j=0;j<200;j++)for(let i=0;i<300;i++){const dx=(i+.5)/300*3-1.5-m.x,dy=(j+.5)/200*2-1-m.y,q=-Math.sin(theta)*dx+Math.cos(theta)*dy,p=Math.cos(theta)*dx+Math.sin(theta)*dy,env=Math.exp(-(q*q+m.aspect*m.aspect*p*p)/(2*m.sigma*m.sigma)),arg=Math.PI*m.spatial_frequency*q,value=env*(m.type==='V1 simple Gabor cell'?Math.sin(arg):Math.cos(arg));weights[j*300+i]=value;peak=Math.max(peak,Math.abs(value));}
    const cutoff=.07,peakAlpha=1;
    for(let i=0;i<weights.length;i++){const value=weights[i]/(peak||1),shade=value>=0?255:0;pixels.data[i*4]=pixels.data[i*4+1]=pixels.data[i*4+2]=shade;pixels.data[i*4+3]=Math.abs(value)<cutoff?0:Math.round(peakAlpha*255*Math.abs(value));}
    c.putImageData(pixels,0,0);if(rfImageCache.size>16)rfImageCache.clear();rfImageCache.set(key,canvas);
  }
  context.save();context.imageSmoothingEnabled=true;context.drawImage(canvas,0,0,width,height);context.restore();
}
function drawRF(){const c=$('rf'),ctx=c.getContext('2d');ctx.fillStyle='#808080';ctx.fillRect(0,0,180,120);if(!$('reveal').checked){$('modelInfo').textContent='One simulated neuron. Infer its selectivity from stimulus responses.';return;}
  const m=cameraRFModel;drawReceptiveFieldOverlay(ctx,m,180,120);$('modelInfo').textContent=m.type==='V1 simple Gabor cell'?'Odd-phase Gabor: one light-preferring lobe and one dark-preferring lobe.':'Complex-cell Gabor energy model. The overlay shows one of its two quadrature components.';
}
$('reveal').onchange=drawRF;drawRF();
worker.onmessage=e=>{const m=e.data;
  if(m.type==='data'){clock=m.time;const detections=scope.push(m.data);for(let i=0;i<Math.min(detections.length,3);i++)audioClick();if(scope.auto)$('threshold').value=scope.threshold.toFixed(1);$('recTime').textContent=(m.samples/20000).toFixed(1)+' s';$('recSize').textContent=m.samples.toLocaleString()+' samples · '+(m.samples*4/1e6).toFixed(2)+' MB';}
  if(m.type==='stimulus'){stim=m.stimulus;$('present').textContent=stim.type==='blank'?'Show stimulus':'Hide stimulus';$('present').setAttribute('aria-pressed',String(stim.type!=='blank'));stimOnset=m.time;$('stimBadge').textContent=stim.type==='blank'?'GRAY SCREEN':`${stim.orientation}° ${stim.type==='bar'?'BAR':'GRATING'}`;$('stimDetails').textContent=stim.type==='blank'?'Mean luminance · no stimulus':stim.type==='bar'?'Black bar':`${stim.spatial_frequency} cyc/screen · ${stim.temporal_frequency} Hz · ${Math.round(stim.radius*100)}% size`;
    if(stim.type==='bar'){$('stimulusKind').value='bar';$('barWidth').value=stim.width;$('barLength').value=stim.length;$('orientation').value=((stim.orientation%180)+180)%180;position={x:stim.x,y:stim.y};updateControls();}
    if(stim.type==='grating'){$('stimulusKind').value='grating';$('orientation').value=((stim.orientation%180)+180)%180;$('gratingSize').value=Math.round(stim.radius*100);$('frequency').value=stim.spatial_frequency;$('speed').value=stim.temporal_frequency;position={x:stim.x,y:stim.y};updateControls();}}
  if(m.type==='protocol'){if(['stopped','completed'].includes(m.status)){protocolRunning=false;updateProtocolButton();message(m.status==='completed'?'Protocol complete.':'Protocol stopped.');}else{protocolRunning=true;updateProtocolButton();message('Protocol segment '+m.status+(recording?' · recording':''));}}
  if(m.type==='recording'){recording=m.active;saved=!!lastRecording;$('record').disabled=false;$('record').textContent=recording?'■ Stop recording':'● Start recording';$('record').setAttribute('aria-pressed',String(recording));$('recBadge').textContent=recording?'● RECORDING':'READY';$('recBadge').style.color=recording?'#ffab84':'#75dcc3';updateLastRecording();$('recStatus').textContent=recording?'Recording in progress · maximum 5 minutes.':'Saving last recording…';if(!recording){$('record').disabled=true;send('export');}}
  if(m.type==='export')storeLastRecording(m);
  if(m.type==='error'){$('record').disabled=false;$('download').disabled=recording||!saved;message(m.message,true);}
};
worker.onerror=()=>{$('rigStatus').textContent='Acquisition error';message('The recording worker could not start. Reload the page.',true);};
document.addEventListener('visibilitychange',()=>{hidden=document.hidden;send('suspend',{value:hidden});$('rigStatus').textContent=hidden?'Paused · tab hidden':'Rig running';});
function drawMonitor(){const s=stim,th=(s.orientation||0)*Math.PI/180,phase=(s.phase||0)*Math.PI/180+2*Math.PI*(s.temporal_frequency||0)*(clock-stimOnset);
  for(let j=0;j<120;j++)for(let i=0;i<180;i++){let v=128;if(s.type==='bar'){const x=(i+.5)/180*3-1.5-s.x,y=(j+.5)/120*2-1-s.y,q=-Math.sin(th)*x+Math.cos(th)*y,p=Math.cos(th)*x+Math.sin(th)*y;if(Math.abs(q)<=s.width/2&&Math.abs(p)<=s.length/2)v=Math.round(127.5*(1-s.contrast));}else if(s.type==='grating'){const x=(i+.5)/180*3-1.5-s.x,y=(j+.5)/120*2-1-s.y;if(x*x+y*y<=s.radius*s.radius){const q=-Math.sin(th)*x+Math.cos(th)*y;v=Math.round(127.5+127.5*s.contrast*Math.cos(Math.PI*s.spatial_frequency*q+phase));}}const n=(j*180+i)*4;image.data[n]=image.data[n+1]=image.data[n+2]=v;image.data[n+3]=255;}
  ic.putImageData(image,0,0);mc.imageSmoothingEnabled=true;mc.drawImage(imageCanvas,0,0,600,400);
  if($('reveal').checked&&$('inputSource').value==='direct')drawReceptiveFieldOverlay(mc,cameraRFModel);}

let lastDraw=0,displayStarted=false,displayError='';
function frame(now){requestAnimationFrame(frame);if(hidden||now-lastDraw<=30)return;try{drawMonitor();if($('inputSource').value==='direct')window.refreshVisualInput?.();drawTrace();lastDraw=now;if(displayError){displayError='';$('rigStatus').textContent='Rig running';}}catch(err){if(displayError!==err.message){displayError=err.message;$('rigStatus').textContent='Display error';$('scopeStatus').textContent='Display error: '+err.message;}}}
function startDisplay(){if(displayStarted)return;displayStarted=true;updateControls();$('rigStatus').textContent='Rig running';requestAnimationFrame(frame);}
// Later scripts define drawTrace and waveform state. Wait for all of them.
if(document.readyState==='complete')startDisplay();else document.addEventListener('DOMContentLoaded',startDisplay,{once:true});
