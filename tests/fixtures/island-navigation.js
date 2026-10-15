import { canWalk } from '../../shared/islands.js';
import { dist } from '../../shared/config.js';

// A small navigation fixture drives the real movement code around obstacles.
export function walkRoute(island,start,target){
  const size=12,key=p=>p.x+','+p.y,point=p=>({x:island.x+p.x*size,y:island.y+p.y*size});
  // Leave room for sampled keyboard input to turn at a corner.
  const clear=p=>[[0,0],[7,0],[-7,0],[0,7],[0,-7]].every(([x,y])=>canWalk({x:p.x+x,y:p.y+y},island));
  const first={x:Math.round((start.x-island.x)/size),y:Math.round((start.y-island.y)/size)},queue=[first],parents=new Map([[key(first),null]]);let end=null;
  for(let n=0;n<queue.length;n++){
    const at=queue[n],here=point(at);if(dist(here,target)<18){end=at;break;}
    for(const [dx,dy]of [[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]]){
      const next={x:at.x+dx,y:at.y+dy},p=point(next),mid={x:(here.x+p.x)/2,y:(here.y+p.y)/2};
      if(!parents.has(key(next))&&clear(p)&&clear(mid)){parents.set(key(next),at);queue.push(next);}
    }
  }
  if(!end)throw new Error('Island objective is unreachable: '+island.id);
  const route=[];for(let p=end;p;p=parents.get(key(p)))route.unshift(point(p));
  return route.filter((p,n)=>n===0||n===route.length-1||Math.sign(p.x-route[n-1].x)!==Math.sign(route[n+1].x-p.x)||Math.sign(p.y-route[n-1].y)!==Math.sign(route[n+1].y-p.y));
}
