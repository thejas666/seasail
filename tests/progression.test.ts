import {test} from 'node:test';
import assert from 'node:assert/strict';
import {PICKUPS,MAP} from '../src/data';
import {freshState,collect,available,upgrade,eat,repair,parseSave,objective} from '../src/state';

test('the main route guarantees a reinforced boat and chart without Shell Cove',()=>{
  const s=freshState();
  for(const p of PICKUPS.filter(p=>['palm','wreck'].includes(p.island)))assert.equal(collect(s,p.id),true);
  assert.equal(upgrade(s),true);assert.equal(s.reinforced,true);
  assert.equal(s.inventory.scrap,0);assert.equal(upgrade(s),false);
  assert.equal(collect(s,'l-chart'),true);assert.equal(s.chart,true);
  assert.equal(objective(s).island,'harbor');
});
test('save and reload preserve collected objects without duplicating permanent items',()=>{
  const s=freshState();collect(s,'w-scrap-1');collect(s,'l-chart');s.fishJournal=[0,2];s.lastDock='wreck';s.visited.push('wreck');s.discovered.push('wreck');
  const restored=parseSave(JSON.stringify(s));
  assert.deepEqual(restored,s);assert.equal(collect(restored,'w-scrap-1'),false);assert.equal(restored.inventory.scrap,1);assert.equal(collect(restored,'l-chart'),false);
});
test('renewable resources replenish only after enough active play time',()=>{
  const s=freshState();assert.equal(collect(s,'p-wood-1'),true);assert.equal(available(s,'p-wood-1'),false);
  s.playTime=149;assert.equal(available(s,'p-wood-1'),false);s.playTime=150;assert.equal(collect(s,'p-wood-1'),true);assert.equal(s.inventory.wood,4);
  collect(s,'w-scrap-1');s.playTime=10000;assert.equal(available(s,'w-scrap-1'),false);
});
test('survival actions cannot consume missing items and clamp restored meters',()=>{
  const s=freshState();s.nourishment=0;assert.equal(eat(s,'fish'),false);assert.equal(eat(s,'fruit'),true);assert.equal(s.nourishment,24);
  s.nourishment=95;assert.equal(eat(s,'fruit'),true);assert.equal(s.nourishment,100);assert.equal(eat(s,'fruit'),false);
  s.condition=0;assert.equal(repair(s),false);s.inventory.wood=1;s.condition=90;assert.equal(repair(s),true);assert.equal(s.condition,100);assert.equal(s.inventory.wood,0);
});
test('invalid, incompatible, or corrupted saves are rejected',()=>{
  for(const raw of ['null','{}','{','{"version":2}',JSON.stringify({...freshState(),condition:-10}),JSON.stringify({...freshState(),lastDock:'nowhere'}),JSON.stringify({...freshState(),fishJournal:[12]}),JSON.stringify({...freshState(),collected:{'fake':0}})])assert.throws(()=>parseSave(raw));
});
test('required pickups are walkable and each docking point is reachable from outside',()=>{
  for(const p of PICKUPS){const i=MAP.islands.find(i=>i.id===p.island)!;const onJetty=Math.abs(p.x-i.dock[0])<3&&p.z>i.z&&p.z<i.dock[1]-3;assert.ok(Math.hypot(p.x-i.x,p.z-i.z)<i.radius-1||onJetty,`${p.id} is on walkable land or a jetty`);}
  for(const i of MAP.islands)assert.ok(Math.hypot(i.dock[0]-i.x,i.dock[1]-i.z)>i.radius+3,`${i.name} has a sea-accessible dock`);
});
