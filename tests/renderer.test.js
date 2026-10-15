import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Box3 } from 'three';
import { makeShip,animateShip,makeWreck } from '../src/renderer.js';
import { SHIPS,SAILS,WRECKS } from '../shared/config.js';

test('Each ship keeps its deck above the hull bevel and its sail pattern on the animated cloth',()=>{
  for(const kind of Object.keys(SHIPS))for(const sailId of Object.keys(SAILS)){
    const ship=makeShip(kind,{hull:'cedar',sail:sailId,flag:'gull'});ship.updateMatrixWorld(true);
    const hull=new Box3().setFromObject(ship.getObjectByName('hull')),deck=new Box3().setFromObject(ship.getObjectByName('deck'));
    assert(deck.min.y>hull.max.y+.5,'Deck must not share the top bevel plane');
    for(const sail of ship.userData.sails){assert.equal(sail.geometry.attributes.color.count,sail.geometry.attributes.position.count);assert.equal(sail.material.vertexColors,true);}
    const cloth=ship.userData.sails[0],colors=cloth.geometry.attributes.color.array.slice();
    if(SAILS[sailId].pattern!=='plain')assert(new Set(Array.from({length:colors.length/3},(_,i)=>colors.slice(i*3,i*3+3).join(','))).size>1,'The actual cloth contains the cosmetic pattern');
    for(const t of [0,.7,2,6,12]){animateShip(ship,t);for(const sail of ship.userData.sails)for(const attr of ['position','normal'])assert([...sail.geometry.attributes[attr].array].every(Number.isFinite));}
    assert.deepEqual(cloth.geometry.attributes.color.array,colors,'Pattern is fixed to cloth vertices while it bends');
    animateShip(ship,15,true);for(const sail of ship.userData.sails)assert.deepEqual(sail.geometry.attributes.position.array,sail.userData.rest,'Reduced motion restores the original cloth exactly');
  }
});
test('Every searchable shipwreck has a visible model at the gameplay location',()=>{for(const wreck of WRECKS){const model=makeWreck(wreck);assert.equal(model.position.x,wreck.x);assert.equal(model.position.z,wreck.y);assert(model.children.length>=4);assert(new Box3().setFromObject(model).max.y>10);}});

test('Clicking the visible sail picks that enemy ship instead of a sea point behind it',async()=>{const {Scene,OrthographicCamera,Raycaster,Vector3}=await import('three');const {OceanRenderer}=await import('../src/renderer.js');const oldW=globalThis.innerWidth,oldH=globalThis.innerHeight;globalThis.innerWidth=1000;globalThis.innerHeight=700;try{const scene=new Scene(),camera=new OrthographicCamera(-670,670,470,-470,10,2100);camera.position.set(0,640,490);camera.lookAt(0,0,0);camera.updateMatrixWorld(true);const target=makeShip();target.position.set(90,.5,-200);const state={id:'enemy',x:90,y:-200,theta:-Math.PI/2};target.userData.state=state;scene.add(target);scene.updateMatrixWorld(true);const sailPoint=new Vector3(0,55,-3).applyMatrix4(target.matrixWorld).project(camera),fake={state:{me:{id:'me',x:0,y:0}},id:'me',scene,camera,pickRay:new Raycaster(),objects:new Map([['enemy',target]])};const picked=OceanRenderer.prototype.aimAt.call(fake,(sailPoint.x+1)*500,(1-sailPoint.y)*350);assert.equal(picked.target,'enemy');assert(Math.abs(picked.aim-Math.atan2(-200,90))<1e-8);}finally{globalThis.innerWidth=oldW;globalThis.innerHeight=oldH;}});
