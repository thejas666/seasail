import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Group,Vector3} from 'three';
import {BirdBehavior} from '../src/systems/bird-behavior';

test('coastal visitors have varied identities, irregular intervals, and quiet periods between landings',()=>{
  const boat=new Group();boat.position.set(19,0,43);const flock=new BirdBehavior(9,42),visits:{time:number;bird:number}[]=[],leaves:number[]=[];let maxVisitors=0;
  for(let n=0;n<18000;n++){
    const old=flock.birds.map(b=>b.mode);flock.update(.1,boat,0,0);
    maxVisitors=Math.max(maxVisitors,flock.birds.filter(b=>['approaching','landing','perched','departing'].includes(b.mode)).length);
    flock.birds.forEach((b,j)=>{if(b.mode==='perched'&&old[j]!=='perched')visits.push({time:flock.elapsed,bird:j});if(old[j]==='perched'&&b.mode==='departing')leaves.push(flock.elapsed);});
  }
  assert.equal(maxVisitors,1);assert.ok(visits.length>=3);assert.ok(new Set(visits.map(v=>v.bird)).size>=3);assert.ok(visits.some(v=>v.bird>1));
  const intervals=visits.slice(1).map((v,j)=>Math.round(v.time-visits[j].time));assert.ok(new Set(intervals).size>1);assert.ok(intervals.every(v=>v>100));
  for(let j=1;j<visits.length;j++)assert.ok(visits[j].time-leaves[j-1]>75);
});

test('roaming birds use world-space coast routes instead of repeating boat-centered orbits',()=>{
  const boat=new Group();boat.position.set(19,0,43);const flock=new BirdBehavior(9,7);flock.nextEncounter=Infinity;flock.update(.1,boat,0,0);const start=flock.birds.map(b=>b.position.clone()),home=flock.birds[0].home.clone();
  boat.position.add(new Vector3(80,0,0));flock.update(.1,boat,3,0);
  assert.ok(flock.birds[0].home.distanceTo(home)<.001);assert.ok(flock.birds.every((b,j)=>b.position.distanceTo(start[j])<2));
  for(let n=0;n<950;n++)flock.update(.1,boat,3,0);assert.ok(flock.birds.every((b,j)=>b.position.distanceTo(start[j])>5));
});

test('fast boats and squalls do not attract landings, and performance mode visitors come from visible birds',()=>{
  const boat=new Group();boat.position.set(19,0,43);const moving=new BirdBehavior(12,42),stormy=new BirdBehavior(12,42),low=new BirdBehavior(12,42);let visitors=0;
  for(let n=0;n<12000;n++){
    moving.update(.1,boat,3,0);stormy.update(.1,boat,0,.8);low.update(.1,boat,0,0,8);
    assert.ok(moving.birds.every(b=>!['approaching','landing','perched'].includes(b.mode)));assert.ok(stormy.birds.every(b=>!['approaching','landing','perched'].includes(b.mode)));
    low.birds.forEach((b,j)=>{if(b.mode==='perched'){assert.ok(j<8);visitors++;}});
  }
  assert.ok(visitors>0);
});
