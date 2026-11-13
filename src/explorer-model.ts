import * as T from 'three';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';
export type Limb={upper:T.Group;lower:T.Group;end:T.Group;lengthA:number;lengthB:number;side:number};
export type ExplorerRig={root:T.Group;pelvis:T.Group;torso:T.Group;body:T.Group;head:T.Group;belt:T.Object3D;leftArm:Limb;rightArm:Limb;leftLeg:Limb;rightLeg:Limb;eyes:T.Mesh[];rod:T.Group;rodTip:T.Object3D;reel:T.Group;fish:T.Group;held:T.Group;backpack:T.Group};
const paint=(color:string)=>new T.MeshStandardMaterial({color,roughness:.96});
const cloth=paint('#e2e9cf'),pants=paint('#497574'),skin=paint('#d8ab83'),hair=paint('#795339'),cream=paint('#fff3d6'),boot=paint('#86694c'),leather=paint('#c49555');
function part(geometry:T.BufferGeometry,material:T.Material,parent:T.Object3D,x=0,y=0,z=0){const m=new T.Mesh(geometry,material);m.position.set(x,y,z);m.castShadow=m.receiveShadow=true;parent.add(m);return m;}
function box(w:number,h:number,d:number,material:T.Material,parent:T.Object3D,x=0,y=0,z=0){return part(new RoundedBoxGeometry(w,h,d,1,Math.min(.055,w*.15,h*.15,d*.15)),material,parent,x,y,z);}
function sphere(radius:number,material:T.Material,parent:T.Object3D,x=0,y=0,z=0){return part(new T.SphereGeometry(radius,12,9),material,parent,x,y,z);}
function cylinder(rt:number,rb:number,h:number,material:T.Material,parent:T.Object3D,x=0,y=0,z=0,n=16){return part(new T.CylinderGeometry(rt,rb,h,n),material,parent,x,y,z);}
function segment(a:T.Vector3,b:T.Vector3,r:number,material:T.Material,parent:T.Object3D){const m=cylinder(r,r,a.distanceTo(b),material,parent);m.position.copy(a).add(b).multiplyScalar(.5);m.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),b.clone().sub(a).normalize());return m;}
function arm(side:number,torso:T.Group):Limb{
  const upper=new T.Group(),lower=new T.Group(),end=new T.Group();upper.position.set(side*.34,.53,0);lower.position.set(0,-.3,0);end.position.set(0,-.26,0);torso.add(upper);upper.add(lower);lower.add(end);
  part(new T.CapsuleGeometry(.105,.16,4,10),cloth,upper,0,-.13,0);sphere(.084,skin,lower);part(new T.CapsuleGeometry(.075,.15,4,10),skin,lower,0,-.115,.015);const hand=sphere(.087,skin,end);hand.scale.set(.86,1.12,.85);sphere(.038,skin,end,-side*.06,.035,.05);
  return {upper,lower,end,lengthA:.3,lengthB:.26,side};
}
function leg(side:number,pelvis:T.Group):Limb{
  const upper=new T.Group(),lower=new T.Group(),end=new T.Group();upper.position.set(side*.16,-.04,0);lower.position.set(0,-.3,0);end.position.set(0,-.3,0);pelvis.add(upper);upper.add(lower);lower.add(end);
  part(new T.CapsuleGeometry(.118,.19,4,10),pants,upper,0,-.15,0);sphere(.102,pants,lower);part(new T.CapsuleGeometry(.102,.17,4,10),pants,lower,0,-.14,.012);box(.255,.17,.4,boot,end,0,-.04,.06);box(.24,.035,.39,paint('#514f3f'),end,0,-.116,.06);for(let k=0;k<2;k++)box(.13,.018,.022,cream,end,0,.04,.12+k*.05);
  return {upper,lower,end,lengthA:.3,lengthB:.3,side};
}
export function createExplorer():T.Group{
  const root=new T.Group(),pelvis=new T.Group(),torso=new T.Group(),body=new T.Group(),head=new T.Group(),backpack=new T.Group();pelvis.position.y=.76;torso.position.y=.02;head.position.y=.84;root.add(pelvis);pelvis.add(torso);torso.add(body,head,backpack);
  part(new T.CapsuleGeometry(.28,.4,4,14),cloth,body,0,.28,0);const belt=cylinder(.27,.27,.065,paint('#7c6944'),pelvis);
  sphere(.28,skin,head);const cap=sphere(.282,hair,head,0,.07,-.025);cap.scale.set(1,.72,.96);for(const side of [-1,1])sphere(.058,skin,head,side*.266,-.01,0);
  const eyes:T.Mesh[]=[];for(const x of [-.093,.093]){const eye=sphere(.039,cream,head,x,.035,.25);eye.scale.set(.9,1.2,.5);const pupil=sphere(.021,paint('#354c43'),head,x,.035,.275);eyes.push(eye,pupil);segment(new T.Vector3(x-.035,.098,.247),new T.Vector3(x+.035,.105,.247),.012,hair,head);}
  const nose=sphere(.045,skin,head,0,-.02,.281);nose.scale.set(.8,.85,1);const smile=new T.CatmullRomCurve3([new T.Vector3(-.065,-.085,.263),new T.Vector3(0,-.101,.28),new T.Vector3(.065,-.085,.263)]);part(new T.TubeGeometry(smile,9,.008,5,false),hair,head);
  cylinder(.49,.49,.065,paint('#d8bc83'),head,0,.21,0,28);cylinder(.29,.33,.245,paint('#e2c993'),head,0,.335,0,24);cylinder(.333,.335,.052,paint('#73906a'),head,0,.252,0,24);
  box(.47,.55,.28,leather,backpack,0,.3,-.255);box(.33,.25,.055,paint('#d9ae6b'),backpack,0,.18,-.425);box(.09,.09,.025,paint('#f0d08a'),backpack,0,.39,-.415);for(const side of [-1,1])segment(new T.Vector3(side*.21,.59,-.07),new T.Vector3(side*.22,.08,.23),.022,paint('#aa8751'),body);for(const y of [.38,.21])sphere(.018,paint('#9ba885'),body,0,y,.281);
  const leftArm=arm(-1,torso),rightArm=arm(1,torso),leftLeg=leg(-1,pelvis),rightLeg=leg(1,pelvis);
  const rod=new T.Group(),rodTip=new T.Object3D(),reel=new T.Group();root.add(rod);rod.visible=false;
  const pole=new T.CatmullRomCurve3([new T.Vector3(),new T.Vector3(0,.7,0),new T.Vector3(0,1.3,.025),new T.Vector3(0,1.85,.12)]);part(new T.TubeGeometry(pole,18,.018,6,false),paint('#8b6541'),rod);cylinder(.038,.038,.25,paint('#5c6050'),rod,0,.08,0,10);const spool=part(new T.TorusGeometry(.075,.025,7,16),paint('#c7b27a'),rod,-.04,.18,0);spool.rotation.y=Math.PI/2;reel.position.set(-.09,.18,0);rod.add(reel);segment(new T.Vector3(),new T.Vector3(0,.08,.045),.014,paint('#987747'),reel);sphere(.025,paint('#4a6862'),reel,0,.08,.045);rodTip.position.set(0,1.85,.12);rod.add(rodTip);
  const held=new T.Group();rightArm.end.add(held);held.visible=false;
  const fish=new T.Group();leftArm.end.add(fish);const fishBody=sphere(.14,paint('#eab75f'),fish);fishBody.scale.set(1.5,.64,.4);const tail=part(new T.ConeGeometry(.085,.15,5),paint('#d59d57'),fish,-.23,0,0);tail.rotation.z=Math.PI/2;sphere(.022,cream,fish,.13,.025,.052);sphere(.012,hair,fish,.135,.025,.07);fish.visible=false;
  const rig:ExplorerRig={root,pelvis,torso,body,head,belt,leftArm,rightArm,leftLeg,rightLeg,eyes,rod,rodTip,reel,fish,held,backpack};root.userData.rig=rig;return root;
}
