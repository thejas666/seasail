import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Group,Scene,Vector3} from 'three';
import {Seabirds} from '../src/companions';
test('gulls land on a slow boat and take off during a squall',()=>{const scene=new Scene(),boat=new Group();scene.add(boat);boat.position.set(20,0,-50);const birds=new Seabirds(scene);for(let j=0;j<360;j++)birds.update(40,1/60,boat,0,0,false);assert.ok(birds.perchBlend>.99);const perch=boat.localToWorld(new Vector3(-1.5,1.36,1.8));assert.ok(birds.birds[0].position.distanceTo(perch)<.2);for(let j=0;j<360;j++)birds.update(45,1/60,boat,0,1,false);assert.ok(birds.perchBlend<.01);assert.ok(birds.birds[0].position.y>5);});
