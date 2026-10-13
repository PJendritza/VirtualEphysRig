'use strict';
class Biquad {
  constructor(type,frequency,fs,q=Math.SQRT1_2){const w=2*Math.PI*frequency/fs,c=Math.cos(w),s=Math.sin(w),alpha=s/(2*q),a0=1+alpha;
    if(!['highpass','lowpass'].includes(type))throw Error('Unknown filter type');const b=type==='highpass'?[(1+c)/2,-(1+c),(1+c)/2]:[(1-c)/2,1-c,(1-c)/2];
    [this.b0,this.b1,this.b2]=b.map(x=>x/a0);this.a1=-2*c/a0;this.a2=(1-alpha)/a0;this.z1=0;this.z2=0;
  }
  process(x){const y=this.b0*x+this.z1;this.z1=this.b1*x-this.a1*y+this.z2;this.z2=this.b2*x-this.a2*y;return y;}
}
class LiveScope {
  constructor(fs=20000){this.fs=fs;this.capacity=fs*10;this.raw=new Float32Array(this.capacity);this.view=new Float32Array(this.capacity);this.n=0;this.window=3;this.range=250;this.threshold=-45;this.auto=false;this.factor=4.5;this.sigma=10;this.detected=[];this.waveforms=[];this.pending=[];this.lastCross=-Infinity;this.lastEstimate=0;this.setFilter({highpass:300,lowpass:6000},false);}
  setFilter(settings,reprocess=true){const{highpass,lowpass}=settings;if(!Number.isFinite(highpass)||!Number.isFinite(lowpass)||highpass<0||lowpass<0||highpass>=this.fs/2||lowpass>=this.fs/2||(highpass&&lowpass&&highpass>=lowpass))throw Error('Use 0 to disable a cutoff; otherwise 0 < high-pass < low-pass < 10,000 Hz.');
    this.settings={...settings};this.filters=[];if(highpass)this.filters.push(new Biquad('highpass',highpass,this.fs));if(lowpass)this.filters.push(new Biquad('lowpass',lowpass,this.fs));
    if(reprocess){for(let i=Math.max(0,this.n-this.capacity);i<this.n;i++){let value=this.raw[i%this.capacity];for(const f of this.filters)value=f.process(value);this.view[i%this.capacity]=value;}this.pending=[];this.waveforms=[];this.detected=[];this.lastCross=-Infinity;this.lastEstimate=this.n;this.estimateNoise();}
  }
  estimateNoise(){const begin=Math.max(0,this.n-this.fs),values=[];for(let i=begin;i<this.n;i+=8)values.push(this.view[i%this.capacity]);if(values.length<50)return;values.sort((a,b)=>a-b);const median=values[Math.floor(values.length/2)],deviations=values.map(x=>Math.abs(x-median)).sort((a,b)=>a-b);this.sigma=Math.max(.5,deviations[Math.floor(deviations.length/2)]/.67448975);}
  push(data){const found=[];for(const raw of data){let value=raw;for(const f of this.filters)value=f.process(value);const index=this.n++;this.raw[index%this.capacity]=raw;this.view[index%this.capacity]=value;
      const previous=index>0?this.view[(index-1)%this.capacity]:0,negative=this.threshold<0,cross=negative?value<this.threshold&&previous>=this.threshold:value>this.threshold&&previous<=this.threshold;
      if(cross&&index-this.lastCross>=Math.round(this.fs*.0015)&&index>20){this.pending.push({index,negative});this.lastCross=index;}
      while(this.pending.length&&index>=this.pending[0].index+84){const p=this.pending.shift();let peak=p.index;for(let j=p.index;j<=p.index+24;j++){const v=this.view[j%this.capacity],old=this.view[peak%this.capacity];if(p.negative?v<old:v>old)peak=j;}const waveform=new Float32Array(80);for(let k=0;k<80;k++)waveform[k]=this.view[(peak-20+k)%this.capacity];const event={sample:peak,time:peak/this.fs,peak:this.view[peak%this.capacity],waveform};found.push(event);this.detected.push(event.time);this.waveforms.push(waveform);if(this.waveforms.length>40)this.waveforms.shift();}
    }
    if(this.n-this.lastEstimate>=this.fs/2){this.estimateNoise();this.lastEstimate=this.n;}this.detected=this.detected.filter(t=>t>this.n/this.fs-10);return found;
  }
  estimateThreshold(){this.estimateNoise();this.setThreshold(-this.factor*this.sigma);return this.threshold;}
  setThreshold(value){if(!Number.isFinite(value)||Math.abs(value)>.999e4||value===0)throw Error('Threshold must be a non-zero voltage between −9,990 and +9,990 µV.');this.auto=false;this.threshold=value;this.pending=[];}
  autoRange(){let peak=0;const begin=Math.max(0,this.n-Math.round(this.window*this.fs));for(let i=begin;i<this.n;i++)peak=Math.max(peak,Math.abs(this.view[i%this.capacity]));this.range=Math.max(25,Math.min(5000,Math.ceil(peak*1.15/25)*25));}
}
if(typeof module!=='undefined')module.exports={Biquad,LiveScope};
