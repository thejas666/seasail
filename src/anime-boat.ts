import * as T from 'three';
import {Kit,plank,tube,PROP_COLORS} from './anime-props';
import * as Props from './props';
import {TILLER_BASE,TILLER_GRIP} from './systems/boat-layout';

// The anime-style boat: a small sloop with a raked bow, a sweeping sheer line, a tall mast, a mainsail on
// a boom and a jib. Painted like a hand-crafted toy: aqua hull, a gold line, varnished wood above, pale
// edges, cream sails with gold trim and a teal emblem. The cockpit floor, helm, tiller and lantern post
// sit where the game expects them, so steering, boarding and fishing work unchanged.
const BOW=-5.2,STERN=3.1,BEAM=1.72,FLOOR=1.04,MAST_Z=-1.5,MAST_TOP=10.4;
const clamp01=(x:number)=>Math.max(0,Math.min(1,x));
const zAt=(s:number)=>BOW+(STERN-BOW)*s,sOf=(z:number)=>(z-BOW)/(STERN-BOW);
const beam=(s:number)=>s<.55?BEAM*Math.pow(1-(1-s/.55)**2,.75):BEAM*(1-.28*Math.pow((s-.55)/.45,1.6));
const sheer=(s:number)=>1.3+.5*Math.pow(1-s,2.4)+.07*s*s*s;
const keel=(s:number)=>-.6+1.1*Math.pow(Math.max(0,1-s/.22),2)+.4*Math.pow(Math.max(0,(s-.68)/.32),2);
/** A point on the hull skin: s runs bow to stern, t runs keel to sheer. */
function hullPoint(s:number,t:number){const b=beam(s),k=keel(s);return new T.Vector3(b*(1-Math.pow(1-t,2.4)),k+(sheer(s)-k)*Math.pow(t,1.4),zAt(s)-.5*t*clamp01(1-s/.2)**2);}
/** Half-width of the hull at cockpit-floor height. */
function floorHalf(s:number){const k=keel(s),t=Math.pow(clamp01((FLOOR-k)/(sheer(s)-k)),1/1.4);return beam(s)*(1-Math.pow(1-t,2.4));}
const UP=new T.Vector3(0,1,0);
function rod(kit:Kit,a:T.Vector3,b:T.Vector3,rA:number,rB:number,color:string,shade=.15){
  const g=new T.CylinderGeometry(rB,rA,a.distanceTo(b),8);g.applyQuaternion(new T.Quaternion().setFromUnitVectors(UP,b.clone().sub(a).normalize()));const m=a.clone().add(b).multiplyScalar(.5);g.translate(m.x,m.y,m.z);kit.add(g,color,{},{shade,jitter:0});
}

function hullMesh(){
  const pos:number[]=[],col:number[]=[],idx:number[]=[];
  const add=(p:T.Vector3,c:T.Color,side=1)=>{pos.push(p.x*side,p.y,p.z);col.push(c.r,c.g,c.b);return pos.length/3-1;};
  const C=(hex:string)=>new T.Color(hex);
  // Rings from keel to sheer. Doubled values give the crisp edges of the gold line.
  const rings=[0,.14,.28,.42,.56,.68,.74,.74,.775,.775,.89,1];
  const ringColor=[C('#2a8f96'),C('#3fb0ad'),C('#58cabf'),C('#66d4c8'),C('#72dacd'),C('#7fe0d2'),C('#86e4d6'),C('#f0c25a'),C('#f0c25a'),C('#b06a36'),C('#c98448'),C('#dd9c5c')];
  const N=32,R=rings.length;
  for(const side of [-1,1]){
    const base=pos.length/3;
    for(let i=0;i<=N;i++){const s=Math.pow(i/N,1.3);for(let r=0;r<R;r++)add(hullPoint(s,rings[r]),ringColor[r],side);}
    for(let i=0;i<N;i++)for(let r=0;r<R-1;r++){if(rings[r]===rings[r+1])continue;const a=base+i*R+r,b=a+R;idx.push(a,b,a+1,a+1,b,b+1);}
  }
  // Varnished transom.
  {const ts=[0,.2,.4,.6,.8,1],base=pos.length/3,dark=C('#a8632f'),light=C('#d08f52');
    for(const t of ts){const p=hullPoint(1,t),c=dark.clone().lerp(light,t);add(p,c,-1);add(p,c,1);}
    for(let k=0;k<ts.length-1;k++){const a=base+k*2;idx.push(a,a+1,a+2,a+1,a+3,a+2);}}
  // Cambered foredeck from the stem back to just behind the mast, with pale covering boards at the edges.
  {const M=16,across=[-1,-.84,0,.84,1],shade=[C('#f0cc94'),C('#c98448'),C('#d69a58'),C('#c98448'),C('#f0cc94')],base=pos.length/3;
    for(let i=0;i<=M;i++){const s=.48*Math.pow(i/M,1.2),edge=hullPoint(s,1);for(let k=0;k<5;k++){const f=across[k];add(new T.Vector3(f*edge.x,edge.y+.09*(1-f*f)*(edge.x/BEAM)+.005,edge.z),shade[k]);}}
    for(let i=0;i<M;i++)for(let k=0;k<4;k++){const a=base+i*5+k,b=a+5;idx.push(a,b,a+1,a+1,b,b+1);}}
  const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(pos,3));g.setAttribute('color',new T.Float32BufferAttribute(col,3));g.setIndex(idx);g.computeVertexNormals();
  const mesh=new T.Mesh(g,new T.MeshStandardMaterial({vertexColors:true,side:T.DoubleSide,roughness:.7}));mesh.name='boat-hull';mesh.castShadow=mesh.receiveShadow=true;return mesh;
}
function floorMesh(){
  const shape=new T.Shape(),steps=24,from=.05;
  for(let i=0;i<=steps;i++){const s=from+(1-from)*i/steps,x=floorHalf(s)*.99;if(i)shape.lineTo(x,zAt(s));else shape.moveTo(x,zAt(s));}
  for(let i=steps;i>=0;i--){const s=from+(1-from)*i/steps;shape.lineTo(-floorHalf(s)*.99,zAt(s));}
  const g=new T.ShapeGeometry(shape,1);g.rotateX(Math.PI/2);g.translate(0,FLOOR,0);
  let map:T.Texture|null=null;
  if(typeof document!=='undefined'){const c=document.createElement('canvas');c.width=256;c.height=64;const ctx=c.getContext('2d')!;
    for(let k=0;k<4;k++){ctx.fillStyle=['#dba968','#cf9a58','#e2b274','#d4a060'][k];ctx.fillRect(k*64,0,64,64);ctx.fillStyle='rgba(120,70,35,.55)';ctx.fillRect(k*64,0,3,64);ctx.fillStyle='rgba(255,235,190,.35)';ctx.fillRect(k*64+3,0,3,64);}
    map=new T.CanvasTexture(c);map.wrapS=map.wrapT=T.RepeatWrapping;map.colorSpace=T.SRGBColorSpace;map.anisotropy=4;}
  const mesh=new T.Mesh(g,new T.MeshStandardMaterial({map,color:map?'#ffffff':'#d9a15e',side:T.DoubleSide,roughness:.8}));mesh.name='cockpit-floor';mesh.receiveShadow=true;return mesh;
}
/** Cream sailcloth with faint panel seams, a gold border along the leech and foot, and optionally a teal emblem. */
function sailMaterial(emblem:boolean){
  let map:T.Texture|null=null;
  if(typeof document!=='undefined'){const c=document.createElement('canvas');c.width=256;c.height=512;const g=c.getContext('2d')!;
    g.fillStyle='#fff8e8';g.fillRect(0,0,256,512);g.strokeStyle='rgba(214,190,140,.55)';g.lineWidth=2;for(let y=56;y<512;y+=56){g.beginPath();g.moveTo(0,y);g.lineTo(256,y-14);g.stroke();}
    g.fillStyle='#efbf52';g.fillRect(238,0,18,512);g.fillRect(0,484,256,28);g.fillStyle='#fff3cf';g.fillRect(232,0,3,512);g.fillRect(0,478,256,3);
    if(emblem){g.save();g.translate(118,330);g.scale(1,.75);g.strokeStyle='#2fa6a0';g.fillStyle='#2fa6a0';g.lineWidth=9;g.beginPath();g.arc(0,0,62,0,Math.PI*2);g.stroke();
      g.beginPath();for(let k=0;k<16;k++){const a=k/16*Math.PI*2,r=k%2?17:46;g.lineTo(Math.cos(a)*r,Math.sin(a)*r);}g.closePath();g.fill();g.restore();}
    map=new T.CanvasTexture(c);map.colorSpace=T.SRGBColorSpace;map.anisotropy=4;}
  return new T.MeshStandardMaterial({map,color:map?'#ffffff':'#fff8e8',side:T.DoubleSide,roughness:.9});
}
function sailGrid(rows:number,point:(t:number,u:number)=>T.Vector3){
  const pos:number[]=[],uv:number[]=[],idx:number[]=[];
  for(let row=0;row<=rows;row++)for(let col=0;col<=rows;col++){const t=row/rows,u=col/rows,p=point(t,u);pos.push(p.x,p.y,p.z);uv.push(u,1-t);if(row<rows&&col<rows){const a=row*(rows+1)+col;idx.push(a,a+1,a+rows+1,a+1,a+rows+2,a+rows+1);}}
  const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(pos,3));g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));g.setIndex(idx);g.computeVertexNormals();return g;
}

export function animeSailboat(){
  const boat=new T.Group(),kit=new Kit(41),wood=PROP_COLORS.wood,pale='#f0cc94',spar='#f3ddb0',gold=PROP_COLORS.brass,teal='#2fa6a0';
  boat.add(hullMesh(),floorMesh());
  // Pale gunwale along the sheer on both sides, meeting at the stem.
  for(const side of [-1,1]){const pts:T.Vector3[]=[];for(let i=0;i<=20;i++){const p=hullPoint(Math.pow(i/20,1.3),1);pts.push(new T.Vector3(p.x*side,p.y+.03,p.z));}kit.add(tube(pts,.07,60),pale,{},{shade:.1,jitter:0});}
  const stem=hullPoint(0,1);kit.add(new T.SphereGeometry(.11,10,8),gold,{x:0,y:stem.y+.08,z:stem.z},{shade:.1});kit.add(new T.OctahedronGeometry(.1),teal,{x:0,y:stem.y+.25,z:stem.z,sy:1.4},{shade:.1,top:.3});
  // Bulkhead and coaming at the back of the foredeck, with a teal hatch.
  {const s=.48,z=zAt(s),w=floorHalf(s)*2,h=sheer(s)-FLOOR;kit.add(plank(w*.99,h,.07),'#b9743c',{y:FLOOR+h/2,z:z-.03},{shade:.25,jitter:0});kit.add(plank(beam(s)*2,.2,.1),pale,{y:sheer(s)+.07,z},{shade:.1,jitter:0});
    kit.add(plank(.62,.26,.05),teal,{y:FLOOR+h*.5,z:z+.02},{shade:.15,top:.25,jitter:0});kit.add(plank(.7,.34,.03),gold,{y:FLOOR+h*.5,z:z+.005},{shade:.1,jitter:0});}
  // Thwart across the cockpit and a small stern seat.
  {const z=1.6,s=sOf(z);kit.add(plank(beam(s)*1.96,.12,.5),wood,{y:1.27,z},{shade:.2});kit.add(plank(beam(s)*1.96+.02,.05,.54),pale,{y:1.335,z},{shade:.05,jitter:0});}
  kit.add(plank(beam(.98)*1.9,.1,.42),wood,{y:1.27,z:2.9},{shade:.2});
  // Mast, boom and rigging.
  rod(kit,new T.Vector3(0,FLOOR,MAST_Z),new T.Vector3(0,MAST_TOP,MAST_Z),.13,.06,spar,.2);
  for(const y of [1.75,2.3,MAST_TOP-.75])kit.add(new T.CylinderGeometry(.115,.115,.09,10),gold,{y,z:MAST_Z,sx:y>5?.7:1.05,sz:y>5?.7:1.05},{shade:.1});
  kit.add(new T.SphereGeometry(.09,10,8),gold,{y:MAST_TOP+.05,z:MAST_Z},{shade:.1});
  const boomA=new T.Vector3(0,2.45,MAST_Z+.08),boomB=new T.Vector3(0,2.62,3.2);rod(kit,boomA,boomB,.07,.055,spar,.1);kit.add(new T.SphereGeometry(.075,8,6),gold,{x:boomB.x,y:boomB.y,z:boomB.z});
  const mastHead=new T.Vector3(0,MAST_TOP-.8,MAST_Z-.05),bowPoint=new T.Vector3(0,stem.y+.06,stem.z+.1);rod(kit,mastHead,bowPoint,.014,.014,PROP_COLORS.cream,0);
  for(const side of [-1,1]){const p=hullPoint(sOf(-1.05),1);rod(kit,new T.Vector3(0,MAST_TOP-1.8,MAST_Z),new T.Vector3(p.x*side,p.y+.05,-1.05),.013,.013,PROP_COLORS.cream,0);}
  rod(kit,boomB,new T.Vector3(0,1.35,2.75),.012,.012,PROP_COLORS.cream,0);
  // Helm post (the tiller pivots on top of it).
  kit.add(new T.CylinderGeometry(.045,.055,1.73,10),wood,{y:1.115,z:2.9},{shade:.2});kit.add(new T.SphereGeometry(.06,8,6),gold,{y:1.98,z:2.9});
  // Life ring on the starboard side and a rope coil on the foredeck.
  {const z=.6,s=sOf(z),x=hullPoint(s,.8).x+.1;kit.add(new T.TorusGeometry(.34,.1,10,26),PROP_COLORS.cream,{x,y:.86,z,ry:Math.PI/2},{shade:.12,jitter:0});
    for(let k=0;k<4;k++)kit.add(new T.TorusGeometry(.34,.104,10,6,Math.PI*.22),teal,{x,y:.86,z,ry:Math.PI/2,rz:k*Math.PI/2+.3},{shade:.12,jitter:0});}
  {const z=-2.7,y=sheer(sOf(z))+.1;for(let k=0;k<3;k++)kit.add(new T.TorusGeometry(.2+k*.06,.03,6,20),PROP_COLORS.rope,{x:-.55,y:y+.02,z,rx:Math.PI/2},{shade:.05});}
  boat.add(kit.mesh('sloop-fittings'));
  // Mainsail: a 14 by 14 grid, pinned by the game's cloth simulation along the mast and the boom.
  const rows=14,main=new T.Mesh(sailGrid(rows,(t,u)=>new T.Vector3(.1+Math.sin(t*Math.PI)*Math.sin(u*Math.PI)*.65,9.95-t*7.42+u*t*.17,MAST_Z+.08+u*t*4.5)),sailMaterial(true));main.name='sail-cloth';main.castShadow=main.receiveShadow=true;boat.add(main);
  // Jib on the forestay.
  const head=mastHead.clone().lerp(bowPoint,.1),tack=mastHead.clone().lerp(bowPoint,.94),clew=new T.Vector3(0,2.35,MAST_Z-.45);
  const jib=new T.Mesh(sailGrid(10,(t,u)=>{const p=head.clone().lerp(tack.clone().lerp(clew,u),t);p.x+=Math.sin(t*Math.PI)*Math.sin(u*Math.PI)*.42;return p;}),sailMaterial(false));jib.name='jib';jib.castShadow=true;boat.add(jib);
  const flagShape=new T.Shape();flagShape.moveTo(0,0);flagShape.lineTo(1.05,.35);flagShape.lineTo(0,.65);const flag=new T.Mesh(new T.ShapeGeometry(flagShape),new T.MeshStandardMaterial({color:PROP_COLORS.coral,side:T.DoubleSide,roughness:.9}));flag.position.set(0,MAST_TOP-.62,MAST_Z);flag.rotation.y=Math.PI/2;flag.name='sail-flag';boat.add(flag);
  // Cargo.
  const cargo=Props.crate();cargo.position.set(.85,FLOOR+.01,.3);boat.add(cargo);const cask=Props.barrel();cask.position.set(-.85,FLOOR+.01,-.45);boat.add(cask);
  // Rudder and tiller, as separate parts the game turns while steering.
  const rudderKit=new Kit(5);rudderKit.add(plank(.1,1.25,.62),'#b9743c',{},{shade:.25,jitter:0});rudderKit.add(plank(.12,.1,.66),gold,{y:.5},{shade:.1,jitter:0});const rudder=rudderKit.mesh('rudder');rudder.position.set(0,.35,STERN+.33);boat.add(rudder);
  const tiller=new T.Group();tiller.position.copy(TILLER_BASE);boat.add(tiller);const grip=TILLER_GRIP.clone().sub(TILLER_BASE),tillerKit=new Kit(9);rod(tillerKit,new T.Vector3(),grip,.05,.04,wood,.05);tillerKit.add(new T.SphereGeometry(.055,8,6),gold,{x:grip.x,y:grip.y,z:grip.z});tiller.add(tillerKit.mesh('tiller'));
  const handle=new T.Object3D();handle.position.copy(grip);tiller.add(handle);
  boat.userData.tiller=tiller;boat.userData.tillerHandle=handle;boat.userData.rudder=rudder;return boat;
}
