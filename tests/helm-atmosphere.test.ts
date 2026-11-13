import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Box3,Color,Scene,SRGBColorSpace,Vector3} from 'three';
import {horizonAt,seaFogDensity} from '../src/systems/atmosphere';
import {HELM_STANCE,HELM_EYE} from '../src/systems/boat-layout';
import {boatModel} from '../src/world';
import {createExplorer,type ExplorerRig} from '../src/explorer-model';
import {ExplorerAnimator,type ExplorerInput} from '../src/systems/explorer-animation';

test('night fog matches the dark horizon in display space instead of a pale island silhouette',()=>{
  const day=horizonAt(0),night=horizonAt(1);assert.ok(night.every((v,n)=>v<day[n]*.45));const fog=new Color().setRGB(...night,SRGBColorSpace),uploaded=fog.getRGB(new Color(),SRGBColorSpace);assert.ok(Math.abs(uploaded.r-night[0])<1e-5&&Math.abs(uploaded.g-night[1])<1e-5&&Math.abs(uploaded.b-night[2])<1e-5);assert.ok(seaFogDensity(1)>seaFogDensity(0));for(let n=0;n<100;n++){const a=horizonAt(n/100,.1,.3),b=horizonAt((n+1)/100,.1,.3);assert.ok(a.every((v,j)=>Math.abs(v-b[j])<.01));}
});

test('helm stance clears the boom and bench while the steering hand reaches the real tiller',()=>{
  const boat=boatModel(),explorer=createExplorer(),rig=explorer.userData.rig as ExplorerRig,animation=new ExplorerAnimator(rig,new Scene());explorer.position.copy(HELM_STANCE);explorer.rotation.y=Math.PI;
  for(const turn of [-.62,0,.62]){(boat.userData.tiller as import('three').Group).rotation.y=turn*.4;boat.updateMatrixWorld(true);const grip=(boat.userData.tillerHandle as import('three').Object3D).getWorldPosition(new Vector3()),input:ExplorerInput={dt:1/60,time:1,walkSpeed:0,aboard:true,boatRoll:0,boatPitch:0,turn,jump:0,fishing:null,firstPerson:false,reduced:true,paused:false,tiller:grip,floatTarget:new Vector3()};for(let n=0;n<120;n++)animation.update(input);explorer.updateMatrixWorld(true);const head=new Box3().setFromObject(rig.head);assert.ok(head.max.x<-.2,`head is clear of boom at ${head.max.x}`);assert.ok(head.containsPoint(HELM_EYE));assert.ok(rig.leftArm.end.getWorldPosition(new Vector3()).distanceTo(grip)<.018);for(const limb of [rig.leftLeg,rig.rightLeg]){const boot=new Box3().setFromObject(limb.end);assert.ok(boot.min.z>2.01);assert.ok(boot.min.y>=1.048&&boot.min.y<1.06);}}
});

