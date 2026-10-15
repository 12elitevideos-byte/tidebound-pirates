import { BALANCE,PORT,WORLD,WRECKS,ISLANDS,ISLAND_QUESTS,SHIPS,CANNONS,shipStats,dist,clamp,angle } from './config.js';
import { segmentHull,attackPermission,interceptAim,aimStatus } from './combat.js';
import { collideShip,segmentIsland,islandById,dockPoint,landingPoint,nearbyDock,localPoint,canWalk,questState,shoreInteraction } from './islands.js';
const uuid=()=>globalThis.crypto.randomUUID();
const rand=(a,b)=>a+Math.random()*(b-a);
const harbor=p=>dist(p,PORT)<BALANCE.safeRadius;
const beginner=p=>dist(p,PORT)<BALANCE.beginnerRadius;
export class World {
  constructor(mode='solo',hooks={}) {this.mode=mode;this.hooks=hooks;this.time=0;this.ships=new Map();this.shots=[];this.loot=[];this.fleets=new Map();this.paused=false;this.greed={holder:null,item:null,next:45,ping:null};this.wind=0.45;this.events=[];this.wrecks=WRECKS.map(w=>({...w}));this.visited=new Map();this.spawnNPCs();}
  notice(s,text,kind='info') {this.hooks.notice?.(s,text,kind);}
  sound(s,type,detail={}) {this.hooks.sound?.(s,type,{id:s.id,x:s.x,y:s.y,theta:s.theta,...detail});}
  spawnNPCs(){for(let i=0;i<8;i++)this.spawnNPC(i<3?'merchant':'pirate');}
  spawnNPC(type='pirate',at=null){let p=at||{x:rand(-3000,3000),y:rand(-2900,950)};for(let n=0;n<20&&ISLANDS.some(i=>dist(i,p)<i.r+150);n++)p={x:rand(-3000,3000),y:rand(-2900,950)};const ship={id:uuid(),npc:true,npcType:type,name:type==='merchant'?'Merchant vessel':type==='hunter'?'Cursed-chest hunter':'NPC pirate',x:p.x,y:p.y,theta:rand(-Math.PI,Math.PI),speed:0,sail:0.7,hp:type==='hunter'?210:130,maxHp:type==='hunter'?210:130,kind:type==='merchant'?'brig':'sloop',radius:27,anchor:false,coolLeft:0,coolRight:0,loadout:{cannon:'balanced',hull:type==='merchant'?'cedar':'navy',sail:'cream',flag:'violet'},input:{},route:Math.floor(rand(1,ISLANDS.length)),repairs:0,damage:20,reload:4.6,maxSpeed:type==='merchant'?66:79,turn:0.85,cargo:[],fleet:null,invuln:0,wanted:0};this.ships.set(ship.id,ship);return ship;}
  addPlayer(id,account){if(this.ships.has(id))throw new Error('Captain already at sea.');const st=shipStats(account);const s={id,npc:false,name:account.pirateName,account,kind:account.selectedShip,loadout:{...account.loadouts[account.selectedShip]},x:PORT.x+rand(-60,60),y:PORT.y-40,theta:-Math.PI/2,speed:0,sail:0,anchor:true,hp:st.hp,maxHp:st.hp,radius:st.radius,maxSpeed:st.speed,turn:st.turn,damage:st.cannon.damage,reload:st.cannon.reload,coolLeft:0,coolRight:0,repairs:3,special:3,cargo:[],capacity:st.cargo,input:{},fleet:null,invuln:3,wanted:0,busy:false,connected:true,ashore:null,dockedIsland:null,clue:1+Math.floor(rand(0,ISLANDS.length-1)),searched:new Set(),sailing:0,tutorialSent:new Set(account.tutorial)};this.ships.set(id,s);this.supplyMail(s);return s;}
  supplyMail(s){if(harbor(s)&&s.account.contract?.id==='delivery'&&!s.cargo.some(i=>i.type==='mail'))s.cargo.push({id:uuid(),type:'mail',name:'Harbor mail',value:0,size:2});}
  input(id,v){
    const s=this.ships.get(id);if(!s||s.npc||s.busy||!s.connected)return;
    const n=k=>Number.isFinite(v?.[k])?clamp(v[k],-1,1):0;
    if(s.ashore){s.input={walkX:n('walkX'),walkY:n('walkY')};return;}
    const sail=n('sail');if(sail<=0)s.blockSailUntilRelease=false;
    if(sail>0&&(s.input?.sail||0)<=0&&s.anchor&&!s.blockSailUntilRelease){s.anchor=false;this.sound(s,'anchorup');}
    s.input={sail:s.blockSailUntilRelease?0:sail,steer:n('steer'),aim:Number.isFinite(v?.aim)?angle(v.aim):s.theta,fire:Boolean(v?.fire),target:typeof v?.target==='string'&&v.target.length<128?v.target:null,side:['left','right'].includes(v?.side)?v.side:null,special:Boolean(v?.special)};
  }
  attack(s,intent){if(s.busy||s.ashore||!s.connected||!Number.isFinite(intent?.aim))return false;let aim=angle(intent.aim),target=null;if(intent.target){target=this.ships.get(intent.target);if(!target||dist(s,target)>850)return false;const status=aimStatus(s,target,this.mode);if(!status.ok){if(!status.reload&&this.time>(s.nextAttackHint||0)){this.notice(s,status.reason);s.nextAttackHint=this.time+1.5;}return false;}aim=interceptAim(s,target,(CANNONS[s.loadout.cannon]||CANNONS.balanced).speed);}const side=angle(aim-s.theta)<0?'left':'right';return this.fire(s,side,aim,Boolean(intent.special),true);}
  async reward(s,type,extra={},op=uuid()){if(s.npc)return;const result=await this.hooks.reward?.(s,{type,mode:this.mode,ship:s.kind,...extra},op);if(result)s.account=result;return result;}
  tutorial(s,step){if(s.npc||s.tutorialSent.has(step))return;s.tutorialSent.add(step);this.reward(s,'tutorial',{step}).catch(()=>s.tutorialSent.delete(step));}
  fire(s,side,aim,special=false,aimed=false){if(s.busy||s.ashore||s.hp<=0||s.invuln>0&&s.npc)return false;const key=side==='left'?'coolLeft':'coolRight';if((!s.npc?Math.max(s.coolLeft,s.coolRight):s[key])>0)return false;const relative=angle(aim-s.theta);const wanted=side==='left'?-Math.PI/2:Math.PI/2;if(!aimed&&Math.abs(angle(relative-wanted))>BALANCE.shootArc)return false;if(harbor(s))return false;const gun=CANNONS[s.loadout.cannon]||CANNONS.balanced;const heavy=special&&s.special>0;if(heavy)s.special--;if(s.npc)s[key]=s.reload;else s.coolLeft=s.coolRight=s.reload;s.recoil=0.18;const count=s.npc?1:SHIPS[s.kind].cannons;for(let i=0;i<count;i++){const spread=(i-(count-1)/2)*0.018;const a=aim+spread;this.shots.push({id:uuid(),owner:s.id,x:s.x+Math.cos(a)*s.radius,y:s.y+Math.sin(a)*s.radius,vx:Math.cos(a)*gun.speed,vy:Math.sin(a)*gun.speed,damage:s.damage/(count**0.5)*(heavy?1.55:1),life:gun.range/gun.speed,heavy});}this.sound(s,'cannon',{side,heavy,guns:count,kind:s.kind});this.tutorial(s,'fire');return true;}
  action(id,type,value){
    const s=this.ships.get(id);if(!s||s.npc||!s.connected)return;
    if(type==='pause'&&this.mode!=='online'){this.paused=Boolean(value);return;}if(s.busy)return;
    const run=p=>p.catch(e=>this.notice(s,'Could not save: '+e.message,'error'));
    if(type==='disembark'){run(this.land(s));return;}
    if(type==='board'){this.board(s);return;}
    if(type==='questStart'||type==='questFinish'){run(this.islandQuest(s,type==='questStart'?'start':'finish'));return;}
    if(type==='interact'){run(this.interact(s));return;}
    if(type==='fleet'){this.fleet(s,value);return;}
    if(s.ashore)return;
    if(type==='attack'){this.attack(s,value);return;}
    if(type==='anchor'){s.anchor=!s.anchor;if(s.anchor){s.sail=0;s.blockSailUntilRelease=(s.input?.sail||0)>0;s.input.sail=0;}else s.blockSailUntilRelease=false;this.sound(s,s.anchor?'anchordown':'anchorup');this.notice(s,s.anchor?'Anchor lowered.':'Anchor raised.');}
    else if(type==='repair'&&s.repairs>0&&s.hp<s.maxHp){s.repairs--;s.hp=Math.min(s.maxHp,s.hp+55);this.sound(s,'repair');}
  }
  async land(s){
    if(s.ashore)return;const dock=nearbyDock(s);
    if(!dock){this.notice(s,'Sail to an island’s anchor marker on the chart to go ashore.');return;}
    if(!s.anchor||Math.abs(s.speed)>5){this.notice(s,'Drop anchor and stop at the landing dock first.');return;}
    s.busy=true;
    try{
      if(!s.account.visitedIslands?.includes(dock.island.id))await this.reward(s,'islandVisit',{island:dock.island.id},'island:'+dock.island.id+':visit');
      if(!this.ships.has(s.id))return;
      s.search=null;s.speed=0;s.sail=0;s.input={};s.blockSailUntilRelease=true;
      s.dockedIsland=dock.island.id;s.ashore={...landingPoint(dock.island),theta:dock.island.dockAngle+Math.PI,speed:0};
      this.sound(s,'land',{x:s.ashore.x,y:s.ashore.y});
      this.notice(s,'Welcome to '+dock.island.name+'. Walk with your sailing keys; interact to talk, gather, or board.','success');
    }finally{s.busy=false;}
  }
  board(s){
    const i=islandById(s.ashore?.island);if(!i)return;
    if(dist(s.ashore,landingPoint(i))>42){this.notice(s,'Walk back to the anchor marker to board your ship.');return;}
    s.ashore=null;s.dockedIsland=null;s.input={};s.sail=0;s.speed=0;s.anchor=true;s.invuln=Math.max(s.invuln,3);s.blockSailUntilRelease=false;
    this.sound(s,'board');this.notice(s,'Back aboard. Hold your sail key to set off.');
  }
  talk(s){const i=islandById(s.ashore?.island);if(!i||dist(s.ashore,localPoint(i,i.npc))>=48)return;
    const p=questState(s.account,i.id);this.sound(s,'talk',{x:s.ashore.x,y:s.ashore.y});this.hooks.result?.(s,{kind:'islandTalk',island:i.id,phase:p.done?'done':!p.accepted?'offer':p.steps.length===p.total?'ready':'active'});
  }
  async islandQuest(s,phase,step=null){
    const i=islandById(s.ashore?.island);if(!i||s.busy||!s.connected)return;
    if(phase==='step'){
      const action=shoreInteraction(s.account,s.ashore);
      if(action?.kind!=='step'||action.step.id!==step)return;
    }else if(dist(s.ashore,localPoint(i,i.npc))>=48){this.notice(s,'Talk to the island’s quest giver in person.');return;}
    const p=questState(s.account,i.id);if(p.done||phase==='start'&&p.accepted||phase==='step'&&p.steps.includes(step))return;
    s.busy=true;
    try{
      await this.reward(s,'islandQuest',{island:i.id,phase,...(step?{step}:{})},'island:'+i.id+':'+phase+(step?':'+step:''));
      if(phase==='start')this.notice(s,ISLAND_QUESTS[i.id].name+' accepted. Follow the gold markers.','success');
      else if(phase==='step'){this.sound(s,'queststep',{x:s.ashore?.x||s.x,y:s.ashore?.y||s.y});const progress=questState(s.account,i.id);this.notice(s,'Objective saved · '+progress.steps.length+'/'+progress.total+'.'+(progress.steps.length===progress.total?' Return to '+i.npc.name+'.':''),'success');}
      else this.notice(s,ISLAND_QUESTS[i.id].outro,'success');
    }finally{s.busy=false;}
  }
  async explore(s){const action=shoreInteraction(s.account,s.ashore);if(!action){this.notice(s,'Walk closer to a character, quest item, or your ship’s anchor marker.');return;}
    if(action.kind==='board')this.board(s);else if(action.kind==='npc')this.talk(s);else await this.islandQuest(s,'step',action.step.id);
  }
  walk(s,dt){const a=s.ashore,i=islandById(a.island);if(!i)return;const x=s.connected?s.input.walkX||0:0,y=s.connected?s.input.walkY||0:0,n=Math.hypot(x,y),speed=95,dx=n?x/Math.max(1,n)*speed*dt:0,dy=n?y/Math.max(1,n)*speed*dt:0,old={x:a.x,y:a.y};
    if(canWalk({x:a.x+dx,y:a.y+dy},i)){a.x+=dx;a.y+=dy;}else{if(canWalk({x:a.x+dx,y:a.y},i))a.x+=dx;if(canWalk({x:a.x,y:a.y+dy},i))a.y+=dy;}
    a.speed=dist(a,old)/dt;if(a.speed>1)a.theta=Math.atan2(a.y-old.y,a.x-old.x);
  }
  async interact(s){if(s.ashore){await this.explore(s);return;}if(s.search){this.notice(s,'Searching… keep your anchor down.');return;}if(harbor(s)){if(Math.abs(s.speed)>12){this.notice(s,'Lower your sails and anchor before docking.');return;}if(s.cargo.some(i=>i.type!=='mail'))await this.bank(s);else {s.repairs=3;s.special=3;s.hp=s.maxHp;this.supplyMail(s);this.tutorial(s,'dock');this.sound(s,'dock');this.notice(s,'Docked. Hull repaired and supplies replenished.');}return;}
    const drop=this.loot.find(i=>dist(i,s)<80);if(drop){this.collect(s,drop);return;}
    if(!s.anchor||Math.abs(s.speed)>5){this.notice(s,'Anchor beside a wreck or your clue’s cove to search.');return;}
    const island=ISLANDS.find(i=>i.id==='pearl'&&dist(i,s)<i.r+115);if(island&&s.account.contract?.id==='delivery'&&s.cargo.some(i=>i.type==='mail')){s.busy=true;try{await this.reward(s,'delivery',{},'delivery:'+s.account.contract.instance);s.cargo=s.cargo.filter(i=>i.type!=='mail');this.notice(s,'Harbor mail delivered. Contract reward saved.','success');}finally{s.busy=false;}return;}
    const wreck=this.wrecks.find(w=>dist(w,s)<90&&!s.searched.has(w.id));const clue=ISLANDS[s.clue];const search= wreck || (clue&&dist(clue,s)<clue.r+115&&!s.searched.has(clue.id)?{...clue,id:clue.id}:null);if(!search){this.notice(s,'Nothing to search here. Check your map clue.');return;}s.search={id:search.id,time:3,type:wreck?'salvage':'treasure'};this.sound(s,'search');this.notice(s,'Searching… keep the anchor lowered for three seconds.');}
  collect(s,item){const used=s.cargo.reduce((n,i)=>n+i.size,0);if(used+item.size>s.capacity){this.notice(s,'Your hold is full. Bank a haul or discard an item.');return false;}const index=this.loot.findIndex(i=>i.id===item.id);if(index<0)return false;this.loot.splice(index,1);s.cargo.push({...item});if(item.type==='greed'){this.greed.holder=s.id;this.greed.item=item.id;this.greed.pickup=this.time;this.greed.base=item.value;this.greed.ping={x:Math.round(s.x/180)*180,y:Math.round(s.y/180)*180,time:this.time};}this.tutorial(s,'collect');this.sound(s,'loot',{lootId:item.id,itemX:item.x,itemY:item.y,value:item.value});this.notice(s,`Collected ${item.name}. Bring it home.`, 'success');return true;}
  async bank(s){if(!harbor(s)||Math.abs(s.speed)>12||s.busy)return;const manifest=s.bankAttempt?.manifest||s.cargo.filter(i=>i.type!=='mail').map(i=>({...i}));if(!manifest.length)return;s.bankAttempt={manifest};s.busy=true;const gold=manifest.reduce((n,i)=>n+Math.floor(i.value),0);try{const account=await this.hooks.bank?.(s,manifest,gold);if(account)s.account=account;const ids=new Set(manifest.map(i=>i.id));s.cargo=s.cargo.filter(i=>!ids.has(i.id));s.bankAttempt=null;if(ids.has(this.greed.item)){this.greed={holder:null,item:null,next:this.time+BALANCE.greedInterval,ping:null};}s.hp=s.maxHp;s.repairs=3;s.special=3;s.anchor=true;s.sail=0;this.hooks.result?.(s,{kind:'bank',gold,xp:Math.round(gold*BALANCE.bankXP)+20,items:manifest.length});this.notice(s,this.mode==='practice'?'Treasure banked in local practice.':'Treasure banked. Progress saved.','success');this.tutorial(s,'bank');}catch(e){this.notice(s,'Banking failed. Your cargo is still aboard. Try again.','error');throw e;}finally{s.busy=false;}}
  discard(s,id){if(s.busy)return;const i=s.cargo.find(i=>i.id===id&&i.type!=='mail');if(!i)return;s.cargo=s.cargo.filter(x=>x.id!==id);this.loot.push({...i,x:s.x+45,y:s.y+45});if(i.type==='greed')this.greed.holder=null;}
  fleet(s,a){if(this.mode!=='online'){this.notice(s,'Fleets are available in online oceans.');return;}if(a?.type==='create'&&!s.fleet){const code=uuid().slice(0,6).toUpperCase();this.fleets.set(code,{code,leader:s.id,members:[s.id],pending:[]});s.fleet=code;}if(a?.type==='request'&&!s.fleet){const f=typeof a.code==='string'&& /^[A-F0-9]{6}$/i.test(a.code)?this.fleets.get(a.code.toUpperCase()):null;if(f&&!f.pending.includes(s.id))f.pending.push(s.id);else this.notice(s,'Fleet code not found.');}const f=this.fleets.get(s.fleet);if(a?.type==='accept'&&f?.leader===s.id&&f.pending.includes(a.id)&&f.members.length<4){const other=this.ships.get(a.id);f.pending=f.pending.filter(id=>id!==a.id);if(other&&!other.fleet){other.fleet=f.code;f.members.push(other.id);this.notice(other,'Your fleet invitation was accepted.','success');}}if(a?.type==='leave'&&f){f.members=f.members.filter(id=>id!==s.id);s.fleet=null;if(!f.members.length)this.fleets.delete(f.code);else if(f.leader===s.id)f.leader=f.members[0];}if(a?.type==='kick'&&f?.leader===s.id&&a.id!==s.id){const other=this.ships.get(a.id);if(other?.fleet===f.code){other.fleet=null;f.members=f.members.filter(id=>id!==a.id);}}}
  dropCargo(s){s.bankAttempt=null;for(const i of s.cargo.filter(i=>i.type!=='mail'))this.loot.push({...i,x:s.x+rand(-35,35),y:s.y+rand(-35,35)});if(this.greed.holder===s.id)this.greed.holder=null;s.cargo=[];}
  removePlayer(id){const s=this.ships.get(id);if(!s)return;this.dropCargo(s);this.fleet(s,{type:'leave'});this.ships.delete(id);}
  damage(target,amount,owner){const attacker=this.ships.get(owner);if(!attackPermission(attacker,target,this.mode).ok)return false;target.hp-=amount;this.sound(target,'impact',{amount:Math.round(amount),owner});target.hit=.18;if(target.hp<=0)this.sink(target,attacker);return true;}
  sink(s,killer){const lost=s.cargo.filter(i=>i.type!=='mail').length;this.dropCargo(s);this.hooks.explosion?.(s);if(s.npc){this.loot.push({id:uuid(),x:s.x,y:s.y,type:'chest',name:s.npcType==='merchant'?'Merchant cargo':'Pirate spoils',value:s.npcType==='merchant'?220:140,size:3});this.ships.delete(s.id);if(killer&&!killer.npc){const members=[...this.ships.values()].filter(p=>!p.npc&&(p.id===killer.id||killer.fleet&&p.fleet===killer.fleet&&dist(p,killer)<600));for(const m of members)this.reward(m,'npcKill',{},'npc:'+s.id+':'+m.id).catch(e=>this.notice(m,'Reward save delayed: '+e.message,'error'));}this.events.push({at:this.time+40,type:'npc',npcType:s.npcType});}
    else {this.reward(s,'sink',{},'sink:'+uuid()).catch(()=>this.notice(s,'Statistics could not be saved.','error'));if(killer&&!killer.npc){killer.wanted++;this.reward(killer,'playerKill',{},'pvp:'+uuid()).catch(()=>{});if(s.wanted>=3)this.hooks.bounty?.(killer,s);}s.wanted=0;s.x=PORT.x;s.y=PORT.y;s.speed=0;s.sail=0;s.anchor=true;s.hp=s.maxHp;s.invuln=8;s.search=null;s.ashore=null;s.dockedIsland=null;s.input={};this.supplyMail(s);this.hooks.result?.(s,{kind:'sink',lost});}}
  npcInput(s){let target;const players=[...this.ships.values()].filter(p=>!p.npc&&!p.ashore&&!harbor(p)&&dist(s,p)<650);if(s.npcType==='hunter'&&this.greed.holder){const holder=this.ships.get(this.greed.holder);if(holder&&!holder.ashore)target=holder;}else if(s.npcType!=='merchant')target=players.sort((a,b)=>dist(s,a)-dist(s,b))[0];let goal=target||ISLANDS[s.route];if(!goal)return;let dx=goal.x-s.x,dy=goal.y-s.y;if(!target&&dist(s,goal)<goal.r+210){s.route=1+(s.route%(ISLANDS.length-1));goal=ISLANDS[s.route];dx=goal.x-s.x;dy=goal.y-s.y;}let desired=Math.atan2(dy,dx);if(target&&dist(s,target)<400)desired=angle(Math.atan2(dy,dx)-Math.PI/2);for(const i of ISLANDS){const d=dist(s,i);if(d<i.r+200){const away=Math.atan2(s.y-i.y,s.x-i.x);desired=Math.atan2(Math.sin(desired)+Math.sin(away)*2.8,Math.cos(desired)+Math.cos(away)*2.8);}}const aim=target?Math.atan2(target.y-s.y,target.x-s.x):s.theta;const rel=angle(aim-s.theta);return {steer:clamp(angle(desired-s.theta)*1.8,-1,1),sail:0,aim,fire:Boolean(target),side:rel<0?'left':'right'};}
  tick(dt=BALANCE.step){if(this.paused&&this.mode!=='online')return;this.time+=dt;this.wind=0.45+Math.sin(this.time/90)*0.3;
    for(const s of [...this.ships.values()]){s.coolLeft=Math.max(0,s.coolLeft-dt);s.coolRight=Math.max(0,s.coolRight-dt);s.invuln=Math.max(0,s.invuln-dt);s.hit=Math.max(0,(s.hit||0)-dt);s.recoil=Math.max(0,(s.recoil||0)-dt);const input=s.npc?this.npcInput(s)||{}:s.input||{};
      if(s.ashore){if(!s.busy)this.walk(s,dt);else s.ashore.speed=0;continue;}
      if(!s.busy){s.sail=clamp(s.sail+(input.sail||0)*dt*0.6,0,1);s.theta=angle(s.theta+(input.steer||0)*s.turn*dt*(0.35+Math.min(1,s.speed/35)));const cargo=s.cargo.reduce((n,i)=>n+i.size,0)/Math.max(1,s.capacity||20);const wind=0.85+0.15*Math.cos(angle(s.theta-this.wind));const speed=s.anchor?0:s.maxSpeed*s.sail*wind*(1-0.13*cargo);s.speed+=(speed-s.speed)*Math.min(1,dt*(s.anchor?3.2:0.8));const old={x:s.x,y:s.y};s.x=clamp(s.x+Math.cos(s.theta)*s.speed*dt,WORLD.minX,WORLD.maxX);s.y=clamp(s.y+Math.sin(s.theta)*s.speed*dt,WORLD.minY,WORLD.maxY);
        for(const i of ISLANDS){const hit=collideShip(s,i,s.radius);if(hit){s.x=hit.x;s.y=hit.y;s.speed*=.65;}}
        if(!s.npc){if(dist(old,s)>0.05){s.sailing+=dt;this.tutorial(s,'sail');}if(Math.abs(input.steer)>0.1)this.tutorial(s,'steer');if(input.fire){if(input.side)this.fire(s,input.side,s.theta+(input.side==='left'?-Math.PI/2:Math.PI/2),input.special);else this.attack(s,input);}if(s.search){if(!s.anchor||Math.abs(s.speed)>5)s.search=null;else if((s.search.time-=dt)<=0){const search=s.search;s.searched.add(search.id);s.search=null;this.loot.push({id:uuid(),x:s.x+35,y:s.y,type:'chest',name:search.type==='salvage'?'Shipwreck salvage':'Buried treasure',value:search.type==='salvage'?170:340,size:3});this.sound(s,'searchdone',{itemX:s.x+35,itemY:s.y});if(search.type==='salvage')this.reward(s,'salvage',{},'salvage:'+s.id+':'+search.id).catch(()=>this.notice(s,'Contract progress could not save.','error'));this.notice(s,'Treasure uncovered. Press interact to collect.','success');}}}
        else if(input.fire)this.fire(s,input.side,input.aim);
      }
    }
    const ships=[...this.ships.values()];for(let i=0;i<ships.length;i++)for(let j=i+1;j<ships.length;j++){const a=ships[i],b=ships[j],d=dist(a,b),min=a.radius+b.radius;if(d<min&&!a.dockedIsland&&!b.dockedIsland){const nx=(a.x-b.x)/(d||1),ny=(a.y-b.y)/(d||1);a.x+=nx*(min-d)/2;b.x-=nx*(min-d)/2;a.y+=ny*(min-d)/2;b.y-=ny*(min-d)/2;}}
    for(const p of this.shots){
      const from={x:p.x,y:p.y},travel=Math.min(dt,Math.max(0,p.life)),to={x:p.x+p.vx*travel,y:p.y+p.vy*travel};let earliest=1.00001,target=null,terrain=false;
      for(const island of ISLANDS){const t=segmentIsland(from,to,island);if(t!==null&&t<earliest){earliest=t;target=null;terrain=true;}}
      for(const ship of this.ships.values()){if(ship.id===p.owner)continue;const t=segmentHull(from,to,ship,p.heavy?4:3);if(t!==null&&t<earliest){earliest=t;target=ship;terrain=false;}}
      const fraction=earliest<=1?earliest:1;p.x=from.x+(to.x-from.x)*fraction;p.y=from.y+(to.y-from.y)*fraction;p.life-=travel;
      if(target){const hit=this.damage(target,p.damage,p.owner);p.life=0;if(!hit)this.sound(p,'splash');}else if(terrain){p.life=0;this.sound(p,'splash');}else if(p.life<=.000001){p.life=0;this.sound(p,'splash');}
    }this.shots=this.shots.filter(p=>p.life>0);
    for(const e of this.events.filter(e=>e.at<=this.time)){if(e.type==='npc')this.spawnNPC(e.npcType);}this.events=this.events.filter(e=>e.at>this.time);
    if(!this.greed.item&&this.time>=this.greed.next){const item={id:uuid(),x:140,y:-350,type:'greed',name:'Greed Chest',value:500,size:4};this.loot.push(item);this.greed={...this.greed,item:item.id,ping:{x:item.x,y:item.y,time:this.time},next:this.time+180};}
    const holder=this.ships.get(this.greed.holder);if(holder){if(holder.ashore)this.greed.pickup+=dt;const item=holder.cargo.find(i=>i.id===this.greed.item);if(item)item.value=Math.min(BALANCE.greedMax,this.greed.base+Math.floor((this.time-this.greed.pickup)*BALANCE.greedGrowth));if(!holder.ashore&&(!this.greed.ping||this.time-this.greed.ping.time>=20)){this.greed.ping={x:Math.round(holder.x/180)*180,y:Math.round(holder.y/180)*180,time:this.time};if(this.mode==='solo'&&[...this.ships.values()].filter(s=>s.npcType==='hunter').length<3)this.spawnNPC('hunter',{x:holder.x+450,y:holder.y-150});}}
  }
  snapshot(id){
    const s=this.ships.get(id);if(!s)return null;const view=s.ashore||s;
    const publicShip=p=>({id:p.id,npc:p.npc,npcType:p.npcType,name:p.npc?p.name:p.loadout.name,captain:p.name,x:p.x,y:p.y,theta:p.theta,speed:p.speed,kind:p.kind,loadout:p.loadout,hp:p.hp,maxHp:p.maxHp,anchor:p.anchor,sail:p.sail,fleet:p.fleet,recoil:p.recoil,hit:p.hit,wanted:p.wanted,connected:p.connected,invuln:p.invuln,dockedIsland:p.dockedIsland||null,ashore:Boolean(p.ashore)});
    const fleet=this.fleets.get(s.fleet),avatars=[...this.ships.values()].filter(p=>p.ashore&&(p.id===id||dist(p.ashore,view)<850)).map(p=>({id:p.id,name:p.name,...p.ashore,color:p.loadout.hull}));
    return {time:this.time,wind:this.wind,paused:this.paused,mode:this.mode,ships:[...this.ships.values()].filter(p=>p.id===id||dist(view,p)<850||s.fleet&&s.fleet===p.fleet).map(publicShip),avatars,shots:this.shots.filter(p=>dist(view,p)<1000).map(p=>({id:p.id,x:p.x,y:p.y,vx:p.vx,vy:p.vy,heavy:p.heavy})),loot:this.loot.filter(i=>dist(view,i)<700),me:{...publicShip(s),ashore:s.ashore?{...s.ashore}:null,busy:s.busy,capacity:s.capacity,cargo:s.cargo.map(i=>({...i})),coolLeft:s.coolLeft,coolRight:s.coolRight,reload:s.reload,repairs:s.repairs,special:s.special,clue:s.clue,search:s.search,searched:[...s.searched],islandQuests:structuredClone(s.account.islandQuests||{})},greed:{...this.greed},fleet:fleet?{...fleet,members:fleet.members.map(id=>({id,name:this.ships.get(id)?.name})),pending:fleet.leader===id?fleet.pending.map(id=>({id,name:this.ships.get(id)?.name})):[]}:null};
  }
}
