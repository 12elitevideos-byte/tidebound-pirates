import { test } from 'node:test';
import assert from 'node:assert/strict';
import { World } from '../shared/world.js';
import { defaultAccount,ISLANDS,ISLAND_QUESTS,WORLD,dist } from '../shared/config.js';
import { applyReward,applyAction } from '../shared/economy.js';
import { dockPoint,landingPoint,localPoint,canWalk,shoreDistance,islandOutline } from '../shared/islands.js';
import { restorePracticeSave } from '../src/practice-save.js';
import { MemoryStore } from '../server/store.js';
import { makeIslandScene,animateIslandScene,makeCaptain,animateCaptain } from '../src/island-scene.js';
import { walkRoute } from './fixtures/island-navigation.js';

const empty=w=>{for(const [id,s]of w.ships)if(s.npc)w.ships.delete(id);};
function walkTo(w,s,i,target){for(const point of walkRoute(i,s.ashore,target)){
  for(let n=0;n<500&&dist(s.ashore,point)>4;n++){const dx=point.x-s.ashore.x,dy=point.y-s.ashore.y,d=Math.hypot(dx,dy);w.input(s.id,{walkX:dx/d,walkY:dy/d});w.tick(1/30);assert(canWalk(s.ashore,i));}
  assert(dist(s.ashore,point)<=4,'Walking should reach the route waypoint');
}w.input(s.id,{});w.tick(1/30);assert(dist(s.ashore,target)<24);}

test('The larger ocean has four distinct, separated islands and usable landing docks',()=>{
  assert.equal(ISLANDS.length,4);assert((WORLD.maxX-WORLD.minX)*(WORLD.maxY-WORLD.minY)>3600*3400*4.9);
  assert.equal(new Set(ISLANDS.map(i=>i.theme)).size,4);
  for(const i of ISLANDS){assert(canWalk(landingPoint(i),i));assert(canWalk(localPoint(i,i.npc),i));for(const other of ISLANDS)if(other!==i)assert(dist(i,other)>i.r+other.r+800);const edge=shoreDistance(dockPoint(i),i);assert(!edge.inside&&edge.distance>50);}
});

test('Every island quest can be accepted, explored using actual foot movement, rewarded, and boarded',async()=>{
  let account=defaultAccount('Explorer');const w=new World('practice',{reward:async(s,r)=>(account=applyReward(account,r))});empty(w);const s=w.addPlayer('explorer',account);
  for(const i of ISLANDS){
    Object.assign(s,{...dockPoint(i),speed:0,anchor:true});await w.land(s);assert.equal(s.ashore.island,i.id);const boat={x:s.x,y:s.y};
    walkTo(w,s,i,localPoint(i,i.npc));await w.islandQuest(s,'start');const gold=account.gold;
    for(const step of ISLAND_QUESTS[i.id].steps){walkTo(w,s,i,localPoint(i,step));await w.interact(s);assert(account.islandQuests[i.id].steps.includes(step.id));}
    assert.equal(account.gold,gold,'Collecting an objective does not pay the full reward');
    walkTo(w,s,i,localPoint(i,i.npc));await w.islandQuest(s,'finish');assert.equal(account.gold,gold+ISLAND_QUESTS[i.id].gold);assert(account.islandQuests[i.id].completedAt);
    await w.islandQuest(s,'finish');assert.equal(account.gold,gold+ISLAND_QUESTS[i.id].gold,'The completed quest cannot pay twice');
    assert.deepEqual({x:s.x,y:s.y},boat,'The boat remains moored while the captain walks');
    walkTo(w,s,i,landingPoint(i));w.board(s);assert.equal(s.ashore,null);assert.equal(s.dockedIsland,null);assert(s.anchor);
  }
  assert.equal(account.stats.practice.islandQuests,4);assert.equal(account.visitedIslands.length,4);
  assert.equal(account.gold,250+Object.values(ISLAND_QUESTS).reduce((n,q)=>n+q.gold,0));
});

test('Docking, boarding, walking bounds, and distant quest requests are validated by the simulation',async()=>{
  let account=defaultAccount();const w=new World('online',{reward:async(s,r)=>(account=applyReward(account,r))});empty(w);const s=w.addPlayer('captain',account),i=ISLANDS[1];
  await w.land(s);assert.equal(s.ashore.island,'home');w.board(s);Object.assign(s,{x:0,y:-500,anchor:true,speed:0});await w.land(s);assert.equal(s.ashore,null);
  Object.assign(s,dockPoint(i));s.speed=20;await w.land(s);assert.equal(s.ashore,null);s.speed=0;await w.land(s);
  await w.islandQuest(s,'start');assert(!account.islandQuests.pearl,'Quest cannot be accepted from the landing point');
  const initial={...s.ashore};w.input(s.id,{walkX:1e9,walkY:1e9,sail:1,fire:true});w.tick(1/30);assert(dist(initial,s.ashore)<=95/30+.001);assert.equal(w.shots.length,0);
  for(let n=0;n<300;n++)w.tick(1/30);assert(canWalk(s.ashore,i));w.board(s);assert(s.ashore,'Boarding from a distant position is rejected');
  w.input(s.id,{walkX:NaN,walkY:Infinity});w.tick();assert.equal(s.ashore.speed,0);
  const hp=s.hp;assert.equal(w.damage(s,1000,null),false);assert.equal(s.hp,hp,'The moored ship is protected');
  const snap=w.snapshot(s.id);assert(snap.avatars.some(a=>a.id===s.id));assert(snap.avatars.every(a=>!('account' in a)&&!('userId' in a)));
  assert.throws(()=>applyAction(account,{type:'islandQuest',island:'pearl',phase:'finish'}),'Browser account actions cannot mint quest rewards');
});

test('Partial quest progress survives local save restoration and resumes on a later voyage',()=>{
  let d=defaultAccount('Returning captain');d.gold=925;d.xp=240;d.owned.hull.push('teal');
  d=applyReward(d,{type:'islandQuest',mode:'practice',island:'gull',phase:'start'});d=applyReward(d,{type:'islandQuest',mode:'practice',island:'gull',phase:'step',step:'oil'});
  const saved=restorePracticeSave(JSON.parse(JSON.stringify(d)));assert.equal(saved.gold,925);assert(saved.owned.hull.includes('teal'));assert.deepEqual(saved.islandQuests.gull.steps,['oil']);
  const w=new World('practice');const s=w.addPlayer('returning',saved);assert.deepEqual(w.snapshot(s.id).me.islandQuests.gull.steps,['oil']);assert.equal(s.ashore,null);
  const legacy=defaultAccount();delete legacy.islandQuests;delete legacy.visitedIslands;assert.deepEqual(restorePracticeSave(legacy).islandQuests,{});
});

test('A quest reward with a lost database response retries without losing progress or paying twice',async()=>{
  const db=new MemoryStore(),i=ISLANDS[0];let lose=true;const w=new World('solo',{reward:async(s,r,op)=>{const d=await db.reward('captain',op,r);if(r.phase==='finish'&&lose){lose=false;throw new Error('Lost after commit');}return d;}});empty(w);const s=w.addPlayer('captain',await db.account('captain'));Object.assign(s,dockPoint(i));await w.land(s);walkTo(w,s,i,localPoint(i,i.npc));await w.islandQuest(s,'start');
  for(const step of ISLAND_QUESTS.home.steps){walkTo(w,s,i,localPoint(i,step));await w.interact(s);}walkTo(w,s,i,localPoint(i,i.npc));
  await assert.rejects(()=>w.islandQuest(s,'finish'));assert.equal(s.busy,false);assert(!s.account.islandQuests.home.completedAt);assert.equal((await db.account('captain')).gold,430);
  await w.islandQuest(s,'finish');assert(s.account.islandQuests.home.completedAt);assert.equal(s.account.gold,430);
  const retry=await db.reward('captain','different-finish-id',{type:'islandQuest',mode:'online',island:'home',phase:'finish'});assert.equal(retry.gold,430);
});

test('Island models match the shared shoreline and show distinct landmarks and quest-item states',()=>{
  const expected={home:'house',pearl:'lagoon',gull:'tower',ember:'volcano'};
  for(const i of ISLANDS){const root=makeIslandScene(i);assert(root.getObjectByName('landing-dock'));assert(root.userData.landmarks.some(o=>o.name===expected[i.id]||expected[i.id]==='house'&&o.children.length>3));assert.equal(islandOutline(i).length,48);
    root.traverse(o=>{if(o.geometry)assert([...o.geometry.attributes.position.array].every(Number.isFinite));});
    animateIslandScene(root,{},null,2);assert([...root.userData.quest.steps.values()].every(s=>!s.mark.visible));
    const step=ISLAND_QUESTS[i.id].steps[0].id;animateIslandScene(root,{[i.id]:{acceptedAt:'now',steps:[step],completedAt:null}},{island:i.id},4);assert(root.userData.quest.shipMarker.visible);assert(!root.userData.quest.steps.get(step).prop.visible);assert([...root.userData.quest.steps].filter(([id])=>id!==step).every(([,s])=>s.mark.visible));
    animateIslandScene(root,{[i.id]:{acceptedAt:'now',steps:ISLAND_QUESTS[i.id].steps.map(s=>s.id),completedAt:'now'}},null,8,true);assert(!root.userData.quest.questMark.visible);assert(!root.userData.quest.shipMarker.visible);
  }
  const captain=makeCaptain();animateCaptain(captain,{speed:95,theta:1},.3);assert(captain.userData.limbs.some(l=>l.leg.rotation.x!==0));animateCaptain(captain,{speed:95,theta:1},.3,true);assert(captain.userData.limbs.every(l=>l.leg.rotation.x===0));
});
