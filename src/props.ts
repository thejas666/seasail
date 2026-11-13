import * as T from 'three';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
const palette=new Map<string,T.MeshStandardMaterial>();
const material=(color:string)=>{if(!palette.has(color))palette.set(color,new T.MeshStandardMaterial({color,roughness:.94}));return palette.get(color)!;};
const wood=material('#b48650'),darkWood=material('#785334'),endWood=material('#d3ae73'),rope=material('#c4ac76'),iron=material('#62736b'),brass=material('#c2a363'),cream=material('#f3e4bd'),coral=material('#c87851');
function mesh(geo:T.BufferGeometry,mat:T.Material,g:T.Object3D,x=0,y=0,z=0){const m=new T.Mesh(geo,mat);m.position.set(x,y,z);m.castShadow=m.receiveShadow=true;g.add(m);return m;}
function box(w:number,h:number,d:number,mat:T.Material,g:T.Object3D,x=0,y=0,z=0){return mesh(new RoundedBoxGeometry(w,h,d,1,Math.min(.045,w*.15,h*.15,d*.15)),mat,g,x,y,z);}
function cylinder(rt:number,rb:number,h:number,mat:T.Material,g:T.Object3D,x=0,y=0,z=0,n=12){return mesh(new T.CylinderGeometry(rt,rb,h,n),mat,g,x,y,z);}
function ring(r:number,tube:number,mat:T.Material,g:T.Object3D,x:number,y:number,z:number){const m=mesh(new T.TorusGeometry(r,tube,5,18),mat,g,x,y,z);m.rotation.x=Math.PI/2;return m;}
function line(a:T.Vector3,b:T.Vector3,r:number,mat:T.Material,g:T.Object3D){const m=cylinder(r,r,a.distanceTo(b),mat,g);m.position.copy(a).add(b).multiplyScalar(.5);m.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),b.clone().sub(a).normalize());return m;}
function combine(g:T.Group){
  const list=g.children.filter((o):o is T.Mesh=>o instanceof T.Mesh&&!Array.isArray(o.material));const materials=[...new Set(list.map(o=>o.material as T.Material))];
  for(const mat of materials){const parts=list.filter(p=>p.material===mat);if(parts.length<2)continue;const geos=parts.map(p=>{p.updateMatrix();const geo=p.geometry.index?p.geometry.toNonIndexed():p.geometry.clone();return geo.applyMatrix4(p.matrix);});const merged=mergeGeometries(geos,false);for(const geo of geos)geo.dispose();if(!merged)continue;for(const p of parts){p.removeFromParent();p.geometry.dispose();}mesh(merged,mat,g);}
  return g;
}
export function barrel(){
  const g=new T.Group();g.name='staved-barrel';const profile=[new T.Vector2(.235,0),new T.Vector2(.28,.07),new T.Vector2(.31,.31),new T.Vector2(.29,.61),new T.Vector2(.24,.7)];mesh(new T.LatheGeometry(profile,16),wood,g);
  cylinder(.237,.237,.025,endWood,g,0,.7,0);for(const y of [.11,.57])ring(.29,.027,iron,g,0,y,0);
  for(let j=0;j<10;j++){const a=j*Math.PI/5;line(new T.Vector3(Math.sin(a)*.266,.05,Math.cos(a)*.266),new T.Vector3(Math.sin(a)*.275,.65,Math.cos(a)*.275),.008,darkWood,g);}
  for(const x of [-.1,0,.1])box(.012,.012,Math.sqrt(.235**2-x*x)*2,darkWood,g,x,.716,0);cylinder(.04,.04,.028,darkWood,g,.08,.732,-.07);return combine(g);
}
export function crate(){
  const g=new T.Group();g.name='braced-cargo-crate';box(.63,.54,.63,wood,g,0,.27,0);
  for(const z of [-.323,.323]){for(const x of [-.23,.23])box(.055,.53,.035,darkWood,g,x,.27,z);for(const y of [.08,.46])box(.62,.055,.035,endWood,g,0,y,z);line(new T.Vector3(-.25,.1,z),new T.Vector3(.25,.44,z),.025,endWood,g);for(const x of [-.23,.23])for(const y of [.09,.45])mesh(new T.SphereGeometry(.016,6,4),iron,g,x,y,z*1.035);}
  for(const x of [-.23,.23])box(.055,.035,.63,darkWood,g,x,.555,0);return combine(g);
}
export function driftwood(){const g=new T.Group();g.name='driftwood-bundle';for(let j=0;j<3;j++){const log=cylinder(.23,.27,2,wood,g,(j-1)*.4,.2+j*.08,0,12);log.rotation.x=Math.PI/2;for(const side of [-1,1]){const cap=cylinder(.232,.232,.02,endWood,g,(j-1)*.4,.2+j*.08,side*1.01,12);cap.rotation.x=Math.PI/2;for(const radius of [.08,.15,.21]){const growth=mesh(new T.TorusGeometry(radius,.008,4,14),darkWood,g,(j-1)*.4,.2+j*.08,side*1.025);growth.rotation.z=j*.3;}}}return combine(g);}
export function cleat(){const g=new T.Group();g.name='mooring-cleat';box(.23,.04,.13,iron,g,0,.02,0);cylinder(.025,.035,.1,iron,g,0,.07,0);const bar=cylinder(.025,.025,.36,iron,g,0,.12,0);bar.rotation.z=Math.PI/2;return combine(g);}
export function dock(){
  const g=new T.Group();g.name='timber-jetty';for(let j=0;j<26;j++){const z=-3-j*.8;box(4.4,.25,.7,j%2?wood:endWood,g,0,1.35,z);if(j%3===0)for(const x of [-1.65,1.65])cylinder(.025,.025,.02,iron,g,x,1.487,z,6);}
  for(const x of [-1.65,1.65])box(.22,.28,21,darkWood,g,x,1.03,-13.4);
  for(const z of [-3,-9.5,-16,-23])for(const x of [-2,2]){cylinder(.18,.23,3.5,darkWood,g,x,.45,z);cylinder(.26,.26,.12,endWood,g,x,2.23,z);ring(.19,.016,darkWood,g,x,2.298,z);for(const y of [1.65,1.73])ring(.205,.025,rope,g,x,y,z);}
  for(const z of [-5,-12]){const fixture=cleat();fixture.position.set(-1.7,1.48,z);g.add(fixture);}
  for(const z of [-7,-15]){const fender=mesh(new T.TorusGeometry(.32,.105,8,20),iron,g,-2.18,.65,z);fender.rotation.y=Math.PI/2;line(new T.Vector3(-2.05,1.45,z),new T.Vector3(-2.18,.96,z),.022,rope,g);}
  return combine(g);
}
function lettering(text:string){
  if(typeof document==='undefined')return null;const c=document.createElement('canvas');c.width=512;c.height=128;const ctx=c.getContext('2d')!;ctx.fillStyle='#956c43';ctx.fillRect(0,0,512,128);ctx.strokeStyle='#765133';ctx.lineWidth=4;ctx.strokeRect(8,8,496,112);ctx.fillStyle='#f7e8bf';ctx.font='600 35px sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(text.toUpperCase(),256,65,465);const texture=new T.CanvasTexture(c);texture.colorSpace=T.SRGBColorSpace;return texture;
}
export function sign(text:string){const g=new T.Group();g.name='island-sign';cylinder(.09,.13,2.5,darkWood,g,0,1.1,0);box(2.8,.8,.15,wood,g,0,2.05,0);const texture=lettering(text);if(texture)mesh(new T.PlaneGeometry(2.65,.68),new T.MeshStandardMaterial({map:texture,roughness:1}),g,0,2.05,.081);return combine(g);}
export function buoy(color:string){const g=new T.Group();g.name='channel-buoy';mesh(new T.LatheGeometry([new T.Vector2(.28,0),new T.Vector2(.58,.15),new T.Vector2(.52,.8),new T.Vector2(.26,1.3)],14),material(color),g);ring(.52,.04,cream,g,0,.7,0);cylinder(.05,.07,2.5,iron,g,0,1.8,0);const flag=new T.Shape();flag.moveTo(0,0);flag.lineTo(.7,-.18);flag.lineTo(0,-.38);mesh(new T.ShapeGeometry(flag),new T.MeshStandardMaterial({color,side:T.DoubleSide}),g,.03,3.1,0);mesh(new T.SphereGeometry(.15,10,7),brass,g,0,3.2,0);return combine(g);}
export function chart(){
  const g=new T.Group();g.name='harbor-chart';box(1.5,.045,1.05,cream,g,0,.035,0);for(const x of [-.73,.73]){const roll=cylinder(.045,.045,1.1,endWood,g,x,.055,0);roll.rotation.x=Math.PI/2;}
  if(typeof document!=='undefined'){const c=document.createElement('canvas');c.width=384;c.height=256;const ctx=c.getContext('2d')!;ctx.fillStyle='#e9d5a3';ctx.fillRect(0,0,384,256);ctx.strokeStyle='#a7986b';ctx.lineWidth=1;for(let x=24;x<384;x+=32){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,256);ctx.stroke();}for(let y=20;y<256;y+=32){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(384,y);ctx.stroke();}ctx.fillStyle='#778c5a';for(const [x,y]of [[65,192],[138,142],[220,82],[305,45]]){ctx.beginPath();ctx.ellipse(x,y,18,10,-.4,0,Math.PI*2);ctx.fill();}ctx.strokeStyle='#b16e46';ctx.setLineDash([5,6]);ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(65,192);ctx.bezierCurveTo(190,190,180,40,305,45);ctx.stroke();ctx.setLineDash([]);ctx.fillStyle='#6e6844';ctx.font='bold 23px serif';ctx.fillText('SUNHAVEN',20,32);const texture=new T.CanvasTexture(c);texture.colorSpace=T.SRGBColorSpace;const paper=mesh(new T.PlaneGeometry(1.42,.98),new T.MeshStandardMaterial({map:texture,roughness:1}),g,0,.062,0);paper.rotation.x=-Math.PI/2;}
  return combine(g);
}
export function harborHouse(color:string){
  const g=new T.Group();g.name='harbor-cottage';box(7,5,7,material(color),g,0,2.5,0);const shape=new T.Shape();shape.moveTo(-4,0);shape.lineTo(0,2.4);shape.lineTo(4,0);shape.lineTo(-4,0);mesh(new T.ExtrudeGeometry(shape,{depth:8,bevelEnabled:true,bevelThickness:.06,bevelSize:.06,bevelSegments:1,steps:1}),coral,g,0,4.95,-4);
  for(const z of [-4.05,4.05]){line(new T.Vector3(-4,4.95,z),new T.Vector3(0,7.35,z),.1,darkWood,g);line(new T.Vector3(0,7.35,z),new T.Vector3(4,4.95,z),.1,darkWood,g);}
  const glass=new T.MeshStandardMaterial({color:'#91bfc2',emissive:'#ffd38a',emissiveIntensity:0,roughness:.5});g.userData.nightMaterials=[glass];
  for(const x of [-2.05,2.05]){box(1.2,1.4,.1,endWood,g,x,3.05,3.56);box(.96,1.15,.045,glass,g,x,3.05,3.64);box(.055,1.2,.05,cream,g,x,3.05,3.68);box(1,.055,.05,cream,g,x,3.05,3.69);for(const side of [-1,1]){box(.4,1.35,.08,material('#6e967e'),g,x+side*.84,3.05,3.62);for(const y of [2.7,2.95,3.2,3.45])box(.35,.035,.06,darkWood,g,x+side*.84,y,3.68);}}
  box(1.5,2.7,.15,darkWood,g,0,1.35,3.57);box(1.22,2.5,.1,wood,g,0,1.32,3.68);for(const x of [-.35,0,.35])box(.025,2.35,.03,endWood,g,x,1.32,3.75);mesh(new T.SphereGeometry(.075,8,6),brass,g,.4,1.3,3.82);box(1.9,.12,.65,endWood,g,0,.08,3.85);
  box(.95,2,.95,material('#ba9677'),g,1.7,6.65,-1.1);box(1.13,.16,1.12,darkWood,g,1.7,7.7,-1.1);box(.6,.025,.6,iron,g,1.7,7.79,-1.1);return combine(g);
}
export function lighthouse(){
  const g=new T.Group();g.name='sunhaven-lighthouse';cylinder(2.8,4,18,cream,g,0,9,0,20);cylinder(3.15,3.45,3,coral,g,0,9,0,20);
  for(const y of [5,13.7]){const port=mesh(new T.TorusGeometry(.47,.075,8,20),brass,g,0,y,4-(y/18)*1.2+.025);const pane=mesh(new T.SphereGeometry(.41,12,8),material('#769b9f'),g,0,y,port.position.z);pane.scale.z=.08;}
  box(1.4,2.6,.13,darkWood,g,0,1.3,4);box(1.12,2.4,.08,wood,g,0,1.28,4.1);mesh(new T.SphereGeometry(.07,8,5),brass,g,.35,1.3,4.18);
  cylinder(4.25,4.25,.3,darkWood,g,0,18,0,24);for(let j=0;j<12;j++){const a=j*Math.PI/6;cylinder(.045,.055,1.4,brass,g,Math.cos(a)*4,18.8,Math.sin(a)*4,6);}for(const y of [18.45,19.5])ring(4,.06,brass,g,0,y,0);
  const glass=new T.MeshStandardMaterial({color:'#a3cdd0',transparent:true,opacity:.32,roughness:.2,depthWrite:false,side:T.DoubleSide});cylinder(2.2,2.2,3,glass,g,0,20,0,16);for(let j=0;j<8;j++){const a=j*Math.PI/4;cylinder(.07,.07,3.2,darkWood,g,Math.cos(a)*2.2,20,Math.sin(a)*2.2,6);}
  const lens=new T.MeshStandardMaterial({color:'#ffe4a0',emissive:'#ffc96a',emissiveIntensity:1.2,roughness:.25});cylinder(.65,.65,1.25,lens,g,0,20,0,16);for(const y of [19.55,19.85,20.15,20.45])ring(.95,.085,cream,g,0,y,0);g.userData.nightMaterials=[lens];cylinder(0,3.3,2.4,coral,g,0,22.7,0,20);cylinder(.09,.1,1.2,brass,g,0,24.4,0,8);return combine(g);
}
export function lookout(){
  const g=new T.Group();g.name='island-lookout';for(const x of [-3,3])for(const z of [-3,3]){cylinder(.22,.3,8,wood,g,x,6,z-9);cylinder(.15,.15,2.6,wood,g,x,11.3,z-9);}
  for(const x of [-3,3]){line(new T.Vector3(x,2,-12),new T.Vector3(x,10,-6),.1,darkWood,g);line(new T.Vector3(x,10,-12),new T.Vector3(x,2,-6),.1,darkWood,g);}
  for(let j=0;j<10;j++)box(7.5,.22,.7,j%2?wood:endWood,g,0,10,-12.3+j*.74);for(const z of [-12,-6])box(6.3,.12,.12,darkWood,g,0,11.4,z);for(const x of [-3,3])box(.12,.12,6.3,darkWood,g,x,11.4,-9);
  const roof=mesh(new T.ConeGeometry(5.7,2.8,4),coral,g,0,13.8,-9);roof.rotation.y=Math.PI/4;
  const table=new T.Group();table.name='chart-table';for(const x of [-.8,.8])for(const z of [-.45,.45])cylinder(.07,.1,.9,wood,table,x,.45,z-6);box(2,.12,1.3,endWood,table,0,.95,-6);g.add(combine(table));return combine(g);
}
