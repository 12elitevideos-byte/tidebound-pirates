import * as THREE from 'three';
export function applyEquipmentAppearance(ship,gear){
 const cannon=gear.cannon;
 const colors={deckguns:0x46545a,ironjaw:0x252e37,stormpiercer:0x527b8b,embermaw:0x9d5435,corsair:0xa78b50};
 for(const gun of ship.userData.cannons){gun.material=gun.material.clone();gun.material.color.setHex(colors[cannon.id]||0x46545a);gun.scale.set(cannon.gun==='heavy'?1.3:.95,cannon.gun==='heavy'?1.2:cannon.gun==='rapid'?1.35:1,1);}
 const armor=gear.armor;
 if(!['timber','driftwood'].includes(armor.id)){const heavy=armor.id==='leviathan';for(const side of [-1,1]){const plate=new THREE.Mesh(new THREE.BoxGeometry(heavy?5:3,heavy?13:9,47),new THREE.MeshStandardMaterial({color:armor.id==='tideguard'?0x6b9d99:heavy?0x364858:0x7b8589,roughness:.72,metalness:.3}));plate.position.set(side*22,15,0);ship.add(plate);}}
 for(const sail of ship.userData.sails.filter(s=>!s.userData.flag)){sail.scale.x=gear.speed.id==='tempest'?1.15:gear.speed.id==='duelist'?.92:1;}
 return ship;
}
