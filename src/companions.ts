import * as T from 'three';
import {createSeagull,type BirdRig} from './seagull-model';
export type {BirdRig} from './seagull-model';
export function flightHeading(angle:number){return Math.atan2(-Math.cos(angle),Math.sin(angle));}
const angleDelta=(a:number,b:number)=>Math.atan2(Math.sin(a-b),Math.cos(a-b));
export class Seabirds {
  birds:T.Group[]=[];perchBlend=0;onChirp:((near:boolean)=>void)|null=null;dummy=new T.Object3D();
  constructor(scene:T.Scene){for(let j=0;j<9;j++){const b=createSeagull();b.userData.size=j<2?.75:.6;b.scale.setScalar(b.userData.size);scene.add(b);this.birds.push(b);}}
  update(time:number,dt:number,boat:T.Group,speed:number,storm:number,reduced:boolean,observer?:T.Vector3,low=false){
    const firstRest=Math.abs(speed)<1.4&&storm<.25&&(time%95>18&&time%95<72);this.perchBlend=T.MathUtils.damp(this.perchBlend,firstRest?1:0,1.1,dt);boat.updateMatrixWorld();
    for(const [j,b]of this.birds.entries()){
      b.visible=!low||j<6;if(!b.visible)continue;const rig=b.userData.rig as BirdRig;
      const a=time*(.12+j*.008)+j*1.8,r=12+j*2.8,target=new T.Vector3(boat.position.x+Math.sin(a)*r,8+(j%3)*4+Math.sin(a*2)*1.3,boat.position.z+Math.cos(a)*r);
      const phase=(time+j*12)%95,wantsRest=j<2&&Math.abs(speed)<1.4&&storm<.25&&phase>18&&phase<72;
      let blend=j===0?this.perchBlend:T.MathUtils.damp(b.userData.blend,wantsRest?1:0,1.1,dt);b.userData.blend=blend;
      const wasPerched=b.userData.behaviour==='perched';b.userData.behaviour=blend>.94?'perched':blend>.05?(wantsRest?'landing':'taking-off'):'flying';
      if(j<2){const perch=boat.localToWorld(new T.Vector3(j===0?-1.5:1.4,1.415,j===0?1.8:-1.65));target.lerp(perch,blend);}
      const previous=b.position.clone();b.position.lerp(target,Math.min(1,dt*4));const velocity=b.position.clone().sub(previous);
      const forward=velocity.lengthSq()>.000001?Math.atan2(-velocity.x,-velocity.z):flightHeading(a);
      const desiredHeading=blend>.9?boat.rotation.y+.4:forward;b.rotation.y+=angleDelta(desiredHeading,b.rotation.y)*Math.min(1,dt*9);
      b.rotation.z=reduced?0:T.MathUtils.lerp(-.14+Math.sin(time*.9+j)*.025,-boat.rotation.z*.7,blend);b.rotation.x=reduced?0:T.MathUtils.lerp(Math.sin(a*2)*.035,-boat.rotation.x*.6,blend);
      if(blend>.98)b.scale.y=b.userData.size*(1+(reduced?0:Math.sin(time*2.3+j)*.012));else b.scale.y=b.userData.size;
      const glide=(time*.48+j*1.7)%5.5<2.5&&blend<.08,landing=blend>.08&&blend<.9;
      const flap=reduced?0:Math.sin(time*(landing?8:6.5)+j)*(glide?.055:landing?.68:.5)*(1-blend);
      const fold=T.MathUtils.smoothstep(blend,.35,.96);
      rig.head.position.y=T.MathUtils.lerp(.2,.45,blend);rig.head.position.z=T.MathUtils.lerp(-.4,-.27,blend);
      rig.neck.scale.y=T.MathUtils.lerp(.15,.26,blend);rig.neck.position.y=T.MathUtils.lerp(.14,.255,blend);rig.neck.position.z=T.MathUtils.lerp(-.285,-.225,blend);
      for(let sideIndex=0;sideIndex<2;sideIndex++){
        const side=sideIndex===0?-1:1,wing=rig.wings[sideIndex];wing.rotation.z=T.MathUtils.damp(wing.rotation.z,side*(flap+.08*(1-blend)),10,dt);wing.rotation.y=T.MathUtils.damp(wing.rotation.y,-side*1.25*blend,9,dt);rig.wrists[sideIndex].rotation.y=side*(.12+blend*.4);rig.wrists[sideIndex].rotation.z=side*flap*.32;
        wing.scale.set(1-fold*.98,1-fold*.9,1-fold*.7);wing.visible=fold<.995;
        rig.foldedWings[sideIndex].scale.setScalar(Math.max(.0001,fold));rig.foldedWings[sideIndex].visible=fold>.005;
        const tips=rig.feathers[sideIndex];tips.visible=!low||j<2;for(let n=0;n<6;n++){this.dummy.position.set(side*(.025+n*.064),.012,.07+n*.028);this.dummy.rotation.set(0,side*(-.72+n*.12+(landing?(n-2.5)*.07:0)),0);this.dummy.scale.set(.056,.018,.27+(n<3?n*.022:(5-n)*.018));this.dummy.updateMatrix();tips.setMatrixAt(n,this.dummy.matrix);}tips.instanceMatrix.needsUpdate=true;
      }
      const preen=blend>.98&&(time+j*8)%43>34&&(time+j*8)%43<37;
      const scan=(time+j*2.1)%18;let yaw=scan<4?0:scan<7?-.55:scan<10?.48:scan<14?.08:-.22;
      if(observer&&blend>.9&&observer.distanceTo(b.position)<7){const dx=observer.x-b.position.x,dz=observer.z-b.position.z;yaw=T.MathUtils.clamp(angleDelta(Math.atan2(-dx,-dz),b.rotation.y),-.9,.9);}
      rig.head.rotation.y=T.MathUtils.damp(rig.head.rotation.y,reduced?0:preen?1.7:yaw*blend,7,dt);rig.head.rotation.x=T.MathUtils.damp(rig.head.rotation.x,reduced?0:preen?.8:Math.sin(time*.8+j)*.07*blend,7,dt);
      const blink=!reduced&&(time+j*.73)%5.3<.12;for(const eye of rig.eyes)eye.scale.y=blink?.0016:.02;
      const calling=blend>.98&&(time+j*3.6)%23.5<.42;if(calling&&!b.userData.calling)this.onChirp?.(true);b.userData.calling=calling;rig.beak.rotation.x=calling?-.22*(.7+Math.sin(time*31)*.3):0;
      const shuffle=!reduced&&blend>.98&&(time+j*4)%29>8&&(time+j*4)%29<9;
      for(let foot=0;foot<2;foot++)rig.feet[foot].rotation.x=T.MathUtils.damp(rig.feet[foot].rotation.x,blend<.25?-1.25:shuffle?Math.sin(time*16+foot*Math.PI)*.4:0,10,dt);
      rig.tail.rotation.x=reduced?0:landing?-.28:Math.sin(time*.9+j)*.04;
      for(let n=0;n<5;n++){this.dummy.position.set((n-2)*.037,0,.09);this.dummy.rotation.set(0,(n-2)*(landing?.16:.07),0);this.dummy.scale.set(.05,.018,.16);this.dummy.updateMatrix();rig.tailFeathers.setMatrixAt(n,this.dummy.matrix);}rig.tailFeathers.instanceMatrix.needsUpdate=true;
      if(wasPerched&&blend<.9)rig.head.rotation.y*=.8;
    }
  }
}
