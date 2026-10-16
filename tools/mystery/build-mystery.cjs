// Bundle the unchanged exercise-3 rig, with narrowly scoped mystery adapters.
const fs=require('fs'),path=require('path');
const bundled=fs.existsSync(path.join(__dirname,'../../dist/engine.js'));
const root=process.env.MYSTERY_RIG_DIST||path.join(__dirname,bundled?'../../dist':'site-update/VirtualEphysRig-github/dist');
const read=n=>fs.readFileSync(path.join(root,n),'utf8').replace(/\r\n/g,'\n');
function swap(s,a,b){if(!s.includes(a))throw Error('Missing integration point: '+a.slice(0,90));return s.replace(a,b);}
let engine=read('engine.js');
engine=swap(engine,"stimulusDrive(t){", "stimulusDrive(t){if(this.mystery)return this.n-this.cameraSample<this.fs*.3?this.cameraDrive:0;");
let acq=read('acquisition-worker.js').replace(/importScripts\([^;]+;/g,'');
acq=swap(acq,"if(m.type==='stop')engine.stopProtocol();","if(m.type==='stop')engine.stopProtocol(!m.preserveStimulus);");
acq=swap(acq,"if(m.type==='stimulus')",`if(m.type==='mysteryModel'){engine.configureModel({...exerciseThreeModel(),type:'Mystery '+m.model,...m.parameters},{exercise:'mystery',neuron:m.model});engine.mystery=true;engine.mysteryEpoch=m.epoch;}
  if(m.type==='mysteryDrive'&&(m.epoch===undefined||m.epoch===engine.mysteryEpoch)){engine.cameraDrive=m.value;engine.cameraSample=engine.n;if(engine.recording)engine.recording.cameraFrames.push({sample:engine.n-engine.recording.start,time_s:(engine.n-engine.recording.start)/engine.fs,drive:m.value,...m.timing});}
  if(m.type==='mysteryEpoch'){engine.mysteryEpoch=m.epoch;engine.cameraDrive=0;engine.cameraSample=-Infinity;}
  if(m.type==='stimulus')`);
const acquisition=engine+'\n'+read('exercise-one-model.js')+'\n'+read('exercise-two-model.js')+'\n'+acq;
let py=read('python-worker.js');
py=swap(py,'def blank(duration=0.5):',`def image(filename, duration=1, x=0, y=0, size=0.5, rotation=0):
    _segments.append({'duration':duration,'stimulus':{'type':'image','filename':filename,'x':x,'y':y,'size':size,'rotation':rotation}})
    if len(_segments)>1000: raise ValueError('Maximum 1,000 segments.')

def blank(duration=0.5):`);
let app=read('app.js');
app=swap(app,"new Worker('acquisition-worker.js')","makeWorker(ACQUISITION_SOURCE)");
app=swap(app,"new Worker('python-worker.js')","makeWorker(PYTHON_SOURCE)");
app=swap(app,"if(!s||!['blank','grating','bar'].includes(s.type))","if(!s||!['blank','grating','bar','image'].includes(s.type))");
app=swap(app,"if(s.type==='bar'){s.orientation=",`if(s.type==='image'){if(!isImageAvailable(s.filename))throw Error('Image is unavailable: '+s.filename+'. Upload it or enable reveal mode for instructor samples.');s.x=number(s.x,'x',-1.5,1.5);s.y=number(s.y,'y',-1,1);s.size=number(s.size,'size',.05,2);s.rotation=((number(s.rotation??0,'rotation',-36000,36000)%360)+360)%360;}
    if(s.type==='bar'){s.orientation=`);
// The original manual events call this adapter, preserving existing drag behavior.
app=swap(app,'function manualStim(){','function manualStim(){if(window.mysteryManual)return window.mysteryManual();');
app=swap(app,"if(m.type==='stimulus'){stim=m.stimulus;","if(m.type==='stimulus'){stim=m.stimulus;window.mysteryStimulusChanged?.(stim);");
app=swap(app,'function drawMonitor(){','function drawMonitor(){if(window.mysteryDrawMonitor){window.mysteryDrawMonitor();return;}');
app=app.replaceAll('visual-rig-protocol-v3-','mystery-rig-protocol-v1-');
let camera=read('camera.js');
camera=swap(camera,"function drawRFOverlay(){","function drawRFOverlay(){if(window.mysteryOverlay){window.mysteryOverlay(vc);return;}");
camera=swap(camera,"worker.postMessage({type:'cameraFrame',gray,timing:{capture_wall_ms:Date.now(),camera_media_time_s:mediaTime}},[gray.buffer]);","window.mysteryInput?.(processing,{capture_wall_ms:Date.now(),camera_media_time_s:mediaTime});");
let html=read('index.html');
html=swap(html,'<link rel="stylesheet" href="style.css">','<style>'+read('style.css')+`\n.protocolBadge{display:flex;align-items:center;gap:7px}.protocolInfo{border:1px solid #617d90;background:#203747;color:#dbf4ff;width:23px;height:23px;padding:0;border-radius:50%;font:600 14px Georgia,serif}.protocolHelp{padding:12px;border:1px solid #4a5f70;border-radius:7px;margin-bottom:12px;background:#101c27;color:#bfd2de;font-size:12px}.protocolHelp[hidden]{display:none}.protocolHelp code{font-size:11px}.protocolHelp pre{white-space:pre-wrap}.imageGallery{display:flex;gap:6px;overflow:auto;padding:8px 0}.imageGallery button{flex:0 0 78px;padding:4px;background:#172735;color:#b7c7d4;font-size:10px}.imageGallery img{width:68px;height:48px;object-fit:contain;background:#808080}.imageGallery button[aria-pressed=true]{outline:2px solid #75dcc3}.imageUpload{margin-top:12px}.imageUpload input{max-width:100%}.imageUpload label{display:block}.imageControls{display:grid;grid-template-columns:minmax(120px,1fr) 90px 90px;align-items:end;gap:12px;margin-top:10px}.imageControls input{width:100%;box-sizing:border-box}.imageControls label{min-width:0}.uploadActions{display:flex;gap:8px;align-items:center;flex-wrap:wrap}#imageFiles{display:none!important}.fileMenu{position:fixed;z-index:10000;padding:6px;border:1px solid #487083;border-radius:8px;background:#152530}.fileMenu[hidden]{display:none}.fileMenu button{display:block}.imageGallery button:focus-visible{outline:2px solid #75dcc3}@media(max-width:460px){.imageControls{grid-template-columns:1fr 1fr}.imageControls label:first-child{grid-column:1/-1}}.stimulusPicker,.stimulusPrimary,.gratingControls,.barControls{display:none!important}.imageUpload .hint{margin:4px 0}.version{font-size:12px!important}\n</style>`);
html=html.replace(/prototype \d+/,'mystery exercise');
// Keep the shared Exercise selector in its original slot on every page.
html=swap(html,'<label class="neuronSlot" aria-hidden="true">Neuron<select disabled tabindex="-1"><option>MysteryNeuron1</option></select></label>','<label>Neuron<select id="mysteryType"><option value="color">MysteryNeuron1</option><option value="curve">MysteryNeuron2</option><option value="face">MysteryNeuron3</option></select></label>');
html=swap(html,'<option value="four">4 · Mystery neuron</option>','<option value="four" selected>4 · Mystery neuron</option>');
html=swap(html,'<body>','<body data-exercise="three">');
html=swap(html,'<div class="monitorStand" aria-hidden="true"></div>',`<div class="monitorStand" aria-hidden="true"></div>
<div class="imageUpload"><div class="uploadActions"><button id="uploadImages" type="button" class="secondary">Upload images</button><button id="restoreImages" type="button" class="ghost" disabled>Restore files</button><span id="fileCount" class="hint"></span><input id="imageFiles" type="file" accept="image/png,image/jpeg,image/webp" multiple aria-label="Upload stimulus images"></div><div id="fileMenu" class="fileMenu" role="menu" hidden><button id="removeImage" type="button" role="menuitem">Remove image</button></div><div id="imageGallery" class="imageGallery" aria-label="Image library"></div><label>Image<select id="imageChoice"></select></label><div class="imageControls"><label>Size <output id="imageSizeOut">0.6</output><input id="imageSize" type="range" min="0.1" max="2" step="0.05" value="0.6"></label><label>X<input id="imageX" type="number" min="-1.5" max="1.5" step="0.1" value="0"></label><label>Y<input id="imageY" type="number" min="-1" max="1" step="0.1" value="0"></label></div><p id="imageStatus" class="hint">Images keep their aspect ratio. Right-click a thumbnail to remove it; Restore files brings it back.</p></div>`);
html=swap(html,'Wheel over the monitor to rotate the stimulus. Drag it to change its position. Click Show stimulus to toggle it on/off.','Drag the image to change its position. Use Size to resize it. Click Show stimulus to toggle it on/off.');
html=html.replace('Write a sequence, then run it on the rig. <code>grating(...)</code> or <code>bar(...)</code> presents a stimulus;','Write a sequence, then run it on the rig. <code>image(filename, ...)</code> presents an uploaded or sample image;');
html=html.replace('<code>grating(orientation=0, duration=1, spatial_frequency=5, temporal_frequency=2, phase=0, x=0, y=0, size=0.9)</code>','<code>image("grating_1.png", duration=1, x=0, y=0, size=0.6)</code>');
html=html.replace('Orientation describes bar angle (0° = horizontal). Phase is in degrees. Spatial frequency is cycles per screen height. Position and size use screen half-height units; x spans −1.5…1.5 and y spans −1…1.','Position and square image size use screen half-height units; x spans −1.5…1.5 and y spans −1…1 (positive downward). Size 1 fills half the screen height. Images retain their aspect ratio.');
html=swap(html,'<span class="badge">PYTHON</span>','<div class="protocolBadge"><span class="badge">PYTHON</span><button id="protocolInfo" type="button" class="protocolInfo" aria-label="Python protocol help" aria-expanded="false" aria-controls="protocolHelp" title="What can I do in Python?">i</button></div>');
html=html.replace(/<details><summary>Available stimulus parameters<\/summary>[\s\S]*?<\/details>/,'');
html=swap(html,'<textarea id="code"',`<div id="protocolHelp" class="protocolHelp" role="region" aria-label="Python protocol options" hidden>
<p><strong>Present an image</strong><br><code>image("my_image.png", duration=1, x=0, y=0, size=0.6, rotation=0)</code></p>
<p>Use an exact filename from the image library. Upload PNG, JPEG or WebP images. <code>blank(duration=0.5)</code> inserts a gray interval. Durations are seconds.</p>
<p><strong>Position and size:</strong> x spans −1.5…1.5; y spans −1…1, positive downward. Size is the longest side of the image in screen half-height units; size 1 fills half the screen height. Aspect ratio is preserved.</p>
<p><strong>Rotation:</strong> <code>rotation</code> is clockwise degrees around the image center. 0 keeps its original orientation. For example:</p>
<pre><code>for angle in range(0, 360, 30):
    blank(duration=0.5)
    image("my_curve.png", duration=1,
          x=0, y=0, size=0.8, rotation=angle)</code></pre>
<p>Replace <code>my_curve.png</code> with your uploaded filename. Combine images, positions, sizes and rotations using Python loops, lists, <code>math</code>, and <code>random</code>. The code builds a sequence before presentation. Maximum: 300 seconds / 1,000 segments. Image name, position, size and rotation are saved with each presentation.</p></div><textarea id="code"`);
const scripts=['engine.js','scope.js','recording.js','exercise-one-model.js','exercise-two-model.js','app.js','camera.js','scope-ui.js','monitor-window.js','camera-window.js','waveform-window.js','panel-resize.js'];
const inline=s=>'<script>'+s.replace(/<\/script/gi,'<\\/script')+'</script>';
const models=fs.readFileSync(path.join(__dirname,'mystery-models.js'),'utf8');
const faceData='data:image/png;base64,'+fs.readFileSync(path.join(__dirname,'mystery-face.png')).toString('base64');
const bundle=inline('const FACE_ASSET='+JSON.stringify(faceData)+';const ACQUISITION_SOURCE='+JSON.stringify(acquisition)+';const PYTHON_SOURCE='+JSON.stringify(py)+';\n'+models)+scripts.map(n=>inline(n==='app.js'?app:n==='camera.js'?camera:read(n))).join('\n')+inline(fs.readFileSync(path.join(__dirname,'mystery-adapter.js'),'utf8'));
html=html.replace(/<script src="engine.js">[\s\S]*?<\/body>/,bundle+'\n</body>');
fs.writeFileSync(process.env.MYSTERY_OUTPUT||path.join(bundled?root:__dirname,'mystery-neuron.html'),html);
// Parse all bundled scripts, including the two worker programs.
const vm=require('vm');for(const s of html.matchAll(/<script>([\s\S]*?)<\/script>/g))new vm.Script(s[1]);new vm.Script(acquisition);new vm.Script(py);
console.log('Built standalone mystery-neuron.html from exercise 3; all scripts parse.');
