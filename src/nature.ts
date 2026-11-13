import {coastalFoliageField,createMossRock,createSandstone} from './assets/coastal-nature';
import * as T from 'three';
import {PICKUPS,type Island} from './data';
import {localHeight,rand,type Biome} from './environment';
import {stylizedTree} from './stylized-trees';

export type Collider={x:number;z:number;r:number};
export type NatureAssets={rock:T.Group;sandstone?:T.Group};
export async function loadNature(progress:(done:number)=>void):Promise<NatureAssets>{progress(1);return {rock:createMossRock(),sandstone:createSandstone()};}
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
  group.add(coastalFoliageField(i,b.wind));
  for(let j=0;j<5;j++){
    const x=-i.radius*.57+Math.sin(j*2.4)*4,z=-i.radius*.58+Math.cos(j*2.4)*4;
    if(!clear(x,z,4))continue;const sandstone=j===1||j===4,size=sandstone?2.3+(j%2)*.3:3+(j%3)*.35,rock=(sandstone?(assets.sandstone??createSandstone()):assets.rock).clone(true);rock.position.set(x,localHeight(i,x,z)-.12,z);rock.scale.setScalar(size);rock.rotation.y=j*1.7;rock.userData.cameraSolid=true;group.add(rock);colliders.push({x:i.x+x,z:i.z+z,r:(sandstone?1.1:.85)*size});
  }
  group.position.set(i.x,0,i.z);return {group,colliders};
}
