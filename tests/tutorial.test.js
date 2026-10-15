import { test } from 'node:test';
import assert from 'node:assert/strict';
import { World } from '../shared/world.js';
import { defaultAccount,PORT,dist,angle,clamp } from '../shared/config.js';
import { applyReward } from '../shared/economy.js';
import { FirstVoyage,LESSON_STEPS } from '../src/tutorial.js';

test('The guided route can be completed using actual sailing, search, collection and banking',async()=>{
  let account=defaultAccount('Training captain'),lesson;
  const world=new World('practice',{reward:async(s,r)=>(account=applyReward(account,r)),bank:async(s,items,gold)=>(account=applyReward(account,{type:'bank',mode:'practice',ship:s.kind,items:items.length,gold})),result:(s,r)=>{if(r.kind==='bank')lesson.banked=true;}});
  // Keep this navigation fixture free from random combat encounters.
  for(const [id,s] of world.ships)if(s.npc)world.ships.delete(id);
  const ship=world.addPlayer('captain',account);ship.x=0;ship.y=1340;lesson=new FirstVoyage(ship);
  const seen=new Set(),tick=(input={},count=1)=>{for(let i=0;i<count;i++){world.input(ship.id,input);world.tick(1/30);seen.add(LESSON_STEPS[lesson.step]);lesson.update(world.snapshot(ship.id),input,1/30);}};
  tick({},10);assert.equal(lesson.step,0);world.action(ship.id,'anchor');tick();assert.equal(lesson.step,1);
  tick({sail:1},80);assert.equal(lesson.step,2);tick({steer:-1},12);assert.equal(lesson.step,3);
  function navigate(target){for(let i=0;i<1800;i++){const distance=dist(ship,target),heading=Math.atan2(target.y-ship.y,target.x-ship.x);if(ship.anchor&&distance>70)world.action(ship.id,'anchor');if(distance<70){if(!ship.anchor)world.action(ship.id,'anchor');tick({sail:-1},100);assert(dist(ship,target)<90);return;}tick({sail:distance>120?1:-1,steer:clamp(angle(heading-ship.theta)*2.8,-1,1)});}assert.fail('Could not reach the objective with the real sailing simulation');}
  navigate(lesson.wreck);assert.equal(lesson.step,4);await world.interact(ship);assert(ship.search);tick({},95);assert.equal(lesson.step,5);assert(world.loot.some(i=>i.name==='Shipwreck salvage'));
  await world.interact(ship);tick();assert.equal(lesson.step,6);assert(ship.cargo.length>0);
  navigate(PORT);assert.equal(lesson.step,7);const gold=account.gold;await world.interact(ship);tick();assert.equal(lesson.step,8);assert(account.gold>gold);assert.equal(ship.cargo.length,0);assert.deepEqual([...seen].filter(Boolean),LESSON_STEPS);
});
