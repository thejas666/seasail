import * as T from 'three';
import type {ExplorerRig,Limb} from './explorer-model';

// Anime-style explorer: an original young sailor with slimmer, taller proportions, a small face with
// large eyes, tousled hair under a bandana, a sailor tunic with a short cape, and soft two-tone cel
// shading with a thin outline. It uses the same joints as the cartoon explorer so every animation works.
const ramp=new T.DataTexture(new Uint8Array([168,172,196,255,255,255,255,255]),2,1);
ramp.minFilter=ramp.magFilter=T.NearestFilter;ramp.generateMipmaps=false;ramp.needsUpdate=true;
const toon=(color:string)=>new T.MeshToonMaterial({color,gradientMap:ramp});
const flat=(color:string)=>new T.MeshBasicMaterial({color});
const C={skin:'#ffe3cf',hair:'#5a3b2e',hairLight:'#7d5540',white:'#fbf7ef',navy:'#27406b',teal:'#2fa3a8',tealDark:'#1f7f8a',gold:'#e8c46a',shorts:'#3a4763',boot:'#6b4a3a',bootDark:'#3e2c25',bag:'#b98552',iris:'#2f9bb8',ink:'#33283a',blush:'#ffb7a8',mouth:'#b9544f'};
const skin=toon(C.skin),hair=toon(C.hair),white=toon(C.white),navy=toon(C.navy),teal=toon(C.teal),gold=toon(C.gold),shorts=toon(C.shorts),boot=toon(C.boot);
const outlineMaterial=new T.MeshBasicMaterial({color:'#3a2c3f',side:T.BackSide});
outlineMaterial.onBeforeCompile=shader=>{shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\n  transformed += normalize(normal) * 0.009;');};
function part(geometry:T.BufferGeometry,material:T.Material,parent:T.Object3D,x=0,y=0,z=0){const m=new T.Mesh(geometry,material);m.position.set(x,y,z);m.castShadow=m.receiveShadow=true;parent.add(m);return m;}
const sphere=(r:number,m:T.Material,p:T.Object3D,x=0,y=0,z=0)=>part(new T.SphereGeometry(r,20,14),m,p,x,y,z);
const capsule=(r:number,h:number,m:T.Material,p:T.Object3D,x=0,y=0,z=0)=>part(new T.CapsuleGeometry(r,h,5,14),m,p,x,y,z);
const cyl=(rt:number,rb:number,h:number,m:T.Material,p:T.Object3D,x=0,y=0,z=0,n=18,open=false)=>part(new T.CylinderGeometry(rt,rb,h,n,1,open),m,p,x,y,z);
const fine=<M extends T.Mesh>(m:M)=>{m.userData.noOutline=true;m.castShadow=false;return m;};
function outline(root:T.Object3D,skip:T.Object3D[]){
  const meshes:T.Mesh[]=[];root.traverse(o=>{if(o instanceof T.Mesh&&!o.userData.noOutline&&!skip.some(s=>s===o||s.getObjectById(o.id)))meshes.push(o);});
  for(const m of meshes){m.geometry.computeBoundingSphere();if(m.geometry.boundingSphere!.radius<.03)continue;const shell=new T.Mesh(m.geometry,outlineMaterial);shell.userData.outline=true;shell.castShadow=false;m.add(shell);}
}
function arm(side:number,torso:T.Group):Limb{
  const upper=new T.Group(),lower=new T.Group(),end=new T.Group();upper.position.set(side*.245,.5,0);lower.position.set(0,-.3,0);end.position.set(0,-.26,0);torso.add(upper);upper.add(lower);lower.add(end);
  // Short white sleeve with a navy cuff, slim bare arm, fingerless glove.
  sphere(.085,white,upper,0,0,0);capsule(.07,.12,white,upper,0,-.11,0);cyl(.076,.076,.035,navy,upper,0,-.2,0,14);
  capsule(.05,.1,skin,upper,0,-.26,0);capsule(.046,.17,skin,lower,0,-.12,.005);
  cyl(.055,.05,.07,teal,lower,0,-.225,.005,12);
  const hand=sphere(.058,skin,end,0,-.03,0);hand.scale.set(.85,1.15,.7);sphere(.022,skin,end,-side*.045,-.01,.03);
  return {upper,lower,end,lengthA:.3,lengthB:.26,side};
}
function leg(side:number,pelvis:T.Group):Limb{
  const upper=new T.Group(),lower=new T.Group(),end=new T.Group();upper.position.set(side*.1,-.04,0);lower.position.set(0,-.3,0);end.position.set(0,-.3,0);pelvis.add(upper);upper.add(lower);lower.add(end);
  // Shorts, bare knee, tall boot with a folded cuff and gold trim.
  capsule(.095,.1,shorts,upper,0,-.07,0);cyl(.098,.092,.03,navy,upper,0,-.175,0,14);
  capsule(.066,.1,skin,upper,0,-.24,0);sphere(.066,skin,lower,0,0,.004);
  capsule(.064,.17,boot,lower,0,-.17,.004);cyl(.082,.074,.05,toon(C.bootDark),lower,0,-.06,.004,14);fine(cyl(.084,.084,.012,gold,lower,0,-.034,.004,14));
  const foot=part(new T.CapsuleGeometry(.062,.13,4,12),boot,end,0,-.085,.05);foot.rotation.x=Math.PI/2;foot.scale.set(1,1,.8);
  part(new T.BoxGeometry(.12,.03,.25),toon(C.bootDark),end,0,-.125,.05);
  return {upper,lower,end,lengthA:.3,lengthB:.3,side};
}
function face(head:T.Group){
  const eyes:T.Mesh[]=[];
  for(const side of [-1,1]){
    const x=side*.092,eye=new T.Group();eye.position.set(x,-.012,.188);eye.rotation.y=side*.33;head.add(eye);
    // Tall anime eye: white, coloured iris with a darker top, pupil, two highlights and a lash line.
    const sclera=fine(part(new T.SphereGeometry(.05,16,12),flat('#ffffff'),eye));sclera.scale.set(.82,1.18,.3);
    const iris=fine(part(new T.SphereGeometry(.039,16,12),flat(C.iris),eye,-side*.004,-.006,.012));iris.scale.set(.86,1.2,.3);
    fine(part(new T.SphereGeometry(.03,12,10,0,Math.PI*2,0,Math.PI*.45),flat('#1c5d78'),eye,-side*.004,.004,.016)).scale.set(.95,1.25,.3);
    const pupil=fine(part(new T.SphereGeometry(.016,10,8),flat('#152c3d'),eye,-side*.004,-.006,.021));pupil.scale.set(.9,1.3,.3);
    fine(part(new T.SphereGeometry(.012,8,6),flat('#ffffff'),eye,.012,.024,.027)).scale.z=.3;
    fine(part(new T.SphereGeometry(.006,8,6),flat('#ffffff'),eye,-.012,-.024,.027)).scale.z=.3;
    const lash=fine(part(new T.TorusGeometry(.05,.0085,6,14,Math.PI*.8),flat(C.ink),eye,0,.012,.012));lash.rotation.z=Math.PI*.1;lash.scale.set(.9,1.05,.6);
    eyes.push(sclera,iris);
    const brow=fine(part(new T.CapsuleGeometry(.006,.05,3,6),flat(C.hair),head,x,.082,.2));brow.rotation.set(0,side*.3,Math.PI/2+side*.14);
    fine(part(new T.SphereGeometry(.026,10,8),new T.MeshBasicMaterial({color:C.blush,transparent:true,opacity:.5}),head,side*.125,-.07,.175)).scale.set(1.2,.6,.3);
  }
  fine(part(new T.SphereGeometry(.009,8,6),toon('#f0c4ae'),head,0,-.052,.226));
  const mouth=fine(part(new T.TorusGeometry(.022,.005,5,10,Math.PI),flat(C.mouth),head,0,-.098,.208));mouth.rotation.set(.25,0,Math.PI);
  return eyes;
}
function hairStyle(head:T.Group){
  // Layered hair cap, a swept fringe of pointed locks, side locks, and a short tail with a ribbon.
  const cap=part(new T.SphereGeometry(.248,22,12,0,Math.PI*2,0,Math.PI*.4),hair,head,0,.012,-.012);cap.scale.set(1.02,1.03,1.05);
  const back=part(new T.SphereGeometry(.248,18,14,Math.PI-.35,Math.PI+.7,0,Math.PI*.72),hair,head,0,.012,-.012);back.scale.set(1.02,1.03,1.05);(back.material as T.Material).side=T.DoubleSide;
  const lock=(x:number,y:number,z:number,rx:number,ry:number,rz:number,len:number,w:number,m:T.Material=hair)=>{const g=new T.ConeGeometry(w,len,6);g.translate(0,-len/2,0);const l=part(g,m,head,x,y,z);l.rotation.set(rx,ry,rz);l.scale.z=.55;return l;};
  for(const [x,rz,len] of [[-.16,.5,.13],[-.085,.3,.12],[-.01,.1,.1],[.07,-.3,.125],[.155,-.55,.13]] as const)lock(x,.215,.19-Math.abs(x)*.3,-.42,0,rz,len,.06);
  lock(.03,.225,.2,-.42,0,-.15,.09,.035,toon(C.hairLight));
  for(const side of [-1,1]){lock(side*.215,.1,.07,-.05,0,side*-.1,.3,.055);lock(side*.2,.11,-.05,.1,0,side*-.14,.26,.06);}
  for(const [x,len] of [[-.13,.24],[-.045,.3],[.045,.3],[.13,.24]] as const)lock(x,.08,-.2,.34,0,x*-.6,len,.07);
  for(const [x,y,z,rx,rz] of [[-.06,.25,-.02,-.5,.5],[.07,.245,.03,-.7,-.5],[0,.25,-.1,.5,0]] as const)lock(x,y,z,rx+Math.PI,0,rz,.1,.04);
  // Teal bandana with a knot and two trailing tails.
  const band=part(new T.TorusGeometry(.228,.02,8,28),teal,head,0,.13,-.015);band.rotation.x=Math.PI/2-.16;band.scale.set(1.06,1.1,1.9);
  sphere(.034,teal,head,.19,.12,-.15);
  for(const [rz,len] of [[-.5,.2],[-.95,.16]] as const){const tail=lock(.2,.11,-.16,.5,0,rz,len,.04,teal);tail.scale.z=.3;}
}
export function createAnimeExplorer():T.Group{
  const root=new T.Group(),pelvis=new T.Group(),torso=new T.Group(),body=new T.Group(),head=new T.Group(),backpack=new T.Group();pelvis.position.y=.76;torso.position.y=.02;head.position.y=.83;root.add(pelvis);pelvis.add(torso);torso.add(body,head,backpack);
  // Sailor tunic: white, slightly flared, navy sailor collar with gold trim, teal neckerchief.
  part(new T.CylinderGeometry(.165,.2,.44,20),white,body,0,.3,0).scale.z=.74;
  sphere(.166,white,body,0,.5,0).scale.set(1.3,.6,.8);
  const hem=cyl(.205,.225,.1,white,body,0,.06,0,20);hem.scale.z=.76;fine(cyl(.228,.228,.016,gold,body,0,.02,0,20)).scale.z=.76;
  const collar=part(new T.CylinderGeometry(.2,.27,.11,20,1,true),navy,body,0,.545,-.01);collar.scale.z=.72;(collar.material as T.Material).side=T.DoubleSide;
  const flap=part(new T.BoxGeometry(.4,.2,.025),navy,body,0,.44,-.135);flap.rotation.x=.12;fine(part(new T.BoxGeometry(.36,.012,.03),gold,body,0,.365,-.143));
  // Two long scarf tails down the back, so the character reads well from the usual behind-the-shoulder view.
  for(const side of [-1,1]){const tailGeometry=new T.BoxGeometry(.085,.62,.014,1,6,1);const tp=tailGeometry.attributes.position;for(let n=0;n<tp.count;n++){const t=.5-tp.getY(n)/.62;tp.setX(n,tp.getX(n)*(1-.55*t*t));tp.setZ(n,tp.getZ(n)-t*t*.12);}tailGeometry.computeVertexNormals();const scarfTail=part(tailGeometry,teal,body,side*.06,.2,-.165);scarfTail.rotation.z=side*.1;(scarfTail.material as T.Material).side=T.DoubleSide;}
  const knot=sphere(.036,teal,body,0,.47,.132);knot.scale.set(1.2,.9,.8);
  for(const side of [-1,1]){const end=part(new T.ConeGeometry(.034,.14,5),teal,body,side*.035,.39,.14);end.rotation.set(.1,0,Math.PI+side*.28);end.scale.z=.4;}
  for(const y of [.31,.22])fine(sphere(.014,gold,body,0,y,.142));
  // Belt, shorts and a short teal half-cape off the left hip.
  const belt=cyl(.19,.19,.05,toon(C.bootDark),pelvis,0,.04,0,20);belt.scale.z=.78;fine(part(new T.BoxGeometry(.055,.055,.02),gold,pelvis,0,.04,.15));
  const hips=sphere(.19,shorts,pelvis,0,-.02,0);hips.scale.set(1.02,.62,.78);
  const cape=part(new T.CylinderGeometry(.2,.27,.3,14,1,true,Math.PI*.55,Math.PI*.95),toon(C.tealDark),pelvis,0,-.1,0);cape.scale.z=.82;(cape.material as T.Material).side=T.DoubleSide;
  // Neck and head.
  cyl(.045,.052,.11,skin,head,0,-.215,0,12);
  const skull=sphere(.235,skin,head,0,0,0);skull.scale.set(.94,1,.94);
  const jaw=sphere(.15,skin,head,0,-.1,.035);jaw.scale.set(1.12,.95,1.05);
  for(const side of [-1,1])sphere(.04,skin,head,side*.222,-.03,-.005).scale.set(.5,1,.8);
  const eyes=face(head);hairStyle(head);
  // Small satchel on a cross strap, worn at the back of the right hip.
  part(new T.BoxGeometry(.2,.17,.1),toon(C.bag),backpack,-.12,.06,-.2).rotation.y=.25;part(new T.BoxGeometry(.2,.07,.105),toon('#8f6238'),backpack,-.12,.125,-.2).rotation.y=.25;fine(sphere(.014,gold,backpack,-.135,.085,-.255));
  const strap=part(new T.TorusGeometry(.3,.013,5,26),toon('#8f6238'),body,0,.3,0);strap.rotation.set(Math.PI/2,.72,0);strap.scale.set(.74,.56,1);strap.userData.noOutline=true;
  const leftArm=arm(-1,torso),rightArm=arm(1,torso),leftLeg=leg(-1,pelvis),rightLeg=leg(1,pelvis);
  const paint=(color:string)=>new T.MeshStandardMaterial({color,roughness:.96});
  const rod=new T.Group(),rodTip=new T.Object3D(),reel=new T.Group();root.add(rod);rod.visible=false;
  const pole=new T.CatmullRomCurve3([new T.Vector3(),new T.Vector3(0,.7,0),new T.Vector3(0,1.3,.025),new T.Vector3(0,1.85,.12)]);part(new T.TubeGeometry(pole,18,.018,6,false),paint('#8b6541'),rod);cyl(.038,.038,.25,paint('#5c6050'),rod,0,.08,0,10);const spool=part(new T.TorusGeometry(.075,.025,7,16),paint('#c7b27a'),rod,-.04,.18,0);spool.rotation.y=Math.PI/2;reel.position.set(-.09,.18,0);rod.add(reel);sphere(.025,paint('#4a6862'),reel,0,.08,.045);rodTip.position.set(0,1.85,.12);rod.add(rodTip);
  const held=new T.Group();rightArm.end.add(held);held.visible=false;
  const fish=new T.Group();leftArm.end.add(fish);const fishBody=sphere(.14,paint('#eab75f'),fish);fishBody.scale.set(1.5,.64,.4);const tail=part(new T.ConeGeometry(.085,.15,5),paint('#d59d57'),fish,-.23,0,0);tail.rotation.z=Math.PI/2;fish.visible=false;
  outline(root,[rod,fish,held]);
  const rig:ExplorerRig={root,pelvis,torso,body,head,belt,leftArm,rightArm,leftLeg,rightLeg,eyes,rod,rodTip,reel,fish,held,backpack};root.userData.rig=rig;root.userData.artStyle='anime';return root;
}
