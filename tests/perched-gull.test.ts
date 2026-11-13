import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {Box3,Mesh} from 'three';
import {createPerchedGull,createPerchedGullExport} from '../src/assets/perched-gull';

test('stationary gull exports a finite, compact, vertex-painted single-draw surface',()=>{
  const source=createPerchedGull(),asset=createPerchedGullExport();
  assert.equal(source.userData.pose,'perched-static');
  assert.ok(source.getObjectByName('continuous-body-neck-head'));
  assert.ok(source.getObjectByName('folded-wing-left'));assert.ok(source.getObjectByName('folded-wing-right'));
  const bounds=new Box3().setFromObject(asset);assert.ok(bounds.min.y>=0&&bounds.min.y<.02);assert.ok(bounds.max.y>1&&bounds.max.y<1.1);
  assert.ok(bounds.min.z<-.6&&bounds.max.z>.6);
  let draws=0,triangles=0;asset.traverse(o=>{if(o instanceof Mesh){draws++;triangles+=(o.geometry.index?.count??o.geometry.attributes.position.count)/3;for(const attribute of ['position','normal','color']){const a=o.geometry.getAttribute(attribute);assert.ok(a);assert.ok(Array.from(a.array).every(Number.isFinite));}assert.equal(o.geometry.getAttribute('color').count,o.geometry.getAttribute('position').count);}});
  assert.equal(draws,1);assert.ok(triangles<23000);
});

test('checked-in GLB is a self-contained static mesh and matches the authored triangle count',()=>{
  const bytes=readFileSync('public/assets/models/perched-gull.glb');assert.equal(bytes.readUInt32LE(0),0x46546c67);assert.equal(bytes.readUInt32LE(4),2);assert.equal(bytes.readUInt32LE(8),bytes.length);assert.ok(bytes.length<600*1024);
  const gltf=JSON.parse(bytes.subarray(20,20+bytes.readUInt32LE(12)).toString());
  assert.equal(gltf.animations?.length??0,0);assert.equal(gltf.skins?.length??0,0);assert.equal(gltf.images?.length??0,0);
  assert.equal(gltf.meshes.length,1);assert.equal(gltf.materials.length,1);assert.equal(gltf.buffers[0].uri,undefined);
  const primitive=gltf.meshes[0].primitives[0];assert.notEqual(primitive.attributes.COLOR_0,undefined);
  const source=createPerchedGullExport().children[0] as Mesh;
  assert.equal(gltf.accessors[primitive.indices].count,source.geometry.index!.count);
});
