import * as T from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';

// Painterly anime-style trees: S-bent tapered trunks with root flare, branches that end in big
// clustered canopies built from leaf cards, and flat-padded pines. Canopy normals are bent outward
// from each cluster so the light wraps softly, like the hand-painted foliage of open-world anime games.
export type AnimeTreeKind='red'|'gold'|'green'|'pink'|'lime'|'deep'|'pine';
type Palette=[string,string,string];
const PALETTES:Record<AnimeTreeKind,Palette>={
  red:['#c42c28','#ff5236','#ff9868'],
  gold:['#d27806','#ffbb18','#ffea5c'],
  green:['#2c7d2c','#62bb3a','#d6f774'],
  pink:['#c23450','#ff5f6c','#ffa293'],
  lime:['#3b8c22','#80d03a','#e6fb84'],
  deep:['#1d6a2e','#44a83c','#c2ee6c'],
  pine:['#14685c','#26a88e','#7ff0c4'],
};
export const BUSH_PALETTES={green:['#2f8a2c','#5fc23a','#c8f46a'] as Palette,yellow:['#c88a06','#ffcc1e','#fff070'] as Palette,red:['#9c2a2c','#d8483c','#ff9a78'] as Palette};

function rng(seed:number){let s=(seed*2654435761)>>>0||1;return ()=>{s^=s<<13;s>>>=0;s^=s>>17;s^=s<<5;s>>>=0;return s/4294967296;};}
const V=(x:number,y:number,z:number)=>new T.Vector3(x,y,z);

// ---------- materials ----------
let leafTexture:T.Texture|null|undefined;
/** A star-shaped clump of pointed leaves, painted in greys so the vertex colours show through. */
function leafMap(){
  if(leafTexture!==undefined)return leafTexture;
  if(typeof document==='undefined')return leafTexture=null;
  const size=128,canvas=document.createElement('canvas');canvas.width=canvas.height=size;const g=canvas.getContext('2d')!;const r=rng(7);
  const leaf=(x:number,y:number,len:number,w:number,angle:number,shade:number)=>{
    g.save();g.translate(x,y);g.rotate(angle);const grad=g.createLinearGradient(0,0,0,-len);
    const base=Math.round(shade*.88),tip=Math.min(255,Math.round(shade*1.1));grad.addColorStop(0,`rgb(${base},${base},${base})`);grad.addColorStop(1,`rgb(${tip},${tip},${tip})`);
    g.fillStyle=grad;g.beginPath();g.moveTo(0,0);g.bezierCurveTo(w,-len*.25,w*.8,-len*.7,0,-len);g.bezierCurveTo(-w*.8,-len*.7,-w,-len*.25,0,0);g.fill();g.restore();
  };
  for(let k=0;k<13;k++){const a=k/13*Math.PI*2+(r()-.5)*.35;leaf(64,64,36+r()*22,9+r()*5,a,212+r()*43);}
  for(let k=0;k<6;k++){const a=k/6*Math.PI*2+.4;leaf(64+Math.sin(a)*6,64-Math.cos(a)*6,22+r()*10,7,a,230+r()*25);}
  leafTexture=new T.CanvasTexture(canvas);leafTexture.colorSpace=T.SRGBColorSpace;leafTexture.anisotropy=4;return leafTexture;
}
let cardMat:T.MeshStandardMaterial|undefined,cardDepth:T.MeshDepthMaterial|undefined;
function cardMaterial(){
  if(!cardMat){const map=leafMap();cardMat=new T.MeshStandardMaterial({vertexColors:true,roughness:.95,side:T.DoubleSide,map:map??null,alphaTest:map?.42:0});
    // Both faces of a card share the bent canopy normal, so the back of a leaf is lit like its front.
    cardMat.onBeforeCompile=shader=>{shader.fragmentShader=shader.fragmentShader.replace('#include <normal_fragment_begin>',T.ShaderChunk.normal_fragment_begin.replace('gl_FrontFacing ? 1.0 : - 1.0','1.0'));};cardMat.customProgramCacheKey=()=>'anime-leaf-cards-v1';
    cardDepth=new T.MeshDepthMaterial({depthPacking:T.RGBADepthPacking,map:map??null,alphaTest:map?.42:0});}
  return cardMat;
}
const coreMat=new T.MeshStandardMaterial({vertexColors:true,roughness:1});
const barkMat=new T.MeshStandardMaterial({vertexColors:true,roughness:.9});

// ---------- wood ----------
/** A tube that narrows from r0 to r1 along its curve, with a subtle flare at the base. */
function taperTube(curve:T.Curve<T.Vector3>,r0:number,r1:number,segments=14,radial=8,flare=0){
  const g=new T.TubeGeometry(curve,segments,1,radial,false),p=g.attributes.position,c=new T.Vector3(),v=new T.Vector3();
  for(let i=0;i<=segments;i++){const t=i/segments;curve.getPointAt(t,c);const r=T.MathUtils.lerp(r0,r1,Math.pow(t,.8))*(1+flare*Math.exp(-t*9));
    for(let j=0;j<=radial;j++){const k=i*(radial+1)+j;v.fromBufferAttribute(p,k).sub(c).multiplyScalar(r).add(c);p.setXYZ(k,v.x,v.y,v.z);}}
  g.computeVertexNormals();return g;
}
function woodMesh(parts:T.BufferGeometry[],height:number){
  const merged=mergeGeometries(parts,false)!;parts.forEach(p=>p.dispose());
  const dark=new T.Color('#6a4232'),light=new T.Color('#c99a72'),c=new T.Color(),p=merged.attributes.position,n=merged.attributes.normal,colors=new Float32Array(p.count*3);
  for(let k=0;k<p.count;k++){const t=T.MathUtils.clamp(p.getY(k)/height,0,1);c.copy(dark).lerp(light,.35+t*.35+Math.max(0,n.getX(k)*.3+n.getZ(k)*.2));colors.set([c.r,c.g,c.b],k*3);}
  merged.setAttribute('color',new T.BufferAttribute(colors,3));
  const mesh=new T.Mesh(merged,barkMat);mesh.castShadow=mesh.receiveShadow=true;mesh.userData.cameraSolid=true;mesh.name='anime-tree-wood';return mesh;
}

// ---------- foliage ----------
type Cluster={c:T.Vector3;r:number};
type CanopyOptions={flat:number;density:number;card:number;core:number};
function paint(pal:Palette,light:number,out:T.Color){const a=new T.Color(pal[0]),b=new T.Color(pal[1]),c=new T.Color(pal[2]);light=T.MathUtils.clamp(light,0,1);return light<.5?out.copy(a).lerp(b,light*2):out.copy(b).lerp(c,(light-.5)*2);}
/** Leaf cards filling overlapping ellipsoids; inner cards are painted darker so the crown has depth. */
function canopy(clusters:Cluster[],pal:Palette,random:()=>number,o:CanopyOptions){
  const center=new T.Vector3();for(const k of clusters)center.add(k.c);center.divideScalar(clusters.length);
  let minY=Infinity,maxY=-Infinity;for(const k of clusters){minY=Math.min(minY,k.c.y-k.r*o.flat);maxY=Math.max(maxY,k.c.y+k.r*o.flat);}
  const span=Math.max(.01,maxY-minY),cards:T.BufferGeometry[]=[],cores:T.BufferGeometry[]=[],dummy=new T.Object3D(),color=new T.Color();
  // Bend each vertex normal outward from its cluster and the whole crown, then paint by height and facing.
  const finish=(g:T.BufferGeometry,k:Cluster,darken:number,jitter:number)=>{
    const p=g.attributes.position,normals=new Float32Array(p.count*3),colors=new Float32Array(p.count*3),v=new T.Vector3(),a=new T.Vector3(),b=new T.Vector3();
    for(let n=0;n<p.count;n++){
      v.fromBufferAttribute(p,n);a.copy(v).sub(k.c);a.y/=o.flat;a.normalize();b.copy(v).sub(center);b.y/=o.flat;b.normalize();a.multiplyScalar(.62).addScaledVector(b,.38).normalize();
      normals.set([a.x,a.y,a.z],n*3);
      const t=(v.y-minY)/span,light=(t*.6+a.y*.26+(a.x*.5+a.z*.3)*.12+.26)*darken+jitter;
      paint(pal,light,color);colors.set([color.r,color.g,color.b],n*3);
    }
    g.setAttribute('normal',new T.BufferAttribute(normals,3));g.setAttribute('color',new T.BufferAttribute(colors,3));
  };
  for(const k of clusters){
    if(o.core>0){const core=new T.IcosahedronGeometry(k.r*o.core,2),p=core.attributes.position,v=new T.Vector3();
      for(let n=0;n<p.count;n++){v.fromBufferAttribute(p,n);const w=1+Math.sin(v.x*3.1+k.c.x)*Math.cos(v.z*2.7+k.c.z)*.12;p.setXYZ(n,v.x*w,v.y*w*o.flat,v.z*w);}
      core.translate(k.c.x,k.c.y,k.c.z);finish(core,k,.55,-.06);cores.push(core);}
    const count=Math.round(o.density*k.r*k.r);
    for(let n=0;n<count;n++){
      const dir=V(random()*2-1,random()*2-1,random()*2-1);if(dir.lengthSq()>1||dir.lengthSq()<.01){n--;continue;}dir.normalize();
      if(dir.y<-.35&&random()<.55)dir.y=-dir.y;  // fewer cards on the underside
      const depth=.3+Math.sqrt(random())*.8,p=V(dir.x*k.r*depth,dir.y*k.r*depth*o.flat,dir.z*k.r*depth).add(k.c),out=V(dir.x,dir.y/o.flat,dir.z).normalize();
      const s=o.card*(.7+random()*.6),plane=new T.PlaneGeometry(s,s);
      dummy.position.copy(p);dummy.lookAt(p.clone().add(out));dummy.rotateZ(random()*Math.PI*2);dummy.rotateX((random()-.5)*.9);dummy.updateMatrix();plane.applyMatrix4(dummy.matrix);
      finish(plane,k,.72+depth*.3,(random()-.5)*.12);cards.push(plane);
    }
  }
  const group=new T.Group();
  const leaves=new T.Mesh(mergeGeometries(cards,false)!,cardMaterial());leaves.customDepthMaterial=cardDepth;leaves.castShadow=leaves.receiveShadow=true;leaves.name='anime-leaf-cards';group.add(leaves);
  if(cores.length){const core=new T.Mesh(mergeGeometries(cores,false)!,coreMat);core.castShadow=core.receiveShadow=true;core.name='anime-leaf-core';group.add(core);}
  cards.forEach(g=>g.dispose());cores.forEach(g=>g.dispose());return group;
}

// ---------- trees ----------
function broadleaf(kind:Exclude<AnimeTreeKind,'pine'>,seed:number,height:number){
  const r=rng(seed),root=new T.Group(),wood:T.BufferGeometry[]=[],clusters:Cluster[]=[];
  const spread=kind==='red'||kind==='deep'?1.25:kind==='pink'?1.1:1,bend=height*(.1+r()*.1),base=height*.07;
  // An S-bend with the top leaning out over one side, like the hero trees in the reference.
  const trunk=new T.CatmullRomCurve3([V(0,0,0),V(bend*.55,height*.22,bend*.1),V(-bend*.2,height*.45,-bend*.15),V(bend*.5,height*.68,bend*.1),V(bend*1.1,height*.86,0)]);
  wood.push(taperTube(trunk,base,base*.42,18,9,.45));
  for(let k=0;k<4;k++){const a=k*1.57+r()*.6,l=height*(.14+r()*.06);
    wood.push(taperTube(new T.CatmullRomCurve3([V(0,height*.08,0),V(Math.cos(a)*l*.5,height*.03,Math.sin(a)*l*.5),V(Math.cos(a)*l,-.12,Math.sin(a)*l)]),base*.55,base*.12,8,6));}
  const branches=4+Math.floor(r()*2);
  for(let k=0;k<branches;k++){
    const t=.55+k/branches*.38,start=trunk.getPointAt(t),a=k*2.399+r()*.7,reach=height*(.32+r()*.18)*spread;
    const end=start.clone().add(V(Math.cos(a)*reach,height*(.1+r()*.14),Math.sin(a)*reach)),mid=start.clone().lerp(end,.5).add(V(0,height*.06,0));
    wood.push(taperTube(new T.CatmullRomCurve3([start,mid,end]),base*.45*(1-k*.06),base*.12,10,6));
    const cr=height*(.19+r()*.06)*Math.sqrt(spread);clusters.push({c:end.clone().add(V(0,cr*.25,0)),r:cr});
    if(r()<.7)clusters.push({c:start.clone().lerp(end,.55).add(V(0,cr*.55,0)),r:cr*.72});
  }
  const top=trunk.getPointAt(1);clusters.push({c:top.clone().add(V(0,height*.14,0)),r:height*.25*Math.sqrt(spread)});
  root.add(woodMesh(wood,height));root.add(canopy(clusters,PALETTES[kind],r,{flat:.68,density:120,card:height*.115,core:0}));return root;
}
function pine(seed:number,height:number){
  const r=rng(seed),root=new T.Group(),wood:T.BufferGeometry[]=[],clusters:Cluster[]=[],bend=height*.08,base=height*.045;
  const trunk=new T.CatmullRomCurve3([V(0,0,0),V(bend,height*.3,0),V(-bend*.6,height*.6,bend*.4),V(bend*.4,height,0)]);
  wood.push(taperTube(trunk,base,base*.35,16,8,.35));
  const tiers=4+Math.floor(r()*2);
  for(let k=0;k<tiers;k++){
    const t=.42+k/tiers*.5,start=trunk.getPointAt(t),a=k*2.4+r()*.8,reach=height*(.2+r()*.12)*(1.15-t*.5);
    const end=start.clone().add(V(Math.cos(a)*reach,height*.03,Math.sin(a)*reach));
    wood.push(taperTube(new T.CatmullRomCurve3([start,start.clone().lerp(end,.5).add(V(0,-height*.02,0)),end]),base*.4,base*.1,8,5));
    clusters.push({c:end.clone().add(V(0,height*.04,0)),r:height*(.17+r()*.04)});
  }
  clusters.push({c:trunk.getPointAt(1).add(V(0,height*.05,0)),r:height*.19});
  root.add(woodMesh(wood,height));root.add(canopy(clusters,PALETTES.pine,r,{flat:.42,density:120,card:height*.085,core:0}));return root;
}
/** A tree in the anime style. The returned trunk is the solid used for collisions and camera blocking. */
export function animeTree(kind:AnimeTreeKind,seed:number,height:number){
  const group=kind==='pine'?pine(seed,height):broadleaf(kind,seed,height);group.name=`anime-tree-${kind}`;
  const trunk=group.getObjectByName('anime-tree-wood') as T.Mesh;return {group,trunk};
}
/** A low leafy bush made of the same leaf cards as the trees. */
export function animeBush(seed:number,size:number,palette:Palette=BUSH_PALETTES.green){
  const r=rng(seed),clusters:Cluster[]=[{c:V(0,size*.55,0),r:size}];
  for(let k=0;k<3;k++){const a=k*2.1+r(),d=size*.7;clusters.push({c:V(Math.cos(a)*d,size*.4,Math.sin(a)*d),r:size*(.62+r()*.15)});}
  const g=canopy(clusters,palette,r,{flat:.8,density:200,card:size*.5,core:0});g.name='anime-bush';return g;
}
