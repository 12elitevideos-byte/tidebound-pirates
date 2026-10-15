import { angle } from '../shared/config.js';
export function boatFloat(clock,reduced=false){return reduced?{height:.5,roll:0}:{height:.5+Math.sin(clock*.9)*.22,roll:Math.sin(clock*.65)*.002};}

// Draw ships and projectiles at the same time, with a one-packet buffer online.
export class VoyageMotion {
  constructor(){this.frames=[];this.id=null;}
  push(state,id,now){if(this.id!==id||this.frames.length&&state.time<this.frames.at(-1).time)this.frames=[];this.id=id;this.mode=state.mode;if(this.frames.at(-1)?.time===state.time){this.frames[this.frames.length-1]={...state,received:now};return;}this.frames.push({...state,received:now});while(this.frames.length>8)this.frames.shift();}
  time(now){const last=this.frames.at(-1);if(!last)return 0;if(last.paused)return last.time;return this.mode==='practice'?last.time:Math.min(last.time,last.time+Math.max(0,now-last.received)-.11);}
  pose(entity,collection,now){if(this.mode==='practice'||this.frames.length<2)return entity;const time=this.time(now);let a=this.frames[0],b=this.frames.at(-1);for(let i=1;i<this.frames.length;i++)if(this.frames[i].time>=time){a=this.frames[i-1];b=this.frames[i];break;}const old=a[collection]?.find(s=>s.id===entity.id),next=b[collection]?.find(s=>s.id===entity.id);if(!old||!next)return entity;const f=Math.max(0,Math.min(1,(time-a.time)/Math.max(.0001,b.time-a.time)));return {...entity,x:old.x+(next.x-old.x)*f,y:old.y+(next.y-old.y)*f,theta:Number.isFinite(old.theta)?angle(old.theta+angle(next.theta-old.theta)*f):entity.theta};}
}
