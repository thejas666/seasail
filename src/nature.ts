import * as T from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {MeshoptDecoder} from 'three/addons/libs/meshopt_decoder.module.js';
import {PICKUPS,type Island} from './data';
import {localHeight,rand,type Biome} from './environment';
import {stylizedTree} from './stylized-trees';

export type Collider={x:number;z:number;r:number};
export type NatureAssets={fern:T.Group;rock:T.Group};
function normalize(model:T.Group,height=true){
  const bounds=new T.Box3().setFromObject(model),size=bounds.getSize(new T.Vector3()),center=bounds.getCenter(new T.Vector3());
  model.position.sub(new T.Vector3(center.x,bounds.min.y,center.z));
  const root=new T.Group();root.add(model);root.scale.setScalar(1/(height?size.y:Math.max(size.x,size.z)));root.updateMatrixWorld(true);
  root.traverse(object=>{if(object instanceof T.Mesh){object.castShadow=true;object.receiveShadow=true;for(const material of Array.isArray(object.material)?object.material:[object.material]){if(material instanceof T.MeshStandardMaterial){material.flatShading=false;material.roughness=1;material.metalness=0;material.envMapIntensity=.15;material.side=T.DoubleSide;material.normalScale.setScalar(.18);if(material.map)material.map.anisotropy=4;}}}});
  return root;
}
export async function loadNature(progress:(done:number)=>void):Promise<NatureAssets>{
  const loader=new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);let done=0;
  const [fern,rock]=await Promise.all(['fern','rock'].map(async name=>{const gltf=await loader.loadAsync(`/assets/${name}.glb`);progress(++done/2);return normalize(gltf.scene,name!=='rock');}));
  rock.traverse(object=>{if(object instanceof T.Mesh)object.material=new T.MeshStandardMaterial({color:'#8b9d9a',roughness:1});});
  return {fern,rock};
}
export function plantNature(i:Island,b:Biome,assets:NatureAssets){
  const group=new T.Group(),colliders:Collider[]=[],random=rand(i.id.length*7927);
  b.objects.getObjectByName('placeholder-trunks')?.removeFromParent();b.objects.getObjectByName('placeholder-crowns')?.removeFromParent();
  for(const child of [...b.objects.children])if(child.userData.placeholderRock)child.removeFromParent();
  const clear=(x:number,z:number,range:number)=>!PICKUPS.some(p=>p.island===i.id&&Math.hypot(p.x-i.x-x,p.z-i.z-z)<range);
  for(let j=0;j<13;j++){
    const a=j*2.399+.7,r=i.radius*(.34+random()*.27),x=Math.cos(a)*r,z=Math.sin(a)*r;
    if(x>7&&z>10||!clear(x,z,3))continue;
    const height=5.8+random()*2,tree=stylizedTree(j+i.id.length,height);tree.position.set(x,localHeight(i,x,z)-.08,z);tree.rotation.y=random()*6;group.add(tree);colliders.push({x:i.x+x,z:i.z+z,r:.3});
  }
  for(let j=0;j<28;j++){
    const a=random()*Math.PI*2,r=i.radius*(.26+random()*.45),x=Math.cos(a)*r,z=Math.sin(a)*r;
    if(!clear(x,z,1.8))continue;
    const fern=assets.fern.clone(true);fern.position.set(x,localHeight(i,x,z)-.03,z);fern.scale.multiplyScalar(.6+random()*.7);fern.rotation.y=random()*6;fern.userData.lowDetailHide=j%2===0;group.add(fern);
  }
  for(let j=0;j<5;j++){
    const x=-i.radius*.57+Math.sin(j*2.4)*4,z=-i.radius*.58+Math.cos(j*2.4)*4;
    const rock=assets.rock.clone(true);rock.position.set(x,localHeight(i,x,z)-1.1,z);rock.scale.multiply(new T.Vector3(9+(j%2)*2,13+(j%3)*3,8+(j%3)));rock.rotation.y=j*1.7;rock.userData.cameraSolid=true;group.add(rock);colliders.push({x:i.x+x,z:i.z+z,r:4.6});
  }
  group.position.set(i.x,0,i.z);return {group,colliders};
}
