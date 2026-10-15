// Scheduling/connection fixture only: this does not claim to listen to audio.
export function fakeAudioContext(){
  class Param {constructor(value=0){this.value=value;this.events=[];}record(type,value,time){if(!Number.isFinite(value)||!Number.isFinite(time))throw new Error('Non-finite audio parameter');this.value=value;this.events.push({type,value,time});}setValueAtTime(v,t){this.record('set',v,t);}setTargetAtTime(v,t){this.record('target',v,t);}linearRampToValueAtTime(v,t){this.record('linear',v,t);}exponentialRampToValueAtTime(v,t){if(v<=0)throw new Error('Invalid exponential ramp');this.record('exponential',v,t);}}
  return class Context {
    constructor(){this.sampleRate=128;this.destination={};this.currentTime=0;this.state='running';this.nodes=[];this.constructor.last=this;}
    node(type,properties={}){const ctx=this,n={kind:type,type,connections:[],...properties,connect(node){this.connections.push(node);},disconnect(){this.connections=[];},start(at=ctx.currentTime){if(!Number.isFinite(at))throw new Error('Invalid start');this.started=at;},stop(at=ctx.currentTime){if(!Number.isFinite(at))throw new Error('Invalid stop');this.stopped=at;}};this.nodes.push(n);return n;}
    createGain(){return this.node('gain',{gain:new Param()});}
    createDynamicsCompressor(){return this.node('compressor',Object.fromEntries(['threshold','knee','ratio','attack','release'].map(k=>[k,new Param()])));}
    createBiquadFilter(){return this.node('filter',{frequency:new Param(),Q:new Param()});}
    createStereoPanner(){return this.node('pan',{pan:new Param()});}
    createOscillator(){return this.node('oscillator',{frequency:new Param()});}
    createBuffer(channels,length){const d=new Float32Array(length);return {getChannelData(){return d;}};}
    createBufferSource(){return this.node('buffer');}
    advance(dt){this.currentTime+=dt;for(const node of this.nodes)if(!node.ended&&Number.isFinite(node.stopped)&&node.stopped<=this.currentTime){node.ended=true;node.onended?.();}}
    resume(){return Promise.resolve();}
    close(){this.state='closed';return Promise.resolve();}
  };
}
