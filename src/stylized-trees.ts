import * as T from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
const bark=new T.MeshStandardMaterial({color:'#997044',roughness:1});
const gradient=new T.DataTexture(new Uint8Array([105,105,105,255,160,160,160,255,210,210,210,255,255,255,255,255]),4,1);
gradient.minFilter=gradient.magFilter=T.NearestFilter;gradient.generateMipmaps=false;gradient.needsUpdate=true;
const foliage=new T.MeshToonMaterial({color:'#ffffff',gradientMap:gradient});
const highlight=new T.MeshToonMaterial({color:'#ffffff',gradientMap:gradient});
const crownGeometry=new T.SphereGeometry(1,16,12);
const positions=crownGeometry.attributes.position;
for(let n=0;n<positions.count;n++){const x=positions.getX(n),y=positions.getY(n),z=positions.getZ(n),r=1+Math.sin(x*4+y*3)*Math.cos(z*4)*.055;positions.setXYZ(n,x*r,y*r,z*r);}crownGeometry.computeVertexNormals();
function branch(points:T.Vector3[],radius:number,parent:T.Group){const mesh=new T.Mesh(new T.TubeGeometry(new T.CatmullRomCurve3(points),12,radius,7,false),bark);mesh.castShadow=mesh.receiveShadow=true;parent.add(mesh);}
export function stylizedTree(seed:number,height:number){
  const g=new T.Group(),shape=seed%3;
  const trunkCurve=new T.CatmullRomCurve3([new T.Vector3(0,0,0),new T.Vector3(-.12,height*.3,.06),new T.Vector3(.24,height*.6,-.12),new T.Vector3(.05,height*.86,0)]);
  const trunk=new T.Mesh(new T.TubeGeometry(trunkCurve,20,.19,9,false),bark);trunk.castShadow=trunk.receiveShadow=true;g.add(trunk);
  const crowns=new T.InstancedMesh(crownGeometry,foliage,9),spots=new T.InstancedMesh(crownGeometry,highlight,36),dummy=new T.Object3D();let c=0,s=0;
  crowns.castShadow=crowns.receiveShadow=true;
  const palette=['#85b83f','#8db83f','#77a93b','#9bc94a','#6e9d35'];
  for(let k=0;k<8;k++){
    const a=k*2.399+seed*.6,t=.34+k*.045,start=trunkCurve.getPoint(t);
    const reach=shape===1?1.0:1.8+(k%3)*.48;
    const y=shape===1?height*(.48+k*.065):height*(.68+(k%3)*.085);
    const end=new T.Vector3(Math.cos(a)*reach,y,Math.sin(a)*reach);
    branch([start,start.clone().lerp(end,.48).add(new T.Vector3(0,-.15,0)),end],.065+(8-k)*.008,g);
    const size=shape===1?1.35:1.5+(k%3)*.2;
    dummy.position.copy(end).add(new T.Vector3(0,.35,0));dummy.rotation.set(.1,a,.1);dummy.scale.set(size,shape===2?.85:1.2,size*.85);dummy.updateMatrix();crowns.setMatrixAt(c,dummy.matrix);crowns.setColorAt(c++,new T.Color(palette[(k+seed)%palette.length]));
    for(let p=0;p<4;p++){
      const angle=p*2.4+k;dummy.position.set(end.x+Math.cos(angle)*size*.5,end.y+.9+Math.sin(p)*.2,end.z+Math.sin(angle)*size*.48);dummy.rotation.set(.2,a,.2);dummy.scale.set(.33+(p%2)*.18,.1,.3+(p%2)*.15);dummy.updateMatrix();spots.setMatrixAt(s,dummy.matrix);spots.setColorAt(s++,new T.Color(p%2?'#b3d75a':'#a0ce4b'));
    }
  }
  dummy.position.set(.05,height*.94,0);dummy.scale.set(1.4,1.3,1.2);dummy.updateMatrix();crowns.setMatrixAt(c,dummy.matrix);crowns.setColorAt(c++,new T.Color('#9ac94b'));
  crowns.count=c;spots.count=s;spots.userData.lowDetailHide=true;crowns.computeBoundingSphere();spots.computeBoundingSphere();
  const woodParts=g.children.filter((o):o is T.Mesh=>o instanceof T.Mesh);const merged=mergeGeometries(woodParts.map(o=>o.geometry),false)!;for(const part of woodParts){part.removeFromParent();part.geometry.dispose();}const connectedWood=new T.Mesh(merged,bark);connectedWood.castShadow=connectedWood.receiveShadow=true;connectedWood.userData.cameraSolid=true;g.add(connectedWood,crowns,spots);return g;
}
