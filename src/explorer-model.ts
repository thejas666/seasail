import * as T from 'three';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';
export type Limb={upper:T.Group;lower:T.Group;end:T.Group;lengthA:number;lengthB:number;side:number};
export type ExplorerRig={root:T.Group;pelvis:T.Group;torso:T.Group;body:T.Group;head:T.Group;belt:T.Object3D;leftArm:Limb;rightArm:Limb;leftLeg:Limb;rightLeg:Limb;eyes:T.Mesh[];rod:T.Group;rodTip:T.Object3D;reel:T.Group;fish:T.Group;held:T.Group;backpack:T.Group};

// Cartoon-adventurer style: a big chibi head with large eyes, a round nose and an open grin, stubby limbs,
// chunky boots, flat cel shading in three tones and a dark ink outline around each shape.
const gradient=new T.DataTexture(new Uint8Array([150,150,150,255,205,205,205,255,255,255,255,255]),3,1);
gradient.minFilter=gradient.magFilter=T.NearestFilter;gradient.generateMipmaps=false;gradient.needsUpdate=true;
const toon=(color:string)=>new T.MeshToonMaterial({color,gradientMap:gradient});
const paint=(color:string)=>new T.MeshStandardMaterial({color,roughness:.96});
const C={skin:'#f3c9a1',skinShade:'#e2ab83',hair:'#3f2a1f',cap:'#8c5a31',capSeam:'#6e4425',goggleRim:'#e3a634',lens:'#2c2a33',jacket:'#d9622b',jacketDark:'#b44c21',tee:'#f5c43c',collar:'#2a2228',shorts:'#2f3a46',boot:'#5b3a24',sole:'#2d2420',pack:'#2f8f9c',packFlap:'#49b3bd',ink:'#2a1d1a',white:'#fffaf0',mouth:'#5e2420',tongue:'#e0736a'};
const skin=toon(C.skin),jacket=toon(C.jacket),shorts=toon(C.shorts),boot=toon(C.boot),cap=toon(C.cap),hair=toon(C.hair),white=toon(C.white),ink=new T.MeshBasicMaterial({color:C.ink});
const outlineMaterial=new T.MeshBasicMaterial({color:C.ink,side:T.BackSide});
outlineMaterial.onBeforeCompile=shader=>{shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\n  transformed += normalize(normal) * 0.016;');};
function part(geometry:T.BufferGeometry,material:T.Material,parent:T.Object3D,x=0,y=0,z=0){const m=new T.Mesh(geometry,material);m.position.set(x,y,z);m.castShadow=m.receiveShadow=true;parent.add(m);return m;}
function box(w:number,h:number,d:number,material:T.Material,parent:T.Object3D,x=0,y=0,z=0){return part(new RoundedBoxGeometry(w,h,d,2,Math.min(.07,w*.3,h*.3,d*.3)),material,parent,x,y,z);}
function sphere(radius:number,material:T.Material,parent:T.Object3D,x=0,y=0,z=0){return part(new T.SphereGeometry(radius,18,13),material,parent,x,y,z);}
function cylinder(rt:number,rb:number,h:number,material:T.Material,parent:T.Object3D,x=0,y=0,z=0,n=16){return part(new T.CylinderGeometry(rt,rb,h,n),material,parent,x,y,z);}
function segment(a:T.Vector3,b:T.Vector3,r:number,material:T.Material,parent:T.Object3D){const m=cylinder(r,r,a.distanceTo(b),material,parent);m.position.copy(a).add(b).multiplyScalar(.5);m.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),b.clone().sub(a).normalize());return m;}
const curve=(points:[number,number,number][],radius:number,material:T.Material,parent:T.Object3D)=>part(new T.TubeGeometry(new T.CatmullRomCurve3(points.map(p=>new T.Vector3(...p))),12,radius,6,false),material,parent);
/** Ink outlines: an inflated back-face shell behind every sizeable shape, so it reads like the line art. */
function outline(root:T.Object3D,skip:T.Object3D[]){
  const meshes:T.Mesh[]=[];root.traverse(o=>{if(o instanceof T.Mesh&&!o.userData.noOutline&&!skip.some(s=>s===o||s.getObjectById(o.id)))meshes.push(o);});
  for(const m of meshes){m.geometry.computeBoundingSphere();if(m.geometry.boundingSphere!.radius<.035)continue;const shell=new T.Mesh(m.geometry,outlineMaterial);shell.userData.outline=true;shell.castShadow=false;m.add(shell);}
}
const fine=<M extends T.Mesh>(m:M)=>{m.userData.noOutline=true;m.castShadow=false;return m;};

function arm(side:number,torso:T.Group):Limb{
  const upper=new T.Group(),lower=new T.Group(),end=new T.Group();upper.position.set(side*.34,.53,0);lower.position.set(0,-.3,0);end.position.set(0,-.26,0);torso.add(upper);upper.add(lower);lower.add(end);
  // Puffed jacket shoulder and sleeve, bare forearm, and a big round cartoon fist.
  sphere(.15,jacket,upper,side*.01,-.02,0).scale.set(1,.92,1);part(new T.CapsuleGeometry(.118,.16,4,12),jacket,upper,0,-.16,0);
  cylinder(.112,.112,.05,toon(C.jacketDark),upper,0,-.27,0,14);
  sphere(.085,skin,lower);part(new T.CapsuleGeometry(.08,.14,4,12),skin,lower,0,-.115,.012);
  const fist=sphere(.11,skin,end,0,-.02,0);fist.scale.set(.95,1,.92);sphere(.045,skin,end,-side*.075,.03,.055);
  return {upper,lower,end,lengthA:.3,lengthB:.26,side};
}
function leg(side:number,pelvis:T.Group):Limb{
  const upper=new T.Group(),lower=new T.Group(),end=new T.Group();upper.position.set(side*.16,-.04,0);lower.position.set(0,-.3,0);end.position.set(0,-.3,0);pelvis.add(upper);upper.add(lower);lower.add(end);
  part(new T.CapsuleGeometry(.135,.17,4,12),shorts,upper,0,-.14,0);sphere(.105,shorts,lower);part(new T.CapsuleGeometry(.105,.14,4,12),shorts,lower,0,-.12,.01);
  // Chunky round-toed boot with a turned-down cuff and a dark sole.
  cylinder(.135,.125,.13,boot,lower,0,-.25,.01,16);cylinder(.15,.15,.05,toon('#714a2e'),lower,0,-.19,.01,16);
  box(.28,.2,.44,boot,end,0,-.03,.07);sphere(.14,boot,end,0,-.03,.21).scale.set(1,.72,.85);box(.3,.05,.46,toon(C.sole),end,0,-.108,.07);
  return {upper,lower,end,lengthA:.3,lengthB:.3,side};
}
function face(head:T.Group){
  const eyes:T.Mesh[]=[];
  for(const side of [-1,1]){
    const x=side*.13;
    const eye=sphere(.095,white,head,x,-.01,.33);eye.scale.set(.78,1.15,.42);eye.rotation.y=side*.3;
    const pupil=fine(sphere(.047,ink,head,x+side*.012,-.02,.368));pupil.scale.set(.85,1.15,.5);
    fine(sphere(.017,toon(C.white),head,x+side*.012+.018,.014,.392));
    eyes.push(eye,pupil);
    fine(curve([[x-.075,.105,.335],[x,.135,.35],[x+.075,.11,.328]],.017,ink,head));
  }
  const nose=sphere(.088,skin,head,0,-.11,.385);nose.scale.set(1,.88,.95);
  // Open, happy grin: a dark mouth with a tongue and a lip line.
  const mouth=fine(sphere(.1,toon(C.mouth),head,0,-.225,.29));mouth.scale.set(1,.55,.4);mouth.rotation.x=-.35;
  fine(sphere(.06,toon(C.tongue),head,0,-.25,.305)).scale.set(1,.45,.35);
  fine(curve([[-.11,-.19,.31],[0,-.182,.34],[.11,-.19,.31]],.012,ink,head));
  return eyes;
}
function aviatorCap(head:T.Group){
  // Leather flight cap tipped back off the brow, with stitched panels, ear flaps, chin strap and goggles.
  const capGroup=new T.Group();capGroup.position.set(0,.03,-.02);capGroup.rotation.x=-.5;head.add(capGroup);
  part(new T.SphereGeometry(.425,24,14,0,Math.PI*2,0,Math.PI*.5),cap,capGroup);
  const rim=cylinder(.428,.428,.05,toon(C.capSeam),capGroup,0,.02,0,28);(rim.geometry as T.CylinderGeometry).dispose();rim.geometry=new T.CylinderGeometry(.428,.428,.05,28,1,true);
  for(const x of [-.12,.12])part(new T.TorusGeometry(Math.sqrt(.425**2-x*x)+.006,.02,6,30,Math.PI),toon(C.capSeam),capGroup,x,0,0).rotation.y=Math.PI/2;
  const strap=cylinder(.432,.432,.065,toon('#4a3a33'),capGroup,0,.2,0,28);strap.geometry.dispose();strap.geometry=new T.CylinderGeometry(.385,.385,.065,28,1,true);strap.userData.noOutline=true;
  for(const side of [-1,1]){
    const lens=new T.Group();lens.position.set(side*.14,.2,.335);lens.rotation.set(Math.PI/2-.55,0,side*-.2);capGroup.add(lens);
    part(new T.TorusGeometry(.092,.032,10,22),toon(C.goggleRim),lens).rotation.x=Math.PI/2;
    const glass=cylinder(.088,.088,.03,toon(C.lens),lens,0,.005,0,22);glass.userData.noOutline=true;
    fine(sphere(.022,toon('#9aa3b5'),lens,.03,.022,-.03)).scale.set(1,.3,1);
  }
  fine(box(.07,.05,.05,toon(C.goggleRim),capGroup,0,.22,.36));
  for(const side of [-1,1]){
    const flap=box(.09,.3,.24,cap,head,side*.39,-.12,-.03);flap.rotation.z=side*.12;
    cylinder(.05,.05,.03,toon(C.capSeam),head,side*.44,-.12,-.03,12).rotation.z=Math.PI/2;
    fine(curve([[side*.39,-.25,0],[side*.3,-.36,.1],[side*.12,-.41,.17]],.016,toon(C.capSeam),head));
  }
  // Hair: a fringe peeking out under the cap's front edge and a tuft at the back.
  for(const [x,y,z,s] of [[-.2,.2,.3,.075],[-.06,.23,.33,.08],[.1,.22,.32,.075],[.24,.18,.27,.065]] as const)sphere(s,hair,head,x,y,z).scale.set(1.25,.7,.6);
  for(const [x,y] of [[-.13,-.26],[.02,-.22],[.15,-.27]] as const){const tuft=part(new T.ConeGeometry(.07,.2,6),hair,head,x,y,-.36);tuft.rotation.x=-2.1;}
}
export function createExplorer():T.Group{
  const root=new T.Group(),pelvis=new T.Group(),torso=new T.Group(),body=new T.Group(),head=new T.Group(),backpack=new T.Group();pelvis.position.y=.76;torso.position.y=.02;head.position.y=.68;root.add(pelvis);pelvis.add(torso);torso.add(body,head,backpack);
  // Rounded torso: open orange jacket over a yellow tee with a dark crew neck.
  const chest=part(new T.CapsuleGeometry(.29,.3,4,16),jacket,body,0,.27,0);chest.scale.set(1.04,1,.92);
  const tee=box(.27,.42,.12,toon(C.tee),body,0,.27,.215);tee.scale.z=.9;
  cylinder(.16,.18,.05,toon(C.collar),body,0,.61,.02,20);
  for(const side of [-1,1]){const lapel=box(.1,.42,.08,toon(C.jacketDark),body,side*.165,.3,.215);lapel.rotation.z=side*.08;fine(sphere(.022,toon('#f1d38b'),body,side*.17,.36,.265));}
  const belt=cylinder(.29,.29,.07,toon('#3b2b22'),pelvis);fine(box(.09,.07,.03,toon(C.goggleRim),pelvis,0,0,.29));
  part(new T.SphereGeometry(.3,18,10,0,Math.PI*2,Math.PI*.45,Math.PI*.55),shorts,pelvis,0,.07,0).scale.set(1,.7,.95);
  // Neck and the big head.
  cylinder(.11,.12,.14,skin,head,0,-.33,0,12);
  const skull=sphere(.4,skin,head,0,0,.02);skull.scale.set(1,.98,.95);
  const eyes=face(head);aviatorCap(head);
  // Small canvas pack worn low, in sea-teal so the back view reads as cap / orange jacket / pack.
  box(.36,.34,.2,toon(C.pack),backpack,0,.2,-.3);box(.34,.15,.06,toon(C.packFlap),backpack,0,.29,-.4);fine(box(.07,.07,.03,toon(C.goggleRim),backpack,0,.23,-.435));
  const roll=cylinder(.075,.075,.42,toon('#f2e3b8'),backpack,0,.42,-.3,12);roll.rotation.z=Math.PI/2;
  for(const side of [-1,1])segment(new T.Vector3(side*.2,.6,-.1),new T.Vector3(side*.22,.06,.24),.03,toon('#5c3a22'),body);
  const leftArm=arm(-1,torso),rightArm=arm(1,torso),leftLeg=leg(-1,pelvis),rightLeg=leg(1,pelvis);
  const rod=new T.Group(),rodTip=new T.Object3D(),reel=new T.Group();root.add(rod);rod.visible=false;
  const pole=new T.CatmullRomCurve3([new T.Vector3(),new T.Vector3(0,.7,0),new T.Vector3(0,1.3,.025),new T.Vector3(0,1.85,.12)]);part(new T.TubeGeometry(pole,18,.018,6,false),paint('#8b6541'),rod);cylinder(.038,.038,.25,paint('#5c6050'),rod,0,.08,0,10);const spool=part(new T.TorusGeometry(.075,.025,7,16),paint('#c7b27a'),rod,-.04,.18,0);spool.rotation.y=Math.PI/2;reel.position.set(-.09,.18,0);rod.add(reel);segment(new T.Vector3(),new T.Vector3(0,.08,.045),.014,paint('#987747'),reel);sphere(.025,paint('#4a6862'),reel,0,.08,.045);rodTip.position.set(0,1.85,.12);rod.add(rodTip);
  const held=new T.Group();rightArm.end.add(held);held.visible=false;
  const fish=new T.Group();leftArm.end.add(fish);const fishBody=sphere(.14,paint('#eab75f'),fish);fishBody.scale.set(1.5,.64,.4);const tail=part(new T.ConeGeometry(.085,.15,5),paint('#d59d57'),fish,-.23,0,0);tail.rotation.z=Math.PI/2;sphere(.022,paint('#fff3d6'),fish,.13,.025,.052);sphere(.012,paint('#795339'),fish,.135,.025,.07);fish.visible=false;
  outline(root,[rod,fish,held]);
  const rig:ExplorerRig={root,pelvis,torso,body,head,belt,leftArm,rightArm,leftLeg,rightLeg,eyes,rod,rodTip,reel,fish,held,backpack};root.userData.rig=rig;return root;
}
