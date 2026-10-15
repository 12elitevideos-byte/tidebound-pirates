export const WEAPONS={
 deckguns:{name:'Round shot',damage:38,cooldown:.7,range:1015,velocity:700,pellets:1,spread:0,color:0xffd19a},
 ironjaw:{name:'Siege shot',damage:700,cooldown:8.5,range:1200,velocity:550,pellets:1,spread:0,color:0xffae65},
 stormpiercer:{name:'Repeater',damage:8,cooldown:.11,range:680,velocity:1000,pellets:1,spread:.07,color:0xb5e9ff},
 corsair:{name:'Scatter shot',damage:17,cooldown:1.1,range:360,velocity:800,pellets:7,spread:.6,color:0xffd983},
 embermaw:{name:'Fire beam',damage:9,cooldown:.1,range:540,velocity:0,pellets:1,spread:0,beam:true,color:0xff6f35}
};
export function weapon(item){return WEAPONS[item.id]||WEAPONS.deckguns;}
export function weaponFacts(item){const w=weapon(item);return `<div class="weapon-facts"><strong>${w.name}</strong><span>${w.beam?w.damage*10+' damage / second':w.pellets>1?w.pellets+' × '+w.damage+' damage':w.damage+' damage / shot'}</span><span>${w.range} range · ${w.cooldown.toFixed(2)}s ${w.beam?'damage tick':'reload'}</span>${w.beam?'<span>Overheats after 2s · cools for 2.5s</span>':''}</div>`;}
