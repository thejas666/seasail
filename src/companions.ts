import * as T from 'three';
import {createAnimatedGull,poseGull,type BirdRig} from './assets/animated-gull';
import {BirdBehavior,BIRD_PERCHES} from './systems/bird-behavior';
export {BIRD_PERCHES};
export type {BirdRig} from './assets/animated-gull';
export function flightHeading(angle:number){return Math.atan2(-Math.cos(angle),Math.sin(angle));}
const angleDelta=(a:number,b:number)=>Math.atan2(Math.sin(a-b),Math.cos(a-b));
export class Seabirds {
  birds:T.Group[]=[];perchBlend=0;onChirp:((near:boolean)=>void)|null=null;behavior:BirdBehavior;
  constructor(scene:T.Scene,seed?:number){this.behavior=new BirdBehavior(9,seed);for(const state of this.behavior.birds){const b=createAnimatedGull();b.userData.size=state.size;b.scale.setScalar(state.size);scene.add(b);this.birds.push(b);}}
  update(time:number,dt:number,boat:T.Group,speed:number,storm:number,reduced:boolean,observer?:T.Vector3,low=false){
    this.behavior.update(dt,boat,speed,storm,low?6:9);this.perchBlend=0;
    for(const [j,b]of this.birds.entries()){
      const state=this.behavior.birds[j],blend=state.perch,rig=b.userData.rig as BirdRig;b.visible=!low||j<6||blend>.05;if(!b.visible)continue;
      const previous=b.position.clone();b.position.copy(state.position);const velocity=b.position.clone().sub(previous);b.userData.behaviour=state.mode==='roaming'||state.mode==='passing'?'flying':state.mode;b.userData.perchIndex=state.slot;this.perchBlend=Math.max(this.perchBlend,blend);
      const desiredHeading=blend>.94?boat.rotation.y+Math.sin(state.phase)*.7:state.heading;b.rotation.y+=angleDelta(desiredHeading,b.rotation.y)*Math.min(1,dt*9);
      const turn=angleDelta(state.heading,b.userData.previousHeading??state.heading)/Math.max(.001,dt);b.userData.previousHeading=state.heading;const bank=T.MathUtils.clamp(-Math.atan2(velocity.length()/Math.max(.001,dt)*T.MathUtils.clamp(turn,-.6,.6),9.81),-.28,.28);
      b.rotation.z=reduced?0:T.MathUtils.damp(b.rotation.z,T.MathUtils.lerp(bank,boat.rotation.z,blend),8,dt);b.rotation.x=reduced?0:T.MathUtils.lerp(Math.sin(time*.8+state.phase)*.018,boat.rotation.x,blend)+Math.sin(blend*Math.PI)*.18;
      b.scale.y=state.size*(1+(blend>.985&&!reduced?Math.sin(time*2.3+state.phase)*.006:0));
      let yaw=state.yaw;if(observer&&blend>.94&&observer.distanceTo(b.position)<6){const dx=observer.x-b.position.x,dz=observer.z-b.position.z;yaw=T.MathUtils.clamp(angleDelta(Math.atan2(-dx,-dz),b.rotation.y),-.75,.75);}
      const calling=state.mode==='perched'&&this.behavior.elapsed<state.callUntil;if(calling&&!b.userData.calling)this.onChirp?.(true);b.userData.calling=calling;
      poseGull(rig,{time:time+state.phase,dt,perch:blend,glide:state.glide&&state.mode!=='landing'&&state.mode!=='departing',landing:state.mode==='landing'||state.mode==='departing',yaw,pitch:state.pitch,calling,shuffle:state.mode==='perched'&&this.behavior.elapsed<state.shuffleUntil,reduced});
    }
  }
}
