import * as T from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
const white=new T.MeshStandardMaterial({color:'#f5f1df',roughness:1}),grey=new T.MeshStandardMaterial({color:'#91a8a5',roughness:1,side:T.DoubleSide}),orange=new T.MeshStandardMaterial({color:'#dba654',roughness:1}),dark=new T.MeshStandardMaterial({color:'#354f50',roughness:1});
const bodyGeometry=new T.SphereGeometry(1,12,8),eyeGeometry=new T.SphereGeometry(.025,8,6),featherGeometry=new T.SphereGeometry(1,8,5);
export type BirdRig={head:T.Group;eyes:T.Mesh[];beak:T.Group;wings:T.Group[];wrists:T.Group[];feathers:T.InstancedMesh[];feet:T.Group[];tail:T.Group;tailFeathers:T.InstancedMesh};
function part(geometry:T.BufferGeometry,material:T.Material,parent:T.Object3D,position:[number,number,number],scale:[number,number,number]=[1,1,1]){const m=new T.Mesh(geometry,material);m.position.set(...position);m.scale.set(...scale);parent.add(m);return m;}
function mergeStatic(g:T.Group){for(const material of [white,grey,orange,dark]){const parts=g.children.filter((o):o is T.Mesh=>o instanceof T.Mesh&&o.material===material);if(!parts.length)continue;const geometries=parts.map(part=>{part.updateMatrix();return part.geometry.clone().applyMatrix4(part.matrix);});const geometry=mergeGeometries(geometries,false)!;for(const p of parts)p.removeFromParent();for(const geo of geometries)geo.dispose();g.add(new T.Mesh(geometry,material));}}
function gull(){
  const g=new T.Group();part(bodyGeometry,white,g,[0,0,0],[.24,.22,.42]);part(bodyGeometry,grey,g,[0,.075,.04],[.235,.13,.33]);part(new T.CapsuleGeometry(.12,.1,3,9),white,g,[0,.17,-.21]);
  const head=new T.Group();head.position.set(0,.2,-.2);g.add(head);part(bodyGeometry,white,head,[0,.12,-.1],[.18,.18,.18]);
  const eyes:T.Mesh[]=[];for(const side of [-1,1])eyes.push(part(eyeGeometry,dark,head,[side*.145,.17,-.17]));
  const upper=part(new T.ConeGeometry(.045,.22,9),orange,head,[0,.1,-.34]);upper.rotation.x=-Math.PI/2;
  const beak=new T.Group();beak.position.set(0,.075,-.23);head.add(beak);const lower=part(new T.ConeGeometry(.032,.2,8),orange,beak,[0,-.01,-.09]);lower.rotation.x=-Math.PI/2;
  const feet:T.Group[]=[];for(const x of [-.09,.09]){const foot=new T.Group();foot.position.set(x,-.17,0);g.add(foot);part(new T.CylinderGeometry(.015,.019,.16,6),orange,foot,[0,-.08,0]);for(let toe=0;toe<3;toe++){const t=part(new T.CapsuleGeometry(.012,.09,2,5),orange,foot,[(toe-1)*.023,-.165,-.03]);t.rotation.x=Math.PI/2;t.rotation.z=(toe-1)*.3;}mergeStatic(foot);feet.push(foot);}
  const wings:T.Group[]=[],wrists:T.Group[]=[],feathers:T.InstancedMesh[]=[];
  for(const side of [-1,1]){
    const wing=new T.Group();wing.position.set(side*.15,.055,.02);g.add(wing);
    const shape=new T.Shape();shape.moveTo(0,0);shape.quadraticCurveTo(side*.44,.25,side*.67,.08);shape.lineTo(side*.53,-.18);shape.lineTo(0,-.12);
    const shoulder=part(new T.ExtrudeGeometry(shape,{depth:.026,bevelEnabled:true,bevelSize:.018,bevelThickness:.012,bevelSegments:1,steps:1}),grey,wing,[0,0,0]);shoulder.rotation.x=-Math.PI/2;
    const wrist=new T.Group();wrist.position.set(side*.55,0,.02);wing.add(wrist);const tips=new T.InstancedMesh(featherGeometry,grey,6);wrist.add(tips);wings.push(wing);wrists.push(wrist);feathers.push(tips);tips.frustumCulled=false;
  }
  const tail=new T.Group();tail.position.set(0,-.025,.34);g.add(tail);const tailFeathers=new T.InstancedMesh(featherGeometry,white,5);tailFeathers.frustumCulled=false;tail.add(tailFeathers);
  mergeStatic(g);const rig:BirdRig={head,eyes,beak,wings,wrists,feathers,feet,tail,tailFeathers};g.userData.rig=rig;g.userData.blend=0;g.userData.calling=false;return g;
}
export function flightHeading(angle:number){return Math.atan2(-Math.cos(angle),Math.sin(angle));}
const angleDelta=(a:number,b:number)=>Math.atan2(Math.sin(a-b),Math.cos(a-b));
export class Seabirds {
  birds:T.Group[]=[];perchBlend=0;onChirp:((near:boolean)=>void)|null=null;dummy=new T.Object3D();
  constructor(scene:T.Scene){for(let j=0;j<9;j++){const b=gull();b.userData.size=j<2?.75:.6;b.scale.setScalar(b.userData.size);scene.add(b);this.birds.push(b);}}
  update(time:number,dt:number,boat:T.Group,speed:number,storm:number,reduced:boolean,observer?:T.Vector3,low=false){
    const firstRest=Math.abs(speed)<1.4&&storm<.25&&(time%95>18&&time%95<72);this.perchBlend=T.MathUtils.damp(this.perchBlend,firstRest?1:0,1.1,dt);boat.updateMatrixWorld();
    for(const [j,b]of this.birds.entries()){
      b.visible=!low||j<6;if(!b.visible)continue;const rig=b.userData.rig as BirdRig;
      const a=time*(.12+j*.008)+j*1.8,r=12+j*2.8,target=new T.Vector3(boat.position.x+Math.sin(a)*r,8+(j%3)*4+Math.sin(a*2)*1.3,boat.position.z+Math.cos(a)*r);
      const phase=(time+j*12)%95,wantsRest=j<2&&Math.abs(speed)<1.4&&storm<.25&&phase>18&&phase<72;
      let blend=j===0?this.perchBlend:T.MathUtils.damp(b.userData.blend,wantsRest?1:0,1.1,dt);b.userData.blend=blend;
      const wasPerched=b.userData.behaviour==='perched';b.userData.behaviour=blend>.94?'perched':blend>.05?(wantsRest?'landing':'taking-off'):'flying';
      if(j<2){const perch=boat.localToWorld(new T.Vector3(j===0?-1.5:1.4,1.36,j===0?1.8:-1.65));target.lerp(perch,blend);}
      const previous=b.position.clone();b.position.lerp(target,Math.min(1,dt*4));const velocity=b.position.clone().sub(previous);
      const forward=velocity.lengthSq()>.000001?Math.atan2(-velocity.x,-velocity.z):flightHeading(a);
      const desiredHeading=blend>.9?boat.rotation.y+.4:forward;b.rotation.y+=angleDelta(desiredHeading,b.rotation.y)*Math.min(1,dt*9);
      b.rotation.z=reduced?0:T.MathUtils.lerp(-.14+Math.sin(time*.9+j)*.025,-boat.rotation.z*.7,blend);b.rotation.x=reduced?0:T.MathUtils.lerp(Math.sin(a*2)*.035,-boat.rotation.x*.6,blend);
      if(blend>.98)b.scale.y=b.userData.size*(1+(reduced?0:Math.sin(time*2.3+j)*.012));else b.scale.y=b.userData.size;
      const glide=(time*.48+j*1.7)%5.5<2.5&&blend<.08,landing=blend>.08&&blend<.9;
      const flap=reduced?0:Math.sin(time*(landing?8:6.5)+j)*(glide?.055:landing?.68:.5)*(1-blend);
      for(let sideIndex=0;sideIndex<2;sideIndex++){
        const side=sideIndex===0?-1:1,wing=rig.wings[sideIndex];wing.rotation.z=T.MathUtils.damp(wing.rotation.z,side*(flap+.08*(1-blend)),10,dt);wing.rotation.y=T.MathUtils.damp(wing.rotation.y,-side*1.25*blend,9,dt);rig.wrists[sideIndex].rotation.y=side*(.12+blend*.4);rig.wrists[sideIndex].rotation.z=side*flap*.32;
        const tips=rig.feathers[sideIndex];tips.visible=!low||j<2;for(let n=0;n<6;n++){this.dummy.position.set(side*(.07+n*.067),.012,.05+n*.015);this.dummy.rotation.set(0,side*(n-2.5)*(.06+(landing?.08:glide?.03:.02))*(1-blend*.8),0);this.dummy.scale.set(.052,.016,.23+(n%3)*.025);this.dummy.updateMatrix();tips.setMatrixAt(n,this.dummy.matrix);}tips.instanceMatrix.needsUpdate=true;
      }
      const preen=blend>.98&&(time+j*8)%43>34&&(time+j*8)%43<37;
      const scan=(time+j*2.1)%18;let yaw=scan<4?0:scan<7?-.55:scan<10?.48:scan<14?.08:-.22;
      if(observer&&blend>.9&&observer.distanceTo(b.position)<7){const dx=observer.x-b.position.x,dz=observer.z-b.position.z;yaw=T.MathUtils.clamp(angleDelta(Math.atan2(-dx,-dz),b.rotation.y),-.9,.9);}
      rig.head.rotation.y=T.MathUtils.damp(rig.head.rotation.y,reduced?0:preen?1.7:yaw*blend,7,dt);rig.head.rotation.x=T.MathUtils.damp(rig.head.rotation.x,reduced?0:preen?.8:Math.sin(time*.8+j)*.07*blend,7,dt);
      const blink=!reduced&&(time+j*.73)%5.3<.12;for(const eye of rig.eyes)eye.scale.y=blink?.08:1;
      const calling=blend>.98&&(time+j*3.6)%23.5<.42;if(calling&&!b.userData.calling)this.onChirp?.(true);b.userData.calling=calling;rig.beak.rotation.x=calling?-.22*(.7+Math.sin(time*31)*.3):0;
      const shuffle=!reduced&&blend>.98&&(time+j*4)%29>8&&(time+j*4)%29<9;
      for(let foot=0;foot<2;foot++)rig.feet[foot].rotation.x=T.MathUtils.damp(rig.feet[foot].rotation.x,blend<.25?1.1:shuffle?Math.sin(time*16+foot*Math.PI)*.4:0,10,dt);
      rig.tail.rotation.x=reduced?0:landing?-.28:Math.sin(time*.9+j)*.04;
      for(let n=0;n<5;n++){this.dummy.position.set((n-2)*.037,0,.15);this.dummy.rotation.set(0,(n-2)*(landing?.16:.07),0);this.dummy.scale.set(.05,.018,.23);this.dummy.updateMatrix();rig.tailFeathers.setMatrixAt(n,this.dummy.matrix);}rig.tailFeathers.instanceMatrix.needsUpdate=true;
      if(wasPerched&&blend<.9)rig.head.rotation.y*=.8;
    }
  }
}