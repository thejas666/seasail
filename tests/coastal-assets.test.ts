import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {Box3,Group,Matrix4,Mesh,Vector3} from 'three';
import {createPalm,createPalmExport,PALM_VARIANTS,palmColliders} from '../src/assets/palm-tree';
import {createMossRock,createSandstone,createCoastalPlant} from '../src/assets/coastal-nature';
import {grassTuftGeometry,COASTAL_GRASS_HEIGHT,GRASS_FIELD_COUNT,GRASS_FIELD_LOW_COUNT} from '../src/assets/grass-tuft';
import {createExplorer} from '../src/explorer-model';
import {biome} from '../src/environment';
import {MAP,PICKUPS} from '../src/data';
import {blockedAt} from '../src/systems/collision';

test('illustrated coastal assets have finite geometry, vertex paint, and small draw budgets',()=>{
  const models=[...PALM_VARIANTS.map(v=>createPalm(v)),createMossRock(),createSandstone(),createCoastalPlant('grass'),createCoastalPlant('reeds'),createCoastalPlant('seedgrass')];
  for(const model of models){let draws=0,triangles=0;model.traverse(o=>{if(o instanceof Mesh){draws++;triangles+=(o.geometry.index?.count??o.geometry.getAttribute('position').count)/3;for(const name of ['position','normal','color'])assert.ok(Array.from(o.geometry.getAttribute(name).array).every(Number.isFinite),`${model.name} ${name}`);}});assert.ok(draws<=2,model.name);assert.ok(triangles<15000,`${model.name}: ${triangles} triangles`);const bounds=new Box3().setFromObject(model).getSize(new Vector3());assert.ok(bounds.toArray().every(v=>v>0&&Number.isFinite(v)));}
  for(const variant of PALM_VARIANTS){const a=createPalm(variant),b=createPalm(variant);assert.equal((a.children[0] as Mesh).geometry,(b.children[0] as Mesh).geometry);assert.equal((a.children[1] as Mesh).geometry,(b.children[1] as Mesh).geometry);}
});

test('curved and clustered palm colliders follow root rotation, scaling, and world position',()=>{
  const island=new Group();island.position.set(100,0,-70);const palm=createPalm('clump',12);palm.position.set(4,0,7);palm.rotation.y=1.3;island.add(palm);const colliders=palmColliders(palm);assert.equal(colliders.length,9);for(const c of colliders)assert.equal(blockedAt(c.x,c.z,colliders,[]),true);assert.equal(blockedAt(120,-30,colliders,[]),false);const raySolid=palm.children.find(o=>o.userData.cameraSolid);assert.ok(raySolid instanceof Mesh);assert.ok(colliders.every(c=>c.r>.2&&c.r<.5));
});

test('the replacement field uses the reference tuft at three quarters of explorer height and keeps pickups clear',()=>{
  const explorerHeight=new Box3().setFromObject(createExplorer()).getSize(new Vector3()).y;
  for(const steps of [3,8]){const geometry=grassTuftGeometry(steps);geometry.computeBoundingBox();const height=geometry.boundingBox!.getSize(new Vector3()).y;assert.ok(Math.abs(height/explorerHeight-.75)<.025);assert.ok(Math.abs(height-COASTAL_GRASS_HEIGHT)<.01);}
  for(const island of MAP.islands){const b=biome(island);assert.equal(b.grass.geometry,grassTuftGeometry(3));assert.equal(b.grass.count,GRASS_FIELD_COUNT);assert.equal(b.grass.userData.lowDensityCount,GRASS_FIELD_LOW_COUNT);const m=new Matrix4(),scale=new Vector3();for(let n=0;n<b.grass.count;n++){b.grass.getMatrixAt(n,m);scale.setFromMatrixScale(m);assert.ok(scale.y>=.949&&scale.y<=1.051);for(const pickup of PICKUPS.filter(p=>p.island===island.id))assert.ok(Math.hypot(m.elements[12]-(pickup.x-island.x),m.elements[14]-(pickup.z-island.z))>2.59);}}
});

test('coastal GLB exports are self-contained, painted, and below 400 KB each',()=>{
  const names=[...PALM_VARIANTS.map(v=>`palm-${v}`),'moss-rock','sandstone','coastal-grass','coastal-reeds','coastal-seedgrass'];
  for(const name of names){const bytes=readFileSync(`public/assets/models/${name}.glb`);assert.equal(bytes.readUInt32LE(0),0x46546c67);assert.equal(bytes.readUInt32LE(8),bytes.length);assert.ok(bytes.length<400*1024,name);const json=JSON.parse(bytes.subarray(20,20+bytes.readUInt32LE(12)).toString());assert.equal(json.images?.length??0,0);assert.equal(json.buffers[0].uri,undefined);assert.notEqual(json.meshes[0].primitives[0].attributes.COLOR_0,undefined);}
  assert.equal(createPalmExport('tall').children.length,1);
});
