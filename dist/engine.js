'use strict';
// The model and acquisition clock are independent of display frame rate.
class NeuronEngine {
  constructor(seed=8675309) {
    this.fs=20000; this.n=0; this.randomState=seed>>>0; this.seed=seed;
    this.model={type:'V1 complex cell',orientation:60,spatial_frequency:5,sigma:0.22,aspect:0.45,x:0,y:0,baseline_hz:5,maximum_hz:95,response_exponent:2,latency_s:0.04,sustained_fraction:1,onset_gain:0,adaptation_tau_s:.18};
    this.stim={type:'blank'};this.stimOnset=0;this.rate=5;this.target=5;this.responseAdaptation=0;this.delay=[];this.lastSpike=-1000;this.tail=[];this.noiseFast=0;this.noiseSlow=0;
    this.lfpComponents=Array.from({length:12},(_,i)=>{const fc=.15*(160/.15)**(i/11),decay=Math.exp(-2*Math.PI*fc*.001);return{fc,decay,state:20*this.normal(),scale:20*Math.sqrt(1-decay*decay)};});this.lfpPrevious=this.lfpComponents.reduce((s,c)=>s+c.state,0);this.lfpNext=this.lfpPrevious;
    this.voltageModel={unit_peak_microvolts:-180,amplitude_sd_fraction:.10,width_sd_fraction:.06,background:'Correlated broadband noise, broadband 1/f-like field activity (log-spaced relaxation processes), 50 Hz interference and small unresolved background spikes',lfp_processes:12,lfp_corner_range_hz:[.15,160],lfp_component_sd_microvolts:20,waveform:'Positive prepotential, negative trough, positive rebound and small afterpotential'};
    this.protocol=null;this.recording=null;this.saved=null;this.inputSource='direct';this.cameraDrive=0;this.cameraSample=-Infinity;this.cameraSettings={};this.buildKernel();this.prepareStimulus(this.stim);
  }
  random(){let x=this.randomState;x^=x<<13;x^=x>>>17;x^=x<<5;this.randomState=x>>>0;return(this.randomState+0.5)/4294967296;}
  normal(){return Math.sqrt(-2*Math.log(this.random()))*Math.cos(2*Math.PI*this.random());}
  buildKernel(){this.kernel=[];this.envSum=0;const m=this.model,th=m.orientation*Math.PI/180;
    for(let j=0;j<48;j++)for(let i=0;i<72;i++){
      const x=(i+.5)/72*3-1.5,y=(j+.5)/48*2-1,dx=x-m.x,dy=y-m.y;
      const q=-Math.sin(th)*dx+Math.cos(th)*dy,p=Math.cos(th)*dx+Math.sin(th)*dy;
      const env=Math.exp(-(q*q+m.aspect*m.aspect*p*p)/(2*m.sigma*m.sigma)),arg=Math.PI*m.spatial_frequency*q;
      const rectangular=m.simple_rf&&m.type==='V1 simple dark-bar cell',stripe=offset=>Math.abs(q-offset)<=m.bar_width/2&&Math.abs(p)<=m.bar_length/2?1:0;
      this.kernel.push({x,y,env,a:Math.cos(arg),b:Math.sin(arg),center:rectangular?stripe(0):env,left:rectangular?stripe(-(m.flank_offset||.19)):Math.exp(-(((q+(m.flank_offset||.19))**2+m.aspect*m.aspect*p*p)/(2*m.sigma*m.sigma))),right:rectangular?stripe(m.flank_offset||.19):Math.exp(-(((q-(m.flank_offset||.19))**2+m.aspect*m.aspect*p*p)/(2*m.sigma*m.sigma)))});this.envSum+=env;
    }
    this.barCenterSum=this.kernel.reduce((s,k)=>s+k.center,0);this.barLeftSum=this.kernel.reduce((s,k)=>s+k.left,0);this.barRightSum=this.kernel.reduce((s,k)=>s+k.right,0);
    this.cameraEnergyA=this.kernel.reduce((s,k)=>s+k.env*k.a*k.a,0);this.cameraEnergyB=this.kernel.reduce((s,k)=>s+k.env*k.b*k.b,0);
  }
  setInputSource(source){this.inputSource=source;this.cameraDrive=0;this.addNote('input_source_changed',{source});}
  configureModel(parameters,context={}){if(this.recording)throw Error('Stop recording before changing exercise.');this.model={...this.model,...parameters};this.context={...context};this.buildKernel();this.prepareStimulus(this.stim);this.cameraDrive=0;this.cameraSample=-Infinity;this.delay=[];this.responseAdaptation=0;this.target=this.model.baseline_hz;}
  setCameraSettings(settings){this.cameraSettings={...settings};this.addNote('camera_settings_changed',this.cameraSettings);}
  cameraFrame(gray,timing={}){if(gray.length!==this.kernel.length)throw Error('Wrong camera frame dimensions');
    if(this.model.type==='V1 simple dark-bar cell'){let center=0,left=0,right=0;for(let i=0;i<gray.length;i++){const v=gray[i]/255,k=this.kernel[i];center+=k.center*v;left+=k.left*v;right+=k.right*v;}center/=this.barCenterSum;left/=this.barLeftSum;right/=this.barRightSum;
      // OFF central subfield, flanked by lighter regions: a dark line, not a single edge.
      const contrast=Math.max(0,Math.min(left-center,right-center)),drive=Math.min(1,contrast/.45);this.cameraDrive=drive;this.cameraSample=this.n;if(this.recording)this.recording.cameraFrames.push({sample:this.n-this.recording.start,time_s:(this.n-this.recording.start)/this.fs,...timing,local_contrast:contrast,filter_match:drive,drive});return{contrast,match:drive,drive};}
    let mean=0;
    for(let i=0;i<gray.length;i++)mean+=this.kernel[i].env*gray[i]/255;mean/=this.envSum;
    let a=0,b=0,energy=0;for(let i=0;i<gray.length;i++){const k=this.kernel[i],v=gray[i]/255-mean;a+=k.env*v*k.a;b+=k.env*v*k.b;energy+=k.env*v*v;}
    const contrast=Math.sqrt(energy/this.envSum),ca=a/Math.sqrt(Math.max(1e-12,energy*this.cameraEnergyA)),cb=b/Math.sqrt(Math.max(1e-12,energy*this.cameraEnergyB));
    const match=Math.min(1,Math.hypot(ca,cb)),gate=Math.min(1,Math.max(0,(contrast-.025)/.1));this.cameraDrive=match*gate;this.cameraSample=this.n;
    if(this.recording)this.recording.cameraFrames.push({sample:this.n-this.recording.start,time_s:(this.n-this.recording.start)/this.fs,...timing,local_contrast:contrast,filter_match:match,drive:this.cameraDrive});
    return {contrast,match,drive:this.cameraDrive};
  }
  prepareStimulus(s){this.coeffs=[0,0,0,0];this.directBarDrive=0;
    if(s.type==='bar'){const theta=s.orientation*Math.PI/180,values=new Float32Array(this.kernel.length);let mean=0;for(let i=0;i<this.kernel.length;i++){const k=this.kernel[i],dx=k.x-s.x,dy=k.y-s.y,q=-Math.sin(theta)*dx+Math.cos(theta)*dy,p=Math.cos(theta)*dx+Math.sin(theta)*dy;values[i]=Math.abs(q)<=s.width/2&&Math.abs(p)<=s.length/2?.5*(1-s.contrast):.5;mean+=k.env*values[i];}mean/=this.envSum;let a=0,b=0,energy=0;for(let i=0;i<values.length;i++){const k=this.kernel[i],v=values[i]-mean;a+=k.env*v*k.a;b+=k.env*v*k.b;energy+=k.env*v*v;}const contrast=Math.sqrt(energy/this.envSum),match=Math.min(1,Math.hypot(a/Math.sqrt(Math.max(1e-12,energy*this.cameraEnergyA)),b/Math.sqrt(Math.max(1e-12,energy*this.cameraEnergyB))));this.directBarDrive=match*Math.min(1,Math.max(0,(contrast-.025)/.1));return;}
    if(s.type!=='grating')return;
    const theta=s.orientation*Math.PI/180;
    for(const k of this.kernel){const dx=k.x-s.x,dy=k.y-s.y;if(dx*dx+dy*dy>s.radius*s.radius)continue;
      const q=-Math.sin(theta)*dx+Math.cos(theta)*dy,phase=Math.PI*s.spatial_frequency*q;
      const a=Math.cos(phase)*k.env,b=Math.sin(phase)*k.env;
      this.coeffs[0]+=a*k.a;this.coeffs[1]+=b*k.a;this.coeffs[2]+=a*k.b;this.coeffs[3]+=b*k.b;
    }
  }
  stimulusDrive(t){if(this.inputSource==='webcam')return this.n-this.cameraSample<this.fs*.3?this.cameraDrive:0;const s=this.stim;if(s.type==='bar')return this.directBarDrive;if(s.type!=='grating')return 0;
    const phase=s.phase*Math.PI/180+2*Math.PI*s.temporal_frequency*(t-this.stimOnset),co=Math.cos(phase),si=Math.sin(phase),c=this.coeffs;
    const a=(c[0]*co-c[1]*si)*2/this.envSum,b=(c[2]*co-c[3]*si)*2/this.envSum;
    return Math.min(1,Math.hypot(a,b)*s.contrast);
  }
  setStimulus(stim,source='manual'){
    const now=this.n/this.fs;
    if(this.recording){const last=this.recording.stimuli.at(-1);if(last)last.offset_sample=this.n-this.recording.start;
      this.recording.stimuli.push({onset_sample:this.n-this.recording.start,offset_sample:null,source,stimulus_origin_sample:this.n-this.recording.start,parameters:{...stim}});}
    this.stim={...stim};this.stimOnset=now;this.prepareStimulus(stim);
    this.onStimulus?.({stimulus:{...stim},time:now,source});
  }
  startProtocol(segments,code=''){this.stopProtocol(false);this.protocol={segments,index:0,next:this.n};if(this.recording)this.recording.notes.push({sample:this.n-this.recording.start,kind:'protocol_started',code});}
  stopProtocol(toBlank=true){const had=!!this.protocol;this.protocol=null;if(toBlank)this.setStimulus({type:'blank'},'protocol_stop');if(had)this.onProtocol?.('stopped');}
  startRecording(name,code){if(this.recording)throw Error('Already recording');this.saved=null;
    this.recording={name,code,start:this.n,created:new Date().toISOString(),chunks:[],sampleCount:0,seed:this.seed,random_state_at_start:this.randomState,model_at_start:{...this.model},exercise_at_start:{...this.context},input_source_at_start:this.inputSource,camera_settings_at_start:{...this.cameraSettings},cameraFrames:[],stimuli:[{onset_sample:0,offset_sample:null,source:'recording_start',stimulus_origin_sample:Math.round(this.stimOnset*this.fs)-this.n,parameters:{...this.stim}}],notes:[]};
  }
  stopRecording(){if(!this.recording)return;this.recording.stimuli.at(-1).offset_sample=this.n-this.recording.start;
    this.saved=this.recording;this.recording=null;return this.saved;}
  addNote(kind,details={}){if(this.recording)this.recording.notes.push({sample:this.n-this.recording.start,kind,...details});}
  advance(milliseconds){const count=Math.round(milliseconds*this.fs/1000),data=new Float32Array(count),spikes=[];
    for(let b=0;b<count;b+=20){
      if(this.protocol&&this.n>=this.protocol.next){const p=this.protocol;if(p.index>=p.segments.length){this.protocol=null;this.setStimulus({type:'blank'},'protocol_end');this.onProtocol?.('completed');}
        else{const segment=p.segments[p.index++];this.setStimulus(segment.stimulus,'protocol');p.next=this.n+Math.round(segment.duration*this.fs);this.onProtocol?.(`${p.index}/${p.segments.length}`);}}
      const t=this.n/this.fs,m=this.model,drive=this.stimulusDrive(t);
      const poweredDrive=drive**m.response_exponent,evoked=Math.min(1,m.sustained_fraction*poweredDrive+m.onset_gain*Math.max(0,poweredDrive-this.responseAdaptation));
      this.responseAdaptation+=(poweredDrive-this.responseAdaptation)*(1-Math.exp(-.001/m.adaptation_tau_s));
      this.delay.push({sample:this.n+Math.round(m.latency_s*this.fs),rate:m.baseline_hz+(m.maximum_hz-m.baseline_hz)*evoked});
      while(this.delay.length&&this.delay[0].sample<=this.n)this.target=this.delay.shift().rate;
      this.rate+=(this.target-this.rate)*(1-Math.exp(-0.001/0.035));
      // Poisson proposal with a 2 ms absolute refractory period.
      if(this.random()<1-Math.exp(-this.rate*.001)&&this.n-this.lastSpike>=40){const onset=this.n+Math.floor(this.random()*20);this.lastSpike=onset;this.tail.push({onset,amplitude:Math.max(.7,1+.10*this.normal()),width:Math.max(.8,1+.06*this.normal()),unit:true});spikes.push(onset/this.fs);}
      if(this.random()<.015)this.tail.push({onset:this.n+Math.floor(this.random()*20),amplitude:.07+.12*this.random(),width:.75+.5*this.random(),unit:false});
      this.lfpPrevious=this.lfpNext;this.lfpNext=0;for(const c of this.lfpComponents){c.state=c.decay*c.state+c.scale*this.normal();this.lfpNext+=c.state;}
      for(let j=0;j<20&&b+j<count;j++){
        const sample=this.n+j,tv=sample/this.fs,white=this.normal();this.noiseFast=.39*this.noiseFast+6.5*Math.sqrt(1-.39*.39)*white;this.noiseSlow=.91*this.noiseSlow+4*Math.sqrt(1-.91*.91)*white;
        let v=this.noiseFast+.6*this.noiseSlow+this.lfpPrevious+(this.lfpNext-this.lfpPrevious)*(j+1)/20+6*Math.sin(2*Math.PI*50*tv)+4*Math.sin(2*Math.PI*1.2*tv);
        for(const spike of this.tail){const dt=(sample-spike.onset)/this.fs*1000/spike.width;if(dt>=0&&dt<4)v+=spike.amplitude*(18*Math.exp(-(((dt-.22)/.12)**2))-180*Math.exp(-(((dt-.6)/.18)**2))+65*Math.exp(-(((dt-1.1)/.3)**2))-9*Math.exp(-(((dt-1.9)/.55)**2)));}
        data[b+j]=v;
      }
      this.n+=Math.min(20,count-b);this.tail=this.tail.filter(s=>this.n-s.onset<120);
    }
    if(this.recording){this.recording.chunks.push(data.slice());this.recording.sampleCount+=count;}
    return {data,spikes,time:this.n/this.fs,rate:this.rate};
  }
  exportRecording(){const r=this.saved;if(!r)throw Error('Stop a recording before downloading.');
    const binary=new Uint8Array(r.sampleCount*4),view=new DataView(binary.buffer);let p=0;
    for(const chunk of r.chunks)for(const value of chunk){view.setFloat32(p,value,true);p+=4;}
    const stimuli=r.stimuli.map((s,i)=>({segment:i+1,...s,onset_s:s.onset_sample/this.fs,offset_s:s.offset_sample/this.fs,phase_at_onset_deg:s.parameters.type==='grating'?s.parameters.phase+360*s.parameters.temporal_frequency*(s.onset_sample-s.stimulus_origin_sample)/this.fs:null}));
    const metadata={format:'visual-neuron-rig/v1',session:r.name,created_utc:r.created,sampling_rate_hz:this.fs,channels:1,dtype:'float32',byte_order:'little-endian',units:'microvolts',sample_count:r.sampleCount,duration_s:r.sampleCount/this.fs,voltage_file:'voltage.bin',stimulus_file:'stimuli.json',time_origin:'First voltage sample is t=0. Stimulus onset/offset indices are relative to that sample; offsets are exclusive.',simulation_start_sample:r.start,simulation_seed:r.seed,random_state_at_recording_start:r.random_state_at_start,model:r.model_at_start,exercise:r.exercise_at_start,protocol_code:r.code,notes:r.notes,description:'Synthetic extracellular voltage: broadband 1/f-like field background and variable multiphasic spike waveforms. Stimuli use a simulation clock, not physical monitor timestamps.'};
    metadata.voltage_model=this.voltageModel;metadata.input_source_at_start=r.input_source_at_start;metadata.camera_settings_at_start=r.camera_settings_at_start;metadata.camera_frame_file='camera_frames.json';metadata.camera_frame_description='Frame receipt timestamps on the simulation clock and camera capture timing/response metrics. Camera images are not saved. Stimulus log describes the generated display, not measured webcam presentation.';
    return {binary,metadata,stimuli,cameraFrames:r.cameraFrames};
  }
}
if(typeof module!=='undefined')module.exports={NeuronEngine};
