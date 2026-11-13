import * as T from 'three';
import {mergeGeometries,mergeVertices} from 'three/addons/utils/BufferGeometryUtils.js';

export const PALM_VARIANTS=['tall','leaning','coconut','clump'] as const;
export type PalmVariant=typeof PALM_VARIANTS[number];
type Collider={x:number;z:number;r:number};
type Stem={height:number;lean:number;radius:number;length:number;x:number;z:number;angle:number;nuts:number;seed:number};
const palettes={bark:new T.Color('#bd7850'),barkLight:new T.Color('#d59662'),barkShade:new T.Color('#895847'),base:new T.Color('#65616a'),leaf:new T.Color('#6d9212'),gold:new T.Color('#9aac0d'),olive:new T.Color('#455f12'),rib:new T.Color('#bdce35'),nut:new T.Color('#9f754d'),nutLight:new T.Color('#bd935b')};
const paint=new T.MeshStandardMaterial({vertexColors:true,roughness:1});
const frondPaint=new T.MeshStandardMaterial({vertexColors:true,roughness:1,side:T.DoubleSide});
const windTime={value:0},windStrength={value:1};
frondPaint.onBeforeCompile=shader=>{shader.uniforms.palmTime=windTime;shader.uniforms.palmWindStrength=windStrength;shader.vertexShader='attribute float palmWind;\nuniform float palmTime;\nuniform float palmWindStrength;\n'+shader.vertexShader;shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>',`#include <begin_vertex>
  float palmPhase=position.z*.8+modelMatrix[3].x*.31+modelMatrix[3].z*.17;
  transformed.x+=sin(palmTime*.8+palmPhase)*palmWind*.10*palmWindStrength;
  transformed.y+=cos(palmTime*1.1+palmPhase)*palmWind*.045*palmWindStrength;
  transformed.z+=cos(palmTime*.7+palmPhase)*palmWind*.075*palmWindStrength;`);};
frondPaint.customProgramCacheKey=()=> 'illustrated-palm-fronds-v1';
export function setPalmWind(time:number,reduced=false){windTime.value=time;windStrength.value=reduced?0:1;}
const random=(seed:number,n:number)=>{const v=Math.sin(seed*12.9898+n*78.233)*43758.5453;return v-Math.floor(v);};
class Surface {
  p:number[]=[];c:number[]=[];i:number[]=[];w:number[]=[];
  vertex(p:T.Vector3,c:T.Color,wind=0){const index=this.p.length/3;this.p.push(p.x,p.y,p.z);this.c.push(c.r,c.g,c.b);this.w.push(wind);return index;}
  tri(a:number,b:number,c:number){this.i.push(a,b,c);}
  geometry(wind=false){const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(this.p,3));g.setAttribute('color',new T.Float32BufferAttribute(this.c,3));if(wind)g.setAttribute('palmWind',new T.Float32BufferAttribute(this.w,1));g.setIndex(this.i);g.computeVertexNormals();return g;}
}
const cache=new Map<PalmVariant,{wood:T.BufferGeometry;leaves:T.BufferGeometry;colliders:Collider[]}>();
function curveFor(s:Stem){return new T.CubicBezierCurve3(new T.Vector3(s.x,0,s.z),new T.Vector3(s.x-s.lean*.12,s.height*.32,s.z+.12),new T.Vector3(s.x+s.lean*.38,s.height*.72,s.z-.08),new T.Vector3(s.x+s.lean,s.height,s.z));}
function trunk(s:Stem,out:Surface,colliders:Collider[]){
  const curve=curveFor(s),bands=Math.round(s.height/.32),radial=12,rows:{t:number;lip:number;shade:number}[]=[];
  for(let j=0;j<bands;j++){rows.push({t:j/bands,lip:1.09,shade:.38},{t:(j+.15)/bands,lip:1,shade:0},{t:(j+.89)/bands,lip:.99,shade:.10});}rows.push({t:1,lip:1,shade:.12});
  const base=out.p.length/3;
  for(const {t,lip,shade}of rows){
    const center=curve.getPoint(t),rotation=new T.Quaternion().setFromUnitVectors(new T.Vector3(0,1,0),curve.getTangent(t).normalize()),radius=s.radius*(1-t*.53)*(1+Math.exp(-t*14)*.17)*lip;
    for(let k=0;k<=radial;k++){
      const a=k/radial*Math.PI*2,point=new T.Vector3(Math.cos(a)*radius,0,Math.sin(a)*radius).applyQuaternion(rotation).add(center);
      const color=palettes.bark.clone().lerp(palettes.barkLight,.18+Math.max(0,Math.cos(a+.6))*.35).lerp(palettes.barkShade,shade+Math.max(0,-Math.cos(a+.3))*.17);
      color.lerp(palettes.base,(1-T.MathUtils.smoothstep(t,.02,.28))*.83);
      out.vertex(point,color);
    }
  }
  for(let j=0;j<rows.length-1;j++)for(let k=0;k<radial;k++){const a=base+j*(radial+1)+k,b=a+radial+1;out.tri(a,b,a+1);out.tri(a+1,b,b+1);}
  for(const y of [.35,1.15,1.95]){const t=Math.min(.8,y/s.height),p=curve.getPoint(t);colliders.push({x:p.x,z:p.z,r:s.radius*(1-t*.53)+.045});}
  return curve;
}
function leafWidth(t:number,width:number){return Math.pow(Math.max(0,Math.sin(t*Math.PI)),.72)*width*(1-t*.31);}
function edgeNotches(t:number,side:number,seed:number){let factor=1;for(let n=0;n<3;n++){const cut=.37+n*.22+(side>0?.035:0)+(random(seed,n)-.5)*.018,span=.027+random(seed,n+10)*.012;const d=(t-cut)/span;if(d>=-1&&d<=1)factor=Math.min(factor,1-(1-Math.abs(d))*(.49+random(seed,n+20)*.20));}return factor;}
function frond(out:Surface,origin:T.Vector3,angle:number,length:number,width:number,rise:number,droop:number,seed:number){
  const stations=[0,.06,.13,.2,1];for(const side of [-1,1])for(let n=0;n<3;n++){const cut=.37+n*.22+(side>0?.035:0)+(random(seed,n)-.5)*.018,span=.027+random(seed,n+10)*.012;stations.push(cut-span,cut,cut+span);}stations.sort((a,b)=>a-b);
  const rows=[...new Set(stations.map(t=>T.MathUtils.clamp(t,0,1)))],across=[-1,-.52,0,.52,1],rotation=new T.Quaternion().setFromAxisAngle(new T.Vector3(0,1,0),angle),base=out.p.length/3;
  for(const t of rows){
    const half=leafWidth(t,width),arch=Math.sin(t*Math.PI)*rise-droop*t*t;
    for(const u of across){
      const side=u<0?-1:1,w=half*edgeNotches(t,side,seed),x=u*w,fold=(1-Math.abs(u))*.11*half-Math.abs(u)*half*.24;
      const p=new T.Vector3(x,arch+fold,t*length).applyQuaternion(rotation).add(origin);
      const color=(u<0?palettes.gold:palettes.leaf).clone().lerp(palettes.olive,t*.20+Math.abs(u)*.13);
      if(Math.abs(u)<.1)color.lerp(palettes.rib,.7);if(t<.13)color.lerp(palettes.olive,(1-t/.13)*.45);
      // A wide painted face and a cool olive face give the illustrated fold.
      color.multiplyScalar(.72+random(seed,31)*.30);out.vertex(p,color,t*t);
    }
  }
  for(let j=0;j<rows.length-1;j++)for(let k=0;k<4;k++){const a=base+j*5+k,b=a+5;out.tri(a,b,a+1);out.tri(a+1,b,b+1);}
}
function coconut(out:Surface,center:T.Vector3,size:number,seed:number){
  const radial=12,rings=9,base=out.p.length/3;
  for(let j=0;j<=rings;j++){const phi=j/rings*Math.PI;for(let k=0;k<=radial;k++){const a=k/radial*Math.PI*2,sin=Math.sin(phi),x=Math.cos(a)*sin*size,z=Math.sin(a)*sin*size*.91,y=Math.cos(phi)*size*1.24;const p=new T.Vector3(x,y,z).add(center),color=palettes.nut.clone().lerp(palettes.nutLight,Math.max(0,Math.cos(a+.8))*.45);const groove=Math.pow(Math.max(0,Math.cos(a*3+seed*.2)),18);color.lerp(palettes.barkShade,groove*.30);out.vertex(p,color);}}
  for(let j=0;j<rings;j++)for(let k=0;k<radial;k++){const a=base+j*(radial+1)+k,b=a+radial+1;out.tri(a,a+1,b);out.tri(a+1,b+1,b);}
}
function stem(s:Stem,wood:Surface,leaves:Surface,colliders:Collider[]){
  const curve=trunk(s,wood,colliders),top=curve.getPoint(1),count=9;
  for(let n=0;n<count;n++){
    const angle=s.angle+n*Math.PI*2/count+(random(s.seed,n)-.5)*.28,lower=n%3===0,length=s.length*(.88+random(s.seed,n+30)*.19);
    frond(leaves,top,angle,length,lower?.58:.66,lower?.65:1.2,lower?1.65:.83,s.seed+n*3);
  }
  for(let n=0;n<1;n++)frond(leaves,top,s.angle+.5,s.length*.68,.37,1.2,.12,s.seed+100+n);
  for(let n=0;n<s.nuts;n++){const a=n*2.399+s.seed,r=.28+(n%2)*.07;const p=top.clone().add(new T.Vector3(Math.cos(a)*r,-.28-(n%2)*.16,Math.sin(a)*r));coconut(wood,p,.23+(n%2)*.035,n+s.seed);}
}
function build(variant:PalmVariant){
  const wood=new Surface(),leaves=new Surface(),colliders:Collider[]=[];
  const configs:Record<PalmVariant,Stem[]>={
    tall:[{height:8.7,lean:.28,radius:.27,length:3.05,x:0,z:0,angle:.2,nuts:2,seed:11}],
    leaning:[{height:7.7,lean:2.35,radius:.31,length:3.15,x:0,z:0,angle:.7,nuts:3,seed:23}],
    coconut:[{height:6.2,lean:.35,radius:.48,length:3.05,x:0,z:0,angle:.4,nuts:5,seed:37}],
    clump:[{height:5.2,lean:-1.8,radius:.23,length:2.1,x:-.7,z:.25,angle:1,nuts:2,seed:43},{height:7.5,lean:.1,radius:.28,length:2.6,x:0,z:-.2,angle:.3,nuts:2,seed:53},{height:5.6,lean:1.7,radius:.22,length:2.1,x:.75,z:.15,angle:2,nuts:1,seed:61}],
  };
  for(const config of configs[variant])stem(config,wood,leaves,colliders);
  const result={wood:wood.geometry(),leaves:leaves.geometry(true),colliders};cache.set(variant,result);return result;
}
export function createPalm(variant:PalmVariant='tall',height=9){
  const cached=cache.get(variant)??build(variant),root=new T.Group();root.name=`reference-palm-${variant}`;root.scale.setScalar(height/9);root.userData={assetSource:'illustrated-reference-palm',variant,colliders:cached.colliders.map(c=>({...c}))};
  const bark=new T.Mesh(cached.wood,paint);bark.name='ringed-trunk-and-coconuts';bark.castShadow=bark.receiveShadow=true;bark.userData.cameraSolid=true;
  const fronds=new T.Mesh(cached.leaves,frondPaint);fronds.name='notched-painted-fronds';fronds.castShadow=fronds.receiveShadow=true;root.add(bark,fronds);return root;
}
export function palmColliders(tree:T.Group):Collider[]{tree.updateWorldMatrix(true,false);const scale=tree.getWorldScale(new T.Vector3());return (tree.userData.colliders as Collider[]).map(c=>{const p=new T.Vector3(c.x,0,c.z).applyMatrix4(tree.matrixWorld);return {x:p.x,z:p.z,r:c.r*Math.max(scale.x,scale.z)};});}
export function createPalmExport(variant:PalmVariant){
  const source=createPalm(variant),parts:T.BufferGeometry[]=[];
  source.traverse(o=>{if(o instanceof T.Mesh){const g=o.geometry.index?o.geometry.toNonIndexed():o.geometry.clone();g.deleteAttribute('palmWind');parts.push(g);}});
  const geometry=mergeGeometries(parts,false);parts.forEach(g=>g.dispose());if(!geometry)throw new Error('Could not assemble the palm model.');const indexed=mergeVertices(geometry,1e-5);geometry.dispose();
  const result=new T.Group();result.name=source.name;const material=paint.clone();material.side=T.DoubleSide;result.add(new T.Mesh(indexed,material));return result;
}


