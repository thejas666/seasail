import {flowerField} from './illustrated-assets';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import * as T from 'three';
import {MAP,PICKUPS,WORLD_SCALE,type Island} from './data';
import {terrain,biome,sky,clouds,ocean,groundHeight,localHeight,SKY_COLOR,type Biome} from './environment';
import {loadNature,plantNature} from './nature';
import type {BoxObstacle} from './systems/collision';
import {Seabirds} from './companions';
import {daylightAt} from './systems/atmosphere';
import {SailCloth} from './systems/sail-cloth';
const mat=(color:T.ColorRepresentation,extra:T.MeshStandardMaterialParameters={})=>new T.MeshStandardMaterial({color,roughness:.96,flatShading:false,...extra});
const sand=mat('#e0ca94'),wood=mat('#93613c'),darkWood=mat('#503e30'),leaf=mat('#3c7e35'),leafLight=mat('#6d9f3b'),cream=mat('#fff3d6'),coral=mat('#cf7550'),rockMat=mat('#71858b');
export function mesh(g:T.BufferGeometry,m:T.Material,x=0,y=0,z=0,parent?:T.Object3D){const a=new T.Mesh(g,m);a.position.set(x,y,z);a.castShadow=true;a.receiveShadow=true;parent?.add(a);return a;}
function box(w:number,h:number,d:number,m:T.Material,x:number,y:number,z:number,p:T.Object3D){return mesh(new RoundedBoxGeometry(w,h,d,1,Math.min(.06,w*.15,h*.15,d*.15)),m,x,y,z,p);}
function cylinder(rt:number,rb:number,h:number,m:T.Material,x:number,y:number,z:number,p:T.Object3D,n=8){return mesh(new T.CylinderGeometry(rt,rb,h,n),m,x,y,z,p);}
function lineBetween(a:T.Vector3,b:T.Vector3,r:number,m:T.Material,p:T.Object3D){const o=cylinder(r,r,a.distanceTo(b),m,0,0,0,p,5);o.position.copy(a).add(b).multiplyScalar(.5);o.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),b.clone().sub(a).normalize());return o;}
function mergeParts(root:T.Group,parts:T.Mesh[],material:T.Material){if(!parts.length)return;const geometries=parts.map(part=>{part.updateMatrix();return part.geometry.clone().applyMatrix4(part.matrix);});const geometry=mergeGeometries(geometries,false)!;for(const part of parts){part.removeFromParent();part.geometry.dispose();}for(const geometry of geometries)geometry.dispose();const combined=new T.Mesh(geometry,material);combined.castShadow=combined.receiveShadow=true;root.add(combined);}
function palm(parent:T.Object3D,x:number,z:number,h=10,seed=0) {
  const p=new T.Group();p.position.set(x,1.5,z);parent.add(p);
  for(let j=0;j<5;j++)lineBetween(new T.Vector3(Math.sin(j*.3+seed)*j*.24,j*h/5,0),new T.Vector3(Math.sin((j+1)*.3+seed)*(j+1)*.24,(j+1)*h/5,0),.29-j*.028,wood,p);
  const top=new T.Vector3(Math.sin(1.5+seed)*1.2,h,0);
  for(let j=0;j<12;j++){
    const a=j*Math.PI/6+seed,l=4.8+(j%3)*.5,verts:number[]=[],indexes:number[]=[];
    for(let k=0;k<=9;k++){
      const t=k/9,r=t*l,arch=Math.sin(t*Math.PI)*1.1-t*t*2.3,width=Math.sin(t*Math.PI)*.68;
      const center=new T.Vector3(Math.cos(a)*r,arch,Math.sin(a)*r),side=new T.Vector3(-Math.sin(a),0,Math.cos(a));
      const left=center.clone().addScaledVector(side,-width),right=center.clone().addScaledVector(side,width);left.y-=width*.3;right.y-=width*.3;
      verts.push(left.x,left.y,left.z,center.x,center.y+.06,center.z,right.x,right.y,right.z);
      if(k<9){const n=k*3;indexes.push(n,n+3,n+1,n+1,n+3,n+4,n+1,n+4,n+2,n+2,n+4,n+5);}
    }
    const geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.Float32BufferAttribute(verts,3));geometry.setIndex(indexes);geometry.computeVertexNormals();
    const material=mat(j%2?'#5e932f':'#78a944',{flatShading:false,side:T.DoubleSide});mesh(geometry,material,top.x,top.y,top.z,p);
  }
  for(let j=0;j<3;j++)mesh(new T.IcosahedronGeometry(.4,0),mat('#a78b4e'),top.x+Math.cos(j*2)*.5,h-.4,Math.sin(j*2)*.5,p);
  const parts=p.children.filter((o):o is T.Mesh=>o instanceof T.Mesh);mergeParts(p,parts.filter(m=>m.material===wood),wood);mergeParts(p,parts.filter(m=>m.geometry.type==='BufferGeometry'),mat('#77a83e',{side:T.DoubleSide,flatShading:false}));mergeParts(p,parts.filter(m=>m.geometry.type==='IcosahedronGeometry'),mat('#aa8e4c'));
  return p;
}
function flower(p:T.Object3D,x:number,z:number,color:string){cylinder(.06,.08,.8,leaf,x,2,z,p,4);mesh(new T.IcosahedronGeometry(.35,0),mat(color),x,2.5,z,p);}
export function boatModel(){
  const p=new T.Group(),hullMaterial=mat('#b57b3e',{flatShading:false}),deckMaterial=mat('#d7aa6b',{side:T.DoubleSide,flatShading:false}),railMaterial=mat('#80552f',{flatShading:false});
  const outline=new T.Shape();outline.moveTo(0,-3.6);outline.bezierCurveTo(1.6,-2.9,2.0,-.8,1.65,2.5);outline.quadraticCurveTo(0,3.35,-1.65,2.5);outline.bezierCurveTo(-2,-.8,-1.6,-2.9,0,-3.6);
  const edge=outline.getPoints(42),count=edge.length,vertices:number[]=[],indexes:number[]=[];
  for(let ring=0;ring<6;ring++){
    const t=ring/5,scale=.46+Math.sin(t*Math.PI*.5)*.54,y=-.55+t*1.6;
    for(const point of edge)vertices.push(point.x*scale,y,point.y*(.88+t*.12));
    if(ring<5)for(let n=0;n<count-1;n++){const a=ring*count+n;indexes.push(a,a+count,a+1,a+1,a+count,a+count+1);}
  }
  const hullGeometry=new T.BufferGeometry();hullGeometry.setAttribute('position',new T.Float32BufferAttribute(vertices,3));hullGeometry.setIndex(indexes);hullGeometry.computeVertexNormals();hullMaterial.side=T.DoubleSide;mesh(hullGeometry,hullMaterial,0,0,0,p);
  const deck=mesh(new T.ShapeGeometry(outline,40),deckMaterial,0,1.04,0,p);deck.rotation.x=Math.PI/2;
  for(let n=0;n<15;n++){
    const z=-2.8+n*.38,width=Math.max(.5,2.85-Math.pow((z+.1)/3.8,2)*2.2);
    box(width,.025,.025,railMaterial,0,1.06,z,p);
  }
  for(let ring=0;ring<5;ring++){
    const t=ring/5,scale=.46+Math.sin(t*Math.PI*.5)*.54,y=-.55+t*1.6;
    const curve=new T.CatmullRomCurve3(edge.slice(0,-1).map(point=>new T.Vector3(point.x*scale,y,point.y*(.88+t*.12))),true);
    mesh(new T.TubeGeometry(curve,80,ring===4?.06:.022,5,true),railMaterial,0,0,0,p);
  }
  const railCurve=new T.CatmullRomCurve3(edge.slice(0,-1).map(point=>new T.Vector3(point.x,1.13,point.y)),true);mesh(new T.TubeGeometry(railCurve,100,.1,7,true),railMaterial,0,0,0,p);
  box(2.6,.18,.5,railMaterial,0,1.33,1.75,p);box(1.25,.85,1.1,mat('#bf8545'),0,1.55,-1.9,p);box(1.45,.14,1.3,railMaterial,0,2.03,-1.9,p);box(.7,.39,.03,mat('#548b93'),0,1.68,-2.47,p);
  cylinder(.13,.2,8.2,railMaterial,0,5.1,-.45,p,12);
  const sailPositions:number[]=[],sailIndexes:number[]=[];const rows=14;
  for(let row=0;row<=rows;row++)for(let col=0;col<=rows;col++){
    const t=row/rows,u=col/rows;sailPositions.push(.1+Math.sin(t*Math.PI)*Math.sin(u*Math.PI)*.65,8.8-t*6.3+u*t*.2,-.43+u*t*3.55);
    if(row<rows&&col<rows){const a=row*(rows+1)+col;sailIndexes.push(a,a+1,a+rows+1,a+1,a+rows+2,a+rows+1);}
  }
  const sail=new T.BufferGeometry();sail.setAttribute('position',new T.Float32BufferAttribute(sailPositions,3));sail.setIndex(sailIndexes);sail.computeVertexNormals();const fabric=mesh(sail,mat('#f4e6bd',{side:T.DoubleSide,flatShading:false}),0,0,0,p);fabric.name='sail-cloth';
  lineBetween(new T.Vector3(0,2.43,-.45),new T.Vector3(0,2.63,3.15),.06,railMaterial,p);
  lineBetween(new T.Vector3(0,8.8,-.45),new T.Vector3(0,1.2,-3.4),.018,cream,p);lineBetween(new T.Vector3(0,8.8,-.45),new T.Vector3(-1.5,1.2,2.3),.018,cream,p);
  const flag=new T.Shape();flag.moveTo(0,0);flag.lineTo(1.05,.35);flag.lineTo(0,.65);const flagMesh=mesh(new T.ShapeGeometry(flag),mat('#df9361',{side:T.DoubleSide}),0,8.8,-.45,p);flagMesh.rotation.y=Math.PI/2;flagMesh.name='sail-flag';
  const ring=mesh(new T.TorusGeometry(.38,.105,8,24),cream,1.68,.75,1.2,p);ring.rotation.y=Math.PI/2;for(let n=0;n<4;n++){const band=mesh(new T.TorusGeometry(.38,.108,5,24,Math.PI*.2),coral,1.69,.75,1.2,p);band.rotation.set(0,Math.PI/2,n*Math.PI*.5);}
  for(let n=0;n<3;n++){const rope=mesh(new T.TorusGeometry(.3+n*.06,.027,5,24),mat('#bd9a5f'),-.85,1.1,.1,p);rope.rotation.x=-Math.PI/2;}
  box(.6,.55,.6,mat('#b98d57'),.85,1.35,.4,p);cylinder(.31,.28,.7,railMaterial,-.9,1.4,-.6,p,12);
  box(.13,.8,.9,railMaterial,0,.15,3.1,p);return p;
}
export function characterModel(){
  const g=new T.Group(),shirt=mat('#e2e9cf',{flatShading:false}),pants=mat('#497574',{flatShading:false}),skin=mat('#d8ab83',{flatShading:false}),hair=mat('#795339',{flatShading:false}),shoe=mat('#86694c',{flatShading:false});
  mesh(new T.CapsuleGeometry(.28,.4,4,14),shirt,0,1.06,0,g);cylinder(.27,.27,.065,mat('#7c6944'),0,.76,0,g,18);
  mesh(new T.SphereGeometry(.28,20,14),skin,0,1.62,0,g);const hairCap=mesh(new T.SphereGeometry(.282,18,12),hair,0,1.69,-.025,g);hairCap.scale.set(1,.72,.96);
  for(const side of [-1,1])mesh(new T.SphereGeometry(.058,10,8),skin,side*.266,1.61,0,g);
  for(const x of [-.093,.093]){const eye=mesh(new T.SphereGeometry(.039,10,8),cream,x,1.655,.25,g);eye.scale.set(.9,1.2,.5);mesh(new T.SphereGeometry(.021,9,7),mat('#354c43'),x,1.655,.275,g);lineBetween(new T.Vector3(x-.035,1.718,.247),new T.Vector3(x+.035,1.725,.247),.012,hair,g);}
  const nose=mesh(new T.SphereGeometry(.045,10,8),skin,0,1.6,.281,g);nose.scale.set(.8,.85,1);
  const smile=new T.CatmullRomCurve3([new T.Vector3(-.065,1.535,.263),new T.Vector3(0,1.519,.28),new T.Vector3(.065,1.535,.263)]);mesh(new T.TubeGeometry(smile,9,.008,5,false),hair,0,0,0,g);
  cylinder(.49,.49,.065,mat('#d8bc83',{flatShading:false}),0,1.83,0,g,28);cylinder(.29,.33,.245,mat('#e2c993',{flatShading:false}),0,1.955,0,g,24);cylinder(.333,.335,.052,mat('#73906a',{flatShading:false}),0,1.872,0,g,24);
  box(.47,.55,.28,mat('#c49555',{flatShading:false}),0,1.08,-.255,g);box(.33,.25,.055,mat('#d9ae6b'),0,.96,-.425,g);box(.09,.09,.025,mat('#f0d08a'),0,1.17,-.415,g);
  for(const side of [-1,1]){
    lineBetween(new T.Vector3(side*.21,1.37,-.07),new T.Vector3(side*.22,.86,.23),.022,mat('#aa8751'),g);
    const leg=new T.Group();leg.position.set(side*.16,.72,0);g.add(leg);leg.name=side<0?'leftLeg':'rightLeg';mesh(new T.CapsuleGeometry(.118,.2,4,10),pants,0,-.16,0,leg);mesh(new T.CapsuleGeometry(.105,.19,4,10),pants,0,-.4,.015,leg);box(.255,.17,.4,shoe,0,-.64,.06,leg);box(.24,.035,.39,mat('#514f3f'),0,-.716,.06,leg);for(let lace=0;lace<2;lace++)box(.13,.018,.022,cream,0,-.56,.12+lace*.05,leg);
    const arm=new T.Group();arm.position.set(side*.34,1.31,0);g.add(arm);arm.name=side<0?'leftArm':'rightArm';mesh(new T.CapsuleGeometry(.105,.16,4,10),shirt,0,-.13,0,arm);mesh(new T.SphereGeometry(.085,10,8),skin,0,-.3,.015,arm);mesh(new T.CapsuleGeometry(.075,.15,4,10),skin,0,-.415,.025,arm);const hand=mesh(new T.SphereGeometry(.087,10,8),skin,0,-.56,.04,arm);hand.scale.y=1.12;mesh(new T.SphereGeometry(.038,8,6),skin,-side*.06,-.525,.09,arm);arm.rotation.z=side*.12;
  }
  for(const y of [1.16,.99])mesh(new T.SphereGeometry(.018,7,5),mat('#9ba885'),0,y,.281,g);
  return g;
}
export class World {
  scene=new T.Scene(); camera=new T.PerspectiveCamera(52,1,.1,1600);renderer:T.WebGLRenderer;
  boat=boatModel();player=characterModel();reinforcement=new T.Group();float=new T.Group();pickups=new Map<string,T.Group>();landmarks:T.Group[]=[];palms:T.Group[]=[];solids:T.Object3D[]=[];solidBoxes:BoxObstacle[]=[];
  biomes:{island:Island;biome:Biome}[]=[];landObstacles:{x:number;z:number;r:number}[]=[];natureGroups:T.Group[]=[];lowGraphics=false;sky=sky();clouds=clouds();water:T.ShaderMaterial;sun:T.DirectionalLight;birds:T.Group; wake:T.Mesh; marker:T.Group; rocks:{x:number;z:number;r:number}[]=[];
  companions:Seabirds;ambient=new T.HemisphereLight('#d3eeff','#827041',1.5);lantern=new T.PointLight('#ffd183',.3,11,2);stars:T.Points;moon:T.Mesh;rain:T.LineSegments;
  cloth:SailCloth;sailMesh:T.Mesh;flagMesh:T.Mesh;
  constructor(container:HTMLElement){
    this.renderer=new T.WebGLRenderer({antialias:true,powerPreference:'high-performance'});this.renderer.setPixelRatio(Math.min(devicePixelRatio,1.75));this.renderer.setSize(innerWidth,innerHeight);this.renderer.shadowMap.enabled=true;this.renderer.shadowMap.type=T.PCFSoftShadowMap;this.renderer.outputColorSpace=T.SRGBColorSpace;this.renderer.toneMapping=T.ACESFilmicToneMapping;this.renderer.toneMappingExposure=.98;container.append(this.renderer.domElement);
    this.scene.background=new T.Color(SKY_COLOR);this.scene.fog=new T.FogExp2(SKY_COLOR,.0075);
    this.scene.add(this.ambient);
    this.sun=new T.DirectionalLight('#fff0cf',3.6);this.sun.position.set(-48,82,55);this.sun.castShadow=true;this.sun.shadow.mapSize.set(1024,1024);this.sun.shadow.camera.left=-62;this.sun.shadow.camera.right=62;this.sun.shadow.camera.top=62;this.sun.shadow.camera.bottom=-62;this.sun.shadow.camera.far=250;this.sun.shadow.normalBias=.035;this.sun.shadow.bias=-.00015;this.sun.shadow.radius=2;this.scene.add(this.sun,this.sun.target,this.sky.dome,this.clouds);
    this.water=ocean();this.water.uniforms.islands.value=MAP.islands.map(i=>new T.Vector3(i.x,i.z,i.radius));
    const sea=mesh(new T.PlaneGeometry(3200,3200,240,240),this.water,0,-.1,-200,this.scene);sea.rotation.x=-Math.PI/2;sea.castShadow=false;
    for(const i of MAP.islands)this.island(i);
    for(const p of PICKUPS){const g=new T.Group();const island=MAP.islands.find(i=>i.id===p.island)!;g.position.set(p.x,groundHeight(island,p.x,p.z)+.22,p.z);g.userData={pickup:p.id};
      const colors={wood:'#ac8258',fiber:'#9eac68',scrap:'#809e9b',fruit:'#e7a05b',fish:'#8dbbbd',shell:'#f6c7b1',rod:'#d4b07c',chart:'#fff1c8'};
      const m=mat(colors[p.type]);
      if(p.type==='wood'){for(let j=0;j<3;j++){const log=cylinder(.23,.28,2,m,(j-1)*.4,.2+j*.08,0,g,12);log.rotation.x=Math.PI/2;log.rotation.z=j*.15;}}
      else if(p.type==='fiber'){for(let j=0;j<5;j++){const curve=new T.CatmullRomCurve3([new T.Vector3((j-2)*.12,0,0),new T.Vector3((j-2)*.18,.6,.13),new T.Vector3((j-2)*.24,1.25,.35)]);mesh(new T.TubeGeometry(curve,8,.055,6,false),m,0,0,0,g);}const tie=mesh(new T.TorusGeometry(.34,.035,5,16),wood,0,.55,.08,g);tie.rotation.x=Math.PI/2;}
      else if(p.type==='rod'){lineBetween(new T.Vector3(-1,0,0),new T.Vector3(1,1.6,0),.06,wood,g);mesh(new T.TorusGeometry(.24,.07,6,10),coral,-.5,.3,0,g);}
      else if(p.type==='chart'){box(1.5,.15,1.1,m,0,.1,0,g);box(.8,.17,.06,coral,0,.2,0,g);}
      else if(p.type==='fruit'){const fruit=mesh(new T.SphereGeometry(.32,14,10),m,0,.24,0,g);fruit.scale.set(1,1.2,.85);cylinder(.025,.03,.17,wood,0,.64,0,g,6);const smallLeaf=mesh(new T.SphereGeometry(1,10,7),leafLight,.13,.65,0,g);smallLeaf.scale.set(.18,.035,.07);smallLeaf.rotation.z=.3;}
      else if(p.type==='scrap'){box(.9,.11,.65,m,0,.1,0,g);const ring=mesh(new T.TorusGeometry(.24,.075,7,16),mat('#a7b6a8'),.12,.23,0,g);ring.rotation.x=Math.PI/2;for(const x of [-.28,.28])cylinder(.055,.055,.07,wood,x,.19,.15,g,8);}
      else {const o=mesh(new T.SphereGeometry(.37,14,9),m,0,.15,0,g);o.scale.set(1.2,.45,.9);for(let j=0;j<5;j++){const x=(j-2)*.1;const rib=new T.CatmullRomCurve3([new T.Vector3(x*.25,.12,-.22),new T.Vector3(x,.3,0),new T.Vector3(x,.15,.23)]);mesh(new T.TubeGeometry(rib,6,.014,5,false),cream,0,0,0,g);}}
      const glow=mesh(new T.RingGeometry(1,1.15,24),new T.MeshBasicMaterial({color:'#fff3be',transparent:true,opacity:.75,side:T.DoubleSide}),0,-.2,0,g);glow.rotation.x=-Math.PI/2;this.pickups.set(p.id,g);this.scene.add(g);
    }
    this.scene.add(this.boat,this.player);this.player.visible=false;this.sailMesh=this.boat.getObjectByName('sail-cloth') as T.Mesh;this.flagMesh=this.boat.getObjectByName('sail-flag') as T.Mesh;this.cloth=new SailCloth(this.sailMesh.geometry.attributes.position.array as Float32Array,14,14);this.sailMesh.geometry.computeBoundingSphere();this.sailMesh.geometry.boundingSphere!.radius+=1.5;
    for(const x of [-1.5,1.5])for(const z of [-1.5,.2,1.8])box(.18,.8,.32,mat('#c0b47d'),x,.48,z,this.reinforcement);this.boat.add(this.reinforcement);this.reinforcement.visible=false;
    cylinder(.15,.15,.7,cream,0,.3,0,this.float,8);cylinder(.16,.16,.3,coral,0,.65,0,this.float,8);this.scene.add(this.float);this.float.visible=false;
    this.wake=mesh(new T.RingGeometry(2.2,2.8,36),new T.MeshBasicMaterial({color:'#e0f5df',transparent:true,opacity:.4,side:T.DoubleSide}),0,.07,0,this.scene);this.wake.rotation.x=-Math.PI/2;this.wake.scale.set(1,2,1);
    this.marker=new T.Group();const diamond=mesh(new T.OctahedronGeometry(.65,0),mat('#ffe4a3',{emissive:'#a17e35',emissiveIntensity:.3}),0,0,0,this.marker);diamond.scale.y=1.5;this.scene.add(this.marker);
    for(let [x,z,r] of [[86,-73,3],[114,-213,4],[-66,-208,3],[95,-396,4],[151,-433,3]] as number[][]){x*=WORLD_SCALE;z*=WORLD_SCALE;const rock=mesh(new T.SphereGeometry(r,14,10),rockMat,x,.3,z,this.scene);rock.scale.y=.8;this.rocks.push({x,z,r});const ring=mesh(new T.RingGeometry(r+1,r+1.4,20),new T.MeshBasicMaterial({color:'#e4efd2',transparent:true,opacity:.5,side:T.DoubleSide}),x,.04,z,this.scene);ring.rotation.x=-Math.PI/2;}
    for(let n=0;n<6;n++){const z=(-385-n*12)*WORLD_SCALE,x=(80+n*9)*WORLD_SCALE;const b=new T.Group();b.position.set(x,0,z);cylinder(.5,.7,1.5,n%2?coral:cream,0,.6,0,b);cylinder(.07,.07,3,wood,0,2,0,b);mesh(new T.SphereGeometry(.18,6,4),cream,0,3.5,0,b);this.scene.add(b);}
    this.birds=new T.Group();this.companions=new Seabirds(this.scene);
    this.lantern.position.set(-.9,2,1.4);this.boat.add(this.lantern);const lamp=mesh(new T.SphereGeometry(.13,8,6),mat('#ffe9a1',{emissive:'#ffbf50',emissiveIntensity:1.5}),-.9,1.8,1.4,this.boat);lamp.castShadow=false;
    const starVertices:number[]=[];for(let j=0;j<160;j++){const a=j*2.399,b=.15+(j%17)/17*1.2;starVertices.push(Math.cos(a)*Math.cos(b)*600,Math.sin(b)*600,Math.sin(a)*Math.cos(b)*600);}const starGeometry=new T.BufferGeometry();starGeometry.setAttribute('position',new T.Float32BufferAttribute(starVertices,3));this.stars=new T.Points(starGeometry,new T.PointsMaterial({color:'#fff0c9',size:1.2,transparent:true,opacity:0,fog:false,depthWrite:false}));this.scene.add(this.stars);this.moon=mesh(new T.SphereGeometry(10,16,12),new T.MeshBasicMaterial({color:'#fff4d4',transparent:true,opacity:0,fog:false}),-210,280,-330,this.scene);this.moon.castShadow=false;
    const drops:number[]=[];for(let j=0;j<100;j++){const x=Math.sin(j*42.7)*12,z=Math.cos(j*21.2)*12,y=j%20;drops.push(x,y,z,x+.12,y-.8,z+.04);}const rainGeometry=new T.BufferGeometry();rainGeometry.setAttribute('position',new T.Float32BufferAttribute(drops,3));this.rain=new T.LineSegments(rainGeometry,new T.LineBasicMaterial({color:'#d6e8e9',transparent:true,opacity:0,depthWrite:false}));this.rain.frustumCulled=false;this.scene.add(this.rain);
    addEventListener('resize',()=>this.resize());this.resize();
  }
  island(i:Island){
    const g=new T.Group();g.position.set(i.x,0,i.z);this.scene.add(g);this.landmarks.push(g);
    const surface=terrain(i);g.add(surface);this.solids.push(surface);const vegetation=biome(i);g.add(vegetation.objects);this.biomes.push({island:i,biome:vegetation});
    for(let j=0;j<8;j++){const a=j*2.39+.5,rad=i.radius*(.42+(j%3)*.13);const x=Math.cos(a)*rad,z=Math.sin(a)*rad;if(x>8&&z>14||PICKUPS.some(p=>p.island===i.id&&Math.hypot(p.x-i.x-x,p.z-i.z-z)<2))continue;const tree=palm(g,x,z,9+(j%3)*1.5,j*.6);tree.position.y=localHeight(i,x,z);this.palms.push(tree);this.solids.push(...tree.children.filter(c=>c instanceof T.Mesh&&c.material===wood));this.landObstacles.push({x:i.x+x,z:i.z+z,r:.42});}
    g.add(flowerField(i));
    const dx=i.dock[0]-i.x,dz=i.dock[1]-i.z;for(const zz of [dz-3,dz-11])for(const xx of [-2,2])this.landObstacles.push({x:i.x+dx+xx,z:i.z+zz,r:.22});
    for(let j=0;j<26;j++)box(4.4,.25,.7,j%2?wood:mat('#a7855e'),dx,1.35,dz-3-j*.8,g);
    for(const zz of [dz-3,dz-11])for(const xx of [-2,2]){cylinder(.18,.24,3.8,darkWood,dx+xx,.3,zz,g);cylinder(.27,.27,.15,wood,dx+xx,2.2,zz,g);}
    const sign=new T.Group();sign.position.set(dx-4,1.5,dz-13);cylinder(.1,.1,2.5,wood,0,1,0,sign);box(2.5,.85,.18,wood,0,2,0,sign);g.add(sign);
    // A ring marks the sheltered fishing spot by each jetty.
    const fishing=mesh(new T.RingGeometry(1.7,1.85,32),new T.MeshBasicMaterial({color:'#eaf4ca',transparent:true,opacity:.65,side:T.DoubleSide}),dx+5,.08,dz-2,g);fishing.rotation.x=-Math.PI/2;
    if(i.landmark==='wreck'){this.solidBoxes.push({x:i.x-4,z:i.z-4,hx:2.8,hz:6.2,angle:.8});
      const wreck=boatModel();wreck.position.set(-4,localHeight(i,-4,-4)+.5,-4);wreck.rotation.set(.3,.8,.65);wreck.scale.set(2,1.2,2);g.add(wreck);this.solids.push(wreck);for(let j=0;j<5;j++)box(1.4,.2,4,wood,-9+j*3,2,5,g).rotation.y=j*.7;
    }
    if(i.landmark==='lookout'){for(const x of [-3,3])for(const z of [-3,3])this.landObstacles.push({x:i.x+x,z:i.z+z-9,r:.28});this.landObstacles.push({x:i.x-15,z:i.z-12,r:3.5});
      const hill=mesh(new T.SphereGeometry(4,14,10),rockMat,-15,localHeight(i,-15,-12)+1,-12,g);hill.scale.set(1,.8,1);
      for(const x of [-3,3])for(const z of [-3,3])cylinder(.25,.35,9,wood,x,6,z-9,g);
      box(8,.35,8,wood,0,10,-9,g);const roof=mesh(new T.ConeGeometry(6,3,4),coral,0,13,-9,g);roof.rotation.y=Math.PI/4;
      for(let j=0;j<6;j++)box(2,.6,1.2,sand,-.5,2+j*.3,-1-j*1.2,g);
    }
    if(i.landmark==='harbor'){this.landObstacles.push({x:i.x-12,z:i.z-12,r:4});for(let j=0;j<3;j++)this.solidBoxes.push({x:i.x+7+j*9,z:i.z-8+(j%2)*13,hx:3.5,hz:3.5});
      const lighthouse=new T.Group();lighthouse.position.set(-12,localHeight(i,-12,-12),-12);cylinder(2.8,4,18,cream,0,9,0,lighthouse,12);cylinder(3.15,3.45,3,coral,0,9,0,lighthouse,12);cylinder(3.3,3.3,.6,wood,0,18,0,lighthouse,12);cylinder(2.2,2.2,3,mat('#9ac2b9'),0,20,0,lighthouse,8);cylinder(0,3.3,3,coral,0,23,0,lighthouse,12);mesh(new T.SphereGeometry(1,8,6),mat('#fff4bb',{emissive:'#ffc95b',emissiveIntensity:2}),0,20,0,lighthouse);g.add(lighthouse);this.solids.push(lighthouse);
      for(let j=0;j<3;j++){const h=new T.Group();h.position.set(7+j*9,localHeight(i,7+j*9,-8+(j%2)*13),-8+(j%2)*13);box(7,5,7,mat(j%2?'#e6bb88':'#f4e1b4'),0,2.5,0,h);const roof=mesh(new T.ConeGeometry(6,3,4),mat('#b7785d'),0,6,0,h);roof.rotation.y=Math.PI/4;box(1.5,2.8,.1,mat('#527b76'),0,1.4,3.55,h);for(const xx of [-2,2])box(1,1,.1,mat('#92bcb6'),xx,3.3,3.56,h);g.add(h);this.solids.push(h);}
    }
    if(i.landmark==='shell'){for(let j=0;j<5;j++){const s=mesh(new T.SphereGeometry(1,6,4),mat('#efb9a3'),-9+j*3,1.6,15+Math.sin(j)*2,g);s.scale.set(1,.4,1);}}
  }
  resize(){this.camera.aspect=innerWidth/innerHeight;this.camera.updateProjectionMatrix();this.renderer.setSize(innerWidth,innerHeight);}
  updateSail(dt:number,time:number,speed:number,heading:number,reduced:boolean){this.cloth.advance(dt,time,speed,heading,this.sky.material.uniforms.storm.value,this.lowGraphics,reduced);this.sailMesh.geometry.attributes.position.needsUpdate=true;this.sailMesh.geometry.computeVertexNormals();const flag=this.flagMesh.geometry.attributes.position;for(let vertex=0;vertex<flag.count;vertex++)flag.setZ(vertex,reduced?0:Math.sin(time*5+flag.getX(vertex)*3)*flag.getX(vertex)*.16);flag.needsUpdate=true;this.flagMesh.geometry.computeVertexNormals();}
  setAtmosphere(seconds:number,storm:boolean){const {night,sunset}=daylightAt(seconds);this.sky.material.uniforms.night.value=night;this.sky.material.uniforms.sunset.value=sunset;this.water.uniforms.night.value=night;this.ambient.intensity=1.5-night*.55;this.ambient.color.set(night>.5?'#a6d4ef':'#d3eeff');this.sun.intensity=(3.2-night*2.2)*(storm?.55:1);this.sun.color.set(night>.5?'#c2dbf2':sunset>.1?'#ffd5a1':'#fff0cf');this.lantern.intensity=.3+night*5;(this.stars.material as T.PointsMaterial).opacity=night*.8;(this.moon.material as T.MeshBasicMaterial).opacity=night;this.stars.position.copy(this.camera.position);this.moon.position.copy(this.camera.position).add(new T.Vector3(-210,280,-330));this.scene.fog!.color.copy(new T.Color(SKY_COLOR).lerp(new T.Color('#789aaa'),night*.7));}
  async loadNature(progress:(done:number)=>void){const assets=await loadNature(progress);for(const {island,biome:b}of this.biomes){const nature=plantNature(island,b,assets);this.scene.add(nature.group);this.natureGroups.push(nature.group);this.landObstacles.push(...nature.colliders);nature.group.traverse(object=>{if(object.userData.cameraSolid)this.solids.push(object);});}this.quality(this.lowGraphics);this.scene.updateMatrixWorld(true);}
  quality(low:boolean){this.lowGraphics=low;for(const group of this.natureGroups)group.traverse(child=>{if(child.userData.lowDetailHide)child.visible=!low;if(child instanceof T.InstancedMesh&&child.userData.fullCount)child.count=low?child.userData.lowDensityCount:child.userData.fullCount;});this.renderer.setPixelRatio(Math.min(devicePixelRatio,low?1:1.5));this.renderer.shadowMap.enabled=!low;this.sun.castShadow=!low;for(const {biome:b} of this.biomes)b.grass.count=low?2200:8000;this.resize();}
  render(time:number,reduced:boolean){
    this.water.uniforms.time.value=reduced?0:time;this.sky.dome.position.copy(this.camera.position);this.clouds.position.x=reduced?0:Math.sin(time*.012)*15;
    const rainStrength=this.sky.material.uniforms.storm.value;this.rain.visible=rainStrength>.03;(this.rain.material as T.LineBasicMaterial).opacity=rainStrength*.2;this.rain.position.copy(this.boat.position);const dropPositions=this.rain.geometry.attributes.position;for(let j=0;j<(this.lowGraphics?40:100);j++){const y=((j%20-(reduced?0:time*12))%20+20)%20;dropPositions.setY(j*2,y);dropPositions.setY(j*2+1,y-.8);}dropPositions.needsUpdate=true;this.rain.geometry.setDrawRange(0,this.lowGraphics?80:200);
    this.marker.rotation.y=time;this.marker.position.y+=reduced?0:Math.sin(time*2)*.2;
    for(const [j,p]of this.palms.entries())p.rotation.z=reduced?0:Math.sin(time*.7+j)*.012;
    for(const island of this.landmarks)island.visible=Math.hypot(island.position.x-this.camera.position.x,island.position.z-this.camera.position.z)<300;for(const group of this.natureGroups)group.visible=Math.hypot(group.position.x-this.camera.position.x,group.position.z-this.camera.position.z)<300;
    for(const {island,biome:b}of this.biomes){const distance=Math.hypot(island.x-this.camera.position.x,island.z-this.camera.position.z);b.objects.visible=distance<750;b.grass.visible=distance<145;b.wind.value=reduced?0:time;}
    const focus=this.player.visible?this.player.position:this.boat.position;this.sun.position.set(focus.x-48,82,focus.z+55);this.sun.target.position.set(focus.x,0,focus.z);this.renderer.render(this.scene,this.camera);
  }
}
