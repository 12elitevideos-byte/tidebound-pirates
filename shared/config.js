export const VERSION = 1;
export const BALANCE = { step: 1/30, maxPlayers: 8, reconnectSeconds: 30, safeRadius: 310, beginnerRadius: 750, shootArc: Math.PI/3, greedInterval: 180, greedGrowth: 2, greedMax: 2500, killXP: 25, bankXP: 0.09, sailXP: 0.003 };
export const PORT = { x: 0, y: 1380, name: 'Marigold Harbor' };
export const WORLD = { minX:-4200,maxX:4200,minY:-3600,maxY:3600 };
export const WRECKS = [{id:'wreck-1',x:-420,y:910},{id:'wreck-2',x:410,y:160},{id:'wreck-3',x:-320,y:-650},{id:'wreck-4',x:-2390,y:-900},{id:'wreck-5',x:2410,y:780},{id:'wreck-6',x:750,y:-2600}];
export const ISLANDS = [
  {id:'home',name:'Marigold Harbor',x:-220,y:1580,r:220,color:0x8ea784,theme:'harbor',dockAngle:-.7,description:'A seaside town of colorful cottages, market stalls, and a welcoming dockmaster.',npc:{name:'Dockmaster Mira',x:65,y:-45},obstacles:[{x:-85,y:35,r:31,kind:'house'},{x:25,y:70,r:30,kind:'house'},{x:55,y:-115,r:25,kind:'house'}]},
  {id:'pearl',name:'Pearl Cove',x:-1460,y:250,r:305,color:0x91bc91,theme:'tropical',dockAngle:.45,description:'White sand, turquoise lagoon, shell beds, and a palm-shaded camp.',clue:'The pale beach beside Pearl Cove’s shell-keeper camp.',npc:{name:'Nari the Shell Keeper',x:125,y:95},obstacles:[{x:35,y:-25,r:62,kind:'lagoon'},{x:-50,y:-120,r:25,kind:'tent'},{x:100,y:-25,r:19,kind:'rock'}]},
  {id:'gull',name:'Gullwatch',x:1550,y:-850,r:330,color:0x879b86,theme:'ruins',dockAngle:2.1,description:'An old lighthouse, broken stone arches, pine trees, and forgotten signal supplies.',clue:'The southwestern landing beneath Gullwatch’s lighthouse.',npc:{name:'Keeper Orin',x:-95,y:125},obstacles:[{x:40,y:-20,r:29,kind:'tower'},{x:-120,y:-100,r:22,kind:'ruin'},{x:110,y:130,r:23,kind:'ruin'}]},
  {id:'ember',name:'Ember Reef',x:-980,y:-2400,r:350,color:0x6d7468,theme:'volcanic',dockAngle:1,description:'Black sand, glowing volcanic stone, a sleeping crater, and an abandoned forge.',clue:'The southeastern black-sand landing below Ember Reef’s forge.',npc:{name:'Ivo the Forge Keeper',x:100,y:130},obstacles:[{x:-25,y:-25,r:96,kind:'volcano'},{x:130,y:65,r:30,kind:'forge'}]}
];
export const ISLAND_QUESTS = {
  home:{name:'A captain’s welcome',intro:'The tide scattered three supply parcels around town. Bring them back and I’ll help fund your next voyage.',outro:'All our supplies are home. You have a friend in Marigold, captain.',gold:180,xp:65,rep:6,steps:[{id:'market',name:'Market parcel',verb:'Collect parcel',x:-125,y:-35,kind:'parcel'},{id:'well',name:'Well-side parcel',verb:'Collect parcel',x:-45,y:120,kind:'parcel'},{id:'warehouse',name:'Shore parcel',verb:'Collect parcel',x:95,y:55,kind:'parcel'}]},
  pearl:{name:'Pearls of the tide',intro:'Three rare pearls washed into the shell beds. Find them around the cove, then bring them to me.',outro:'These will make the finest necklace in the archipelago. Thank you!',gold:420,xp:130,rep:15,steps:[{id:'west',name:'West beach pearl',verb:'Gather pearl',x:-170,y:-60,kind:'pearl'},{id:'south',name:'Palm grove pearl',verb:'Gather pearl',x:-95,y:155,kind:'pearl'},{id:'north',name:'Hidden beach pearl',verb:'Gather pearl',x:145,y:-130,kind:'pearl'}]},
  gull:{name:'Relight the watch',intro:'The lighthouse has gone dark. Recover its prism, signal oil, and old bell so ships can find their way home.',outro:'The watch shines again. Every sailor who sees it has you to thank.',gold:650,xp:180,rep:22,steps:[{id:'prism',name:'Lost lighthouse prism',verb:'Recover prism',x:-190,y:-35,kind:'prism'},{id:'oil',name:'Signal oil barrel',verb:'Collect signal oil',x:10,y:-200,kind:'barrel'},{id:'bell',name:'Old watch bell',verb:'Recover bell',x:180,y:75,kind:'bell'}]},
  ember:{name:'The sleeping forge',intro:'Help me wake the old forge. Find basalt ore, a cooled ember crystal, and the smith’s missing tools.',outro:'The forge has a fire again. This island remembers its makers.',gold:850,xp:240,rep:30,steps:[{id:'ore',name:'Basalt ore',verb:'Gather ore',x:-195,y:-65,kind:'ore'},{id:'crystal',name:'Cooled ember crystal',verb:'Collect crystal',x:45,y:-220,kind:'crystal'},{id:'tools',name:'Lost smithing tools',verb:'Recover tools',x:205,y:-40,kind:'tools'}]}
};
export const SHIPS = {
  sloop: {name:'Sloop',label:'Quick on the wind',price:0,level:1,hp:170,speed:108,turn:1.12,cargo:12,radius:25,scale:1,cannons:2},
  brig: {name:'Brig',label:'A little of everything',price:3500,level:4,hp:240,speed:92,turn:0.86,cargo:20,radius:31,scale:1.2,cannons:3},
  galleon: {name:'Galleon',label:'Built for a bigger haul',price:9000,level:7,hp:310,speed:74,turn:0.63,cargo:32,radius:37,scale:1.45,cannons:4}
};
export const CANNONS = {
  balanced:{name:'Deck cannon',price:0,level:1,damage:26,reload:3.5,range:520,speed:320,desc:'Reliable firepower, reach, and reload.'},
  quick:{name:'Swift cannon',price:900,level:2,damage:18,reload:2.15,range:420,speed:340,desc:'Reload sooner. Trade away damage and reach.'},
  long:{name:'Horizon cannon',price:1400,level:3,damage:23,reload:4.2,range:750,speed:420,desc:'Strike from farther away. Reload takes longer.'},
  heavy:{name:'Thunder cannon',price:2000,level:4,damage:42,reload:5.3,range:420,speed:260,desc:'Heavy hits, short reach, a patient reload.'}
};
export const HULLS = { cedar:{name:'Warm cedar',color:0x8d5c40,price:0,level:1}, teal:{name:'Sea glass',color:0x4e8f8a,price:350,level:1}, peach:{name:'Coral dusk',color:0xc8876c,price:500,level:2}, navy:{name:'Midnight tide',color:0x425f76,price:700,level:3}, lilac:{name:'Wisteria',color:0x9588ad,price:800,level:3}, white:{name:'Salt & pearl',color:0xd4cbbb,price:1200,level:5} };
export const SAILS = { cream:{name:'Classic canvas',color:0xf1e4cd,pattern:'plain',price:0,level:1}, stripe:{name:'Blue pinstripe',color:0xc7dbe5,pattern:'stripe',price:400,level:2}, sun:{name:'Golden sun',color:0xf2d6a4,pattern:'sun',price:650,level:3}, rose:{name:'Rosewater',color:0xe8bcbc,pattern:'stripe',price:800,level:4} };
export const FLAGS = { gull:{name:'Gull pennant',color:0xeed5ac,price:0,level:1}, mint:{name:'Mint pennant',color:0x96c6ac,price:300,level:1}, violet:{name:'Violet pennant',color:0xac99c3,price:500,level:2}, compass:{name:'Master mariner',color:0xdbb16c,price:0,level:1,mastery:500} };
export const TITLES = { rookie:{name:'New captain',price:0,level:1}, voyager:{name:'Wayfarer',price:250,level:3}, corsair:{name:'Corsair',price:800,level:5}, admiral:{name:'Admiral',price:1500,level:8} };
export const UPGRADES = { hull:{name:'Hull bracing',desc:'+8% hull per tier; three tiers.',base:450,max:3},sail:{name:'Trimmed sails',desc:'+4% speed per tier; three tiers.',base:500,max:3},cannon:{name:'Cannon fittings',desc:'+5% damage per tier; three tiers.',base:550,max:3} };
export const CONTRACTS = {
  salvage:{name:'A sailor’s lost cargo',desc:'Salvage two shipwrecks.',goal:2,gold:240,xp:70,rep:12,type:'salvage',level:1},
  patrol:{name:'Keep the coves clear',desc:'Sink three NPC pirate ships.',goal:3,gold:380,xp:110,rep:20,type:'npcKills',level:1},
  delivery:{name:'Mail for Pearl Cove',desc:'Carry harbor mail to Pearl Cove. Anchor nearby and interact. Requires 5 reputation.',goal:1,gold:320,xp:90,rep:15,type:'delivery',target:'pearl',level:1,reputation:5}
};
export const ACHIEVEMENTS = {
  firstBank:{name:'Home with treasure',desc:'Bank your first haul.',stat:'treasureBanked',goal:1,gold:100,xp:30},
  hunter:{name:'Safe passage',desc:'Sink ten NPC pirates.',stat:'npcKills',goal:10,gold:300,xp:100},
  gold:{name:'A growing fortune',desc:'Earn 2,000 gold.',stat:'goldEarned',goal:2000,gold:200,xp:70},
  voyager:{name:'Old sea legs',desc:'Finish ten voyages.',stat:'voyages',goal:10,gold:300,xp:100}
};
export const DEFAULT_KEYS = { sailUp:'KeyW',sailDown:'KeyS',left:'KeyA',right:'KeyD',fireLeft:'KeyQ',fireRight:'KeyE',anchor:'Space',interact:'KeyF',repair:'KeyR',map:'KeyM',cargo:'Tab',settings:'Escape' };
export const CATALOG = Object.fromEntries(Object.entries({ship:SHIPS,cannon:CANNONS,hull:HULLS,sail:SAILS,flag:FLAGS,title:TITLES,upgrade:UPGRADES}).flatMap(([kind,items])=>Object.entries(items).map(([id,v])=>[`${kind}:${id}`,{...v,kind,id}])));
export function level(xp) { return Math.floor(Math.sqrt(Math.max(0,xp)/100))+1; }
export function xpNext(xp) { return 100*level(xp)**2; }
export function defaultLoadout(ship='sloop') { return { cannon:'balanced',hull:'cedar',sail:'cream',flag:'gull',hullTier:0,sailTier:0,cannonTier:0,name:ship==='sloop'?'The Little Promise':ship==='brig'?'Second Wind':'Golden Horizon' }; }
export function defaultAccount(name='New captain') { return { version:VERSION,pirateName:name,title:'rookie',gold:250,goldEarned:0,goldSpent:0,xp:0,reputation:0,owned:{ship:['sloop'],cannon:['balanced'],hull:['cedar'],sail:['cream'],flag:['gull'],title:['rookie']},selectedShip:'sloop',loadouts:{sloop:defaultLoadout()},mastery:{sloop:0,brig:0,galleon:0},achievements:{},claims:[],stats:{solo:{},online:{},practice:{}},tutorial:[],hints:[],contract:null,visitedIslands:[],islandQuests:{},preferences:{master:0.65,music:0.2,effects:0.7,reducedMotion:false,quality:'medium',keys:{...DEFAULT_KEYS}},revision:0 }; }
export function shipStats(account) { const id=account.selectedShip; const l=account.loadouts[id]; const b=SHIPS[id]; return {...b,hp:Math.round(b.hp*(1+0.08*l.hullTier)),speed:b.speed*(1+0.04*l.sailTier),cannon:{...CANNONS[l.cannon],damage:CANNONS[l.cannon].damage*(1+0.05*l.cannonTier)}}; }
export const dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
export const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
export const angle=(v)=>Math.atan2(Math.sin(v),Math.cos(v));
