'use strict';
const $=id=>document.getElementById(id);
const example=`# Orientations × repetitions.
import random

orientations = [0, 30, 60, 90, 120, 150]

for repeat in range(3):
    random.shuffle(orientations)
    for angle in orientations:
        blank(duration=0.5)
        grating(orientation=angle, duration=1.0,
                contrast=1.0, spatial_frequency=5,
                temporal_frequency=2)

blank(duration=1.0)`;
try{$('code').value=localStorage.getItem('visual-rig-protocol')||example;}catch{$('code').value=example;}
$('code').value=$('code').value.replace('; no installation needed.','.');
$('code').addEventListener('input',()=>{try{localStorage.setItem('visual-rig-protocol',$('code').value);}catch{}});
$('code').addEventListener('keydown',e=>{if(e.key==='Tab'){e.preventDefault();const p=e.target.selectionStart;e.target.setRangeText('    ',p,e.target.selectionEnd,'end');}});
const monitor=$('monitor'),mc=monitor.getContext('2d'),image=mc.createImageData(180,120),imageCanvas=document.createElement('canvas');imageCanvas.width=180;imageCanvas.height=120;const ic=imageCanvas.getContext('2d');
const trace=$('trace'),tc=trace.getContext('2d');const scope=new LiveScope(20000);
let clock=0,spikes=[],stim={type:'blank'},stimOnset=0,recording=false,saved=false,protocolRunning=false,compiling=false,pythonWorker=null,compileTimer=null,loadTimer=null,audioCtx=null,sound=false,hidden=false,position={x:0,y:0};
const worker=new Worker('acquisition-worker.js');
const modelDisplay=new NeuronEngine();let cameraRFModel={...modelDisplay.model};
function send(type,data={}){worker.postMessage({type,...data});}
function message(text,error=false){$('codeStatus').textContent=text;$('codeStatus').classList.toggle('error',error);}
function manualStim(){const common={type:$('stimulusKind').value,orientation:Number($('orientation').value),contrast:Number($('contrast').value)/100,...position};return common.type==='bar'?{...common,width:Math.max(.01,Math.min(2,Number($('barWidth').value)||.16)),length:Math.max(.05,Math.min(3,Number($('barLength').value)||1.2))}:{...common,spatial_frequency:Number($('frequency').value),temporal_frequency:Number($('speed').value),phase:0,radius:.9};}
function updateControls(){ $('oriOut').textContent=$('orientation').value+'°';$('conOut').textContent=$('contrast').value+'%';$('sfOut').textContent=$('frequency').value+' cyc/screen';$('speedOut').textContent=$('speed').value+' Hz';document.body.dataset.stimulusKind=$('stimulusKind').value;}
function manual(){if(compiling)cancelCompile();send('stimulus',{stimulus:manualStim()});if(protocolRunning)message('Protocol stopped by manual stimulus control.');}
for(const id of ['orientation','contrast','frequency','speed','barWidth','barLength'])$(id).addEventListener('input',()=>{updateControls();if(stim.type!=='blank')manual();});$('stimulusKind').onchange=()=>{updateControls();if(stim.type!=='blank')manual();};
$('present').onclick=()=>{if(stim.type==='blank')manual();else{if(compiling)cancelCompile();send('stimulus',{stimulus:{type:'blank'}});}};
let stimulusDrag=false;function moveStimulus(e){const r=monitor.getBoundingClientRect();position={x:Math.max(-1.5,Math.min(1.5,(e.clientX-r.left)/r.width*3-1.5)),y:Math.max(-1,Math.min(1,(e.clientY-r.top)/r.height*2-1))};manual();}monitor.addEventListener('pointerdown',e=>{if(stim.type==='blank')return;stimulusDrag=true;monitor.setPointerCapture(e.pointerId);moveStimulus(e);});monitor.addEventListener('pointermove',e=>{if(stimulusDrag)moveStimulus(e);});monitor.addEventListener('pointerup',()=>stimulusDrag=false);monitor.addEventListener('pointercancel',()=>stimulusDrag=false);monitor.addEventListener('wheel',e=>{e.preventDefault();$('orientation').value=(Number($('orientation').value)+(e.deltaY<0?5:-5)+180)%180;updateControls();if(stim.type!=='blank')manual();},{passive:false});
$('example').onclick=()=>{$('code').value=example;try{localStorage.setItem('visual-rig-protocol',example);}catch{}};
function validate(segments){if(!Array.isArray(segments)||!segments.length)throw Error('Your code did not call grating() or blank().');if(segments.length>1000)throw Error('Maximum 1,000 segments.');let duration=0;
  const number=(v,name,min,max)=>{if(typeof v!=='number'||!Number.isFinite(v)||v<min||v>max)throw Error(`${name} must be a number between ${min} and ${max}.`);return v;};
  for(const seg of segments){seg.duration=Math.round(number(seg.duration,'duration',.001,120)*1000)/1000;duration+=seg.duration;const s=seg.stimulus;if(!s||!['blank','grating','bar'].includes(s.type))throw Error('Unknown stimulus type.');
    if(s.type==='bar'){s.orientation=number(s.orientation,'orientation',-3600,3600)%180;s.contrast=number(s.contrast,'contrast',0,1);s.x=number(s.x,'x',-1.5,1.5);s.y=number(s.y,'y',-1,1);s.width=number(s.width,'width',.01,2);s.length=number(s.length,'length',.01,3);}
    if(s.type==='grating'){s.orientation=number(s.orientation,'orientation',-3600,3600)%180;s.contrast=number(s.contrast,'contrast',0,1);s.spatial_frequency=number(s.spatial_frequency,'spatial_frequency',.1,15);s.temporal_frequency=number(s.temporal_frequency,'temporal_frequency',-10,10);s.phase=number(s.phase,'phase',-36000,36000);s.x=number(s.x,'x',-1.5,1.5);s.y=number(s.y,'y',-1,1);s.radius=number(s.radius,'radius',.01,2);}}
  if(duration>300)throw Error('Protocol exceeds the 300-second limit.');return duration;
}
function finishCompile(){clearTimeout(compileTimer);clearTimeout(loadTimer);compiling=false;$('run').disabled=false;$('stopProtocol').disabled=!protocolRunning;}
function cancelCompile(){pythonWorker?.terminate();pythonWorker=null;finishCompile();message('Python stopped. Your code is still in the editor.');}
$('run').onclick=()=>{if(compiling)return;const submittedCode=$('code').value;compiling=true;$('run').disabled=true;$('stopProtocol').disabled=false;
  if(protocolRunning)send('stop');message('Starting browser Python…');
  if(!pythonWorker){pythonWorker=new Worker('python-worker.js');pythonWorker.onerror=()=>{pythonWorker?.terminate();pythonWorker=null;finishCompile();message('Python could not load. Check internet access and try again; manual controls still work.',true);};}
  loadTimer=setTimeout(()=>{cancelCompile();message('Python startup timed out. Check internet access and try again.',true);},120000);
  pythonWorker.onmessage=e=>{const m=e.data;if(m.type==='status'){message(m.message);if(m.message.startsWith('Compiling')){clearTimeout(loadTimer);compileTimer=setTimeout(()=>{cancelCompile();message('Code stopped after 15 seconds. Check for an infinite loop.',true);},15000);}}
    if(m.type==='error'){finishCompile();message(m.message,true);}
    if(m.type==='result'){try{const duration=validate(m.segments);protocolRunning=true;send('protocol',{segments:m.segments,code:submittedCode});finishCompile();message(`Running ${m.segments.length} segments · ${duration.toFixed(1)} s${recording?' · recording':''}.`);}catch(err){finishCompile();message(err.message,true);}}};
  pythonWorker.postMessage({code:submittedCode});
};
$('stopProtocol').onclick=()=>{if(compiling)cancelCompile();send('stop');};
$('record').onclick=()=>{if(recording){$('record').disabled=true;send('stopRecord');return;}if(saved&&!confirm('Replace the previous recording? Download it first if you want to keep it.'))return;
  $('record').disabled=true;send('record',{name:$('session').value.trim()||'session-01',code:$('code').value});};
$('download').onclick=()=>{$('download').disabled=true;send('export');};
function audioClick(){if(!sound||!audioCtx||audioCtx.state!=='running')return;const now=audioCtx.currentTime,osc=audioCtx.createOscillator(),gain=audioCtx.createGain();osc.frequency.value=1600;gain.gain.setValueAtTime(.07,now);gain.gain.exponentialRampToValueAtTime(.0001,now+.012);osc.connect(gain);gain.connect(audioCtx.destination);osc.start(now);osc.stop(now+.013);}
$('audio').onclick=async()=>{try{if(!audioCtx)audioCtx=new(window.AudioContext||window.webkitAudioContext)();await audioCtx.resume();sound=!sound;$('audio').textContent=sound?'Sound on':'Sound off';}catch{message('Sound is unavailable in this browser.',true);}};
function drawRF(){const c=$('rf'),ctx=c.getContext('2d');ctx.fillStyle='#0b1620';ctx.fillRect(0,0,180,120);if(!$('reveal').checked){ctx.fillStyle='#9cabb9';ctx.font='11px system-ui';ctx.textAlign='center';ctx.fillText('Receptive field hidden',90,60);$('modelInfo').textContent='One simulated neuron. Infer its selectivity from stimulus responses.';return;}
  $('modelInfo').textContent='Two Gabor filters in quadrature → energy → stochastic spikes. Preferred bars: 60°. The grid shows the two filter components.';
  for(let q=0;q<2;q++){const im=ctx.createImageData(72,48);for(let i=0;i<modelDisplay.kernel.length;i++){const k=modelDisplay.kernel[i],v=k.env*(q?k.b:k.a),a=Math.abs(v);im.data[4*i]=Math.round(27+a*(v>0?223:30));im.data[4*i+1]=Math.round(38+a*65);im.data[4*i+2]=Math.round(51+a*(v>0?40:204));im.data[4*i+3]=255;}const off=document.createElement('canvas');off.width=72;off.height=48;off.getContext('2d').putImageData(im,0,0);ctx.imageSmoothingEnabled=false;ctx.drawImage(off,q*90,17,90,80);}
  ctx.fillStyle='#9cabb9';ctx.font='9px system-ui';ctx.textAlign='center';ctx.fillText('cosine',45,112);ctx.fillText('sine',135,112);
}
$('reveal').onchange=drawRF;drawRF();
worker.onmessage=e=>{const m=e.data;
  if(m.type==='data'){clock=m.time;const detections=scope.push(m.data);for(let i=0;i<Math.min(detections.length,3);i++)audioClick();if(scope.auto)$('threshold').value=scope.threshold.toFixed(1);$('recTime').textContent=(m.samples/20000).toFixed(1)+' s';$('recSize').textContent=m.samples.toLocaleString()+' samples · '+(m.samples*4/1e6).toFixed(2)+' MB';}
  if(m.type==='stimulus'){stim=m.stimulus;$('present').textContent=stim.type==='blank'?'Show stimulus':'Hide stimulus';$('present').setAttribute('aria-pressed',String(stim.type!=='blank'));stimOnset=m.time;$('stimBadge').textContent=stim.type==='blank'?'GRAY SCREEN':`${stim.orientation}° ${stim.type==='bar'?'BAR':'GRATING'}`;$('stimDetails').textContent=stim.type==='blank'?'Mean luminance · no stimulus':stim.type==='bar'?`Black bar · ${Math.round(stim.contrast*100)}% contrast`:`${stim.spatial_frequency} cyc/screen · ${stim.temporal_frequency} Hz · ${Math.round(stim.contrast*100)}%`;
    if(stim.type==='bar'){$('stimulusKind').value='bar';$('barWidth').value=stim.width;$('barLength').value=stim.length;$('orientation').value=((stim.orientation%180)+180)%180;$('contrast').value=stim.contrast*100;position={x:stim.x,y:stim.y};updateControls();}
    if(stim.type==='grating'){$('stimulusKind').value='grating';$('orientation').value=((stim.orientation%180)+180)%180;$('contrast').value=stim.contrast*100;$('frequency').value=stim.spatial_frequency;$('speed').value=stim.temporal_frequency;position={x:stim.x,y:stim.y};updateControls();}}
  if(m.type==='protocol'){if(['stopped','completed'].includes(m.status)){protocolRunning=false;$('stopProtocol').disabled=!compiling;message(m.status==='completed'?'Protocol complete.':'Protocol stopped.');}else message('Protocol segment '+m.status+(recording?' · recording':''));}
  if(m.type==='recording'){recording=m.active;saved=!recording;$('record').disabled=false;$('record').textContent=recording?'■ Stop recording':'● Start recording';$('download').disabled=recording||!saved;$('recBadge').textContent=recording?'● RECORDING':'RECORDING READY';$('recBadge').style.color=recording?'#ffab84':'#75dcc3';$('recStatus').textContent=recording?'Recording raw voltage and every stimulus change. Limit: 5 minutes. Keep this tab visible.':m.auto?'Five-minute limit reached. Your recording is ready to download.':'Recording stopped. Download the ZIP before closing this tab.';}
  if(m.type==='export'){const encoder=new TextEncoder(),json=x=>encoder.encode(JSON.stringify(x,null,2)),zip=recordingZip([['voltage.bin',m.binary],['metadata.json',json(m.metadata)],['stimuli.json',json(m.stimuli)],['camera_frames.json',json(m.cameraFrames||[])]]);const url=URL.createObjectURL(zip),a=document.createElement('a');a.href=url;a.download=(m.metadata.session.replace(/[^a-zA-Z0-9_-]/g,'_')||'recording')+'_'+m.metadata.created_utc.replace(/[:.]/g,'-')+'.zip';a.click();setTimeout(()=>URL.revokeObjectURL(url),60000);$('download').disabled=false;$('recStatus').textContent='Download requested. The ZIP contains raw voltage, metadata, and stimulus intervals.';}
  if(m.type==='error'){$('record').disabled=false;$('download').disabled=recording||!saved;message(m.message,true);}
};
worker.onerror=()=>{$('rigStatus').textContent='Acquisition error';message('The recording worker could not start. Reload the page.',true);};
document.addEventListener('visibilitychange',()=>{hidden=document.hidden;send('suspend',{value:hidden});$('rigStatus').textContent=hidden?'Paused · tab hidden':'Rig running';});
window.addEventListener('beforeunload',e=>{if(recording||saved){e.preventDefault();e.returnValue='';}});
function drawMonitor(){const s=stim,th=(s.orientation||0)*Math.PI/180,phase=(s.phase||0)*Math.PI/180+2*Math.PI*(s.temporal_frequency||0)*(clock-stimOnset);
  for(let j=0;j<120;j++)for(let i=0;i<180;i++){let v=128;if(s.type==='bar'){const x=(i+.5)/180*3-1.5-s.x,y=(j+.5)/120*2-1-s.y,q=-Math.sin(th)*x+Math.cos(th)*y,p=Math.cos(th)*x+Math.sin(th)*y;if(Math.abs(q)<=s.width/2&&Math.abs(p)<=s.length/2)v=Math.round(127.5*(1-s.contrast));}else if(s.type==='grating'){const x=(i+.5)/180*3-1.5-s.x,y=(j+.5)/120*2-1-s.y;if(x*x+y*y<=s.radius*s.radius){const q=-Math.sin(th)*x+Math.cos(th)*y;v=Math.round(127.5+127.5*s.contrast*Math.cos(Math.PI*s.spatial_frequency*q+phase));}}const n=(j*180+i)*4;image.data[n]=image.data[n+1]=image.data[n+2]=v;image.data[n+3]=255;}
  ic.putImageData(image,0,0);mc.imageSmoothingEnabled=true;mc.drawImage(imageCanvas,0,0,600,400);
  if($('reveal').checked&&$('inputSource').value==='direct'){mc.strokeStyle='#65e2c7';mc.lineWidth=1.5;mc.setLineDash([5,5]);mc.beginPath();mc.ellipse(300,200,90,90,0,0,Math.PI*2);mc.stroke();mc.setLineDash([]);mc.fillStyle='#06261ec9';mc.fillRect(9,9,98,21);mc.fillStyle='#96f8df';mc.font='11px system-ui';mc.fillText('RF center shown',16,24);}}
let lastDraw=0,displayStarted=false,displayError='';
function frame(now){requestAnimationFrame(frame);if(hidden||now-lastDraw<=30)return;try{drawMonitor();if($('inputSource').value==='direct')window.refreshVisualInput?.();drawTrace();lastDraw=now;if(displayError){displayError='';$('rigStatus').textContent='Rig running';}}catch(err){if(displayError!==err.message){displayError=err.message;$('rigStatus').textContent='Display error';$('scopeStatus').textContent='Display error: '+err.message;}}}
function startDisplay(){if(displayStarted)return;displayStarted=true;updateControls();$('rigStatus').textContent='Rig running';requestAnimationFrame(frame);}
// Later scripts define drawTrace and waveform state. Wait for all of them.
if(document.readyState==='complete')startDisplay();else document.addEventListener('DOMContentLoaded',startDisplay,{once:true});
