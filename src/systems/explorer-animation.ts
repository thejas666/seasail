import * as T from 'three';
import type {ExplorerRig,Limb} from '../explorer-model';
import type {Fishing} from './fishing';
const down=new T.Vector3(0,-1,0),up=new T.Vector3(0,1,0),clamp=T.MathUtils.clamp;
const ease=(x:number)=>{const t=clamp(x,0,1);return t*t*(3-2*t);};
export type ExplorerInput={dt:number;time:number;walkSpeed:number;aboard:boolean;boatRoll:number;boatPitch:number;turn:number;jump:number;fishing:Fishing|null;firstPerson:boolean;reduced:boolean;paused:boolean;tiller:T.Vector3|null;floatTarget:T.Vector3};
export class PickupTimeline {
  age:number|null=null;contactSent=false;
  start(){this.age=0;this.contactSent=false;}
  cancel(){this.age=null;this.contactSent=false;}
  advance(dt:number){let contact=false,finished=false;if(this.age!==null){this.age+=dt;if(this.age>=.48&&!this.contactSent){contact=true;this.contactSent=true;}if(this.age>=1.2){finished=true;this.age=null;}}return {contact,finished};}
}
/** Two-bone aiming keeps wrists and ankles connected to their visible joints. */
export function solveLimb(limb:Limb,targetInRoot:T.Vector3,root:T.Group,pole:T.Vector3,weight=1){
  const parent=limb.upper.parent!;root.updateMatrixWorld(true);const world=root.localToWorld(targetInRoot.clone()),target=parent.worldToLocal(world),origin=limb.upper.position;
  const direction=target.clone().sub(origin),distance=clamp(direction.length(),.015,limb.lengthA+limb.lengthB-.001);direction.normalize();
  const bend=pole.clone().addScaledVector(direction,-pole.dot(direction));if(bend.lengthSq()<.001)bend.set(0,0,1);bend.normalize();
  const cosine=clamp((distance*distance+limb.lengthA**2-limb.lengthB**2)/(2*distance*limb.lengthA),-1,1),sine=Math.sqrt(Math.max(0,1-cosine*cosine));
  const elbow=origin.clone().addScaledVector(direction,cosine*limb.lengthA).addScaledVector(bend,sine*limb.lengthA),end=origin.clone().addScaledVector(direction,distance);
  const qa=new T.Quaternion().setFromUnitVectors(down,elbow.clone().sub(origin).normalize()),qb=new T.Quaternion().setFromUnitVectors(down,end.clone().sub(elbow).normalize());
  limb.upper.quaternion.slerp(qa,weight);limb.lower.quaternion.slerp(qa.clone().invert().multiply(qb),weight);root.updateMatrixWorld(true);
}
export class ExplorerAnimator {
  pickup=new PickupTimeline();castAge=10;reelAge=10;walkPhase=0;walkWeight=0;bodyY=0;pickupHeight=.3;heldCopy:T.Object3D|null=null;
  line:T.Line;linePositions=new Float32Array(24*3);tip=new T.Vector3();bobber=new T.Vector3();reelTarget=new T.Vector3();
  constructor(public rig:ExplorerRig,scene:T.Scene){const geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.BufferAttribute(this.linePositions,3));this.line=new T.Line(geometry,new T.LineBasicMaterial({color:'#e9e3bb',transparent:true,opacity:.8}));this.line.frustumCulled=false;this.line.visible=false;scene.add(this.line);}
  get busy(){return this.pickup.age!==null;}
  startPickup(source:T.Group,height:number){this.cancelPickup();this.pickupHeight=height;this.pickup.start();this.heldCopy=source.clone(true);this.heldCopy.position.set(0,0,.04);this.heldCopy.rotation.set(.2,.1,-.2);this.heldCopy.scale.setScalar(.33);this.heldCopy.traverse(o=>{if(o instanceof T.Mesh&&o.geometry.type==='RingGeometry')o.visible=false;});this.rig.held.add(this.heldCopy);this.rig.held.visible=false;}
  cancelPickup(){this.pickup.cancel();this.rig.held.clear();this.rig.held.visible=false;this.heldCopy=null;}
  cast(){this.castAge=0;this.reelAge=10;}
  reel(){this.reelAge=0;}
  cancelFishing(){this.castAge=this.reelAge=10;this.line.visible=false;this.rig.rod.visible=false;this.rig.fish.visible=false;}
  advance(dt:number){this.castAge+=dt;this.reelAge+=dt;const events=this.pickup.advance(dt);if(events.contact)this.rig.held.visible=true;if(events.finished){this.rig.held.visible=false;this.rig.held.clear();this.heldCopy=null;}return events;}
  update(input:ExplorerInput){
    const r=this.rig,dt=input.paused?0:input.dt,damp=1-Math.exp(-input.dt*12),speed=input.paused?0:input.walkSpeed,action=this.pickup.age;
    this.walkWeight=T.MathUtils.damp(this.walkWeight,!input.aboard&&!input.fishing&&!this.busy?clamp(speed/2.1,0,1):0,10,input.dt);if(speed>.05)this.walkPhase+=dt*(1.25+speed*.32)*Math.PI*2;
    const reach=action===null?0:action<.48?ease(action/.38):1-ease((action-.48)/.35),stow=action===null?0:ease((action-.73)/.3);
    const breath=input.reduced?0:Math.sin(input.time*2.1)*.008,walkingBob=input.reduced?0:Math.cos(this.walkPhase*2)*.012*this.walkWeight;
    const pickupDepth=1-clamp((this.pickupHeight-.35)/.65,0,1)*.55;
    r.pelvis.position.y=T.MathUtils.damp(r.pelvis.position.y,.76-.075*this.walkWeight-.29*reach*pickupDepth+walkingBob,14,input.dt);r.pelvis.rotation.z=input.aboard?-input.boatRoll*.35:Math.sin(this.walkPhase)*.035*this.walkWeight;
    r.torso.rotation.x=T.MathUtils.damp(r.torso.rotation.x,.07*this.walkWeight+.55*reach*pickupDepth-(this.reelAge<1.2?.17*Math.sin(this.reelAge/1.2*Math.PI):0),10,input.dt);r.torso.rotation.y=T.MathUtils.damp(r.torso.rotation.y,input.aboard&&!input.fishing?input.turn*.14:-stow*.18,10,input.dt);r.torso.position.y=.02+breath;
    r.head.rotation.x=T.MathUtils.damp(r.head.rotation.x,reach*.28+(input.fishing?.12:0),8,input.dt);r.head.rotation.y=T.MathUtils.damp(r.head.rotation.y,input.aboard&&!input.fishing?-input.turn*.22:0,8,input.dt);const blink=!input.reduced&&input.time%5.7<.12;for(const [index,eye]of r.eyes.entries())eye.scale.y=blink?.1:index%2===0?1.2:1;
    r.head.visible=!input.firstPerson;r.body.visible=r.backpack.visible=r.belt.visible=!input.firstPerson;r.leftLeg.upper.visible=r.rightLeg.upper.visible=!input.firstPerson;
    const root=r.root;root.updateMatrixWorld(true);
    for(const limb of [r.leftLeg,r.rightLeg]){
      const phase=this.walkPhase+(limb.side<0?0:Math.PI),cycle=((phase/(Math.PI*2))%1+1)%1,stance=cycle<.6,travel=stance?T.MathUtils.lerp(.27,-.27,cycle/.6):T.MathUtils.lerp(-.27,.27,ease((cycle-.6)/.4));
      const lift=stance?0:Math.sin((cycle-.6)/.4*Math.PI)*.16;
      const foot=new T.Vector3(limb.side*(.16+reach*.045),.12+lift*this.walkWeight,travel*this.walkWeight+reach*(limb.side<0?.08:-.05));
      solveLimb(limb,foot,root,new T.Vector3(0,0,1),damp);root.updateMatrixWorld(true);const parentRotation=limb.end.parent!.getWorldQuaternion(new T.Quaternion());const rootRotation=root.getWorldQuaternion(new T.Quaternion());limb.end.quaternion.copy(parentRotation.invert().multiply(rootRotation));limb.end.rotation.x+=(stance?0:-.16*Math.sin(cycle*Math.PI))*this.walkWeight;
    }
    let right=new T.Vector3(.34,.77,Math.sin(this.walkPhase)*.22*this.walkWeight),left=new T.Vector3(-.34,.77,-Math.sin(this.walkPhase)*.22*this.walkWeight);
    if(input.jump>.02){right.set(.4,.96,.15);left.set(-.4,.96,.15);}
    if(action!==null){right.set(.23,T.MathUtils.lerp(1.02,clamp(this.pickupHeight,.35,1.05),reach),T.MathUtils.lerp(.2,.56+.2*pickupDepth,reach));left.set(-.27,.76-reach*.28*pickupDepth,.16+reach*.12);right.lerp(new T.Vector3(.22,1.05,-.28),stow);}
    if(input.fishing){
      const cast=clamp(this.castAge/.85,0,1),windup=1-ease(cast/.35),sweep=ease((cast-.25)/.4),pull=this.reelAge<1.2?Math.sin(clamp(this.reelAge/1.2,0,1)*Math.PI):0;
      right.set(.13,1.04+windup*.28+pull*.14,.2-windup*.55);left.set(-.25,.85,.1);
      r.rod.rotation.x=T.MathUtils.lerp(-.65,.92,sweep)-pull*.62+(input.fishing.phase==='bite'&&!input.reduced?Math.sin(input.time*15)*.025:0);r.rod.rotation.z=.05;r.reel.rotation.x=this.reelAge<1.2?-this.reelAge*22:input.fishing.phase==='waiting'?Math.sin(input.time*.7)*.1:0;
      r.fish.visible=this.reelAge>.65&&this.reelAge<1.25;r.fish.rotation.z=-.35;
    }else if(input.aboard&&input.tiller){const grip=root.worldToLocal(input.tiller.clone());if(grip.x<-.08)left.copy(grip);else right.copy(grip);}
    solveLimb(r.rightArm,right,root,new T.Vector3(.8,-.1,-.35),damp);
    if(input.fishing){root.updateMatrixWorld(true);r.rod.position.copy(root.worldToLocal(r.rightArm.end.getWorldPosition(new T.Vector3())));root.updateMatrixWorld(true);const reelGrip=r.reel.localToWorld(new T.Vector3(0,.08,.045));left.lerp(root.worldToLocal(reelGrip),ease((this.castAge-.5)/.3));if(this.reelAge>.6&&this.reelAge<1.25)left.lerp(new T.Vector3(-.2,1.18,.25),ease((this.reelAge-.6)/.2));}
    solveLimb(r.leftArm,left,root,new T.Vector3(-.8,-.1,-.35),damp);
    r.held.scale.setScalar(1-stow*.55);r.rod.visible=!!input.fishing;
    if(input.fishing){root.updateMatrixWorld(true);r.rod.position.copy(root.worldToLocal(r.rightArm.end.getWorldPosition(new T.Vector3())));root.updateMatrixWorld(true);this.tip.copy(r.rodTip.getWorldPosition(new T.Vector3()));
      const castProgress=ease((this.castAge-.25)/.55);this.bobber.copy(this.tip).lerp(input.floatTarget,castProgress);this.bobber.y+=Math.sin(castProgress*Math.PI)*1.7;
      if(this.reelAge<1.2)this.bobber.lerp(this.tip,ease(this.reelAge/1.05));this.line.visible=input.fishing.phase!=='missed'&&this.reelAge<1.2||input.fishing.phase==='waiting'||input.fishing.phase==='bite';
      for(let j=0;j<24;j++){const t=j/23,p=this.tip.clone().lerp(this.bobber,t);p.y-=Math.sin(t*Math.PI)*(.15+(input.fishing.phase==='waiting'?.35:0));this.linePositions[j*3]=p.x;this.linePositions[j*3+1]=p.y;this.linePositions[j*3+2]=p.z;}this.line.geometry.attributes.position.needsUpdate=true;
    }else{this.line.visible=false;r.fish.visible=false;}
  }
}
