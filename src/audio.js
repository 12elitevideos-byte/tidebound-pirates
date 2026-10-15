const clamp=(n,a=0,b=1)=>Math.max(a,Math.min(b,Number.isFinite(n)?n:0));
const DEFAULTS={master:.65,music:.2,effects:.7};

// Original procedural sounds: no downloads, sample licensing, or extra files.
export class Audio {
  constructor(){this.p={...DEFAULTS};this.scene='menu';this.visible=true;this.voices=new Set();this.loops=[];this.elapsed=0;this.nextCreak=4;this.nextSail=0;this.lastShip=null;this.musicStep=0;}
  start(){
    if(this.ctx)return this.ctx.state!=='closed';
    const Context=globalThis.AudioContext||globalThis.webkitAudioContext;if(!Context)return false;
    try{
      this.ctx=new Context();this.gain=this.ctx.createGain();
      this.limiter=this.ctx.createDynamicsCompressor();
      for(const [key,v] of Object.entries({threshold:-10,knee:15,ratio:6,attack:.004,release:.18}))this.limiter[key].value=v;
      this.gain.connect(this.limiter);this.limiter.connect(this.ctx.destination);
      this.effects=this.ctx.createGain();this.music=this.ctx.createGain();this.ambient=this.ctx.createGain();
      for(const bus of [this.effects,this.music,this.ambient])bus.connect(this.gain);
      this.white=this.noiseBuffer(false);this.brown=this.noiseBuffer(true);
      this.waves=this.loop(this.brown,'lowpass',700,.14);this.wind=this.loop(this.white,'bandpass',1300,.022);
      this.wake=this.loop(this.white,'lowpass',1900,0);this.cloth=this.loop(this.brown,'bandpass',900,0);
      this.configure(this.p);this.musicTimer=setInterval(()=>this.musicNote(),850);
      return true;
    }catch{this.dispose();return false;}
  }
  unlock(){if(!this.start())return false;try{this.ctx.resume()?.catch(()=>{});return true;}catch{return false;}}
  noiseBuffer(brown){const b=this.ctx.createBuffer(1,Math.floor(this.ctx.sampleRate*2),this.ctx.sampleRate),d=b.getChannelData(0);let n=0,peak=.001;for(let i=0;i<d.length;i++){const white=Math.random()*2-1;n=brown?(n+white*.03)*.985:white;d[i]=n;peak=Math.max(peak,Math.abs(n));}for(let i=0;i<d.length;i++)d[i]=d[i]/peak*.8;return b;}
  smooth(param,value,seconds=.08){if(!this.ctx||!param)return;param.setTargetAtTime(value,this.ctx.currentTime,seconds);}
  loop(buffer,type,freq,volume){const source=this.ctx.createBufferSource(),filter=this.ctx.createBiquadFilter(),gain=this.ctx.createGain();source.buffer=buffer;source.loop=true;filter.type=type;filter.frequency.value=freq;filter.Q.value=.7;gain.gain.value=volume;source.connect(filter);filter.connect(gain);gain.connect(this.ambient);source.start();const record={source,filter,gain};this.loops.push(record);return record;}
  configure(p){this.p={...DEFAULTS,...p};if(!this.ctx)return;this.smooth(this.gain.gain,clamp(this.p.master),.025);this.smooth(this.effects.gain,clamp(this.p.effects)*(this.visible?1:0),.025);this.smooth(this.music.gain,clamp(this.p.music)*(this.visible?1:0),.025);this.smooth(this.ambient.gain,clamp(this.p.effects)*(this.visible?1:0),.04);}
  setScene(scene){if(this.scene!==scene){this.scene=scene;this.lastShip=null;}this.motion(0,0,false);}
  setVisible(visible){this.visible=visible;this.configure(this.p);if(!visible)this.motion(0,0,false);}
  motion(speed,sail,paused){if(!this.ctx)return;const travel=clamp(speed/108),setting=clamp(sail),scene=this.scene==='voyage'&&!paused?1:this.scene==='menu'?.6:.35;this.smooth(this.waves.gain.gain,.13*scene);this.smooth(this.wind.gain.gain,(.022+setting*.035)*scene);this.smooth(this.wake.gain.gain,travel*.13*(paused?0:1));this.smooth(this.cloth.gain.gain,setting*.075*(paused?0:1));this.smooth(this.wake.filter.frequency,850+travel*1900,.15);}
  update(me,dt,{paused=false}={}){
    if(!this.ctx||!me)return;this.motion(this.visible&&!me.ashore?me.speed:0,this.visible&&!me.ashore?me.sail:0,paused||!this.visible);
    if(me.ashore&&!paused&&this.visible&&me.ashore.speed>1){this.footClock=(this.footClock||0)+dt;if(this.footClock>.27){this.footClock=0;this.play('footstep',{gain:.65});}}else this.footClock=0;
    if(!this.lastShip||this.lastShip.id!==me.id){this.lastShip={id:me.id,sail:me.sail,left:me.coolLeft,right:me.coolRight,heading:me.theta};return;}
    const previous=this.lastShip;
    if(!paused&&this.visible){
      this.elapsed+=dt;
      if(Math.abs(me.sail-previous.sail)>.15&&this.elapsed>this.nextSail){this.play(me.sail>previous.sail?'sailup':'saildown');previous.sail=me.sail;this.nextSail=this.elapsed+.65;}
      if(me.speed>12&&this.elapsed>=this.nextCreak){this.play('creak',{gain:.65});this.nextCreak=this.elapsed+3.5+Math.random()*3;}
      if(previous.left>.05&&me.coolLeft<=0)this.play('reload',{pan:-.45,gain:.6});
      if(previous.right>.05&&me.coolRight<=0)this.play('reload',{pan:.45,gain:.6});
    }
    previous.left=me.coolLeft;previous.right=me.coolRight;previous.heading=me.theta;
  }
  voice(source,bus,volume,duration,delay=0,pan=0,filter=null){
    if(this.voices.size>=48){source.disconnect();return false;}
    const gain=this.ctx.createGain(),now=this.ctx.currentTime+delay,nodes=[source,gain];let tail=source;
    if(filter){tail.connect(filter);tail=filter;nodes.push(filter);}tail.connect(gain);
    if(this.ctx.createStereoPanner){const stereo=this.ctx.createStereoPanner();stereo.pan.value=clamp(pan,-1,1);gain.connect(stereo);stereo.connect(bus);nodes.push(stereo);}else gain.connect(bus);
    gain.gain.setValueAtTime(.0001,now);gain.gain.linearRampToValueAtTime(Math.max(.0001,volume),now+.008);gain.gain.exponentialRampToValueAtTime(.0001,now+duration);
    const record={source,nodes};this.voices.add(record);source.onended=()=>{for(const node of nodes)node.disconnect();this.voices.delete(record);};source.start(now);source.stop(now+duration+.02);return true;
  }
  tone(freq,duration=.15,volume=.08,type='sine',delay=0,pan=0,end=freq,bus=this.effects){const o=this.ctx.createOscillator();o.type=type;o.frequency.setValueAtTime(Math.max(20,freq),this.ctx.currentTime+delay);o.frequency.exponentialRampToValueAtTime(Math.max(20,end),this.ctx.currentTime+delay+duration);return this.voice(o,bus,volume,duration,delay,pan);}
  noise(duration,volume,freq=900,type='lowpass',delay=0,pan=0,brown=false){const s=this.ctx.createBufferSource(),f=this.ctx.createBiquadFilter();s.buffer=brown?this.brown:this.white;f.type=type;f.frequency.value=freq;f.Q.value=.8;return this.voice(s,this.effects,volume,duration,delay,pan,f);}
  musicNote(){if(!this.ctx||!this.visible||this.p.master<=0||this.p.music<=0)return;const notes=[293.66,440,523.25,587.33,523.25,440,392,349.23,293.66,349.23,440,523.25,392,349.23,329.63,293.66],freq=notes[this.musicStep++%notes.length];this.tone(freq,.7,.075,'sine',0,-.15,freq,this.music);this.tone(freq*2,.3,.014,'sine',.025,.15,freq*2,this.music);}
  play(type,{gain=1,pan=0,heavy=false}={}){
    if(!this.unlock()||!this.visible||this.p.master<=0||this.p.effects<=0)return false;
    const v=clamp(gain,0,1.5),tone=(f,d,a,w='sine',delay=0,end=f)=>this.tone(f,d,a*v,w,delay,pan,end),noise=(d,a,f=900,kind='lowpass',delay=0,brown=false)=>this.noise(d,a*v,f,kind,delay,pan,brown);
    if(type==='cannon'){tone(heavy?82:112,.46,.36,'triangle',0,32);noise(.18,.55,1800);noise(.62,.2,160,'lowpass',.02,true);tone(220,.08,.065,'sawtooth',0,65);}
    else if(type==='explosion'){tone(76,.9,.36,'triangle',0,25);noise(.9,.45,440,'lowpass',0,true);noise(.25,.25,1600);}
    else if(type==='impact'){noise(.18,.35,1000);tone(150,.24,.14,'triangle',0,55);noise(.09,.15,2300,'highpass',.025);}
    else if(type==='splash'){noise(.26,.14,1900);tone(620,.15,.035,'sine',0,160);}
    else if(type==='footstep'){noise(.07,.045,720,'lowpass',0,true);tone(110,.055,.016,'triangle',0,75);}
    else if(type==='land'||type==='board'){noise(.17,.065,550,'bandpass',0,true);tone(330,.16,.04,'triangle');tone(495,.25,.045,'sine',.1);}
    else if(type==='talk'){tone(440,.1,.045,'sine');tone(587.33,.18,.045,'sine',.08);}
    else if(type==='queststep'){[660,880,1174.66].forEach((f,i)=>tone(f,.2,.055,'sine',i*.06));noise(.08,.025,2500,'highpass');}
    else if(type==='anchorup'||type==='anchordown'){for(let i=0;i<4;i++){tone(950-i*80,.09,.045,'triangle',i*.055);noise(.055,.09,2300,'bandpass',i*.055);}tone(type==='anchordown'?120:220,.25,.1,'triangle',.17,60);}
    else if(type==='sailup'||type==='saildown'){noise(.36,.13,1700,'bandpass');tone(type==='sailup'?240:480,.22,.025,'triangle',.025,type==='sailup'?520:190);}
    else if(type==='creak'){noise(.24,.06,450,'bandpass',0,true);tone(125,.25,.025,'triangle',0,85);}
    else if(type==='search'){for(let i=0;i<3;i++)noise(.16,.09,600+i*300,'bandpass',i*.12,true);}
    else if(type==='loot'||type==='searchdone'){[880,1174.66,1396.91].forEach((f,i)=>{tone(f,.28,.07,'sine',i*.085);tone(f*2,.12,.013,'sine',i*.085);});noise(.12,.035,3100,'highpass');}
    else if(type==='repair'){for(let i=0;i<3;i++){tone(190,.09,.06,'triangle',i*.12,75);noise(.045,.07,1300,'lowpass',i*.12);}tone(660,.28,.035,'sine',.34);}
    else if(type==='bank'||type==='achievement'||type==='levelup'){const notes=type==='levelup'?[440,554.37,659.25,880,1108.73]:[587.33,739.99,880,1174.66];notes.forEach((f,i)=>{tone(f,.5,.085,'sine',i*.105);tone(f*2,.19,.014,'sine',i*.105);});for(let i=0;i<5;i++)tone(1400+i*130,.09,.025,'triangle',i*.065);}
    else if(type==='purchase'){[1396.91,1174.66,880].forEach((f,i)=>tone(f,.18,.06,'sine',i*.06));noise(.13,.05,2700,'highpass');}
    else if(type==='dock'||type==='equip'){tone(440,.32,.045,'triangle');tone(660,.4,.04,'sine',.11);}
    else if(type==='reload'){tone(290,.055,.025,'triangle');noise(.07,.045,2200,'bandpass',.015);}
    else if(type==='error'){tone(200,.11,.035,'triangle',0,140);}
    else if(type==='hover'){tone(610,.035,.014,'sine');}
    else {tone(460,.055,.028,'triangle');noise(.03,.018,1700,'bandpass');}
    return true;
  }
  dispose(){clearInterval(this.musicTimer);for(const record of this.voices){try{record.source.stop();}catch{}for(const node of record.nodes)node.disconnect();}this.voices.clear();for(const loop of this.loops){try{loop.source.stop();}catch{}loop.source.disconnect();loop.filter.disconnect();loop.gain.disconnect();}this.loops=[];try{this.ctx?.close()?.catch(()=>{});}catch{}this.ctx=null;}
}
