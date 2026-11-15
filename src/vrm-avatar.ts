import * as T from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {VRMLoaderPlugin,VRMUtils,type VRM} from './vendor/three-vrm';
import type {ExplorerRig} from './explorer-model';

// A real anime character model (VRM, the format VRoid Studio exports) worn over the game's own explorer
// rig. The built-in rig stays in charge of every animation; each frame its pose is copied onto the model's
// skeleton, so walking, steering, fishing and gathering all work with any VRM dropped in.
const TARGET_HEIGHT=1.86,REST_PELVIS=.76,PROXY_LEG=.6;
const DOWN=new T.Vector3(0,-1,0),FORWARD=new T.Vector3(0,0,1),a=new T.Vector3(),b=new T.Vector3(),c=new T.Vector3(),dir=new T.Vector3(),rootInverse=new T.Quaternion();
const ease=(t:number)=>{t=Math.min(1,Math.max(0,t));return t*t*(3-2*t);};
const HIDDEN=new T.MeshBasicMaterial({visible:false});
export class VrmAvatar{
  scale=1;restHips=new T.Vector3();
  /** 0 standing … 1 walking; set by the game from the explorer animator each frame. */
  walkWeight=0;
  private clock=new T.Clock();private bones:Record<string,T.Object3D|null>={};
  private phase=0;private speed=0;private clockTime=0;private last=new T.Vector3();private started=false;
  private hipOffset:Record<string,T.Vector3>={};private thigh=.45;private shin=.45;private ankle=.09;private restHipsRoot=new T.Vector3();
  constructor(public vrm:VRM,public rig:ExplorerRig){
    const scene=vrm.scene;scene.traverse(o=>{o.frustumCulled=false;if((o as T.Mesh).isMesh){o.castShadow=true;o.receiveShadow=false;}});
    for(const name of ['hips','spine','chest','upperChest','neck','head','leftUpperArm','leftLowerArm','rightUpperArm','rightLowerArm','leftUpperLeg','leftLowerLeg','leftFoot','rightUpperLeg','rightLowerLeg','rightFoot'])this.bones[name]=vrm.humanoid.getNormalizedBoneNode(name);
    scene.updateWorldMatrix(true,true);const head=this.bones.head!.getWorldPosition(new T.Vector3()),hips=this.bones.hips!;
    this.scale=TARGET_HEIGHT/(head.y+.17);this.restHips.copy(hips.position);
    // Measure the model's own legs (in game units) so steps are sized for this body, not the stand-in rig.
    const at=(name:string)=>this.bones[name]!.getWorldPosition(new T.Vector3()).multiplyScalar(this.scale);
    this.restHipsRoot.copy(at('hips'));for(const side of ['left','right'])this.hipOffset[side]=at(`${side}UpperLeg`).sub(this.restHipsRoot);
    this.thigh=at('leftUpperLeg').distanceTo(at('leftLowerLeg'));this.shin=at('leftLowerLeg').distanceTo(at('leftFoot'));this.ankle=at('leftFoot').y;
    scene.scale.setScalar(this.scale);this.model.copy(scene.quaternion);this.modelInverse.copy(scene.quaternion).invert();
    // Hide the built-in body but keep what it carries (rod, caught fish, held items).
    // The rig toggles visibility itself (first person), so its meshes get an invisible material instead.
    const keep=[rig.rod,rig.fish,rig.held];rig.root.traverse(o=>{const m=o as T.Mesh;if(m.isMesh&&!keep.some(k=>k===o||k.getObjectById(o.id))){m.material=HIDDEN;m.castShadow=false;}});
    rig.root.add(scene);
  }
  // VRM 0.x models are turned half a circle to face forward, so rotations and offsets worked out in the
  // character's space are converted into the model's own space before they are applied.
  private model=new T.Quaternion();private modelInverse=new T.Quaternion();
  private put(bone:T.Object3D,rotation:T.Quaternion){bone.quaternion.copy(this.modelInverse).multiply(rotation).multiply(this.model);}
  private chain(upper:string,lower:string,rest:T.Vector3,parent:T.Quaternion,upperDir:T.Vector3,lowerDir:T.Vector3,foot?:string,footPitch=0){
    const u=this.bones[upper],lo=this.bones[lower];if(!u||!lo)return;
    const upperQ=new T.Quaternion().setFromUnitVectors(rest,upperDir),lowerQ=new T.Quaternion().setFromUnitVectors(rest,lowerDir);
    this.put(u,new T.Quaternion().copy(parent).invert().multiply(upperQ));this.put(lo,new T.Quaternion().copy(upperQ).invert().multiply(lowerQ));
    // Feet stay level with the ground and turned with the hips, rolling a little through each step.
    if(foot&&this.bones[foot])this.put(this.bones[foot]!,new T.Quaternion().copy(lowerQ).invert().multiply(parent).multiply(new T.Quaternion().setFromAxisAngle(new T.Vector3(1,0,0),footPitch)));
  }
  dispose(){this.vrm.scene.removeFromParent();VRMUtils.deepDispose(this.vrm.scene);}
  /** Pose the model from the rig, with a walk cycle sized to this body and driven by real ground speed. */
  sync(){
    const r=this.rig,bone=this.bones,dt=Math.min(this.clock.getDelta(),.05),w=this.walkWeight;
    this.vrm.scene.visible=r.head.visible&&r.body.visible;if(!this.vrm.scene.visible)return;
    r.root.updateWorldMatrix(true,true);r.root.getWorldQuaternion(rootInverse).invert();
    // Ground speed from how far the character really moved, so planted feet do not slide.
    r.root.getWorldPosition(a);const moved=this.started?Math.hypot(a.x-this.last.x,a.z-this.last.z):0;this.last.copy(a);this.started=true;
    if(dt>0)this.speed=T.MathUtils.damp(this.speed,w>.02?Math.min(moved/dt,6):0,10,dt);
    const leg=this.thigh+this.shin,run=ease((this.speed-2.4)/1.8),stride=leg*(.23+.19*ease(this.speed/2.6)),cycleLength=stride*2/.6*(1+.55*run);
    if(w>.02)this.phase+=moved/cycleLength*Math.PI*2;
    this.clockTime+=dt;const t=this.clockTime,sway=Math.sin(this.phase),twist=sway*.055*w;
    // A traveller's walk rather than a catwalk: weight drops onto each planted foot, the stance is wide and a
    // little crouched, the body leans into the walk, shoulders roll, and the head keeps scanning the island.
    // Hips: the rig's crouch and lean, scaled to this body, plus a natural rise and fall twice per stride.
    const ratio=leg/PROXY_LEG,drop=(r.pelvis.position.y-REST_PELVIS+.055*w)*ratio-(.022+.02*run)*leg*w-Math.abs(Math.sin(this.phase+.5))*.02*leg*w+Math.sin(t*1.7)*.004*(1-w);
    const hipsRoot=new T.Vector3(this.restHipsRoot.x+r.pelvis.position.x+sway*.034*leg*w+Math.sin(t*.45)*.012*(1-w),this.restHipsRoot.y+drop,this.restHipsRoot.z+r.pelvis.position.z);
    bone.hips!.position.copy(this.restHips).add(a.copy(hipsRoot).sub(this.restHipsRoot).applyQuaternion(this.modelInverse).divideScalar(this.scale));
    const hipsQ=new T.Quaternion().copy(r.pelvis.quaternion).multiply(new T.Quaternion().setFromEuler(new T.Euler(0,twist,0)));this.put(bone.hips!,hipsQ);
    const torsoLocal=new T.Quaternion().setFromEuler(new T.Euler(.14*w+.1*run*w+Math.sin(t*1.7)*.012,-twist*1.5,-sway*.045*w)).multiply(r.torso.quaternion);
    this.put((bone.chest??bone.spine)!,torsoLocal);this.put((bone.neck??bone.head)!,new T.Quaternion().copy(r.head.quaternion).multiply(new T.Quaternion().setFromEuler(new T.Euler(-.09*w+Math.sin(t*.9)*.015,twist*.6+Math.sin(t*.37)*.16*(.35+.65*w),sway*.03*w))));
    const chestQ=new T.Quaternion().copy(hipsQ).multiply(torsoLocal);
    const travelOf:Record<string,number>={};
    for(const side of ['left','right']){
      // Each foot is planted for 60% of the stride and swings forward for the rest.
      const cycle=((this.phase/(Math.PI*2)+(side==='left'?0:.5))%1+1)%1,stance=cycle<.6,swing=stance?0:(cycle-.6)/.4;
      const travel=(stance?T.MathUtils.lerp(stride,-stride,cycle/.6):T.MathUtils.lerp(-stride,stride,ease(swing)))*w;travelOf[side]=stride>0?travel/stride:0;
      const lift=stance?0:Math.sin(swing*Math.PI)*leg*(.14+.1*run)*w;
      const hip=a.copy(this.hipOffset[side]).applyQuaternion(hipsQ).add(hipsRoot),target=b.set(this.hipOffset[side].x*(1+.22*w),this.ankle+lift,travel+hipsRoot.z-this.restHipsRoot.z);
      // Two-bone IK with the knee bending forward.
      const toTarget=c.copy(target).sub(hip),distance=Math.min(toTarget.length(),leg*.999),n=toTarget.normalize();
      const cosHip=T.MathUtils.clamp((this.thigh**2+distance**2-this.shin**2)/(2*this.thigh*distance),-1,1),pole=dir.copy(FORWARD).addScaledVector(n,-FORWARD.dot(n)).normalize();
      const upperDir=new T.Vector3().copy(n).multiplyScalar(cosHip).addScaledVector(pole,Math.sqrt(1-cosHip*cosHip)).normalize();
      const knee=new T.Vector3().copy(hip).addScaledVector(upperDir,this.thigh),lowerDir=new T.Vector3().copy(hip).addScaledVector(n,distance).sub(knee).normalize();
      const pitch=(stance?T.MathUtils.lerp(-.3,.38,ease(cycle/.6)):T.MathUtils.lerp(.38,-.3,swing))*w;
      this.chain(`${side}UpperLeg`,`${side}LowerLeg`,DOWN,hipsQ,upperDir,lowerDir,`${side}Foot`,pitch);
    }
    // Arms: follow the rig (steering, fishing, gathering); while walking, swing opposite the legs with a soft elbow.
    for(const l of [r.leftArm,r.rightArm]){
      const side=l.side>0?'left':'right',rest=new T.Vector3(l.side>0?1:-1,0,0);
      l.upper.getWorldPosition(a);l.lower.getWorldPosition(b);l.end.getWorldPosition(c);
      const upperDir=new T.Vector3().copy(b).sub(a).normalize().applyQuaternion(rootInverse),lowerDir=new T.Vector3().copy(c).sub(b).normalize().applyQuaternion(rootInverse);
      const swing=-travelOf[side]*(.3+.34*run)+.06,elbow=.5+Math.max(0,swing)*.6+.7*run;
      const ownUpper=new T.Vector3(l.side*.2,-Math.cos(swing),Math.sin(swing)).normalize(),ownLower=new T.Vector3(l.side*.04,-Math.cos(swing+elbow),Math.sin(swing+elbow)).normalize();
      upperDir.lerp(ownUpper,w).normalize();lowerDir.lerp(ownLower,w).normalize();if(w<.5)upperDir.x+=l.side*.16*(1-w*2),upperDir.normalize();
      this.chain(`${side}UpperArm`,`${side}LowerArm`,rest,chestQ,upperDir,lowerDir);
    }
    this.vrm.update(dt);
  }
}
export async function loadVrmAvatar(url:string,rig:ExplorerRig){
  const loader=new GLTFLoader();loader.register(parser=>new VRMLoaderPlugin(parser) as never);
  const gltf=await loader.loadAsync(url),vrm=gltf.userData.vrm as VRM|undefined;if(!vrm)throw new Error('Not a VRM file');
  VRMUtils.rotateVRM0(vrm);return new VrmAvatar(vrm,rig);
}
