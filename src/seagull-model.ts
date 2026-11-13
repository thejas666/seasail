import * as T from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';

// Illustrated gull: local -Z is the beak/flight direction throughout the rig.
const mat=(color:string)=>new T.MeshStandardMaterial({color,roughness:.88});
const white=mat('#f4f6f8'),breast=mat('#e1e7ef'),mantle=mat('#b7c2d3');
const featherLight=mat('#cbd4e1'),featherShade=mat('#8c9bb3'),ink=mat('#303847');
const beakGold=mat('#cf915b'),beakLight=mat('#e5b47c'),beakSeam=mat('#99694d');
const legPink=mat('#bd8b80'),footPink=mat('#d1a092'),eyeBlack=mat('#1e242e');
const sphere=new T.SphereGeometry(1,16,12),eyeGeometry=new T.SphereGeometry(1,10,8);
const featherGeometry=new T.SphereGeometry(1,10,7);
const primaryGeometry=featherGeometry.clone();
const primaryColors=new Float32Array(primaryGeometry.attributes.position.count*3);
const greyColor=new T.Color('#c3cddd'),blackColor=new T.Color('#303847'),spotColor=new T.Color('#f5f6f9');
for(let i=0;i<primaryGeometry.attributes.position.count;i++){
  const p=primaryGeometry.attributes.position,z=p.getZ(i),x=p.getX(i);
  const color=z>.28?blackColor:greyColor;
  // Small pale terminal markings, as on the reference's folded black feathers.
  const c=z>.82&&Math.abs(x)<.55?spotColor:color;
  primaryColors.set([c.r,c.g,c.b],i*3);
}
primaryGeometry.setAttribute('color',new T.BufferAttribute(primaryColors,3));
const primaryMaterial=new T.MeshStandardMaterial({vertexColors:true,roughness:.9});

export type BirdRig={head:T.Group;neck:T.Mesh;eyes:T.Mesh[];beak:T.Group;wings:T.Group[];wrists:T.Group[];feathers:T.InstancedMesh[];foldedWings:T.Group[];feet:T.Group[];tail:T.Group;tailFeathers:T.InstancedMesh};
function part(geometry:T.BufferGeometry,material:T.Material,parent:T.Object3D,position:[number,number,number],scale:[number,number,number]=[1,1,1]){
  const m=new T.Mesh(geometry,material);m.position.set(...position);m.scale.set(...scale);m.castShadow=true;parent.add(m);return m;
}
function oval(material:T.Material,parent:T.Object3D,position:[number,number,number],scale:[number,number,number]){return part(sphere,material,parent,position,scale);}
function segment(a:T.Vector3,b:T.Vector3,r:number,material:T.Material,parent:T.Object3D){const m=part(new T.CylinderGeometry(r,r*.86,a.distanceTo(b),7),material,parent,[0,0,0]);m.position.copy(a).add(b).multiplyScalar(.5);m.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),b.clone().sub(a).normalize());return m;}
function mergeStatic(group:T.Group){
  const parts=group.children.filter((o):o is T.Mesh=>o instanceof T.Mesh&&!Array.isArray(o.material)&&!o.userData.animated);
  for(const material of new Set(parts.map(p=>p.material))){
    const batch=parts.filter(p=>p.material===material);if(batch.length<2)continue;
    const geometries=batch.map(p=>{p.updateMatrix();return (p.geometry.index?p.geometry.toNonIndexed():p.geometry.clone()).applyMatrix4(p.matrix);});
    const merged=mergeGeometries(geometries,false);for(const g of geometries)g.dispose();
    if(merged){for(const p of batch)p.removeFromParent();const mesh=new T.Mesh(merged,material);mesh.castShadow=true;group.add(mesh);}
  }
}
function flightWing(side:number){
  const wing=new T.Group();wing.position.set(side*.17,.1,-.035);
  const shape=new T.Shape();shape.moveTo(0,.055);shape.quadraticCurveTo(side*.25,.22,side*.52,.11);shape.quadraticCurveTo(side*.72,.06,side*.64,-.13);shape.quadraticCurveTo(side*.34,-.24,0,-.15);shape.closePath();
  const surface=part(new T.ExtrudeGeometry(shape,{depth:.018,bevelEnabled:true,bevelSize:.026,bevelThickness:.012,bevelSegments:2,curveSegments:8,steps:1}),breast,wing,[0,0,0]);surface.rotation.x=-Math.PI/2;
  // Overlapping secondaries create visible feather edges without a texture map.
  for(let n=0;n<5;n++){const feather=part(featherGeometry,n%2?featherLight:mantle,wing,[side*(.15+n*.089),.026,.105+n*.008],[.069,.022,.15]);feather.rotation.y=-side*.18;}
  const wrist=new T.Group();wrist.position.set(side*.56,.012,.04);wing.add(wrist);
  const tips=new T.InstancedMesh(primaryGeometry,primaryMaterial,6);tips.name='dark-tipped-flight-feathers';tips.frustumCulled=false;tips.castShadow=true;wrist.add(tips);mergeStatic(wing);
  return {wing,wrist,tips};
}
function foldedWing(side:number){
  const g=new T.Group();g.name='layered-folded-wing';g.position.set(side*.196,.065,.055);
  const cover=oval(mantle,g,[side*.018,.018,.025],[.088,.166,.32]);cover.rotation.x=-.2;
  const rim=oval(featherShade,g,[side*.031,-.027,.12],[.072,.108,.27]);rim.rotation.x=-.22;
  // Narrow overlapping lobes follow the teardrop from shoulder down to tail.
  for(let n=0;n<5;n++){
    const feather=oval(n<2?featherLight:mantle,g,[side*(.067-n*.006),.052-n*.04,.005+n*.052],[.035,.065,.225-n*.012]);
    feather.rotation.x=-.28-n*.055;
  }
  oval(featherLight,g,[side*.075,.083,-.065],[.028,.057,.175]).rotation.x=-.35;
  // Black primaries project beyond the gray cover, each with its own pale spot.
  for(let n=0;n<4;n++){
    const x=side*(.025+n*.013),y=-.075+n*.013,z=.25+n*.018;
    oval(ink,g,[x,y,z],[.022,.023,.16-n*.009]).rotation.y=-side*.08;
    oval(white,g,[x+side*.017,y+.011,z+.1-n*.008],[.009,.009,.024]);
  }
  mergeStatic(g);return g;
}
function foot(x:number){
  const g=new T.Group();g.position.set(x,-.15,-.015);
  segment(new T.Vector3(0,0,0),new T.Vector3(0,-.12,.025),.014,legPink,g);
  oval(footPink,g,[0,-.12,.025],[.02,.023,.021]);
  segment(new T.Vector3(0,-.12,.025),new T.Vector3(0,-.25,-.018),.012,legPink,g);
  const web=new T.Shape();web.moveTo(0,.025);web.lineTo(-.066,-.088);web.quadraticCurveTo(-.035,-.072,-.022,-.115);web.quadraticCurveTo(0,-.091,.023,-.115);web.quadraticCurveTo(.04,-.073,.065,-.085);web.closePath();
  const membrane=part(new T.ExtrudeGeometry(web,{depth:.012,bevelEnabled:true,bevelSize:.006,bevelThickness:.004,bevelSegments:1,steps:1}),footPink,g,[0,-.255,-.015]);membrane.rotation.x=Math.PI/2;
  for(let toe=-1;toe<=1;toe++)segment(new T.Vector3(0,-.255,-.015),new T.Vector3(toe*.055,-.256,-.11+(toe===0?-.015:.012)),.008,legPink,g);
  mergeStatic(g);return g;
}
export function createSeagull(){
  const root=new T.Group();root.name='illustrated-seagull';
  oval(white,root,[0,0,.045],[.23,.235,.39]);
  oval(breast,root,[0,-.075,.035],[.215,.165,.32]);
  oval(white,root,[0,.05,-.18],[.19,.23,.23]);
  oval(mantle,root,[0,.155,.1],[.186,.095,.27]);
  // Continuous breast/neck overlap, with a narrower nape and a round white head.
  const neck=oval(white,root,[0,.255,-.225],[.116,.26,.125]);neck.rotation.x=-.13;neck.userData.animated=true;
  const head=new T.Group();head.position.set(0,.45,-.27);root.add(head);
  oval(white,head,[0,.035,-.035],[.151,.165,.157]);
  const eyes:T.Mesh[]=[];
  for(const side of [-1,1]){
    oval(breast,head,[side*.128,.07,-.1],[.026,.029,.012]);
    const eye=part(eyeGeometry,eyeBlack,head,[side*.144,.071,-.103],[.018,.02,.016]);eye.userData.animated=true;eyes.push(eye);
    oval(white,head,[side*.157,.078,-.109],[.004,.005,.004]);
  }
  // Broad at the face, with a gently drooping point rather than a cone spike.
  const beakCurve=[new T.Vector2(.047,0),new T.Vector2(.044,.04),new T.Vector2(.035,.105),new T.Vector2(.015,.16),new T.Vector2(.002,.18)];
  const upper=part(new T.LatheGeometry(beakCurve,10),beakLight,head,[0,.01,-.166],[.82,1,.64]);upper.rotation.x=-Math.PI/2;
  oval(beakGold,head,[0,-.005,-.303],[.019,.022,.041]);
  const beak=new T.Group();beak.position.set(0,-.017,-.169);head.add(beak);
  const lower=part(new T.LatheGeometry([new T.Vector2(.033,0),new T.Vector2(.031,.045),new T.Vector2(.014,.13),new T.Vector2(.001,.16)],10),beakGold,beak,[0,0,0],[1,1,.45]);lower.rotation.x=-Math.PI/2;
  for(const side of [-1,1]){
    oval(beakSeam,head,[side*.032,-.014,-.216],[.003,.003,.045]);
    oval(beakSeam,head,[side*.033,.015,-.2],[.004,.004,.009]);
  }
  const wings:T.Group[]=[],wrists:T.Group[]=[],feathers:T.InstancedMesh[]=[],foldedWings:T.Group[]=[],feet:T.Group[]=[];
  for(const side of [-1,1]){const flight=flightWing(side);root.add(flight.wing);wings.push(flight.wing);wrists.push(flight.wrist);feathers.push(flight.tips);const folded=foldedWing(side);folded.scale.setScalar(.0001);root.add(folded);foldedWings.push(folded);const leg=foot(side*.084);root.add(leg);feet.push(leg);}
  const tail=new T.Group();tail.position.set(0,-.025,.345);root.add(tail);
  const tailFeathers=new T.InstancedMesh(featherGeometry,white,5);tailFeathers.frustumCulled=false;tailFeathers.castShadow=true;tail.add(tailFeathers);
  mergeStatic(root);mergeStatic(head);mergeStatic(beak);
  const rig:BirdRig={head,neck,eyes,beak,wings,wrists,feathers,foldedWings,feet,tail,tailFeathers};root.userData.rig=rig;root.userData.blend=0;root.userData.calling=false;
  return root;
}
