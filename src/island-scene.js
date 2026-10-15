import * as THREE from 'three';
import { ISLAND_QUESTS,HULLS } from '../shared/config.js';
import { islandOutline,landingPoint,dockPoint,questState } from '../shared/islands.js';

const material=(color,extra={})=>new THREE.MeshStandardMaterial({color,roughness:.95,flatShading:true,...extra});
function box(w,h,d,color,x=0,y=0,z=0){const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),material(color));m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;return m;}
function cylinder(top,bottom,h,color,x=0,y=0,z=0,n=10){const m=new THREE.Mesh(new THREE.CylinderGeometry(top,bottom,h,n),material(color));m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;return m;}
export function makeCaptain(color=0x568d93){
  const g=new THREE.Group();g.name='walking-captain';g.userData.limbs=[];
  g.add(box(9,12,6,color,0,16,0),box(10,2,7,0x563e32,0,11,0));
  const head=new THREE.Mesh(new THREE.SphereGeometry(5,8,6),material(0xe7bc8d));head.position.y=26;g.add(head);
  g.add(cylinder(7,7,2,0x46565c,0,30,0),cylinder(4.7,5,5,0x46565c,0,32,0));
  g.add(box(1.5,1.5,.8,0x403b36,-2,26,4.5),box(1.5,1.5,.8,0x403b36,2,26,4.5));
  for(const side of [-1,1]){
    const leg=new THREE.Group();leg.position.set(side*2.7,9,0);leg.add(box(3.5,8,4,0x58616a,0,-4,0),box(4,2,6,0x47372d,0,-8,1));g.add(leg);
    const arm=new THREE.Group();arm.position.set(side*6,20,0);arm.add(box(3,7,4,color,0,-3,0),box(3,3,3,0xe7bc8d,0,-8,0));g.add(arm);
    g.userData.limbs.push({leg,arm,side});
  }
  return g;
}
export function animateCaptain(g,state,time,reduced=false){const walk=!reduced&&state.speed>1?Math.sin(time*10)*.65:0;for(const {leg,arm,side} of g.userData.limbs){leg.rotation.x=walk*side;arm.rotation.x=-walk*side;}g.position.y=12.8+(!reduced&&state.speed>1?Math.abs(Math.sin(time*10))*.55:0);g.rotation.y=-state.theta+Math.PI/2;}
function marker(color=0xf5ce79){const g=new THREE.Group(),m=new THREE.MeshBasicMaterial({color,side:THREE.DoubleSide});const ring=new THREE.Mesh(new THREE.RingGeometry(8,11,20),m);ring.rotation.x=-Math.PI/2;ring.position.y=1;g.add(ring);const gem=new THREE.Mesh(new THREE.OctahedronGeometry(5),m);gem.position.y=42;g.add(gem);g.userData.gem=gem;return g;}
function item(step){const g=new THREE.Group();g.name='quest-item:'+step.id;
  if(step.kind==='pearl'){const shell=new THREE.Mesh(new THREE.SphereGeometry(8,8,5),material(0xe6c6b5));shell.scale.y=.3;shell.position.y=3;g.add(shell);const pearl=new THREE.Mesh(new THREE.SphereGeometry(4.5,10,8),material(0xfff4db,{emissive:0xe1bf96,emissiveIntensity:.18}));pearl.position.y=6;g.add(pearl);}
  else if(step.kind==='prism'||step.kind==='crystal'){const crystal=new THREE.Mesh(new THREE.OctahedronGeometry(11),material(step.kind==='prism'?0x95d7cf:0xe3a45f,{emissive:step.kind==='prism'?0x397d76:0x9b5426,emissiveIntensity:.3}));crystal.scale.y=1.5;crystal.position.y=13;g.add(crystal);}
  else if(step.kind==='barrel'){g.add(cylinder(8,8,18,0x9e7650,0,9,0));for(const y of [4,13])g.add(cylinder(8.5,8.5,2,0x536264,0,y,0));}
  else if(step.kind==='bell'){g.add(cylinder(4,11,12,0xba975c,0,8,0),cylinder(2,2,5,0x5a4c35,0,17,0));}
  else if(step.kind==='ore'){for(let n=0;n<3;n++){const ore=new THREE.Mesh(new THREE.DodecahedronGeometry(7,0),material(0x505b60));ore.position.set(n*6-6,5,Math.sin(n)*5);g.add(ore);}}
  else{g.add(box(15,11,12,step.kind==='tools'?0x887057:0xb98e60,0,6,0),box(2,13,13,0xe1c78d,0,6,0),box(16,13,2,0xe1c78d,0,6,0));}
  return g;
}
function palm(x,z,size=1){const g=new THREE.Group();g.position.set(x,12,z);g.add(cylinder(2,4,42,0x927251,0,21,0,6));g.userData.leaves=[];for(let n=0;n<6;n++){const leaf=new THREE.Mesh(new THREE.ConeGeometry(9,36,4),material(0x528366));leaf.position.set(Math.cos(n)*12,42,Math.sin(n)*12);leaf.rotation.set(Math.sin(n)*.9,0,Math.cos(n)*.9);leaf.userData.swayBase=leaf.rotation.z;g.add(leaf);g.userData.leaves.push(leaf);}g.scale.setScalar(size);return g;}
function pine(x,z,size=1){const g=new THREE.Group();g.position.set(x,12,z);g.add(cylinder(2,3,27,0x7b6b51,0,13,0));for(let n=0;n<3;n++)g.add(cylinder(0,17-n*3,27,0x526e61,0,30+n*12,0,7));g.scale.setScalar(size);return g;}
function house(o,color=0xdcc7a8,roofColor=0x73918b){const g=new THREE.Group();g.name=o.kind;g.position.set(o.x,12,o.y);g.add(box(o.r*1.55,30,o.r*1.4,color,0,15,0));const roof=new THREE.Mesh(new THREE.ConeGeometry(o.r*1.4,23,4),material(roofColor));roof.rotation.y=Math.PI/4;roof.position.y=41;g.add(roof,box(9,16,1,0x75604b,0,8,-o.r*.7-.5));for(const x of [-15,15])g.add(box(6,7,1,0xeccb82,x,20,-o.r*.7-.7));return g;}
function landmark(o,theme){
  if(o.kind==='house'||o.kind==='forge')return house(o,o.kind==='forge'?0x7a7970:[0xe1c8a6,0xc3d3bf,0xdac5cb][Math.abs(o.x)%3],o.kind==='forge'?0xa46954:0x73918b);
  const g=new THREE.Group();g.position.set(o.x,12,o.y);g.name=o.kind;
  if(o.kind==='lagoon'){const water=new THREE.Mesh(new THREE.CircleGeometry(o.r,40),material(0x73c4c2));water.rotation.x=-Math.PI/2;water.position.y=.9;g.add(water);const rim=new THREE.Mesh(new THREE.RingGeometry(o.r,o.r+7,40),material(0xe5d5b0));rim.rotation.x=-Math.PI/2;rim.position.y=1;g.add(rim);}
  else if(o.kind==='tent'){const canvas=new THREE.Mesh(new THREE.CylinderGeometry(0,o.r*1.2,38,4,1,false),material(0xe5cb91));canvas.rotation.y=Math.PI/4;canvas.position.y=18;g.add(canvas,box(10,22,1,0x796752,0,11,-o.r*.8));}
  else if(o.kind==='tower'){g.add(cylinder(15,25,78,0xd6d1bb,0,39,0),cylinder(26,26,4,0x6d7a78,0,79,0),cylinder(20,20,19,0xdeb96b,0,90,0),cylinder(0,29,20,0x7e8b84,0,108,0));const lens=box(10,5,10,0xffdea2,0,92,0);lens.material.emissive.setHex(0xffc979);lens.material.emissiveIntensity=.4;g.userData.lens=lens;g.add(lens);}
  else if(o.kind==='ruin'){for(const x of [-o.r*.65,o.r*.65])g.add(box(10,35,15,0xa5a79a,x,17,0));g.add(box(o.r*1.8,9,17,0xb4b4a1,0,38,0));g.add(box(13,8,15,0x979e92,0,4,14));}
  else if(o.kind==='volcano'){g.add(cylinder(20,o.r,105,0x60645d,0,51,0,11));const lava=cylinder(18,18,2,0xe79a5e,0,105,0);lava.material.emissive.setHex(0xd3703c);lava.material.emissiveIntensity=.7;g.add(lava);g.userData.lava=lava;g.userData.smoke=[];for(let n=0;n<3;n++){const cloud=new THREE.Mesh(new THREE.IcosahedronGeometry(14,0),material(0xcbbf9e,{transparent:true,opacity:.16,depthWrite:false}));g.add(cloud);g.userData.smoke.push(cloud);}}
  else {const rock=new THREE.Mesh(new THREE.DodecahedronGeometry(o.r,0),material(theme==='volcanic'?0x555d57:0x99a795));rock.position.y=o.r*.55;g.add(rock);}
  return g;
}
export function makeIslandScene(i){
  const root=new THREE.Group();root.name='island:'+i.id;root.position.set(i.x,0,i.y);root.userData.island=i;root.userData.leaves=[];root.userData.gulls=[];root.userData.landmarks=[];
  const shape=new THREE.Shape();islandOutline(i).forEach((p,n)=>{if(n)shape.lineTo(p.x-i.x,-(p.y-i.y));else shape.moveTo(p.x-i.x,-(p.y-i.y));});shape.closePath();
  const beach=new THREE.Mesh(new THREE.ExtrudeGeometry(shape,{depth:12,bevelEnabled:false}),material(i.theme==='volcanic'?0x7d796d:0xe7d1a6));beach.rotation.x=-Math.PI/2;beach.receiveShadow=true;beach.name='shoreline';root.add(beach);
  const grass=new THREE.Mesh(new THREE.ShapeGeometry(shape),material(i.color));grass.rotation.x=-Math.PI/2;grass.scale.set(.9,.9,1);grass.position.y=12.35;grass.receiveShadow=true;root.add(grass);
  for(const o of i.obstacles){const model=landmark(o,i.theme);root.userData.landmarks.push(model);root.add(model);}
  for(let n=0;n<9;n++){
    const a=n*2.399+.4,r=i.r*(n%2?.64:.74),x=Math.cos(a)*r,z=Math.sin(a)*r;
    if(i.obstacles.some(o=>Math.hypot(o.x-x,o.y-z)<o.r+25)||ISLAND_QUESTS[i.id].steps.some(p=>Math.hypot(p.x-x,p.y-z)<25))continue;
    if(i.theme==='ruins'){root.add(pine(x,z,.8+(n%3)*.15));}
    else if(i.theme==='volcanic'){const rock=new THREE.Mesh(new THREE.DodecahedronGeometry(14+n%3*3,0),material(0x515c55));rock.position.set(x,18,z);root.add(rock);}
    else{const tree=palm(x,z,i.theme==='harbor'?.75:1);root.add(tree);root.userData.leaves.push(...tree.userData.leaves);}
  }
  if(i.theme==='harbor'){const stall=new THREE.Group();stall.position.set(-15,12,-40);stall.add(box(30,10,15,0xb48b61,0,5,0));for(const x of [-14,14])stall.add(box(2,24,2,0x84684b,x,12,0));stall.add(box(35,2,22,0xc9876b,0,25,0));root.add(stall);}
  // Landing boardwalk and its anchor marker link sea controls to foot controls.
  const pier=new THREE.Group();pier.name='landing-dock';pier.rotation.y=-i.dockAngle;const start=i.r*.6,end=i.r+55;
  for(let x=start;x<end;x+=13){pier.add(box(12,3,29,0xae855b,x,11,0));if(Math.round(x/13)%3===0)for(const z of [-12,12])pier.add(cylinder(2,2,19,0x705842,x,5,z,6));}root.add(pier);
  const berth=marker(0xc8e4d4),dp=dockPoint(i);berth.position.set(dp.x-i.x,5,dp.y-i.y);berth.name='sea-landing-marker';root.add(berth);
  const shipMarker=marker(0xc6e4dc),lp=landingPoint(i);shipMarker.position.set(lp.x-i.x,13,lp.y-i.y);shipMarker.name='return-to-ship';shipMarker.visible=false;root.add(shipMarker);
  const npc=makeCaptain(i.theme==='volcanic'?0xa66d50:i.theme==='ruins'?0x7c8c79:0x729ba1);npc.position.set(i.npc.x,12.8,i.npc.y);npc.rotation.y=i.dockAngle;root.add(npc);
  const questMark=marker();questMark.position.set(i.npc.x,13,i.npc.y);questMark.name='quest-giver-marker';root.add(questMark);
  const steps=new Map();for(const step of ISLAND_QUESTS[i.id].steps){const prop=item(step);prop.position.set(step.x,12.8,step.y);root.add(prop);const mark=marker();mark.position.set(step.x,13,step.y);mark.visible=false;root.add(mark);steps.set(step.id,{prop,mark});}
  root.userData.quest={npc,questMark,steps,shipMarker,berth};return root;
}
export function animateIslandScene(root,progress,avatar,time,reduced=false){
  const i=root.userData.island,q=root.userData.quest,p=questState({islandQuests:progress},i.id),t=reduced?0:time;
  q.questMark.visible=!p.done;q.questMark.children[0].material.color.setHex(p.accepted?0xb8ded1:0xf5ce79);
  q.shipMarker.visible=avatar?.island===i.id;
  for(const [id,{prop,mark}]of q.steps){prop.visible=!p.steps.includes(id);mark.visible=p.accepted&&!p.done&&!p.steps.includes(id);}
  for(const mark of [q.questMark,q.shipMarker,q.berth,...[...q.steps.values()].map(s=>s.mark)]){mark.userData.gem.rotation.y=t*.8;mark.userData.gem.position.y=42+Math.sin(t*1.6)*2;}
  for(const model of root.userData.landmarks){if(model.userData.lens)model.userData.lens.material.emissiveIntensity=p.done?1.5:.4;if(model.userData.lava)model.userData.lava.material.emissiveIntensity=.7+Math.sin(t*.9)*.12;for(const [n,cloud]of (model.userData.smoke||[]).entries()){const phase=(t*.13+n/3)%1;cloud.position.set(Math.sin(t*.4+n)*5,112+phase*70,Math.cos(n)*4);cloud.scale.setScalar(.7+phase*.8);cloud.material.opacity=reduced?.12:(1-phase)*.18;}}
}
export const captainColor=id=>HULLS[id]?.color||0x568d93;
