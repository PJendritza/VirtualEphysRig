importScripts('engine.js');
importScripts('exercise-one-model.js','exercise-two-model.js');
const engine=new NeuronEngine();engine.setInputSource('direct');let suspended=false;
engine.onStimulus=e=>postMessage({type:'stimulus',...e});engine.onProtocol=status=>postMessage({type:'protocol',status});
setInterval(()=>{if(suspended)return;const r=engine.advance(20);postMessage({type:'data',time:r.time,spikes:r.spikes,data:r.data,recording:!!engine.recording,samples:engine.recording?.sampleCount??engine.saved?.sampleCount??0},[r.data.buffer]);
  if(engine.recording&&engine.recording.sampleCount>=engine.fs*300){engine.stopRecording();postMessage({type:'recording',active:false,auto:true});}
},20);
onmessage=e=>{const m=e.data;try{
  if(m.type==='stimulus'){engine.stopProtocol(false);engine.setStimulus(m.stimulus);}
  if(m.type==='protocol')engine.startProtocol(m.segments,m.code);
  if(m.type==='stop')engine.stopProtocol();
  if(m.type==='exerciseProfile'){if(m.exercise==='one'){engine.configureModel(exerciseOneModel(),{exercise:'one'});engine.setInputSource('webcam');}else if(m.exercise==='two'){engine.configureModel(exerciseTwoModel(),{exercise:'two'});engine.setInputSource('webcam');}else if(m.exercise==='three'){engine.configureModel(exerciseThreeModel(),{exercise:'three'});engine.setInputSource('webcam');}postMessage({type:'exerciseReady',exercise:m.exercise});}
  if(m.type==='inputSource')engine.setInputSource(m.source);
  if(m.type==='cameraFrame'){const result=engine.cameraFrame(m.gray,m.timing);postMessage({type:'cameraMetrics',...result});}
  if(m.type==='cameraSettings')engine.setCameraSettings(m.settings);
  if(m.type==='cameraStopped'){engine.cameraDrive=0;engine.cameraSample=-Infinity;engine.addNote('camera_stopped');}
  if(m.type==='record'){engine.startRecording(m.name,m.code);postMessage({type:'recording',active:true});}
  if(m.type==='stopRecord'){engine.stopRecording();postMessage({type:'recording',active:false});}
  if(m.type==='suspend'){suspended=m.value;engine.addNote(suspended?'tab_hidden_simulation_paused':'tab_visible_simulation_resumed');postMessage({type:'suspended',value:suspended});}
  if(m.type==='export'){const r=engine.exportRecording();postMessage({type:'export',...r},[r.binary.buffer]);}
}catch(err){postMessage({type:'error',message:err.message});}};
