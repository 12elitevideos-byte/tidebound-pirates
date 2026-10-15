import * as THREE from 'three';
const random=(a,b)=>a+Math.random()*(b-a);
const vector=(x=0,y=0,z=0)=>new THREE.Vector3(x,y,z);

// Reuse meshes and geometry so busy battles cannot grow GPU resources forever.
export class OceanEffects {
  constructor(scene){this.group=new THREE.Group();scene.add(this.group);this.limit=160;this.reduced=false;this.particles=[];this.pool=[];this.clock=0;this.wakeClocks=new Map();this.geometries={smoke:new THREE.IcosahedronGeometry(1,0),spark:new THREE.OctahedronGeometry(1,0),drop:new THREE.SphereGeometry(1,5,3),ring:new THREE.RingGeometry(.82,1,18),coin:new THREE.CylinderGeometry(1,1,.22,8),wood:new THREE.BoxGeometry(.4,.4,1.8)};}
  configure(p){this.limit=p.quality==='low'?64:p.quality==='high'?240:160;this.reduced=Boolean(p.reducedMotion);if(this.reduced)this.clear();while(this.particles.length>this.limit)this.release(this.particles.shift());}
  emit(kind,position,velocity,color,life,size,{gravity=0,expand=0,opacity=.8,glow=false,priority=false}={}){
    if(this.reduced)return null;
    if(this.particles.length>=this.limit){if(!priority)return null;this.release(this.particles.shift());}
    let o=this.pool.pop();if(!o)o=new THREE.Mesh(this.geometries[kind],new THREE.MeshBasicMaterial({transparent:true,depthWrite:false,side:THREE.DoubleSide}));
    o.geometry=this.geometries[kind];o.material.color.setHex(color);o.material.opacity=opacity;o.material.blending=glow?THREE.AdditiveBlending:THREE.NormalBlending;o.position.copy(position);o.scale.setScalar(size);o.rotation.set(kind==='ring'?-Math.PI/2:random(0,6),0,kind==='ring'?0:random(0,6));this.group.add(o);
    const particle={o,velocity:velocity.clone(),life,total:life,size,gravity,expand,opacity,spin:kind==='ring'?0:random(-3,3)};this.particles.push(particle);return particle;
  }
  release(particle){this.group.remove(particle.o);this.pool.push(particle.o);}
  clear(){for(const p of this.particles)this.release(p);this.particles=[];this.wakeClocks.clear();}
  ring(x,y,color=0xd7f1e7,size=14,life=.7){return this.emit('ring',vector(x,5,y),vector(),color,life,size,{expand:35,opacity:.55,priority:true});}
  feedback(e){
    const x=e.x,y=e.y;
    if(e.type==='cannon'){
      const direction=(e.theta||0)+(e.side==='left'?-Math.PI/2:Math.PI/2),nx=Math.cos(direction),ny=Math.sin(direction),fx=Math.cos(e.theta||0),fy=Math.sin(e.theta||0),scale=e.kind==='galleon'?1.4:e.kind==='brig'?1.18:1;
      for(let i=0;i<(e.guns||2);i++){const along=(15-i*13)*scale,mx=x+nx*30*scale+fx*along,my=y+ny*30*scale+fy*along;
        this.emit('spark',vector(mx,26*scale,my),vector(nx*15,0,ny*15),e.heavy?0xffc56a:0xffe6a0,.16,e.heavy?11:8,{expand:24,opacity:.95,glow:true,priority:true});
        for(let j=0;j<5;j++)this.emit('smoke',vector(mx,26*scale,my),vector(nx*random(15,40),random(10,22),ny*random(15,40)),0xd5d0be,random(.7,1.15),random(3,7),{expand:10,opacity:.43,priority:true});
      }
    }else if(e.type==='impact'){
      for(let i=0;i<9;i++)this.emit(i<5?'wood':'drop',vector(x+random(-12,12),16,y+random(-12,12)),vector(random(-55,55),random(25,65),random(-55,55)),i<5?0xc29a67:0xd7eee0,random(.45,.8),random(2,4),{gravity:95,priority:true});this.ring(x,y,0xe9d8af,22);
    }else if(e.type==='splash'||e.type==='anchordown'||e.type==='anchorup'){
      this.ring(x,y,0xd4eee3,e.type==='splash'?12:35);
      if(e.type==='splash')for(let i=0;i<6;i++)this.emit('drop',vector(x,6,y),vector(random(-22,22),random(25,50),random(-22,22)),0xd8eee6,.5,random(1.7,3),{gravity:100});
    }else if(e.type==='loot'||e.type==='searchdone'){
      const px=e.itemX??x,py=e.itemY??y;
      for(let i=0;i<12;i++)this.emit(i<8?'coin':'spark',vector(px+random(-12,12),12,py+random(-12,12)),vector(random(-15,15),random(30,55),random(-15,15)),i<8?0xf0c56e:0xffe7a0,random(.65,1.2),i<8?3:2,{gravity:30,glow:i>=8,priority:true});this.ring(px,py,0xf2cc79,23,.8);
    }else if(e.type==='repair'||e.type==='dock'){
      for(let i=0;i<10;i++)this.emit('spark',vector(x+random(-22,22),18,y+random(-22,22)),vector(random(-8,8),random(14,30),random(-8,8)),0xc5ebad,.85,random(2,4),{glow:true,priority:true});
    }else if(e.type==='bank'||e.type==='levelup'){
      for(let i=0;i<22;i++)this.emit('coin',vector(x,24,y),vector(random(-48,48),random(50,90),random(-48,48)),0xeec369,random(.9,1.5),random(2,4),{gravity:85,priority:true});this.ring(x,y,0xf6d88f,42,1.1);
    }
  }
  explosion(x,y){this.ring(x,y,0xd7ece0,45,1.3);for(let i=0;i<26;i++)this.emit(i<8?'wood':i<16?'drop':'smoke',vector(x,18,y),vector(random(-75,75),random(25,100),random(-75,75)),i<8?0xb99869:i<16?0xd4e9da:0xaaa99c,random(.8,1.5),random(3,8),{gravity:i<16?95:-4,expand:i<16?0:12,opacity:i<16?.95:.48,priority:true});}
  wake(s,dt){if(this.reduced||s.speed<18)return;const time=(this.wakeClocks.get(s.id)||0)+dt;if(time<.12){this.wakeClocks.set(s.id,time);return;}this.wakeClocks.set(s.id,0);const fx=Math.cos(s.theta),fy=Math.sin(s.theta),speed=Math.min(1,s.speed/100);for(const side of [-1,1]){const nx=-fy*side,ny=fx*side;this.emit('ring',vector(s.x-fx*40+nx*9,4.5,s.y-fy*40+ny*9),vector(nx*8,0,ny*8),0xd5ede0,.95,5+speed*3,{expand:12,opacity:.2});if(speed>.5)this.emit('drop',vector(s.x+fx*34+nx*13,5,s.y+fy*34+ny*13),vector(nx*12,12,ny*12),0xc5e2d9,.4,1.7,{gravity:45,opacity:.5});}}
  trail(p,dt){p.userData.trail=(p.userData.trail||0)+dt;if(p.userData.trail<.1)return;p.userData.trail=0;this.emit('spark',p.position.clone(),vector(),0xf9dda1,.2,p.userData.heavy?2:1.2,{opacity:.35,glow:true});}
  update(dt,ids=null){this.clock+=dt;if(ids)for(const id of this.wakeClocks.keys())if(!ids.has(id))this.wakeClocks.delete(id);const alive=[];for(const p of this.particles){p.life-=dt;if(p.life<=0){this.release(p);continue;}p.velocity.y-=p.gravity*dt;p.o.position.addScaledVector(p.velocity,dt);p.o.scale.setScalar(Math.max(.05,p.size+p.expand*(p.total-p.life)));p.o.rotation.y+=p.spin*dt;if(p.o.geometry!==this.geometries.ring)p.o.rotation.x+=p.spin*dt;p.o.material.opacity=p.opacity*Math.min(1,p.life/p.total*2);alive.push(p);}this.particles=alive;}
  dispose(){this.clear();for(const mesh of this.pool)mesh.material.dispose();for(const geometry of Object.values(this.geometries))geometry.dispose();this.pool=[];this.group.removeFromParent();}
}
