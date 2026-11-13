export const WORLD_SCALE = 2.2;
export type Resource = 'wood' | 'fiber' | 'scrap' | 'fruit' | 'fish' | 'shell';
export type Inventory = Record<Resource, number>;
export type Island = { id: string; name: string; subtitle: string; x: number; z: number; radius: number; dock: [number, number]; color: string; landmark: 'palms' | 'shell' | 'wreck' | 'lookout' | 'harbor' };
export type Pickup = { id: string; island: string; type: Resource | 'rod' | 'chart'; x: number; z: number; amount: number };
export const MAP = {
  id: 'sunhaven', name: 'The Sunhaven Passage', bounds: 1350,
  islands: [
    {id:'palm',name:'Palm Island',subtitle:'Every journey starts small.',x:0,z:0,radius:33,dock:[19,43],color:'#79a878',landmark:'palms'},
    {id:'shell',name:'Shell Cove',subtitle:'A little off the beaten current.',x:-135,z:-90,radius:25,dock:[-119,-56],color:'#94b68a',landmark:'shell'},
    {id:'wreck',name:'Wreck Island',subtitle:'Something old. Something useful.',x:155,z:-155,radius:31,dock:[173,-113],color:'#759a70',landmark:'wreck'},
    {id:'lookout',name:'Lookout Island',subtitle:'A new perspective on the horizon.',x:-25,z:-325,radius:32,dock:[-6,-282],color:'#7fa47c',landmark:'lookout'},
    {id:'harbor',name:'Sunhaven Harbor',subtitle:'You took the scenic route. Welcome home.',x:175,z:-520,radius:42,dock:[194,-466],color:'#87aa78',landmark:'harbor'},
  ] as Island[],
};
export const PICKUPS: Pickup[] = [
  {id:'p-wood-1',island:'palm',type:'wood',x:16,z:21,amount:2},
  {id:'p-wood-2',island:'palm',type:'wood',x:-15,z:10,amount:2},
  {id:'p-fiber-1',island:'palm',type:'fiber',x:12,z:9,amount:2},
  {id:'p-fiber-2',island:'palm',type:'fiber',x:-6,z:-13,amount:2},
  {id:'p-fruit',island:'palm',type:'fruit',x:-8,z:20,amount:3},
  {id:'p-rod',island:'palm',type:'rod',x:20,z:29,amount:1},
  {id:'s-shell',island:'shell',type:'shell',x:-132,z:-73,amount:1},
  {id:'s-fruit',island:'shell',type:'fruit',x:-141,z:-86,amount:3},
  {id:'s-fiber',island:'shell',type:'fiber',x:-125,z:-95,amount:2},
  {id:'w-scrap-1',island:'wreck',type:'scrap',x:166,z:-136,amount:1},
  {id:'w-scrap-2',island:'wreck',type:'scrap',x:146,z:-159,amount:1},
  {id:'w-wood',island:'wreck',type:'wood',x:137,z:-143,amount:3},
  {id:'w-fruit',island:'wreck',type:'fruit',x:154,z:-175,amount:2},
  {id:'w-shell',island:'wreck',type:'shell',x:147,z:-130,amount:1},
  {id:'l-chart',island:'lookout',type:'chart',x:-25,z:-331,amount:1},
  {id:'l-wood',island:'lookout',type:'wood',x:-12,z:-309,amount:3},
  {id:'l-fiber',island:'lookout',type:'fiber',x:-38,z:-322,amount:3},
  {id:'l-fruit',island:'lookout',type:'fruit',x:-37,z:-306,amount:3},
  {id:'l-shell',island:'lookout',type:'shell',x:-20,z:-301,amount:1},
  {id:'h-fruit',island:'harbor',type:'fruit',x:190,z:-494,amount:4},
];
export const FISH = [
  {name:'Sunstripe',color:'#e8b451',description:'A little pocket of sunshine. Found around Palm Island.'},
  {name:'Coral Dancer',color:'#e28d7e',description:'At home in the quiet shallows of Shell Cove.'},
  {name:'Blue Drifter',color:'#83bfcf',description:'A curious companion along the old wreck.'},
  {name:'Moonfin',color:'#b1a6d0',description:'Silvery fins beneath the Lookout cliffs.'},
  {name:'Jade Sprat',color:'#86b899',description:'A small welcome from the waters of Sunhaven.'},
];
// Expand open-water distances while retaining comfortable, walkable island sizes.
for(const island of MAP.islands){
  const dx=island.x*(WORLD_SCALE-1),dz=island.z*(WORLD_SCALE-1);
  island.x+=dx;island.z+=dz;island.dock=[island.dock[0]+dx,island.dock[1]+dz];
  for(const pickup of PICKUPS.filter(p=>p.island===island.id)){pickup.x+=dx;pickup.z+=dz;}
}
export const COST = {wood:4,fiber:4,scrap:2};
export const RESOURCE_LABELS: Record<Resource,string> = {wood:'Driftwood',fiber:'Palm fiber',scrap:'Salvaged metal',fruit:'Tropical fruit',fish:'Fresh fish',shell:'Seashells'};
