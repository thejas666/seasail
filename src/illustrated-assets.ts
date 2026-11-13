import * as T from 'three';
import type {Island} from './data';
import {localHeight} from './environment';
const soft=(color:string)=>new T.MeshStandardMaterial({color,roughness:1,flatShading:false});
const petalGeometry=new T.SphereGeometry(1,9,6),plantMaterial=soft('#ffffff');
export function flowerField(i:Island){
  const g=new T.Group(),stems=new T.InstancedMesh(new T.CylinderGeometry(.018,.024,.55,6),soft('#5d944c'),24),petals=new T.InstancedMesh(petalGeometry,plantMaterial,144),centers=new T.InstancedMesh(petalGeometry,soft('#e1aa45'),24),leaves=new T.InstancedMesh(petalGeometry,soft('#70a64e'),48),dummy=new T.Object3D();
  for(let j=0;j<24;j++){
    const x=Math.sin(j*7)*i.radius*.65,z=Math.cos(j*4)*i.radius*.65,y=localHeight(i,x,z);dummy.position.set(x,y+.28,z);dummy.scale.set(1,1,1);dummy.rotation.set(0,0,.05);dummy.updateMatrix();stems.setMatrixAt(j,dummy.matrix);
    for(let k=0;k<6;k++){const a=k*Math.PI/3;dummy.position.set(x+Math.cos(a)*.11,y+.56,z+Math.sin(a)*.11);dummy.scale.set(.095,.035,.067);dummy.rotation.set(0,-a,0);dummy.updateMatrix();petals.setMatrixAt(j*6+k,dummy.matrix);petals.setColorAt(j*6+k,new T.Color(j%3===0?'#f6e9ad':j%3===1?'#e7a986':'#ebc966'));}
    dummy.position.set(x,y+.59,z);dummy.rotation.set(0,0,0);dummy.scale.set(.06,.04,.06);dummy.updateMatrix();centers.setMatrixAt(j,dummy.matrix);
    for(let k=0;k<2;k++){dummy.position.set(x+(k?-.07:.07),y+.2+k*.12,z);dummy.rotation.set(0,j,.3*(k?-1:1));dummy.scale.set(.12,.025,.055);dummy.updateMatrix();leaves.setMatrixAt(j*2+k,dummy.matrix);}
  }
  for(const mesh of [stems,petals,centers,leaves]){mesh.receiveShadow=true;mesh.computeBoundingSphere();g.add(mesh);}return g;
}
