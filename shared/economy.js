import { CATALOG,CONTRACTS,ACHIEVEMENTS,DEFAULT_KEYS,ISLAND_QUESTS,defaultLoadout,level } from './config.js';
const copy=x=>structuredClone(x);
const fail=message=>{throw new Error(message);};
const num=(v,min,max)=>Number.isFinite(v)&&v>=min&&v<=max;
export function cleanName(value) { if(typeof value!=='string'||value.trim().length<2||value.trim().length>24||! /^[\p{L}\p{N} ._'’-]+$/u.test(value.trim())) fail('Use 2–24 letters, numbers, spaces, or simple punctuation.'); return value.trim(); }
export function preferences(value) { const p={}; for(const k of ['master','music','effects']) { if(!num(value[k],0,1)) fail('Invalid volume.'); p[k]=value[k]; } if(!['low','medium','high'].includes(value.quality)) fail('Invalid graphics quality.'); p.quality=value.quality;p.reducedMotion=Boolean(value.reducedMotion);p.keys={}; for(const k of Object.keys(DEFAULT_KEYS)){const code=value.keys?.[k];if(typeof code!=='string'||! /^(Key[A-Z]|Digit[0-9]|Arrow(Up|Down|Left|Right)|Space|Tab|Escape|ShiftLeft|ControlLeft)$/.test(code))fail('Invalid keybinding.');p.keys[k]=code;} if(new Set(Object.values(p.keys)).size!==Object.keys(p.keys).length)fail('Each action needs a different key.');return p; }
function achievements(d,now) { for(const [id,a] of Object.entries(ACHIEVEMENTS)){const total=a.stat==='goldEarned'?d.goldEarned:Object.values(d.stats).reduce((n,s)=>n+(s[a.stat]||0),0);d.achievements[id]={progress:Math.min(a.goal,total),completedAt:d.achievements[id]?.completedAt||(total>=a.goal?now:null)};} if(d.mastery[d.selectedShip]>=500&&!d.owned.flag.includes('compass'))d.owned.flag.push('compass'); }
export function applyAction(source,a,now=new Date().toISOString()) {
  const d=copy(source); if(!a||typeof a.type!=='string')fail('Invalid action.');
  if(a.type==='purchase') { const item=CATALOG[a.item];if(!item)fail('Unknown item.');const ship=d.selectedShip;const l=d.loadouts[ship];let price;
    if(item.kind==='upgrade'){const tier=l[item.id+'Tier'];if(tier>=item.max)fail('This upgrade is already complete.');price=item.base*(tier+1);}
    else {if(d.owned[item.kind].includes(item.id))return d;if(level(d.xp)<item.level)fail('Your captain level is too low.');if(item.mastery&&d.mastery[ship]<item.mastery)fail('Earn this flag through ship mastery.');price=item.price;}
    if(d.gold<price)fail('Not enough banked gold.');d.gold-=price;d.goldSpent+=price;
    if(item.kind==='upgrade')l[item.id+'Tier']++;else {d.owned[item.kind].push(item.id);if(item.kind==='ship')d.loadouts[item.id]=defaultLoadout(item.id);}
  } else if(a.type==='equip') {const item=CATALOG[a.item];if(!item||item.kind==='upgrade'||!d.owned[item.kind]?.includes(item.id))fail('You do not own that item.');if(item.kind==='ship')d.selectedShip=item.id;else if(item.kind==='title')d.title=item.id;else d.loadouts[d.selectedShip][item.kind]=item.id;if(!d.tutorial.includes('equip'))d.tutorial.push('equip');}
  else if(a.type==='profile'){d.pirateName=cleanName(a.name);d.loadouts[d.selectedShip].name=cleanName(a.shipName);}
  else if(a.type==='preferences')d.preferences=preferences(a.value);
  else if(a.type==='acceptContract'){const c=CONTRACTS[a.id];if(!c||level(d.xp)<c.level||d.reputation<(c.reputation||0))fail('More reputation is needed for this contract.');if(d.contract)fail('Finish or abandon your current contract.');d.contract={id:a.id,instance:globalThis.crypto.randomUUID(),progress:0,acceptedAt:now};}
  else if(a.type==='abandonContract')d.contract=null;
  else if(a.type==='claimAchievement'){const ach=ACHIEVEMENTS[a.id];const key='achievement:'+a.id;if(!ach||!d.achievements[a.id]?.completedAt)fail('Achievement not completed yet.');if(d.claims.includes(key))return d;d.claims.push(key);d.gold+=ach.gold;d.goldEarned+=ach.gold;d.xp+=ach.xp;}
  else fail('Unknown action.');achievements(d,now);return d;
}
export function applyReward(source,r,now=new Date().toISOString()) {
  const d=copy(source); if(!['solo','online','practice'].includes(r.mode))fail('Invalid mode.');const s=d.stats[r.mode];const inc=(key,n=1)=>s[key]=(s[key]||0)+n;let gold=0,xp=0,rep=0;const ship=r.ship||d.selectedShip;
  if(r.type==='bank'){gold=r.gold;xp=Math.round(gold*0.09)+20;rep=Math.floor(gold/100);inc('treasureBanked',r.items);inc('voyages');s.highestHaul=Math.max(s.highestHaul||0,gold);inc('goldBanked',gold);for(const step of ['dock','bank'])if(!d.tutorial.includes(step))d.tutorial.push(step);}
  if(r.type==='npcKill'){inc('npcKills');xp=25;}
  if(r.type==='playerKill'){if(r.mode!=='online')fail('PvP rewards require online mode.');inc('playerKills');}
  if(r.type==='bounty'){gold=120;xp=15;inc('bountyWins');}
  if(r.type==='sink')inc('deaths');
  if(r.type==='salvage')inc('salvage');
  if(r.type==='sailing'){inc('sailingSeconds',r.seconds);xp=Math.min(3,Math.floor(r.seconds/30));}
  if(r.type==='islandVisit'){
    if(!Object.hasOwn(ISLAND_QUESTS,r.island))fail('Unknown island.');
    d.visitedIslands ||= [];if(!d.visitedIslands.includes(r.island)){d.visitedIslands.push(r.island);inc('islandsVisited');}
  }
  if(r.type==='islandQuest'){
    const q=ISLAND_QUESTS[r.island];if(!q)fail('Unknown island quest.');
    d.islandQuests ||= {};let p=d.islandQuests[r.island];
    if(r.phase==='start'){if(!p)d.islandQuests[r.island]={acceptedAt:now,steps:[],completedAt:null};}
    else if(r.phase==='step'){
      if(!p?.acceptedAt)fail('Speak to the quest giver first.');
      if(!q.steps.some(s=>s.id===r.step))fail('Unknown quest objective.');
      if(!p.completedAt&&!p.steps.includes(r.step))p.steps.push(r.step);
    }else if(r.phase==='finish'){
      if(!p?.acceptedAt||!q.steps.every(s=>p.steps.includes(s.id)))fail('Find every quest objective first.');
      const claim='island:'+r.island;
      if(!p.completedAt&&!d.claims.includes(claim)){p.completedAt=now;d.claims.push(claim);gold=q.gold;xp=q.xp;rep=q.rep;inc('islandQuests');}
    }else fail('Unknown quest action.');
  }
  if(r.type==='tutorial'&&['sail','steer','fire','collect','dock','bank','equip'].includes(r.step)&&!d.tutorial.includes(r.step))d.tutorial.push(r.step);
  const c=d.contract&&CONTRACTS[d.contract.id];if(c&&(c.type===r.type||c.type==='npcKills'&&r.type==='npcKill')){d.contract.progress++;if(d.contract.progress>=c.goal){gold+=c.gold;xp+=c.xp;rep+=c.rep;inc('contracts');if(c.type==='delivery')inc('cargoDelivered');d.claims.push('contract:'+d.contract.instance);d.contract=null;}}
  if(!Number.isInteger(gold)||gold<0||!Number.isFinite(xp)||xp<0)fail('Invalid reward.');d.gold+=gold;d.goldEarned+=gold;d.xp+=xp;d.reputation+=rep;d.mastery[ship]=(d.mastery[ship]||0)+xp;achievements(d,now);return d;
}
