import { SHIPS,CANNONS,PORT,ISLANDS,BALANCE,dist,angle } from './config.js';
import { segmentIsland } from './islands.js';

// These bounds match the rendered 86-unit wooden hull, rather than the old
// movement circle. Masts and sails select a ship; cannonballs strike its hull.
export function hullBounds(ship){const scale=SHIPS[ship.kind]?.scale||1;return {length:43*scale,width:26*scale,offset:3*scale};}
export function segmentCircle(from,to,center,radius){
  const dx=to.x-from.x,dy=to.y-from.y,px=from.x-center.x,py=from.y-center.y,a=dx*dx+dy*dy,c=px*px+py*py-radius*radius;
  if(c<=0)return 0;if(a<1e-12)return null;const b=2*(px*dx+py*dy),d=b*b-4*a*c;if(d<0)return null;const t=(-b-Math.sqrt(d))/(2*a);return t>=0&&t<=1?t:null;
}
export function segmentHull(from,to,ship,ballRadius=3){
  const b=hullBounds(ship),cos=Math.cos(ship.theta),sin=Math.sin(ship.theta);
  const local=p=>{const x=p.x-ship.x,y=p.y-ship.y;return {x:(x*cos+y*sin-b.offset)/(b.length+ballRadius),y:(-x*sin+y*cos)/(b.width+ballRadius)};};
  return segmentCircle(local(from),local(to),{x:0,y:0},1);
}
export function attackPermission(attacker,target,mode){
  if(!target||target.hp<=0)return {ok:false,reason:'Choose a ship to attack'};
  if(attacker?.id===target.id)return {ok:false,reason:'Your own ship'};
  if(dist(target,PORT)<BALANCE.safeRadius)return {ok:false,reason:'Protected harbor'};
  if(target.dockedIsland)return {ok:false,reason:'Protected landing dock'};
  if(target.invuln>0)return {ok:false,reason:'Spawn protection'};
  if(attacker&&!attacker.npc&&!target.npc){
    if(attacker.fleet&&attacker.fleet===target.fleet)return {ok:false,reason:'Fleet ally · friendly fire off'};
    if(mode!=='online'||dist(target,PORT)<BALANCE.beginnerRadius||dist(attacker,PORT)<BALANCE.beginnerRadius)return {ok:false,reason:'Protected from PvP'};
  }
  return {ok:true,reason:'Click to fire'};
}
export function interceptAim(shooter,target,projectileSpeed){
  const dx=target.x-shooter.x,dy=target.y-shooter.y,vx=Math.cos(target.theta)*(target.speed||0),vy=Math.sin(target.theta)*(target.speed||0),a=vx*vx+vy*vy-projectileSpeed*projectileSpeed,b=2*(dx*vx+dy*vy),c=dx*dx+dy*dy;
  let t=0;
  if(Math.abs(a)<1e-8){if(Math.abs(b)>1e-8)t=Math.max(0,-c/b);}else {const d=b*b-4*a*c;if(d>=0){const candidates=[(-b-Math.sqrt(d))/(2*a),(-b+Math.sqrt(d))/(2*a)].filter(v=>v>0);if(candidates.length)t=Math.min(...candidates);}}
  return angle(Math.atan2(dy+vy*Math.min(t,4),dx+vx*Math.min(t,4)));
}
export function aimStatus(me,target,mode){
  if(me.ashore)return {ok:false,reason:'Board your ship to use cannons'};
  if(dist(me,PORT)<BALANCE.safeRadius)return {ok:false,reason:'Leave harbor to fire'};
  if(target){const permission=attackPermission(me,target,mode);if(!permission.ok)return permission;const gun=CANNONS[me.loadout.cannon]||CANNONS.balanced;if(dist(me,target)>gun.range+hullBounds(target).length+30)return {ok:false,reason:'Out of range · sail closer'};if(ISLANDS.some(i=>segmentIsland(me,target,i)!==null))return {ok:false,reason:'Island blocks this shot'};}
  const reload=Math.max(me.coolLeft||0,me.coolRight||0);if(reload>0)return {ok:false,reason:'Reloading '+reload.toFixed(1)+'s',reload};
  return {ok:true,reason:target?'Click or hold to attack':'Click to fire · aim at a ship'};
}
