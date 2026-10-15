import { ISLANDS,ISLAND_QUESTS,dist } from './config.js';

// One shoreline is used by terrain, charts, walking, and cannon collisions.
export function coastRadius(island,a){
  const theme=island.theme||'harbor';
  const wave=theme==='tropical'?Math.sin(a*3+.7)*.08+Math.cos(a*5)*.045:theme==='ruins'?Math.cos(a*4+.3)*.065+Math.sin(a*7)*.025:theme==='volcanic'?Math.sin(a*5+1)*.075+Math.cos(a*3)*.04:Math.sin(a*3)*.055+Math.cos(a*5)*.025;
  return island.r*(.87+wave);
}
export function islandOutline(island){return Array.from({length:48},(_,n)=>{const a=n/48*Math.PI*2,r=coastRadius(island,a);return {x:island.x+Math.cos(a)*r,y:island.y+Math.sin(a)*r};});}
const outlines=new Map(ISLANDS.map(i=>[i.id,islandOutline(i)]));
export function outline(island){return outlines.get(island.id)||islandOutline(island);}
export function insideIsland(p,island){const vertices=outline(island);let inside=false;for(let n=0,j=vertices.length-1;n<vertices.length;j=n++){const a=vertices[n],b=vertices[j];if((a.y>p.y)!==(b.y>p.y)&&p.x<(b.x-a.x)*(p.y-a.y)/(b.y-a.y)+a.x)inside=!inside;}return inside;}
export function shoreDistance(p,island){let closest=null,best=Infinity;const v=outline(island);for(let n=0;n<v.length;n++){const a=v[n],b=v[(n+1)%v.length],dx=b.x-a.x,dy=b.y-a.y,f=Math.max(0,Math.min(1,((p.x-a.x)*dx+(p.y-a.y)*dy)/(dx*dx+dy*dy))),q={x:a.x+dx*f,y:a.y+dy*f},d=dist(p,q);if(d<best){best=d;closest=q;}}return {distance:best,point:closest,inside:insideIsland(p,island)};}
export function collideShip(p,island,radius){if(dist(p,island)>island.r+radius)return null;const edge=shoreDistance(p,island);if(!edge.inside&&edge.distance>=radius)return null;let nx=p.x-edge.point.x,ny=p.y-edge.point.y,n=Math.hypot(nx,ny);if(edge.inside){nx=-nx;ny=-ny;}if(n<.0001){nx=p.x-island.x;ny=p.y-island.y;n=Math.hypot(nx,ny)||1;}return {x:edge.point.x+nx/n*(radius+.5),y:edge.point.y+ny/n*(radius+.5)};}
export function segmentIsland(from,to,island){
  if(insideIsland(from,island))return 0;const v=outline(island),dx=to.x-from.x,dy=to.y-from.y;let first=null;
  for(let n=0;n<v.length;n++){const a=v[n],b=v[(n+1)%v.length],ex=b.x-a.x,ey=b.y-a.y,den=dx*ey-dy*ex;if(Math.abs(den)<1e-10)continue;const ax=a.x-from.x,ay=a.y-from.y,t=(ax*ey-ay*ex)/den,u=(ax*dy-ay*dx)/den;if(t>=0&&t<=1&&u>=0&&u<=1&&(first===null||t<first))first=t;}
  return first;
}
export const islandById=id=>ISLANDS.find(i=>i.id===id);
export const localPoint=(i,p)=>({x:i.x+p.x,y:i.y+p.y});
export const dockPoint=i=>({x:i.x+Math.cos(i.dockAngle)*(i.r+85),y:i.y+Math.sin(i.dockAngle)*(i.r+85),name:i.name+' dock',island:i.id});
export const landingPoint=i=>({x:i.x+Math.cos(i.dockAngle)*i.r*.65,y:i.y+Math.sin(i.dockAngle)*i.r*.65,name:'Your ship',island:i.id});
export function nearbyDock(s){return ISLANDS.map(i=>({island:i,point:dockPoint(i)})).filter(d=>dist(s,d.point)<150).sort((a,b)=>dist(s,a.point)-dist(s,b.point))[0]||null;}
export function canWalk(p,island){if(dist(p,island)>island.r||!insideIsland(p,island))return false;const edge=shoreDistance(p,island);if(edge.distance<9)return false;return !(island.obstacles||[]).some(o=>dist(p,localPoint(island,o))<o.r+8);}
export function questState(account,id){const q=ISLAND_QUESTS[id],p=account?.islandQuests?.[id];return {accepted:Boolean(p?.acceptedAt),done:Boolean(p?.completedAt),steps:p?.steps||[],total:q?.steps.length||0};}
export function shoreInteraction(account,avatar){
  const island=islandById(avatar?.island);if(!island)return null;const p=questState(account,island.id),options=[{kind:'board',name:'Board ship',point:landingPoint(island),radius:42},{kind:'npc',name:'Talk to '+island.npc.name,point:localPoint(island,island.npc),radius:48}];
  if(p.accepted&&!p.done)for(const step of ISLAND_QUESTS[island.id].steps)if(!p.steps.includes(step.id))options.push({kind:'step',name:step.verb,point:localPoint(island,step),radius:38,step});
  return options.filter(o=>dist(avatar,o.point)<o.radius).sort((a,b)=>dist(avatar,a.point)-dist(avatar,b.point))[0]||null;
}
export function shoreObjective(account,avatar){const island=islandById(avatar.island),q=ISLAND_QUESTS[island.id],p=questState(account,island.id);if(!p.accepted)return {title:'Meet '+island.npc.name,body:'Walk to the golden marker and interact to hear the island’s quest.',target:{...localPoint(island,island.npc),name:island.npc.name}};if(p.done)return {title:island.name+' explored',body:'Quest complete! Explore the island or return to your ship at the anchor marker.',target:landingPoint(island)};const remaining=q.steps.filter(s=>!p.steps.includes(s.id));if(!remaining.length)return {title:'Return to '+island.npc.name,body:'You found everything. Talk to the quest giver to collect your reward.',target:{...localPoint(island,island.npc),name:island.npc.name}};const next=remaining.sort((a,b)=>dist(avatar,localPoint(island,a))-dist(avatar,localPoint(island,b)))[0];return {title:q.name+' · '+p.steps.length+'/'+q.steps.length,body:'Find '+next.name.toLowerCase()+', then interact. Open your journal to see every objective.',target:{...localPoint(island,next),name:next.name}};}
