import { Room,ServerError } from '@colyseus/core';
import { World } from '../shared/world.js';
import { BALANCE,PORT,dist } from '../shared/config.js';
export const active = new Map();
export let store;
export function setStore(value){store=value;}
export class OceanRoom extends Room {
  onCreate(options){this.mode=options.mode;this.maxClients=this.mode==='solo'?1:8;if(this.mode==='solo')this.setPrivate(true);this.owner=null;this.rates=new Map();
    this.world=new World(this.mode,{
      notice:(s,text,kind)=>this.sendTo(s.id,'notice',{text,kind}),
      reward:async(s,r,op)=>{const d=await store.reward(s.userId,op,r);this.sendTo(s.id,'account',d);return d;},
      bank:async(s,items,gold)=>{const op='bank:'+s.voyage+':'+items.map(i=>i.id).sort().join(',');const d=await store.reward(s.userId,op,{type:'bank',mode:this.mode,ship:s.kind,gold,items:items.length},items.map(i=>i.id));this.sendTo(s.id,'account',d);return d;},
      bounty:(winner,loser)=>store.reward(winner.userId,'bounty:'+loser.voyage,{type:'bounty',mode:'online',ship:winner.kind},[],loser.userId).then(d=>{winner.account=d;this.sendTo(winner.id,'account',d);this.sendTo(winner.id,'notice',{text:'Player bounty claimed. 120 gold saved.',kind:'success'});}).catch(()=>{}),
      result:(s,r)=>this.sendTo(s.id,'result',r),
      sound:(s,type,detail)=>this.sendNearby('sound',{...detail,type}),
      explosion:s=>this.sendNearby('explosion',{id:s.id,x:s.x,y:s.y})
    });
    this.onMessage('input',(c,v)=>{if(this.limit(c,40,'input'))this.world.input(c.sessionId,v);});
    this.onMessage('action',(c,v)=>{if(this.limit(c,12,'action')&&v&&typeof v.type==='string'&&JSON.stringify(v).length<1000)this.world.action(c.sessionId,v.type,v.value);});
    this.onMessage('discard',(c,v)=>{const s=this.world.ships.get(c.sessionId);if(s&&typeof v==='string'&&this.limit(c,8,'discard'))this.world.discard(s,v);});
    this.onMessage('ping',(c,v)=>{if(this.limit(c,4,'ping'))c.send('pong',v);});
    this.onMessage('finish',async c=>{const s=this.world.ships.get(c.sessionId);if(!s||s.busy)return;if(dist(s,PORT)>=BALANCE.safeRadius||Math.abs(s.speed)>12||s.cargo.some(i=>i.type!=='mail')){c.send('notice',{text:'Dock and bank your cargo before finishing.',kind:'error'});return;}s.busy=true;try{const d=await store.endVoyage(s.userId,s.voyage);c.send('account',d);this.world.removePlayer(s.id);active.delete(s.userId);c.send('finished');}catch(e){s.busy=false;c.send('notice',{text:e.message,kind:'error'});}});
    this.setSimulationInterval(()=>{this.world.tick();this.frame=(this.frame||0)+1;if(this.frame%3===0)for(const c of this.clients){const snap=this.world.snapshot(c.sessionId);if(snap)c.send('snapshot',snap);}if(this.frame%1800===0)for(const s of this.world.ships.values())if(!s.npc&&s.sailing>=30){const seconds=Math.floor(s.sailing);s.sailing-=seconds;this.world.reward(s,'sailing',{seconds}).catch(()=>this.world.notice(s,'Sailing statistics could not save.','error'));}},1000/30);
  }
  sendNearby(type,event){for(const client of this.clients){const ship=this.world.ships.get(client.sessionId);if(ship&&dist(ship.ashore||ship,event)<850)client.send(type,event);}}
  limit(c,max,channel='action'){const key=c.sessionId+':'+channel,now=Date.now(),r=this.rates.get(key)||{at:now,count:0};if(now-r.at>1000){r.at=now;r.count=0;}r.count++;this.rates.set(key,r);return r.count<=max;}
  async onAuth(client,options){if(!store)throw new ServerError(503,'Cloud voyages are not configured.');const auth=await store.auth(options.token);if(this.mode==='solo'&&this.owner&&this.owner!==auth.id)throw new ServerError(403,'This is another captain’s private ocean.');if(active.has(auth.id))throw new ServerError(409,'You already have a voyage. Reconnect or wait 30 seconds.');return {...auth,account:await store.account(auth.id,auth.name)};}
  async onJoin(c,options,auth){if(this.mode==='solo'&&!this.owner)this.owner=auth.id;const vid=crypto.randomUUID();await store.startVoyage(auth.id,{id:vid,room:this.roomId,mode:this.mode});if(active.has(auth.id)){await store.endVoyage(auth.id,vid);throw new ServerError(409,'Already at sea.');}const s=this.world.addPlayer(c.sessionId,auth.account);s.userId=auth.id;s.voyage=vid;active.set(auth.id,{room:this,ship:s});c.send('account',auth.account);c.send('welcome',{id:c.sessionId,room:this.roomId,mode:this.mode,voyage:vid});c.send('snapshot',this.world.snapshot(c.sessionId));}
  sendTo(id,type,data){this.clients.find(c=>c.sessionId===id)?.send(type,data);}
  async onLeave(c,consented){for(const key of this.rates.keys())if(key.startsWith(c.sessionId+':'))this.rates.delete(key);const s=this.world.ships.get(c.sessionId);if(!s)return;s.connected=false;s.input={};this.world.paused=false;try{if(consented){await new Promise(resolve=>this.clock.setTimeout(resolve,30000));throw new Error('Voyage abandoned.');}await this.allowReconnection(c,30);s.connected=true;c.send('account',s.account);c.send('snapshot',this.world.snapshot(c.sessionId));}catch{this.world.removePlayer(c.sessionId);if(active.get(s.userId)?.ship===s)active.delete(s.userId);await store.endVoyage(s.userId,s.voyage).catch(()=>{});}}
  async onDispose(){for(const s of this.world.ships.values())if(!s.npc){active.delete(s.userId);await store.endVoyage(s.userId,s.voyage).catch(()=>{});}}
}
export class SoloRoom extends OceanRoom {onCreate(options){super.onCreate({...options,mode:'solo'});}}
export class SharedOceanRoom extends OceanRoom {onCreate(options){super.onCreate({...options,mode:'online'});}}
export async function harborAction(user,op,a){const voyage=active.get(user);if(voyage&&a?.type!=='preferences'&& (dist(voyage.ship,PORT)>BALANCE.safeRadius||Math.abs(voyage.ship.speed)>12||voyage.ship.busy))throw new Error('Dock at the harbor before changing your ship.');const d=await store.action(user,op,a);if(voyage){const s=voyage.ship;if(a.type==='equip'||a.type==='purchase'||a.type==='profile'){const input=s.input,id=s.id,vid=s.voyage,uid=s.userId,cargo=s.cargo;voyage.room.world.ships.delete(id);const fresh=voyage.room.world.addPlayer(id,d);Object.assign(fresh,{input,voyage:vid,userId:uid,cargo});voyage.ship=fresh;}else {s.account=d;voyage.room.world.supplyMail(s);}}return d;}
