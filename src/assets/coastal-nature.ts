import * as T from 'three';
import {mergeGeometries,mergeVertices} from 'three/addons/utils/BufferGeometryUtils.js';
import {PICKUPS,type Island} from '../data';
import {localHeight,rand} from '../environment';
import {grassTuftGeometry} from './grass-tuft';

const paint=new T.MeshStandardMaterial({vertexColors:true,roughness:1,side:T.DoubleSide});
function colored(g:T.BufferGeometry,color:(p:T.Vector3,n:number)=>T.Color){const p=g.getAttribute('position'),colors:number[]=[],v=new T.Vector3();for(let n=0;n<p.count;n++){v.fromBufferAttribute(p,n);const c=color(v,n);colors.push(c.r,c.g,c.b);}g.setAttribute('color',new T.Float32BufferAttribute(colors,3));g.deleteAttribute('uv');return g;}
function mesh(g:T.BufferGeometry,parent:T.Group,name:string){const m=new T.Mesh(g,paint);m.name=name;m.castShadow=m.receiveShadow=true;parent.add(m);return m;}
function combine(group:T.Group,name:string){group.updateMatrixWorld(true);const parts:T.BufferGeometry[]=[];group.traverse(o=>{if(o instanceof T.Mesh){const g=o.geometry.index?o.geometry.toNonIndexed():o.geometry.clone();g.deleteAttribute('uv');parts.push(g.applyMatrix4(o.matrixWorld));}});const merged=mergeGeometries(parts,false);parts.forEach(g=>g.dispose());if(!merged)throw new Error('Could not assemble coastal artwork.');const indexed=mergeVertices(merged,1e-5);merged.dispose();const result=new T.Group();result.name=name;const m=mesh(indexed,result,name+'-surface');m.userData.cameraSolid=true;return result;}
const rockCache=new Map<string,T.Group>();
function rockPoint(phi:number,theta:number,scale:T.Vector3,center:T.Vector3,seed:number){const r=1+.07*Math.sin(theta*3+phi*2+seed)+.035*Math.cos(theta*5-phi*3);return new T.Vector3(Math.cos(theta)*Math.sin(phi)*scale.x,Math.cos(phi)*scale.y,Math.sin(theta)*Math.sin(phi)*scale.z).multiplyScalar(r).add(center);}
function boulder(parent:T.Group,center:T.Vector3,scale:T.Vector3,seed:number,moss:boolean,warm=false){
  const radial=16,rings=10,p:number[]=[],idx:number[]=[],colors:number[]=[];
  for(let j=0;j<=rings;j++)for(let k=0;k<=radial;k++){
    const phi=j/rings*Math.PI,theta=k/radial*Math.PI*2,v=rockPoint(phi,theta,scale,center,seed);v.y=Math.max(.02,v.y);p.push(v.x,v.y,v.z);
    const grain=.5+.5*Math.sin(theta*3+phi*4+seed),top=Math.cos(phi),mossEdge=.42+.14*Math.sin(theta*3+seed)+.07*Math.cos(theta*7);
    const c=new T.Color(warm?'#bf9b72':'#89989b').lerp(new T.Color(warm?'#e0c394':'#c1c4ba'),grain*.38).lerp(new T.Color(warm?'#917356':'#687b80'),Math.max(0,-top)*.5);
    colors.push(c.r,c.g,c.b);
  }
  for(let j=0;j<rings;j++)for(let k=0;k<radial;k++){const a=j*(radial+1)+k,b=a+radial+1;idx.push(a,a+1,b,a+1,b+1,b);}
  const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(p,3));geo.setAttribute('color',new T.Float32BufferAttribute(colors,3));geo.setIndex(idx);geo.computeVertexNormals();mesh(geo,parent,'painted-stone');
  if(moss){
    const mp:number[]=[],mc:number[]=[],mi:number[]=[],around=48,layers=7;
    for(let j=0;j<=layers;j++)for(let k=0;k<=around;k++){const theta=k/around*Math.PI*2,edge=.42+.14*Math.sin(theta*3+seed)+.07*Math.cos(theta*7),phi=j/layers*Math.acos(edge),v=rockPoint(phi,theta,scale,center,seed),normal=v.clone().sub(center).normalize();v.addScaledVector(normal,.028);mp.push(v.x,v.y,v.z);const color=new T.Color('#678c27').lerp(new T.Color('#a2b74d'),(.5+.5*Math.sin(theta*4+phi*5))*.48);mc.push(color.r,color.g,color.b);}
    for(let j=0;j<layers;j++)for(let k=0;k<around;k++){const a=j*(around+1)+k,b=a+around+1;mi.push(a,a+1,b,a+1,b+1,b);}
    const mossGeo=new T.BufferGeometry();mossGeo.setAttribute('position',new T.Float32BufferAttribute(mp,3));mossGeo.setAttribute('color',new T.Float32BufferAttribute(mc,3));mossGeo.setIndex(mi);mossGeo.computeVertexNormals();mesh(mossGeo,parent,'painted-moss-patch');
    for(let n=0;n<17;n++){const theta=n*2.399+seed,phi=.12+(n%5)*.14,pos=rockPoint(phi,theta,scale,center,seed),normal=pos.clone().sub(center).normalize();const spot=new T.SphereGeometry(.025+(n%3)*.01,7,5);spot.scale(1,.23,.8);spot.applyQuaternion(new T.Quaternion().setFromUnitVectors(new T.Vector3(0,1,0),normal));spot.translate(pos.x+normal.x*.034,pos.y+normal.y*.034,pos.z+normal.z*.034);mesh(colored(spot,()=>new T.Color(n%2?'#bdce74':'#a5bc56')),parent,'lichen');}
    const cracks=[[[.65,.6],[1.0,.75],[1.45,.84],[1.9,1.1],[2.35,1.25]],[[1.23,.15],[1.32,.5],[1.45,.84],[1.64,1.5]],[[.8,2],[1.2,1.7],[1.64,1.5],[1.95,1.6]]];
    for(const points of cracks){const curve=new T.CatmullRomCurve3(points.map(([phi,theta])=>new T.Vector3(phi,theta,0))),positions:number[]=[],indices:number[]=[];
      for(let n=0;n<=48;n++){const t=n/48,angles=curve.getPoint(t),next=curve.getPoint(Math.min(1,t+.005)),prev=curve.getPoint(Math.max(0,t-.005)),v=rockPoint(angles.x,angles.y,scale,center,seed),normal=v.clone().sub(center).normalize(),tangent=rockPoint(next.x,next.y,scale,center,seed).sub(rockPoint(prev.x,prev.y,scale,center,seed)).normalize(),side=tangent.cross(normal).normalize().multiplyScalar(.006*(.25+.75*Math.sin(Math.PI*t)));v.addScaledVector(normal,.003);const a=v.clone().sub(side),b=v.clone().add(side);positions.push(a.x,a.y,a.z,b.x,b.y,b.z);if(n<48){const k=n*2;indices.push(k,k+2,k+1,k+1,k+2,k+3);}}
      const fracture=new T.BufferGeometry();fracture.setAttribute('position',new T.Float32BufferAttribute(positions,3));fracture.setIndex(indices);fracture.computeVertexNormals();mesh(colored(fracture,()=>new T.Color('#536a72')),parent,'painted-stone-fracture');}
  }
}
export function createMossRock(){
  if(!rockCache.has('moss')){const g=new T.Group();boulder(g,new T.Vector3(-.16,.62,0),new T.Vector3(.64,.66,.58),2,true);boulder(g,new T.Vector3(.47,.31,.08),new T.Vector3(.31,.34,.36),4,false);boulder(g,new T.Vector3(-.66,.18,.26),new T.Vector3(.23,.20,.23),6,false);rockCache.set('moss',combine(g,'reference-moss-rock'));}
  return rockCache.get('moss')!.clone(true);
}
export function createSandstone(){
  if(!rockCache.has('sandstone')){
    const g=new T.Group(),profiles=[[0,1.02],[.12,1.07],[.22,.96],[.25,.93],[.40,.95],[.45,1],[.56,1.04],[.65,.96],[.84,.93],[.88,1.03],[1.03,1.09],[1.13,1.04]],radial=14,p:number[]=[],colors:number[]=[],idx:number[]=[];
    for(const [y,r]of profiles)for(let k=0;k<=radial;k++){const a=k/radial*Math.PI*2,w=r*(1+.07*Math.sin(a*3+.7));p.push(Math.cos(a)*w+.08*y,y,Math.sin(a)*w*.66);const band=Math.abs(y-.25)<.035||Math.abs(y-.65)<.02;const c=new T.Color(band?'#9a7755':'#bc9469').lerp(new T.Color('#e6c697'),Math.max(0,Math.cos(a+.6))*.36+(y>1?.23:0));colors.push(c.r,c.g,c.b);}
    for(let j=0;j<profiles.length-1;j++)for(let k=0;k<radial;k++){const a=j*(radial+1)+k,b=a+radial+1;idx.push(a,b,a+1,a+1,b,b+1);}
    const cap=p.length/3;p.push(.09,1.13,0);const top=new T.Color('#e2c294');colors.push(top.r,top.g,top.b);for(let k=0;k<radial;k++)idx.push(cap,(profiles.length-1)*(radial+1)+k+1,(profiles.length-1)*(radial+1)+k);
    const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(p,3));geo.setAttribute('color',new T.Float32BufferAttribute(colors,3));geo.setIndex(idx);geo.computeVertexNormals();mesh(geo,g,'layered-sandstone');
    boulder(g,new T.Vector3(-.82,.16,.3),new T.Vector3(.36,.19,.36),2,false,true);boulder(g,new T.Vector3(.86,.14,-.05),new T.Vector3(.26,.16,.3),4,false,true);rockCache.set('sandstone',combine(g,'reference-sandstone'));
  }
  return rockCache.get('sandstone')!.clone(true);
}
export type FoliageKind='grass'|'reeds'|'seedgrass';
const foliageCache=new Map<FoliageKind,T.BufferGeometry>();
export function createCoastalPlant(kind:FoliageKind='grass'){
  if(kind==='grass'){const g=new T.Group();g.name='reference-grass';mesh(grassTuftGeometry(),g,'painted-foliage').castShadow=false;return g;}
  if(!foliageCache.has(kind)){
    const g=new T.Group(),p:number[]=[],c:number[]=[],idx:number[]=[],count=19;
    for(let n=0;n<count;n++){
      const angle=n*2.399,length=1.15+(n%5)*.115,reach=.20+(n%4)*.12,width=.055+(n%3)*.017,base=p.length/3;
      for(let k=0;k<=8;k++){const t=k/8,y=t*length-t*t*t*length*.13,r=t*t*reach,half=Math.sin(t*Math.PI)*width;for(const u of [-1,0,1]){const baseRad=.04+(n%4)*.025,x=Math.sin(angle)*(r+baseRad)+Math.cos(angle)*u*half,z=Math.cos(angle)*(r+baseRad)-Math.sin(angle)*u*half;p.push(x,y+(u===0?.025*Math.sin(t*Math.PI):0),z);const color=new T.Color(u<0?'#779c3f':'#5c863a').lerp(new T.Color('#b9c86c'),t*.4);c.push(color.r,color.g,color.b);}}
      for(let k=0;k<8;k++)for(let j=0;j<2;j++){const a=base+k*3+j,b=a+3;idx.push(a,b,a+1,a+1,b,b+1);}
    }
    const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(p,3));geo.setAttribute('color',new T.Float32BufferAttribute(c,3));geo.setIndex(idx);geo.computeVertexNormals();mesh(geo,g,'painted-grass-leaves');
    for(let n=0;n<5;n++){
      const x=Math.sin(n*2.4)*.22,z=Math.cos(n*2.4)*.18,height=1.35+n*.105,lean=(n-2)*.09,curve=new T.CatmullRomCurve3([new T.Vector3(x,0,z),new T.Vector3(x+lean*.2,height*.55,z),new T.Vector3(x+lean,height,z+.05)]);
      mesh(colored(new T.TubeGeometry(curve,12,.012,5,false),()=>new T.Color('#969f5e')),g,'reed-stem');
      if(kind==='reeds'){const head=new T.CapsuleGeometry(.033,.23,3,7);head.translate(x+lean,height+.045,z+.05);mesh(colored(head,()=>new T.Color('#8f6e45')),g,'cattail-head');}
      else for(let k=0;k<7;k++){const seed=new T.SphereGeometry(.028,6,4);seed.scale(.65,1.5,.7);seed.translate(x+lean+(k%2?-.023:.023),height-.13+k*.033,z+.05);mesh(colored(seed,()=>new T.Color(k%2?'#e1d7a4':'#f2e5ba')),g,'pale-seed-head');}
    }
    const combined=combine(g,`reference-${kind}`);foliageCache.set(kind,(combined.children[0] as T.Mesh).geometry);
  }
  const g=new T.Group();g.name=`reference-${kind}`;const plant=mesh(foliageCache.get(kind)!,g,'painted-foliage');plant.castShadow=false;return g;
}
export function coastalFoliageField(island:Island,wind:{value:number}){
  const group=new T.Group(),random=rand(island.id.length*683),dummy=new T.Object3D(),material=paint.clone();
  material.onBeforeCompile=shader=>{shader.uniforms.coastalWind=wind;shader.vertexShader='uniform float coastalWind;\n'+shader.vertexShader;shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>',`#include <begin_vertex>
    transformed.x+=sin(coastalWind*.9+instanceMatrix[3].x*.7)*position.y*position.y*.055;
    transformed.z+=cos(coastalWind*.7+instanceMatrix[3].z*.6)*position.y*position.y*.04;`);};material.customProgramCacheKey=()=> 'reference-coastal-grasses-v1';
  for(const kind of ['grass','reeds','seedgrass'] as FoliageKind[]){
    const prototype=createCoastalPlant(kind),geometry=(prototype.children[0] as T.Mesh).geometry,instances=new T.InstancedMesh(geometry,material,16);let count=0;
    for(let n=0;n<16;n++){const a=random()*Math.PI*2,r=island.radius*(.40+random()*.36),x=Math.cos(a)*r,z=Math.sin(a)*r;if(PICKUPS.some(p=>p.island===island.id&&Math.hypot(p.x-island.x-x,p.z-island.z-z)<1.6)||x>8&&z>13)continue;dummy.position.set(x,localHeight(island,x,z),z);dummy.rotation.y=random()*Math.PI*2;dummy.scale.setScalar(.65+random()*.55);dummy.updateMatrix();instances.setMatrixAt(count++,dummy.matrix);}
    instances.count=count;instances.userData.fullCount=count;instances.userData.lowDensityCount=Math.ceil(count*.55);instances.receiveShadow=true;instances.computeBoundingSphere();group.add(instances);
  }
  return group;
}


