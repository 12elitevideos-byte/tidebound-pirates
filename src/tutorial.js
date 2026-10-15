import { PORT,WRECKS,BALANCE,dist,angle } from '../shared/config.js';

export const LESSON_STEPS = ['anchor','sails','steer','wreck','search','collect','return','bank'];
export function keyLabel(code='') {
  return code.replace(/^Key/,'').replace(/^Digit/,'').replace('Escape','Esc').replace('Arrow','').replace('ShiftLeft','Shift').replace('ControlLeft','Ctrl');
}

// Guidance observes the real voyage. It never awards treasure or edits balances.
export class FirstVoyage {
  constructor(me) {
    this.step=0;this.wreck=[...WRECKS].sort((a,b)=>dist(me,a)-dist(me,b))[0];
    this.heading=me.theta;this.turnTime=0;this.banked=false;
  }
  update(snapshot,input,dt=0) {
    const s=snapshot.me,id=LESSON_STEPS[this.step];
    if(id==='anchor'&&!s.anchor)this.step++;
    else if(id==='sails'&&s.sail>=.45&&s.speed>12){this.heading=s.theta;this.step++;}
    else if(id==='steer') {
      if(input?.steer)this.turnTime+=dt;
      if(this.turnTime>.2&&Math.abs(angle(s.theta-this.heading))>.12)this.step++;
    } else if(id==='wreck'&&dist(s,this.wreck)<85)this.step++;
    else if(id==='search'&&(s.cargo.some(i=>i.type!=='mail')||snapshot.loot.some(i=>i.name==='Shipwreck salvage'&&dist(i,this.wreck)<130)))this.step++;
    else if(id==='collect'&&s.cargo.some(i=>i.type!=='mail'))this.step++;
    else if(id==='return'&&dist(s,PORT)<BALANCE.safeRadius-20)this.step++;
    else if(id==='bank'&&this.banked)this.step++;
    return this.step>=LESSON_STEPS.length;
  }
  objective(snapshot,keys) {
    const s=snapshot.me,k=a=>keyLabel(keys[a]),id=LESSON_STEPS[this.step];
    const entries={
      anchor:{title:'Raise your anchor',body:`Press ${k('anchor')} to raise anchor, or hold ${k('sailUp')} to set sail automatically.`,keys:[k('anchor')]},
      sails:{title:'Catch the wind',body:`Hold ${k('sailUp')} to raise your sails. More sail means more speed. Hold ${k('sailDown')} to slow down.`,keys:[k('sailUp'),k('sailDown')]},
      steer:{title:'Turn your ship',body:`Hold ${k('left')} or ${k('right')} to steer. Boats carry momentum, so turn a little early.`,keys:[k('left'),k('right')]},
      wreck:{title:'Sail to the golden marker',body:'Follow the compass arrow to the nearby shipwreck. Keep clear of the island.',target:this.wreck,keys:[]},
      search:{title:s.search?'Searching the wreck…':'Stop and search',body:s.search?'Keep your anchor down until the search finishes.':`Press ${k('anchor')} to stop beside the wreck. When the ship settles, press ${k('interact')} to search.`,target:this.wreck,keys:[k('anchor'),k('interact')],progress:s.search?1-s.search.time/3:0},
      collect:{title:'Bring the treasure aboard',body:`Press ${k('interact')} again to collect the floating chest. Treasure in your hold can still be lost.`,target:this.wreck,keys:[k('interact')]},
      return:{title:'Head home with your haul',body:`Hold ${k('sailUp')} to set sail again. Follow the marker to Marigold Harbor.`,target:PORT,keys:[k('anchor'),k('sailUp')]},
      bank:{title:'Bank your first treasure',body:`Stop with ${k('anchor')} and press ${k('interact')} once the ship settles. Banked gold buys upgrades and skins.`,target:PORT,keys:[k('anchor'),k('interact')]}
    };
    return {id,number:this.step+1,total:LESSON_STEPS.length,...entries[id]};
  }
}
