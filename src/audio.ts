export class OceanAudio {
  ctx:AudioContext|null=null; gain:GainNode|null=null; musicAt=0; birdAt=0;
  start(volume:number){
    if(this.ctx){void this.ctx.resume();this.volume(volume);return;}
    try{this.ctx=new AudioContext();const c=this.ctx;this.gain=c.createGain();this.gain.gain.value=volume*.24;this.gain.connect(c.destination);
      const buffer=c.createBuffer(1,c.sampleRate*4,c.sampleRate);const d=buffer.getChannelData(0);let last=0;for(let i=0;i<d.length;i++){last=(last+Math.random()*.06-.03)/1.02;d[i]=last*4;}
      const source=c.createBufferSource();source.buffer=buffer;source.loop=true;const filter=c.createBiquadFilter();filter.type='lowpass';filter.frequency.value=650;source.connect(filter);filter.connect(this.gain);source.start();
      const lfo=c.createOscillator();lfo.frequency.value=.12;const depth=c.createGain();depth.gain.value=170;lfo.connect(depth);depth.connect(filter.frequency);lfo.start();
    }catch{/* Sound is optional on browsers without Web Audio. */}
  }
  volume(v:number){if(this.gain&&this.ctx)this.gain.gain.setTargetAtTime(v*.24,this.ctx.currentTime,.15);}
  chirp(){if(!this.ctx||!this.gain)return;const c=this.ctx,o=c.createOscillator(),g=c.createGain(),t=c.currentTime;o.type='sine';o.frequency.setValueAtTime(1100,t);o.frequency.exponentialRampToValueAtTime(1650,t+.08);o.frequency.exponentialRampToValueAtTime(970,t+.3);g.gain.setValueAtTime(.001,t);g.gain.exponentialRampToValueAtTime(.08,t+.03);g.gain.exponentialRampToValueAtTime(.001,t+.34);o.connect(g);g.connect(this.gain);o.start(t);o.stop(t+.36);}
  tone(freq=660,duration=.25,type:OscillatorType='sine',level=.25){if(!this.ctx||!this.gain)return;const c=this.ctx,o=c.createOscillator(),g=c.createGain();o.type=type;o.frequency.setValueAtTime(freq,c.currentTime);g.gain.setValueAtTime(.001,c.currentTime);g.gain.exponentialRampToValueAtTime(level,c.currentTime+.02);g.gain.exponentialRampToValueAtTime(.001,c.currentTime+duration);o.connect(g);g.connect(this.gain);o.start();o.stop(c.currentTime+duration+.1);}
  update(time:number){if(time>this.musicAt){this.musicAt=time+14+Math.random()*12;[261.63,329.63,392,523.25].forEach((n,i)=>setTimeout(()=>this.tone(n,3,'sine',.06),i*500));}if(time>this.birdAt){this.birdAt=time+22+Math.random()*20;this.tone(1350,.18,'sine',.06);setTimeout(()=>this.tone(1700,.22,'sine',.04),170);}}
  pause(){void this.ctx?.suspend();}
}
