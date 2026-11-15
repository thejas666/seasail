import * as T from 'three';
import {mergeGeometries,mergeVertices} from 'three/addons/utils/BufferGeometryUtils.js';

// Carved anime-style stone: rounded blocks sliced by a few flat cuts, painted pale lavender-grey with
// soft moss on the upward faces. Tall cliff pillars are stacks of the same blocks.
function rng(seed:number){let s=(seed*2654435761)>>>0||1;return ()=>{s^=s<<13;s>>>=0;s^=s>>17;s^=s<<5;s>>>=0;return s/4294967296;};}
const STONE={shadow:new T.Color('#7f86a6'),mid:new T.Color('#b3b9d2'),light:new T.Color('#eceef6'),moss:new T.Color('#5fae38'),mossLight:new T.Color('#b6ea68')};
const cache=new Map<string,T.BufferGeometry>();
let material:T.MeshStandardMaterial|undefined;
export const animeStoneMaterial=()=>material??=new T.MeshStandardMaterial({vertexColors:true,roughness:.95});

/** One carved block centred on the origin, roughly spanning -1..1 before scaling. */
function block(random:()=>number,cuts:number,round:number,lift=1.6,depth=.62){
  let g:T.BufferGeometry=new T.BoxGeometry(2,2,2,5,5,5);g.deleteAttribute('normal');g.deleteAttribute('uv');g=mergeVertices(g);
  const p=g.attributes.position,v=new T.Vector3(),s=new T.Vector3(),planes:{n:T.Vector3;d:number}[]=[];
  for(let k=0;k<cuts;k++){const n=new T.Vector3(random()*2-1,(random()*1.6-.4)*lift/1.6,random()*2-1).normalize();planes.push({n,d:depth+random()*.3});}
  for(let i=0;i<p.count;i++){
    v.fromBufferAttribute(p,i);s.copy(v).normalize().multiplyScalar(1.2);v.lerp(s,round);
    for(const {n,d} of planes){const h=v.dot(n);if(h>d)v.addScaledVector(n,d-h);}
    p.setXYZ(i,v.x,v.y,v.z);
  }
  return g;
}
/** Paint stone by facing and height, with moss on faces that look at the sky. */
function paint(g:T.BufferGeometry,seed:number,moss:number,tone=1){
  g.computeVertexNormals();g.computeBoundingBox();
  const p=g.attributes.position,n=g.attributes.normal,min=g.boundingBox!.min.y,span=Math.max(.01,g.boundingBox!.max.y-min),colors=new Float32Array(p.count*3),c=new T.Color();
  for(let i=0;i<p.count;i++){
    const ny=n.getY(i),t=(p.getY(i)-min)/span,streak=Math.sin(p.getX(i)*5.3+seed)*Math.sin(p.getZ(i)*4.7)*.06;
    const light=T.MathUtils.clamp((ny*.5+.5)*.62+t*.28+(n.getX(i)*-.3+n.getZ(i)*.3)*.15+streak,0,1);
    if(light<.5)c.copy(STONE.shadow).lerp(STONE.mid,light*2);else c.copy(STONE.mid).lerp(STONE.light,(light-.5)*2);
    const m=moss*T.MathUtils.smoothstep(ny,.62,.86)*(.75+Math.sin(p.getX(i)*3.1+p.getZ(i)*2.3+seed)*.25);
    if(m>0)c.lerp(STONE.moss.clone().lerp(STONE.mossLight,T.MathUtils.clamp(ny*.6+t*.4,0,1)),T.MathUtils.clamp(m*1.4,0,1));
    c.multiplyScalar(tone);colors.set([c.r,c.g,c.b],i*3);
  }
  g.setAttribute('color',new T.BufferAttribute(colors,3));g.computeBoundingSphere();return g;
}
/** A squat boulder about 2 units wide and 1.4 tall, resting on y=0. */
export function animeBoulderGeometry(variant:number,moss=1){
  const key=`b${variant}:${moss}`;if(cache.has(key))return cache.get(key)!;
  const random=rng(variant*31+7),g=block(random,5+Math.floor(random()*3),.32);
  g.scale(1+random()*.25,.68+random()*.2,.9+random()*.2);g.computeBoundingBox();g.translate(0,-g.boundingBox!.min.y-.06,0);
  paint(g,variant,moss);cache.set(key,g);return g;
}
/** A tall cliff pillar of fused carved blocks, `height` tall and about 2×`width` across at the base. */
export function animeSpireGeometry(variant:number,height=6,moss=1,width=height*.22){
  const key=`s${variant}:${height}:${moss}:${width}`;if(cache.has(key))return cache.get(key)!;
  const random=rng(variant*53+11),parts:T.BufferGeometry[]=[],tiers=2+(random()<.4?1:0);let y=0,x=0,z=0;
  for(let k=0;k<tiers;k++){
    const h=height/tiers*(1.2-k*.12),w=width*(1-k*.2)*(.9+random()*.2),g=block(random,5+Math.floor(random()*3),.16,.5);
    g.scale(w,h*.6,w*(.8+random()*.25));g.rotateY(random()*6.28);g.computeBoundingBox();g.translate(x,y-g.boundingBox!.min.y-h*.08,z);
    parts.push(g);y+=h*.86;x+=(random()-.5)*width*.12;z+=(random()-.5)*width*.12;
  }
  const merged=mergeGeometries(parts,false)!;parts.forEach(g=>g.dispose());merged.computeBoundingBox();merged.translate(0,-merged.boundingBox!.min.y-.1,0);
  paint(merged,variant,moss);cache.set(key,merged);return merged;
}
/** A weathered ruin block, 1×1×1 centred on the origin: scale the mesh to the size you need. */
export function animeBlockGeometry(variant:number,tone=1,moss=.8){
  const key=`k${variant}:${tone}:${moss}`;if(cache.has(key))return cache.get(key)!;
  const random=rng(variant*71+3),g=block(random,1+Math.floor(random()*2),.1,.8,.86);g.computeBoundingBox();
  const box=g.boundingBox!,size=box.getSize(new T.Vector3()),center=box.getCenter(new T.Vector3());g.translate(-center.x,-center.y,-center.z);g.scale(1/size.x,1/size.y,1/size.z);
  paint(g,variant,moss,tone);cache.set(key,g);return g;
}
/** A worn column centred on the origin, with an uneven, chipped top. */
export function animeColumnGeometry(variant:number,radiusTop:number,radiusBottom:number,height:number,tone=1,moss=.8){
  const key=`c${variant}:${radiusTop}:${radiusBottom}:${height}:${tone}:${moss}`;if(cache.has(key))return cache.get(key)!;
  const random=rng(variant*97+5),wobble=[0,1,2,3,4,5,6,7,8].map(()=>.93+random()*.12),chip=random()*6.28;
  let g:T.BufferGeometry=new T.CylinderGeometry(radiusTop,radiusBottom,height,9,6);g.deleteAttribute('normal');g.deleteAttribute('uv');g=mergeVertices(g);
  const p=g.attributes.position,v=new T.Vector3();
  for(let i=0;i<p.count;i++){v.fromBufferAttribute(p,i);const a=Math.atan2(v.z,v.x),k=Math.round((a+Math.PI)/(Math.PI*2)*9)%9,r=wobble[k];v.x*=r;v.z*=r;
    if(v.y>height/2-.01)v.y-=Math.max(0,Math.cos(a-chip))*height*.06+random()*.03;p.setXYZ(i,v.x,v.y,v.z);}
  paint(g,variant,moss,tone);cache.set(key,g);return g;
}
export function animeStone(geometry:T.BufferGeometry){const m=new T.Mesh(geometry,animeStoneMaterial());m.castShadow=m.receiveShadow=true;m.userData.cameraSolid=true;m.userData.platform=true;return m;}
