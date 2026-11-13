import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Box3,Mesh,MeshStandardMaterial,Vector3} from 'three';
import * as Props from '../src/props';
import {blockedAt} from '../src/systems/collision';
test('detailed props have finite, nonempty geometry with bounded triangles and draw counts',()=>{for(const factory of [Props.barrel,Props.crate,Props.driftwood,Props.cleat,Props.dock,Props.chart,Props.lighthouse,Props.lookout,()=>Props.buoy('#d78c60'),()=>Props.harborHouse('#e8c68b'),()=>Props.sign('Palm Island')]){const group=factory();const size=new Box3().setFromObject(group).getSize(new Vector3());assert.ok(size.toArray().every(n=>Number.isFinite(n)&&n>0),group.name);let triangles=0,draws=0;group.traverse(o=>{if(o instanceof Mesh){draws++;triangles+=(o.geometry.index?.count??o.geometry.attributes.position.count)/3;}});assert.ok(triangles<45000,`${group.name}: ${triangles} triangles`);assert.ok(draws<=14,`${group.name}: ${draws} draws`);}});
test('harbor buildings expose warm window and lens materials for night lighting',()=>{for(const group of [Props.lighthouse(),Props.harborHouse('#e8c68b')]){assert.ok(group.userData.nightMaterials.length>0);assert.ok(group.userData.nightMaterials.every((m:unknown)=>m instanceof MeshStandardMaterial));}});
test('the chart table blocks walking while its chart remains within pickup reach',()=>{const table={x:0,z:-6,hx:1,hz:.65};assert.equal(blockedAt(0,-6,[],[table]),true);assert.equal(blockedAt(0,-4.58,[],[table]),false);assert.equal(blockedAt(1.42,-6,[],[table]),false);});
