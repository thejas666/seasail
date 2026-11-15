import * as T from 'three';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';

// Hand-painted anime props: the jetty, the island sign and the things you can collect. Each piece is
// painted with vertex colours (darker toward its base, lighter on faces that look up, a little tone
// variation per piece) and every prop is merged into one mesh with one material.
export const PROP_COLORS={wood:'#c98a4b',woodLight:'#e2a764',woodDark:'#7c4a2b',endGrain:'#f2cd92',rope:'#ecd197',iron:'#4f5f7d',brass:'#ecb94c',cream:'#fff6df',blue:'#3b82d6',blueDeep:'#2459a8',coral:'#ff7b5c'};
const paintMaterial=new T.MeshStandardMaterial({vertexColors:true,roughness:.82});
function rng(seed:number){let s=(seed*2654435761)>>>0||1;return ()=>{s^=s<<13;s>>>=0;s^=s>>17;s^=s<<5;s>>>=0;return s/4294967296;};}

type PaintOptions={shade?:number;top?:number;jitter?:number};
/** Collects painted pieces and merges them into a single mesh. */
export class Kit{
  parts:T.BufferGeometry[]=[];random:()=>number;
  constructor(seed:number){this.random=rng(seed);}
  add(geometry:T.BufferGeometry,color:string|T.Color,at:{x?:number;y?:number;z?:number;rx?:number;ry?:number;rz?:number;sx?:number;sy?:number;sz?:number}={},o:PaintOptions={}){
    // Keep the geometry's own smooth normals (computing them after un-indexing would facet every piece).
    if(!geometry.attributes.normal)geometry.computeVertexNormals();let g=geometry.index?geometry.toNonIndexed():geometry.clone();geometry.dispose();
    for(const name of Object.keys(g.attributes))if(name!=='position'&&name!=='normal')g.deleteAttribute(name);
    const m=new T.Matrix4().compose(new T.Vector3(at.x??0,at.y??0,at.z??0),new T.Quaternion().setFromEuler(new T.Euler(at.rx??0,at.ry??0,at.rz??0)),new T.Vector3(at.sx??1,at.sy??1,at.sz??1));g.applyMatrix4(m);g.computeBoundingBox();
    const base=new T.Color(color),p=g.attributes.position,n=g.attributes.normal,min=g.boundingBox!.min.y,span=Math.max(.001,g.boundingBox!.max.y-min),colors=new Float32Array(p.count*3),c=new T.Color();
    const tone=1+(this.random()-.5)*(o.jitter??.1),shade=o.shade??.3,top=o.top??.14;
    for(let i=0;i<p.count;i++){const t=(p.getY(i)-min)/span;c.copy(base).multiplyScalar(tone*(1-shade+shade*t)+Math.max(0,n.getY(i))*top);colors.set([c.r,c.g,c.b],i*3);}
    g.setAttribute('color',new T.BufferAttribute(colors,3));this.parts.push(g);return g;
  }
  mesh(name:string,shadows=true){const merged=mergeGeometries(this.parts,false)!;this.parts.forEach(p=>p.dispose());const mesh=new T.Mesh(merged,paintMaterial);mesh.name=name;mesh.castShadow=shadows;mesh.receiveShadow=true;return mesh;}
}
export const plank=(w:number,h:number,d:number)=>new RoundedBoxGeometry(w,h,d,2,Math.min(.05,w*.2,h*.3,d*.2));
export const tube=(points:T.Vector3[],r:number,seg=12)=>new T.TubeGeometry(new T.CatmullRomCurve3(points),seg,r,6,false);
/** A rope wrapped a few turns around a post. */
function ropeWrap(kit:Kit,x:number,y:number,z:number,r:number,turns=2){for(let k=0;k<turns;k++)kit.add(new T.TorusGeometry(r,.032,6,18),PROP_COLORS.rope,{x,y:y+k*.075,z,rx:Math.PI/2},{shade:.1,top:.2});}
/** A white life ring with four blue bands. */
function lifeRing(kit:Kit,x:number,y:number,z:number,ry:number){
  kit.add(new T.TorusGeometry(.34,.1,10,28),PROP_COLORS.cream,{x,y,z,ry},{shade:.15});
  for(let k=0;k<4;k++)kit.add(new T.TorusGeometry(.34,.104,10,6,Math.PI*.22),PROP_COLORS.blue,{x,y,z,ry,rz:k*Math.PI/2+.3},{shade:.15});
}

// ---------- jetty ----------
/** The wooden jetty. Same footprint, deck height and post positions as the original, so collisions match. */
export function animeDock(){
  const kit=new Kit(17),g=new T.Group();g.name='anime-jetty';const r=kit.random,tones=[PROP_COLORS.wood,PROP_COLORS.woodLight,'#b97a40'];
  for(let j=0;j<26;j++){const z=-3-j*.8;kit.add(plank(4.3+(r()-.5)*.25,.22,.68),tones[Math.floor(r()*3)],{x:(r()-.5)*.08,y:1.36+(r()-.5)*.03,z,ry:(r()-.5)*.035},{shade:.35,top:.12,jitter:.12});
    if(j%3===0)for(const x of [-1.65,1.65])kit.add(new T.CylinderGeometry(.03,.03,.02,6),PROP_COLORS.iron,{x,y:1.48,z});}
  for(const x of [-1.65,1.65])kit.add(plank(.24,.3,21),PROP_COLORS.woodDark,{x,y:1.03,z:-13.4});
  for(const z of [-5.5,-12.5,-19.5])kit.add(plank(4,.12,.18),PROP_COLORS.woodDark,{y:.95,z,rz:.02});
  const posts=[-3,-9.5,-16,-23];
  for(const z of posts)for(const x of [-2,2]){
    kit.add(new T.CylinderGeometry(.19,.24,3.5,10),PROP_COLORS.woodDark,{x,y:.45,z},{shade:.45});
    kit.add(new T.SphereGeometry(.22,10,6,0,Math.PI*2,0,Math.PI/2),PROP_COLORS.wood,{x,y:2.2,z},{shade:.1,top:.2});
    ropeWrap(kit,x,1.62,z,.215,2);
  }
  // Rope rails sag between the posts on both sides.
  for(const x of [-2,2])for(let k=0;k<posts.length-1;k++){const a=posts[k],b=posts[k+1],m=(a+b)/2;kit.add(tube([new T.Vector3(x,2.05,a),new T.Vector3(x,1.82,m),new T.Vector3(x,2.05,b)],.035,16),PROP_COLORS.rope,{},{shade:.1,top:.2});}
  for(const z of [-7,-15])lifeRing(kit,-2.12,1.1,z,Math.PI/2);
  for(const z of [-5,-12]){kit.add(plank(.26,.05,.14),PROP_COLORS.iron,{x:-1.7,y:1.5,z});kit.add(new T.CylinderGeometry(.03,.03,.36,8),PROP_COLORS.iron,{x:-1.7,y:1.6,z,rz:Math.PI/2});}
  // Lanterns on the two posts at the end of the jetty.
  const glow:T.MeshStandardMaterial[]=[];
  for(const x of [-2,2]){kit.add(new T.CylinderGeometry(.04,.05,.5,8),PROP_COLORS.woodDark,{x,y:2.55,z:-23});kit.add(new T.ConeGeometry(.17,.12,8),PROP_COLORS.blueDeep,{x,y:3.12,z:-23},{shade:.1});
    for(const dx of [-.1,.1])for(const dz of [-.1,.1])kit.add(new T.CylinderGeometry(.012,.012,.26,5),PROP_COLORS.brass,{x:x+dx,y:2.94,z:-23+dz});kit.add(new T.CylinderGeometry(.14,.14,.05,8),PROP_COLORS.blueDeep,{x,y:2.8,z:-23});
    const lightMaterial=new T.MeshStandardMaterial({color:'#ffe7a8',emissive:'#ffb347',emissiveIntensity:.05,roughness:.4});glow.push(lightMaterial);const bulb=new T.Mesh(new T.BoxGeometry(.17,.22,.17),lightMaterial);bulb.position.set(x,2.94,-23);g.add(bulb);}
  g.add(kit.mesh('jetty-wood'));g.userData.nightMaterials=glow;return g;
}

// ---------- sign ----------
function signLettering(text:string){
  if(typeof document==='undefined')return null;const c=document.createElement('canvas');c.width=640;c.height=160;const ctx=c.getContext('2d')!;
  const draw=()=>{ctx.clearRect(0,0,640,160);ctx.font='76px Heyam, "Lilita One", sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.lineJoin='round';
    ctx.lineWidth=12;ctx.strokeStyle='#5b3418';ctx.strokeText(text,320,88,600);ctx.fillStyle='#fff6df';ctx.fillText(text,320,88,600);};
  draw();const texture=new T.CanvasTexture(c);texture.colorSpace=T.SRGBColorSpace;texture.anisotropy=4;
  // The game font may still be loading when the sign is made; repaint once it is ready.
  document.fonts?.load('76px Heyam').then(()=>{draw();texture.needsUpdate=true;}).catch(()=>{});
  return texture;
}
/** A chunky plank sign on two posts with a blue painted header and the name in the game's font. */
export function animeSign(text:string){
  const kit=new Kit(text.length*13+5),g=new T.Group();g.name='anime-island-sign';const r=kit.random;
  for(const x of [-1.2,1.2]){kit.add(new T.CylinderGeometry(.09,.12,2.7,8),PROP_COLORS.woodDark,{x,y:1.15,z:-.02},{shade:.45});kit.add(new T.SphereGeometry(.1,8,5,0,Math.PI*2,0,Math.PI/2),PROP_COLORS.wood,{x,y:2.5,z:-.02});ropeWrap(kit,x,1.68,-.02,.11,2);}
  for(let k=0;k<3;k++)kit.add(plank(2.75+(r()-.5)*.12,.27,.12),k===1?PROP_COLORS.woodLight:PROP_COLORS.wood,{x:(r()-.5)*.05,y:1.8+k*.28,z:.08,rz:(r()-.5)*.03},{shade:.25,jitter:.12});
  kit.add(plank(2.95,.16,.16),PROP_COLORS.blue,{y:2.47,z:.08},{shade:.2,top:.25});
  for(const x of [-1.15,1.15])for(const y of [1.8,2.36])kit.add(new T.SphereGeometry(.03,6,4),PROP_COLORS.iron,{x,y,z:.15});
  g.add(kit.mesh('sign-wood'));const texture=signLettering(text);
  if(texture){const label=new T.Mesh(new T.PlaneGeometry(2.6,.65),new T.MeshStandardMaterial({map:texture,transparent:true,roughness:1,depthWrite:false}));label.position.set(0,2.08,.15);g.add(label);}
  return g;
}

// ---------- collectibles ----------
export type PickupKind='wood'|'fiber'|'scrap'|'fruit'|'fish'|'shell'|'rod'|'chart';
/** A collectible item in the anime style, sitting on y=0 like the originals. */
export function animePickup(kind:PickupKind){
  const kit=new Kit(kind.length*31+7),g=new T.Group();g.name=`anime-pickup-${kind}`;const r=kit.random;
  if(kind==='wood'){
    // Three cut logs tied with rope.
    for(const [x,y] of [[-.21,.17],[.21,.17],[0,.46]] as const){kit.add(new T.CylinderGeometry(.17,.18,1.05,10),'#9b6034',{x,y,z:0,rx:Math.PI/2},{shade:.25});
      for(const side of [-1,1])kit.add(new T.CylinderGeometry(.165,.165,.02,10),PROP_COLORS.endGrain,{x,y,z:side*.53,rx:Math.PI/2},{shade:0,top:0});}
    for(const z of [-.28,.28])kit.add(new T.TorusGeometry(.42,.03,6,22),PROP_COLORS.rope,{y:.3,z,sy:.95},{shade:.05});
  }else if(kind==='fiber'){
    // A sheaf of long grass tied in the middle.
    for(let k=0;k<11;k++){const a=k/11*Math.PI*2,lean=.15+r()*.2,h=1.1+r()*.35,x=Math.cos(a)*.08,z=Math.sin(a)*.08;
      kit.add(tube([new T.Vector3(x,0,z),new T.Vector3(x*1.6,h*.45,z*1.6),new T.Vector3(x*3+Math.cos(a)*lean,h,z*3+Math.sin(a)*lean)],.035,8),k%2?'#6cbf3e':'#8fd24c',{},{shade:.55,top:.1,jitter:.15});}
    kit.add(new T.TorusGeometry(.13,.035,6,16),PROP_COLORS.rope,{y:.42,rx:Math.PI/2});
  }else if(kind==='scrap'){
    // A bent metal plate, a brass gear and a few bolts.
    kit.add(plank(.85,.07,.6),'#8aa0c2',{y:.08,rz:.06,ry:.2},{shade:.2,top:.25});kit.add(plank(.4,.06,.35),'#6d84a8',{x:-.15,y:.16,z:.05,rz:-.25,ry:.5},{shade:.2,top:.25});
    kit.add(new T.CylinderGeometry(.19,.19,.07,16),PROP_COLORS.brass,{x:.2,y:.2,z:-.05},{shade:.1,top:.3});
    for(let k=0;k<8;k++){const a=k/8*Math.PI*2;kit.add(new T.BoxGeometry(.07,.07,.07),PROP_COLORS.brass,{x:.2+Math.cos(a)*.22,y:.2,z:-.05+Math.sin(a)*.22,ry:-a},{shade:.1,top:.3});}
    kit.add(new T.CylinderGeometry(.06,.06,.08,10),'#5d6f8f',{x:.2,y:.22,z:-.05});
    for(const [x,z] of [[-.32,.2],[.33,.22],[-.3,-.2]] as const)kit.add(new T.CylinderGeometry(.04,.04,.06,6),'#5d6f8f',{x,y:.14,z});
  }else if(kind==='fruit'){
    // A ripe mango: coral at the bottom blushing to gold, with a stem and a glossy leaf.
    const fruit=kit.add(new T.SphereGeometry(.3,18,12),'#ffffff',{y:.33,sx:1,sy:1.18,sz:.88},{shade:0,top:0});
    const p=fruit.attributes.position,colors=fruit.attributes.color,lo=new T.Color('#ff5a3c'),hi=new T.Color('#ffd34a'),c=new T.Color();
    for(let i=0;i<p.count;i++){const t=T.MathUtils.clamp((p.getY(i)-.03)/.62,0,1);c.copy(lo).lerp(hi,Math.pow(t,1.3)).multiplyScalar(.82+t*.25);colors.setXYZ(i,c.r,c.g,c.b);}
    kit.add(new T.CylinderGeometry(.022,.03,.14,6),PROP_COLORS.woodDark,{y:.72});
    kit.add(new T.SphereGeometry(.2,10,6),'#4fb53a',{x:.14,y:.75,sx:1,sy:.16,sz:.42,rz:.35,ry:.4},{shade:.2,top:.3});
  }else if(kind==='fish'){
    // A blue fish with a pale belly, fins and a tail.
    const body=kit.add(new T.SphereGeometry(.3,18,12),'#ffffff',{y:.32,sx:.42,sy:.62,sz:1.15},{shade:0,top:0});
    const p=body.attributes.position,colors=body.attributes.color,back=new T.Color('#2f73cf'),belly=new T.Color('#eef6ff'),c=new T.Color();
    for(let i=0;i<p.count;i++){const t=T.MathUtils.clamp((p.getY(i)-.13)/.38,0,1);c.copy(belly).lerp(back,T.MathUtils.smoothstep(t,.3,.75));colors.setXYZ(i,c.r,c.g,c.b);}
    kit.add(new T.ConeGeometry(.18,.32,4),'#2a64b8',{y:.32,z:-.45,rx:-Math.PI/2,sx:.25},{shade:.2});
    kit.add(new T.ConeGeometry(.08,.2,4),'#4b8fe0',{y:.55,z:-.02,sx:.2},{shade:.2});
    for(const side of [-1,1])kit.add(new T.SphereGeometry(.035,8,6),'#1d2433',{x:side*.115,y:.38,z:.24},{shade:0,top:.3});
  }else if(kind==='shell'){
    // A scallop: a fan of pink ribs over a cream base.
    for(let k=0;k<9;k++){const a=(k/8-.5)*2.3;kit.add(new T.SphereGeometry(.1,10,6),k%2?'#ff9e98':'#ffb8a8',{x:Math.sin(a)*.2,y:.14,z:Math.cos(a)*.2-.1,ry:a,sx:.55,sy:.55,sz:2.2},{shade:.35,top:.25});}
    kit.add(new T.SphereGeometry(.12,10,6),PROP_COLORS.cream,{y:.07,z:-.12,sx:1.2,sy:.5,sz:.8},{shade:.2});
  }else if(kind==='rod'){
    // A bamboo rod with nodes, a line and a red and white float.
    const a=new T.Vector3(-1,0,0),b=new T.Vector3(1,1.6,0),dir=b.clone().sub(a),len=dir.length(),angle=Math.atan2(dir.y,dir.x)-Math.PI/2;
    kit.add(new T.CylinderGeometry(.035,.06,len,8),'#d9c46a',{x:0,y:.8,rz:angle},{shade:.15,top:.25});
    for(let k=1;k<6;k++){const t=k/6,pnt=a.clone().lerp(b,t);kit.add(new T.CylinderGeometry(.065-t*.025,.065-t*.025,.04,8),'#b39a45',{x:pnt.x,y:pnt.y,rz:angle});}
    kit.add(tube([b,new T.Vector3(1.1,1.1,.05),new T.Vector3(1.05,.45,.05)],.008,10),'#f4f4f4',{},{shade:0});
    kit.add(new T.SphereGeometry(.07,10,8,0,Math.PI*2,0,Math.PI/2),PROP_COLORS.coral,{x:1.05,y:.45,z:.05,rx:Math.PI},{shade:0});kit.add(new T.SphereGeometry(.07,10,8,0,Math.PI*2,0,Math.PI/2),PROP_COLORS.cream,{x:1.05,y:.45,z:.05},{shade:0});
    kit.add(new T.TorusGeometry(.13,.04,6,14),PROP_COLORS.blueDeep,{x:-.55,y:.18,z:0,ry:.1},{shade:.1});
  }
  if(kit.parts.length){const m=kit.mesh(`pickup-${kind}`);if(kind==='fish'||kind==='shell')m.scale.setScalar(1.6);g.add(m);}
  return g;
}
let glowTexture:T.Texture|null|undefined;
/** The soft pale-blue glow under a collectible, marking it out in the grass. */
export function animePickupGlow(){
  if(glowTexture===undefined){glowTexture=null;if(typeof document!=='undefined'){const c=document.createElement('canvas');c.width=c.height=128;const g=c.getContext('2d')!,grad=g.createRadialGradient(64,64,10,64,64,64);
    grad.addColorStop(0,'rgba(255,255,255,0)');grad.addColorStop(.55,'rgba(200,232,255,.35)');grad.addColorStop(.8,'rgba(235,248,255,.95)');grad.addColorStop(.9,'rgba(200,232,255,.4)');grad.addColorStop(1,'rgba(200,232,255,0)');
    g.fillStyle=grad;g.fillRect(0,0,128,128);glowTexture=new T.CanvasTexture(c);}}
  const disc=new T.Mesh(new T.PlaneGeometry(2.2,2.2),new T.MeshBasicMaterial({map:glowTexture,color:'#cfeaff',transparent:true,opacity:.55,depthWrite:false,blending:T.AdditiveBlending}));
  disc.rotation.x=-Math.PI/2;disc.name='pickup-glow';return disc;
}

// ---------- boat ----------
/** Repaint the sailing boat: blue lower hull with a white band under warm wood, a striped sail and fresh trim. */
export function paintAnimeBoat(boat:T.Group){
  const hull=boat.getObjectByName('boat-hull') as T.Mesh|undefined;
  if(hull){const g=hull.geometry,p=g.attributes.position,colors=new Float32Array(p.count*3),c=new T.Color(),deep=new T.Color(PROP_COLORS.blueDeep),blue=new T.Color(PROP_COLORS.blue),white=new T.Color(PROP_COLORS.cream),wood=new T.Color(PROP_COLORS.wood),woodTop=new T.Color(PROP_COLORS.woodLight);
    for(let i=0;i<p.count;i++){const y=p.getY(i);if(y<.42)c.copy(deep).lerp(blue,T.MathUtils.smoothstep(y,-.4,.42));else if(y<.62)c.copy(white);else c.copy(wood).lerp(woodTop,T.MathUtils.smoothstep(y,.62,1.05));colors.set([c.r,c.g,c.b],i*3);}
    g.setAttribute('color',new T.BufferAttribute(colors,3));const m=hull.material as T.MeshStandardMaterial;m.vertexColors=true;m.color.set('#ffffff');m.needsUpdate=true;}
  const sail=boat.getObjectByName('sail-cloth') as T.Mesh|undefined;
  if(sail){const g=sail.geometry,p=g.attributes.position,colors=new Float32Array(p.count*3),c=new T.Color(),cream=new T.Color('#fff8e6'),blue=new T.Color(PROP_COLORS.blue);
    for(let i=0;i<p.count;i++){const y=p.getY(i),stripe=(y>4.15&&y<4.75)||(y>5.2&&y<5.45);c.copy(stripe?blue:cream);colors.set([c.r,c.g,c.b],i*3);}
    g.setAttribute('color',new T.BufferAttribute(colors,3));const m=sail.material as T.MeshStandardMaterial;m.vertexColors=true;m.color.set('#ffffff');m.needsUpdate=true;}
  const flag=boat.getObjectByName('sail-flag') as T.Mesh|undefined;if(flag)(flag.material as T.MeshStandardMaterial).color.set(PROP_COLORS.coral);
}
