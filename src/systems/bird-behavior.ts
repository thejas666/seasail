import * as T from 'three';
import {MAP} from '../data';

export const BIRD_PERCHES=[new T.Vector3(-.98,1.411,1.75),new T.Vector3(.48,2.091,-1.9)];
export type BirdMode='roaming'|'passing'|'approaching'|'landing'|'perched'|'departing';
export type BirdMotion={mode:BirdMode;position:T.Vector3;velocity:T.Vector3;target:T.Vector3;home:T.Vector3;homeRadius:number;age:number;waypointAt:number;slot:number;perch:number;restUntil:number;cooldownUntil:number;start:T.Vector3;control:T.Vector3;exit:T.Vector3;transitionDuration:number;heading:number;phase:number;size:number;glide:boolean;styleUntil:number;yaw:number;pitch:number;lookUntil:number;callUntil:number;nextCall:number;shuffleUntil:number;nextShuffle:number;relocateAt:number};

// Bird routes and visits use independent event timers, not a shared orbit or a
// modulo-time perch schedule. A seed makes long behavior simulations testable.
export class BirdBehavior {
  birds:BirdMotion[]=[];elapsed=0;nextEncounter=0;quietUntil=0;idle=0;lastVisitor=-1;initialized=false;randomState:number;
  constructor(count=9,seed=Math.floor(Math.random()*0xffffffff)){this.randomState=seed||1;for(let n=0;n<count;n++)this.birds.push({mode:'roaming',position:new T.Vector3(),velocity:new T.Vector3(),target:new T.Vector3(),home:new T.Vector3(),homeRadius:33,age:0,waypointAt:0,slot:-1,perch:0,restUntil:0,cooldownUntil:0,start:new T.Vector3(),control:new T.Vector3(),exit:new T.Vector3(),transitionDuration:3,heading:0,phase:this.range(0,90),size:this.range(.38,.51),glide:this.random()<.5,styleUntil:this.range(2,7),yaw:0,pitch:0,lookUntil:this.range(1,5),callUntil:0,nextCall:this.range(15,60),shuffleUntil:0,nextShuffle:this.range(10,25),relocateAt:this.range(40,110)});this.nextEncounter=this.range(25,65);}
  random(){let x=this.randomState;x^=x<<13;x^=x>>>17;x^=x<<5;this.randomState=x>>>0;return this.randomState/4294967296;}
  range(min:number,max:number){return min+this.random()*(max-min);}
  coast(b:BirdMotion,boat:T.Group){const island=MAP.islands.reduce((best,i)=>Math.hypot(i.x-boat.position.x,i.z-boat.position.z)<Math.hypot(best.x-boat.position.x,best.z-boat.position.z)?i:best);b.home.set(island.x,0,island.z);b.homeRadius=island.radius;}
  waypoint(b:BirdMotion,awayFrom?:T.Vector3){
    const angle=this.range(0,Math.PI*2),radius=b.homeRadius+this.range(20,85);b.target.set(b.home.x+Math.cos(angle)*radius,this.range(8,22),b.home.z+Math.sin(angle)*radius);
    if(awayFrom){const outward=b.position.clone().sub(awayFrom);outward.y=0;if(outward.lengthSq()<1)outward.set(Math.cos(angle),0,Math.sin(angle));outward.normalize();b.target.copy(b.position).addScaledVector(outward,this.range(65,130));b.target.y=this.range(10,20);}
    b.waypointAt=this.elapsed+this.range(12,26);
  }
  initialize(boat:T.Group){for(const b of this.birds){this.coast(b,boat);this.waypoint(b);b.position.copy(b.target);this.waypoint(b);b.velocity.copy(b.target).sub(b.position).normalize().multiplyScalar(this.range(3.6,6.2));b.heading=Math.atan2(-b.velocity.x,-b.velocity.z);}this.initialized=true;}
  depart(b:BirdMotion,boat:T.Group){
    b.mode='departing';b.age=0;b.start.copy(b.position);b.transitionDuration=this.range(2,3);const angle=this.range(0,Math.PI*2);
    b.exit.copy(b.position).add(new T.Vector3(Math.sin(angle)*this.range(10,17),this.range(5,8),Math.cos(angle)*this.range(10,17)));b.cooldownUntil=this.elapsed+this.range(160,300);this.quietUntil=Math.max(this.quietUntil,this.elapsed+this.range(75,145));b.slot=-1;
    b.control.copy(b.start).lerp(b.exit,.25);b.control.y+=1.3;this.waypoint(b,boat.position);
  }
  encounter(boat:T.Group,speed:number,storm:number,active:number){
    this.nextEncounter=this.elapsed+this.range(50,135);
    if(storm>.3||this.birds.some(b=>b.mode==='approaching'||b.mode==='landing'||b.mode==='perched'||b.mode==='departing'))return;
    const candidates=this.birds.map((b,index)=>({b,index})).filter(({b,index})=>index<active&&index!==this.lastVisitor&&b.mode==='roaming'&&this.elapsed>b.cooldownUntil&&b.position.distanceTo(boat.position)<210);
    if(!candidates.length)return;const {b,index}=candidates[Math.floor(this.random()*candidates.length)];this.lastVisitor=index;b.age=0;b.cooldownUntil=this.elapsed+this.range(100,200);
    if(this.elapsed>this.quietUntil&&this.idle>12&&Math.abs(speed)<.8&&storm<.2&&this.random()<.42){b.mode='approaching';b.slot=this.random()<.5?0:1;}
    else{b.mode='passing';const angle=this.range(0,Math.PI*2),distance=this.range(16,32);b.target.copy(boat.position).add(new T.Vector3(Math.sin(angle)*distance,this.range(7,13),Math.cos(angle)*distance));}
  }
  steer(b:BirdMotion,dt:number,boat:T.Group){
    const desired=b.target.clone().sub(b.position),distance=desired.length();desired.normalize().multiplyScalar(b.mode==='approaching'?T.MathUtils.clamp(distance*.6,1.3,5.5):4.4+Math.sin(b.phase)*1.3);
    if(b.mode==='roaming'){
      for(const other of this.birds){if(other===b)continue;const delta=b.position.clone().sub(other.position),d=delta.length();if(d>0&&d<4)desired.addScaledVector(delta,(4-d)/d);}
      const away=b.position.clone().sub(boat.position);away.y=0;if(away.length()<12&&b.position.y<11)desired.add(away.normalize().multiplyScalar(3));
    }
    if((b.mode==='roaming'||b.mode==='approaching'&&distance>14)&&Math.hypot(b.position.x-b.home.x,b.position.z-b.home.z)<b.homeRadius+8)desired.y=Math.max(desired.y,(21-b.position.y)*1.2);
    b.velocity.lerp(desired,1-Math.exp(-dt*(b.mode==='approaching'?2.2:.8)));b.position.addScaledVector(b.velocity,dt);
  }
  update(dt:number,boat:T.Group,speed:number,storm:number,active=this.birds.length){
    dt=Math.min(.2,Math.max(0,dt));if(!this.initialized)this.initialize(boat);this.elapsed+=dt;boat.updateMatrixWorld(true);this.idle=Math.abs(speed)<.8&&storm<.2?this.idle+dt:0;
    if(this.elapsed>=this.nextEncounter)this.encounter(boat,speed,storm,active);
    for(const b of this.birds){
      b.age+=dt;const previous=b.position.clone();
      if((b.mode==='approaching'||b.mode==='landing'||b.mode==='perched')&&(Math.abs(speed)>1.5||storm>.25))this.depart(b,boat);
      if(b.mode==='roaming'||b.mode==='passing'||b.mode==='approaching'){
        if(b.mode==='approaching'){
          const local=BIRD_PERCHES[b.slot].clone();local.y+=4.2;local.z+=b.slot===0?8:-8;b.target.copy(boat.localToWorld(local));
          if(b.position.distanceTo(b.target)<2.5){b.mode='landing';b.age=0;b.start.copy(b.position);b.control.copy(b.velocity).multiplyScalar(.65).add(b.position);b.transitionDuration=this.range(2.5,3.8);}
          else if(b.age>35)this.depart(b,boat);
        }else if(b.position.distanceTo(b.target)<5||this.elapsed>b.waypointAt&&b.mode==='roaming'||b.mode==='passing'&&b.age>24){const passing=b.mode==='passing';b.mode='roaming';b.age=0;this.waypoint(b,passing?boat.position:undefined);}
        if(b.mode==='roaming'||b.mode==='passing'||b.mode==='approaching')this.steer(b,dt,boat);
        b.perch=T.MathUtils.damp(b.perch,0,4,dt);
      }
      if(b.mode==='landing'){
        const t=T.MathUtils.clamp(b.age/b.transitionDuration,0,1),end=boat.localToWorld(BIRD_PERCHES[b.slot].clone()),approach=end.clone().add(new T.Vector3(0,1.2,b.slot===0?1.8:-1.8).applyAxisAngle(new T.Vector3(0,1,0),boat.rotation.y));
        b.position.copy(b.start).multiplyScalar((1-t)**3).addScaledVector(b.control,3*(1-t)**2*t).addScaledVector(approach,3*(1-t)*t*t).addScaledVector(end,t*t*t);b.perch=T.MathUtils.smoothstep(t,.15,1);
        if(t===1){b.mode='perched';b.age=0;b.perch=1;b.restUntil=this.elapsed+this.range(9,26);}
      }else if(b.mode==='perched'){
        b.position.copy(boat.localToWorld(BIRD_PERCHES[b.slot].clone()));b.perch=1;b.velocity.set(0,0,0);if(this.elapsed>b.restUntil)this.depart(b,boat);
      }else if(b.mode==='departing'){
        const t=T.MathUtils.clamp(b.age/b.transitionDuration,0,1),p=T.MathUtils.smoothstep(t,0,1);b.position.copy(b.start).lerp(b.exit,p);b.perch=1-T.MathUtils.smoothstep(t,0,.85);
        if(t===1){b.mode='roaming';b.age=0;b.velocity.copy(b.exit).sub(b.start).normalize().multiplyScalar(5);this.waypoint(b,boat.position);}
      }
      if(b.mode!=='perched'){const measured=b.position.clone().sub(previous);if(measured.lengthSq()>1e-8)b.heading=Math.atan2(-measured.x,-measured.z);}
      if(this.elapsed>b.styleUntil){b.glide=!b.glide;b.styleUntil=this.elapsed+(b.glide?this.range(2.5,7):this.range(3,8));}
      if(this.elapsed>b.lookUntil){b.yaw=this.range(-.65,.65);b.pitch=this.range(-.08,.1);b.lookUntil=this.elapsed+this.range(1.5,5.5);}
      if(this.elapsed>b.nextCall){b.callUntil=this.elapsed+.35;b.nextCall=this.elapsed+this.range(22,65);}
      if(this.elapsed>b.nextShuffle){b.shuffleUntil=this.elapsed+.6;b.nextShuffle=this.elapsed+this.range(12,28);}
      if(b.mode==='roaming'&&this.elapsed>b.relocateAt){b.relocateAt=this.elapsed+this.range(40,110);if(b.position.distanceTo(boat.position)>400){this.coast(b,boat);const angle=this.range(0,Math.PI*2);b.position.copy(boat.position).add(new T.Vector3(Math.sin(angle)*220,this.range(12,24),Math.cos(angle)*220));this.waypoint(b);}}
    }
  }
}
