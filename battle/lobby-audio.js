// Original looping menu theme: soft plucked melody, bass and brushed rhythm.
export class LobbyAudio {
 constructor(feedback){this.feedback=feedback;this.enabled=true;this.inLobby=true;this.source=null;this.gain=null;this.hidden=false;this.buffer=null;}
 unlock(){this.feedback.unlock();this.sync();}
 setLobby(value){this.inLobby=value;this.sync();}
 sync(){const a=this.feedback.context;if(!a)return;const play=this.enabled&&this.inLobby&&!this.hidden;if(!play){if(this.source){this.source.stop();this.source.disconnect();this.gain.disconnect();this.source=null;this.gain=null;}return;}if(this.source)return;
 if(!this.buffer){const beat=60/94,duration=32*beat,rate=a.sampleRate;this.buffer=a.createBuffer(1,Math.ceil(duration*rate),rate);const data=this.buffer.getChannelData(0),chords=[[57,60,64],[53,57,60],[48,52,55],[55,59,62]],melody=[69,72,76,72,69,67,64,67,65,69,72,69,65,64,60,64,64,67,72,67,64,62,60,62,67,71,74,71,67,64,62,64];
 const add=(note,start,length,amplitude,kind)=>{const hz=440*2**((note-69)/12),from=Math.floor(start*rate),n=Math.floor(length*rate);for(let j=0;j<n&&from+j<data.length;j++){const t=j/rate,phase=2*Math.PI*hz*t,attack=Math.min(1,t/.02),release=Math.min(1,(length-t)/.12);const wave=kind==='pad'?Math.sin(phase)*.7+Math.sin(phase*2)*.15:Math.sin(phase)+Math.sin(phase*2)*.18+Math.sin(phase*3)*.06;data[from+j]+=wave*amplitude*attack*release*(kind==='pad'?1:Math.exp(-t*4));}};
 for(let b=0;b<32;b++){const chord=chords[Math.floor(b/8)];add(melody[b],b*beat,beat*.8,.15,'pluck');add(chord[b%3]+12,(b+.5)*beat,beat*.4,.045,'pluck');if(b%2===0)add(chord[0]-12,b*beat,beat*1.6,.16,'bass');if(b%8===0)for(const note of chord)add(note,b*beat,beat*7.8,.018,'pad');const from=Math.floor(b*beat*rate);for(let j=0;j<rate*.07&&from+j<data.length;j++){const t=j/rate;data[from+j]+=Math.sin(2*Math.PI*(65*t-150*t*t))*.08*Math.exp(-t*50);}}}
 this.source=a.createBufferSource();this.source.buffer=this.buffer;this.source.loop=true;this.gain=a.createGain();this.gain.gain.value=.45;this.source.connect(this.gain).connect(a.destination);this.source.start();}
}
