import * as T from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import type {Island} from './data';
import {flowerPatches,foliageMaterial,localHeight,rand} from './environment';

// Stylised meadow flowers after the reference sheet: low drifts of small orange blossoms and
// clumps of purple lavender spikes, grown in patches beside paths and in clearings of the grass.

type Part={geometry:T.BufferGeometry;color:T.ColorRepresentation;matrix:T.Matrix4};
const at=(x:number,y:number,z:number,rx=0,ry=0,rz=0,sx=1,sy=sx,sz=sx)=>new T.Matrix4().compose(new T.Vector3(x,y,z),new T.Quaternion().setFromEuler(new T.Euler(rx,ry,rz,'YXZ')),new T.Vector3(sx,sy,sz));
function build(parts:Part[],name:string){
  const geometries=parts.map(({geometry,color,matrix})=>{
    const g=(geometry.index?geometry.toNonIndexed():geometry.clone()).applyMatrix4(matrix);g.deleteAttribute('uv');
    const c=new T.Color(color),colors=new Float32Array(g.attributes.position.count*3);for(let n=0;n<colors.length;n+=3)colors.set([c.r,c.g,c.b],n);
    g.setAttribute('color',new T.BufferAttribute(colors,3));return g;
  });
  const merged=mergeGeometries(geometries,false)!;for(const g of geometries)g.dispose();merged.name=name;merged.computeBoundingSphere();return merged;
}

// A five-petal blossom, flat and slightly cupped, about 9 cm across.
function blossomGeometry(){
  const shape=new T.Shape(),points=60;
  for(let n=0;n<=points;n++){const a=n/points*Math.PI*2,r=.022+.028*Math.pow(Math.abs(Math.cos(a*2.5)),.6);const x=Math.cos(a)*r,y=Math.sin(a)*r;if(n)shape.lineTo(x,y);else shape.moveTo(x,y);}
  const g=new T.ShapeGeometry(shape,1).rotateX(-Math.PI/2);const p=g.attributes.position;for(let n=0;n<p.count;n++){const r=Math.hypot(p.getX(n),p.getZ(n));p.setY(n,r*r*4);}
  return g;
}
const stem=(height:number)=>new T.CylinderGeometry(.005,.008,height,3,1).translate(0,height/2,0);
const bud=new T.IcosahedronGeometry(1,0),leaf=new T.ConeGeometry(.012,1,3).translate(0,.5,0);

let orangeSprigs:T.BufferGeometry|undefined,lavenderClump:T.BufferGeometry|undefined;
/** A sprig cluster of 7 orange blossoms, 12–30 cm tall, with a few low leaves. */
export function orangeSprigGeometry(){
  if(orangeSprigs)return orangeSprigs;
  const random=rand(41),blossom=blossomGeometry(),centre=new T.SphereGeometry(.014,6,4),parts:Part[]=[];
  const petals=['#f59a23','#f7b02d','#ee8420'];
  for(let n=0;n<7;n++){
    const a=n*2.399,r=.04+(n%4)*.055,x=Math.cos(a)*r,z=Math.sin(a)*r,h=.12+random()*.18,tx=Math.cos(a)*.035,tz=Math.sin(a)*.035;
    parts.push({geometry:stem(h),color:'#5f9a3a',matrix:at(x,0,z,Math.sin(a)*.12,0,-Math.cos(a)*.12)});
    const head=at(x+tx,h,z+tz,(random()-.5)*.5,random()*6,(random()-.5)*.5,.85+random()*.35);
    parts.push({geometry:blossom,color:petals[n%3],matrix:head},{geometry:centre,color:'#bd521a',matrix:head.clone().multiply(at(0,.004,0))});
  }
  for(let n=0;n<5;n++){const a=n*1.3;parts.push({geometry:leaf,color:'#6aa241',matrix:at(Math.cos(a)*.05,0,Math.sin(a)*.05,Math.sin(a)*.7,0,-Math.cos(a)*.7,1,.11+n%3*.03,1)});}
  return orangeSprigs=build(parts,'orange-blossom-sprigs');
}
/** A clump of 9 lavender spikes, 40–62 cm tall: thin stems topped by stacked purple buds. */
export function lavenderClumpGeometry(){
  if(lavenderClump)return lavenderClump;
  const random=rand(97),parts:Part[]=[],low=new T.Color('#6f55bf'),high=new T.Color('#b39cec');
  for(let n=0;n<9;n++){
    const a=n*2.399,lean=.08+random()*.22,h=.4+random()*.22,base=at(Math.cos(a)*.05*(n%3),0,Math.sin(a)*.05*(n%3),Math.sin(a)*lean,0,-Math.cos(a)*lean);
    parts.push({geometry:stem(h),color:'#5e8f45',matrix:base});
    const whorls=8,start=h*.5;
    for(let k=0;k<whorls;k++){const t=k/(whorls-1),y=start+(h-start)*t,s=.024*(1-t*.55);
      for(const side of [0,Math.PI])parts.push({geometry:bud,color:low.clone().lerp(high,t),matrix:base.clone().multiply(at(Math.cos(k*1.1+side)*s*.7,y,Math.sin(k*1.1+side)*s*.7,0,k,0,s,s*1.45,s))});
    }
  }
  for(let n=0;n<8;n++){const a=n*.79;parts.push({geometry:leaf,color:'#6f9a52',matrix:at(Math.cos(a)*.03,0,Math.sin(a)*.03,Math.sin(a)*.5,0,-Math.cos(a)*.5,1,.18+n%3*.05,1)});}
  return lavenderClump=build(parts,'lavender-clump');
}

export function flowerField(i:Island,wind:{value:number}){
  const random=rand(i.id.split('').reduce((a,c)=>a*31+c.charCodeAt(0),3)),g=new T.Group(),dummy=new T.Object3D(),color=new T.Color();
  const patches=flowerPatches(i),material=foliageMaterial(wind,.35);
  for(const kind of ['orange','lavender'] as const){
    const own=patches.filter(p=>p.kind===kind),perPatch=kind==='orange'?24:14,capacity=own.length*perPatch;
    const mesh=new T.InstancedMesh(kind==='orange'?orangeSprigGeometry():lavenderClumpGeometry(),material,capacity);mesh.name=`${kind}-flowers`;
    let count=0;
    for(const p of own){
      const n=Math.round(perPatch*(.6+random()*.4));
      for(let k=0;k<n&&count<capacity;k++){
        // Denser in the middle of a patch, scattering out toward its edge.
        const a=random()*Math.PI*2,r=p.r*Math.sqrt(random())*.9,x=p.x+Math.cos(a)*r,z=p.z+Math.sin(a)*r,edge=1-r/p.r;
        dummy.position.set(x,localHeight(i,x,z)-.01,z);dummy.rotation.set(0,random()*Math.PI*2,0);dummy.scale.setScalar((kind==='orange'?1.7:1.3)*(.7+.3*edge+random()*.25));dummy.updateMatrix();mesh.setMatrixAt(count,dummy.matrix);
        mesh.setColorAt(count++,color.setRGB(.92+random()*.1,.92+random()*.1,.92+random()*.1));
      }
    }
    mesh.count=count;mesh.receiveShadow=true;mesh.computeBoundingSphere();g.add(mesh);
  }
  return g;
}
