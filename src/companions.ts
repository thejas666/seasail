import * as T from 'three';
import {createAnimatedGull,poseGull,type BirdRig} from './assets/animated-gull';
export type {BirdRig} from './assets/animated-gull';

// The feet are the model origin. These points sit on the stern bench and roof.
export const BIRD_PERCHES=[new T.Vector3(-.98,1.411,1.75),new T.Vector3(.48,2.091,-1.9)];
export function flightHeading(angle:number){return Math.atan2(-Math.cos(angle),Math.sin(angle));}
const angleDelta=(a:number,b:number)=>Math.atan2(Math.sin(a-b),Math.cos(a-b));
export class Seabirds {
  birds:T.Group[]=[];perchBlend=0;onChirp:((near:boolean)=>void)|null=null;
  constructor(scene:T.Scene){for(let j=0;j<9;j++){const b=createAnimatedGull();b.userData.size=j<2?.53:.4;b.scale.setScalar(b.userData.size);scene.add(b);this.birds.push(b);}}
  update(time:number,dt:number,boat:T.Group,speed:number,storm:number,reduced:boolean,observer?:T.Vector3,low=false){
    const firstRest=Math.abs(speed)<1.4&&storm<.25&&(time%95>18&&time%95<72);this.perchBlend=T.MathUtils.damp(this.perchBlend,firstRest?1:0,1.1,dt);boat.updateMatrixWorld();
    for(const [j,b]of this.birds.entries()){
      b.visible=!low||j<6;if(!b.visible)continue;const rig=b.userData.rig as BirdRig;
      const a=time*(.17+j*.008)+j*1.8,r=16+j*3.5+Math.sin(time*.3+j)*.8,target=new T.Vector3(boat.position.x+Math.sin(a)*r,8+(j%3)*4+Math.sin(a*2)*1.3,boat.position.z+Math.cos(a)*r*.85);
      const phase=(time+j*12)%95,wantsRest=j<2&&Math.abs(speed)<1.4&&storm<.25&&phase>18&&phase<72;
      const blend=j===0?this.perchBlend:T.MathUtils.damp(b.userData.blend,wantsRest?1:0,1.1,dt);b.userData.blend=blend;
      b.userData.behaviour=blend>.985?'perched':blend>.05?(wantsRest?'landing':'taking-off'):'flying';
      if(j<2)target.lerp(boat.localToWorld(BIRD_PERCHES[j].clone()),blend>.995?1:blend);
      if(!b.userData.initialized){b.position.copy(target);b.userData.initialized=true;}
      const previous=b.position.clone();if(blend>.995)b.position.copy(target);else b.position.lerp(target,Math.min(1,dt*4));const velocity=b.position.clone().sub(previous);
      const forward=velocity.lengthSq()>.000001?Math.atan2(-velocity.x,-velocity.z):flightHeading(a);
      const desiredHeading=blend>.94?boat.rotation.y+.4:forward;b.rotation.y+=angleDelta(desiredHeading,b.rotation.y)*Math.min(1,dt*9);
      const turn=angleDelta(forward,b.userData.previousHeading??forward)/Math.max(.001,dt);b.userData.previousHeading=forward;const bank=T.MathUtils.clamp(-Math.atan2(velocity.length()/Math.max(.001,dt)*T.MathUtils.clamp(turn,-.6,.6),9.81),-.28,.28);
      b.rotation.z=reduced?0:T.MathUtils.damp(b.rotation.z,T.MathUtils.lerp(bank,boat.rotation.z,blend),8,dt);b.rotation.x=reduced?0:T.MathUtils.lerp(Math.sin(a*2)*.035,boat.rotation.x,blend)+Math.sin(blend*Math.PI)*.18;
      b.scale.y=b.userData.size*(1+(blend>.985&&!reduced?Math.sin(time*2.3+j)*.008:0));
      const glide=(time*.48+j*1.7)%5.5<2.5&&blend<.08,landing=blend>.08&&blend<.985;
      const preen=blend>.985&&(time+j*8)%43>34&&(time+j*8)%43<37,scan=(time+j*2.1)%18;
      let yaw=scan<4?0:scan<7?-.55:scan<10?.48:scan<14?.08:-.22;
      if(observer&&blend>.94&&observer.distanceTo(b.position)<7){const dx=observer.x-b.position.x,dz=observer.z-b.position.z;yaw=T.MathUtils.clamp(angleDelta(Math.atan2(-dx,-dz),b.rotation.y),-.85,.85);}
      const calling=blend>.985&&(time+j*3.6)%23.5<.42;if(calling&&!b.userData.calling)this.onChirp?.(true);b.userData.calling=calling;
      const shuffle=blend>.985&&(time+j*4)%29>8&&(time+j*4)%29<9;
      poseGull(rig,{time:time+j*.73,dt,perch:blend,glide,landing,yaw:preen?1.1:yaw,pitch:preen?.6:Math.sin(time*.8+j)*.07,calling,shuffle,reduced});
    }
  }
}
