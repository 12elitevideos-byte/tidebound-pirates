import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Scene } from 'three';
import { OceanEffects } from '../src/effects.js';
import { World } from '../shared/world.js';
import { OceanRoom } from '../server/ocean-room.js';
import { defaultAccount,WRECKS } from '../shared/config.js';

test('Battle particles expire, reuse meshes, obey graphics limits, and switch off with reduced motion',()=>{
  const scene=new Scene(),effects=new OceanEffects(scene);effects.configure({quality:'low',reducedMotion:false});
  for(let frame=0;frame<240;frame++){effects.feedback({type:'cannon',x:0,y:0,theta:0,side:'left',guns:4,heavy:true});effects.feedback({type:'impact',x:15,y:20});effects.update(1/30);assert(effects.particles.length<=64);assert(effects.particles.length+effects.pool.length<=64);}
  const meshes=new Set([...effects.particles.map(p=>p.o),...effects.pool]);effects.update(3);assert.equal(effects.particles.length,0);assert.equal(effects.group.children.length,0);effects.feedback({type:'loot',x:0,y:0,itemX:20,itemY:30});assert(effects.particles.every(p=>meshes.has(p.o)));for(const p of effects.particles)assert(p.o.position.toArray().every(Number.isFinite));effects.configure({quality:'high',reducedMotion:true});effects.feedback({type:'bank',x:0,y:0});effects.explosion(0,0);assert.equal(effects.particles.length,0);effects.dispose();assert.equal(scene.children.length,0);
});
test('Sound/effect cues follow actual accepted cannon, search and treasure actions',async()=>{
  const events=[],world=new World('practice',{sound:(s,type,detail)=>events.push({type,...detail})});const captain=world.addPlayer('captain',defaultAccount());
  assert.equal(world.fire(captain,'left',captain.theta-Math.PI/2),false);assert.equal(events.length,0);
  captain.x=1100;captain.y=-900;captain.invuln=0;assert(world.fire(captain,'left',captain.theta-Math.PI/2,true));assert.equal(events[0].type,'cannon');assert.equal(events[0].side,'left');assert.equal(events[0].heavy,true);assert.equal(events[0].guns,2);assert.equal(world.fire(captain,'left',captain.theta-Math.PI/2),false);assert.equal(events.length,1);
  world.action(captain.id,'sound',{type:'loot',value:10000});assert.equal(events.length,1);
  captain.x=WRECKS[0].x;captain.y=WRECKS[0].y;captain.speed=0;captain.anchor=true;await world.interact(captain);assert(events.some(e=>e.type==='search'));for(let i=0;i<95;i++)world.tick(1/30);assert.equal(events.filter(e=>e.type==='searchdone').length,1);await world.interact(captain);const collected=events.filter(e=>e.type==='loot');assert.equal(collected.length,1);assert.equal(collected[0].value,170);assert.equal(collected[0].lootId,captain.cargo[0].id);await world.interact(captain);assert.equal(events.filter(e=>e.type==='loot').length,1);
});
test('Online sound/effect locations are sent only to captains close enough to see the event',()=>{const received=[],room={world:{ships:new Map([['near',{x:10,y:20}],['far',{x:1600,y:20}]])},clients:['near','far'].map(id=>({sessionId:id,send:(type,event)=>received.push({id,type,event})}))};OceanRoom.prototype.sendNearby.call(room,'sound',{type:'impact',x:0,y:0});assert.deepEqual(received.map(r=>r.id),['near']);});
