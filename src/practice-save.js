import { defaultAccount,defaultLoadout,CATALOG,SHIPS,UPGRADES,CONTRACTS,ACHIEVEMENTS,ISLAND_QUESTS } from '../shared/config.js';
import { cleanName,preferences } from '../shared/economy.js';

const count=(v,fallback=0)=>Number.isSafeInteger(v)&&v>=0?v:fallback;
const name=(v,fallback)=>{try{return cleanName(v);}catch{return fallback;}};
const date=v=>typeof v==='string'&&Number.isFinite(Date.parse(v))?v:null;
const steps=['sail','steer','fire','collect','dock','bank','equip'];

// This restores only the separate local-practice record. Cloud accounts are
// loaded from the authoritative backend and never pass through this function.
export function restorePracticeSave(raw){
  const d=defaultAccount('Practice captain');
  if(!raw||typeof raw!=='object'||raw.version!==d.version)return d;
  for(const key of ['gold','goldEarned','goldSpent','xp','reputation','revision'])d[key]=count(raw[key],d[key]);
  d.pirateName=name(raw.pirateName,d.pirateName);
  for(const kind of Object.keys(d.owned)){
    const items=Array.isArray(raw.owned?.[kind])?raw.owned[kind]:[];
    d.owned[kind]=[...new Set([...d.owned[kind],...items.filter(id=>typeof id==='string'&&CATALOG[kind+':'+id])])];
  }
  if(d.owned.ship.includes(raw.selectedShip))d.selectedShip=raw.selectedShip;
  if(d.owned.title.includes(raw.title))d.title=raw.title;
  for(const ship of d.owned.ship){
    const l=defaultLoadout(ship),saved=raw.loadouts?.[ship]||{};
    l.name=name(saved.name,l.name);
    for(const kind of ['cannon','hull','sail','flag'])if(d.owned[kind].includes(saved[kind]))l[kind]=saved[kind];
    for(const kind of Object.keys(UPGRADES))l[kind+'Tier']=Math.min(UPGRADES[kind].max,count(saved[kind+'Tier']));
    d.loadouts[ship]=l;
  }
  for(const ship of Object.keys(SHIPS))d.mastery[ship]=count(raw.mastery?.[ship]);
  const counters=['npcKills','playerKills','contracts','cargoDelivered','deaths','bountyWins','sailingSeconds','goldBanked','treasureBanked','voyages','highestHaul','salvage','islandsVisited','islandQuests'];
  for(const mode of Object.keys(d.stats))for(const key of counters)if(Number.isSafeInteger(raw.stats?.[mode]?.[key])&&raw.stats[mode][key]>=0)d.stats[mode][key]=raw.stats[mode][key];
  d.tutorial=Array.isArray(raw.tutorial)?[...new Set(raw.tutorial.filter(s=>steps.includes(s)))]:[];
  d.claims=Array.isArray(raw.claims)?[...new Set(raw.claims.filter(s=>typeof s==='string'&&(/^contract:[a-f0-9-]{36}$/i.test(s)||s.startsWith('achievement:')&&ACHIEVEMENTS[s.slice(12)]||s.startsWith('island:')&&Object.hasOwn(ISLAND_QUESTS,s.slice(7)))))]:[];
  d.visitedIslands=Array.isArray(raw.visitedIslands)?[...new Set(raw.visitedIslands.filter(id=>Object.hasOwn(ISLAND_QUESTS,id)))]:[];
  for(const [id,q] of Object.entries(ISLAND_QUESTS)){
    const p=raw.islandQuests?.[id];if(!p||!date(p.acceptedAt))continue;
    const completedAt=date(p.completedAt),steps=Array.isArray(p.steps)?[...new Set(p.steps.filter(s=>q.steps.some(t=>t.id===s)))]:[];
    // A completed record and its paid claim stay together across old-save repair.
    const done=completedAt&&steps.length===q.steps.length;
    d.islandQuests[id]={acceptedAt:date(p.acceptedAt),steps,completedAt:done?completedAt:null};
    if(done&&!d.claims.includes('island:'+id))d.claims.push('island:'+id);
  }
  for(const [id,a] of Object.entries(ACHIEVEMENTS)){
    const progress=a.stat==='goldEarned'?d.goldEarned:Object.values(d.stats).reduce((n,s)=>n+(s[a.stat]||0),0);
    d.achievements[id]={progress:Math.min(a.goal,Math.max(progress,count(raw.achievements?.[id]?.progress))),completedAt:date(raw.achievements?.[id]?.completedAt)};
  }
  const c=raw.contract;
  if(c&&typeof c.id==='string'&&Object.hasOwn(CONTRACTS,c.id)&&typeof c.instance==='string'&&/^[a-f0-9-]{36}$/i.test(c.instance)&&!d.claims.includes('contract:'+c.instance))d.contract={id:c.id,instance:c.instance,progress:Math.min(CONTRACTS[c.id].goal-1,count(c.progress)),acceptedAt:date(c.acceptedAt)||new Date().toISOString()};
  const savedPrefs=raw.preferences&&typeof raw.preferences==='object'?raw.preferences:{};
  try{d.preferences=preferences({...d.preferences,...savedPrefs,keys:{...d.preferences.keys,...savedPrefs.keys}});}catch{/* Keep safe defaults if old bindings or volumes are invalid. */}
  return d;
}
