import * as T from 'three';
import {PICKUPS,type Island} from './data';
import {localHeight,rand} from './environment';
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
export function fernField(i:Island){
  const random=rand(i.id.length*683),geometry=new T.BufferGeometry(),positions:number[]=[],indices:number[]=[];
  for(let k=0;k<=8;k++){const t=k/8,w=Math.sin(t*Math.PI)*.16,y=Math.sin(t*Math.PI)*.16;positions.push(-w,y,t*.95,0,y+.035,t*.95,w,y,t*.95);if(k<8){const n=k*3;indices.push(n,n+3,n+1,n+1,n+3,n+4,n+1,n+4,n+2,n+2,n+4,n+5);}}
  geometry.setAttribute('position',new T.Float32BufferAttribute(positions,3));geometry.setIndex(indices);geometry.computeVertexNormals();const leaves=new T.InstancedMesh(geometry,new T.MeshStandardMaterial({color:'#ffffff',side:T.DoubleSide,roughness:1}),320),dummy=new T.Object3D();let count=0;
  for(let j=0;j<30;j++){const a=random()*Math.PI*2,r=i.radius*(.22+random()*.5),x=Math.cos(a)*r,z=Math.sin(a)*r;if(PICKUPS.some(p=>p.island===i.id&&Math.hypot(p.x-i.x-x,p.z-i.z-z)<1.5))continue;for(let k=0;k<10;k++){dummy.position.set(x,localHeight(i,x,z)+.025,z);dummy.rotation.set(-.35-random()*.35,k*2.399+j,0);dummy.scale.setScalar(.65+random()*.55);dummy.updateMatrix();leaves.setMatrixAt(count,dummy.matrix);leaves.setColorAt(count++,new T.Color(k%3?'#669a4d':'#8eb359'));}}
  leaves.count=count;leaves.userData.fullCount=count;leaves.userData.lowDensityCount=Math.floor(count*.55);leaves.receiveShadow=true;leaves.computeBoundingSphere();return leaves;
}
export function roundedRock(){
  const geometry=new T.SphereGeometry(1,18,12),positions=geometry.attributes.position;
  for(let n=0;n<positions.count;n++){const x=positions.getX(n),y=positions.getY(n),z=positions.getZ(n),r=1+.12*Math.sin(x*3+z*2)*Math.cos(y*4)+.06*Math.cos(z*5-x);positions.setXYZ(n,x*r,y*r,z*r);}
  geometry.computeVertexNormals();const mesh=new T.Mesh(geometry,soft('#91a39b'));mesh.castShadow=mesh.receiveShadow=true;const g=new T.Group();mesh.position.y=.5;mesh.scale.set(.5,.5,.45);g.add(mesh);return g;
}
