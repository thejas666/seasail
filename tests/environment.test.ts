import {test} from 'node:test';
import assert from 'node:assert/strict';
import {MAP,PICKUPS} from '../src/data';
import {localHeight,groundHeight,biome,rand} from '../src/environment';
import {freshState,readSettings,saveSettings,SETTINGS_KEY,SAVE_KEY} from '../src/state';
import {plantNature} from '../src/nature';
import {Group,Box3,Vector3} from 'three';

test('rendered ground and explorer height agree at every pickup and jetty',()=>{
  for(const p of PICKUPS){const i=MAP.islands.find(i=>i.id===p.island)!;const height=groundHeight(i,p.x,p.z);assert.ok(Number.isFinite(height)&&height>=0&&height<10);}
  for(const i of MAP.islands){assert.equal(groundHeight(i,i.dock[0],i.dock[1]-12),1.5);assert.ok(localHeight(i,0,0)>localHeight(i,0,i.radius*.9));}
});
test('vegetation is deterministic, fits its instance buffers, and leaves required pickups accessible',()=>{
  for(const i of MAP.islands){const b=biome(i);assert.ok(b.grass.count>1000&&b.grass.count<=b.grass.instanceMatrix.count);for(const object of b.objects.children){if('count'in object&&'instanceMatrix'in object)assert.ok(Number(object.count)<=Number((object.instanceMatrix as {count:number}).count));}
    const nature=plantNature(i,b,{rock:new Group()});assert.ok(nature.group.children.length>5);
    for(const p of PICKUPS.filter(p=>p.island===i.id))assert.ok(!nature.colliders.some(o=>Math.hypot(o.x-p.x,o.z-p.z)<o.r+.35),`${p.id} is accessible`);
    const bounds=new Box3().setFromObject(nature.group).getSize(new Vector3());assert.ok(bounds.y>5&&bounds.y<25);
    b.objects.traverse(object=>{if('geometry'in object)(object.geometry as {dispose:()=>void}).dispose();});
  }
  const a=rand(12),b=rand(12);assert.deepEqual(Array.from({length:10},()=>a()),Array.from({length:10},()=>b()));
});
test('pregame settings persist without creating or replacing a saved journey',()=>{
  const values=new Map<string,string>();Object.defineProperty(globalThis,'localStorage',{configurable:true,value:{getItem:(key:string)=>values.get(key)??null,setItem:(key:string,value:string)=>values.set(key,value)}});
  const defaults=freshState().settings;saveSettings({...defaults,volume:.6,lowGraphics:true});assert.equal(values.has(SAVE_KEY),false);assert.equal(readSettings(defaults).lowGraphics,true);
  values.set(SAVE_KEY,'existing voyage');saveSettings(defaults);assert.equal(values.get(SAVE_KEY),'existing voyage');values.set(SETTINGS_KEY,'broken');assert.deepEqual(readSettings(defaults),defaults);
  values.set(SETTINGS_KEY,JSON.stringify({volume:12,sensitivity:-8,reducedMotion:true}));const clamped=readSettings(defaults);assert.equal(clamped.volume,1);assert.equal(clamped.sensitivity,.3);assert.equal(clamped.reducedMotion,true);
});
