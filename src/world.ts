import * as Props from './props';
import {flowerField} from './illustrated-assets';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';
import * as T from 'three';
import {MAP,PICKUPS,WORLD_SCALE,type Island} from './data';
import {terrain,biome,sky,clouds,ocean,groundHeight,localHeight,SKY_COLOR,type Biome} from './environment';
import {loadNature,plantNature} from './nature';
import type {BoxObstacle} from './systems/collision';
import {Seabirds} from './companions';
import {daylightAt,horizonAt,seaFogDensity} from './systems/atmosphere';
import {TILLER_BASE,TILLER_GRIP} from './systems/boat-layout';
import {SailCloth} from './systems/sail-cloth';
import {createExplorer} from './explorer-model';
import {BoatLantern} from './lantern';
import {createPalm,PALM_VARIANTS,setPalmWind,palmColliders} from './assets/palm-tree';
const mat=(color:T.ColorRepresentation,extra:T.MeshStandardMaterialParameters={})=>new T.MeshStandardMaterial({color,roughness:.96,flatShading:false,...extra});
const sand=mat('#e0ca94'),wood=mat('#93613c'),darkWood=mat('#503e30'),leaf=mat('#3c7e35'),leafLight=mat('#6d9f3b'),cream=mat('#fff3d6'),coral=mat('#cf7550'),rockMat=mat('#71858b');
export function mesh(g:T.BufferGeometry,m:T.Material,x=0,y=0,z=0,parent?:T.Object3D){const a=new T.Mesh(g,m);a.position.set(x,y,z);a.castShadow=true;a.receiveShadow=true;parent?.add(a);return a;}
function box(w:number,h:number,d:number,m:T.Material,x:number,y:number,z:number,p:T.Object3D){return mesh(new RoundedBoxGeometry(w,h,d,1,Math.min(.06,w*.15,h*.15,d*.15)),m,x,y,z,p);}
function cylinder(rt:number,rb:number,h:number,m:T.Material,x:number,y:number,z:number,p:T.Object3D,n=8){return mesh(new T.CylinderGeometry(rt,rb,h,n),m,x,y,z,p);}
function lineBetween(a:T.Vector3,b:T.Vector3,r:number,m:T.Material,p:T.Object3D){const o=cylinder(r,r,a.distanceTo(b),m,0,0,0,p,5);o.position.copy(a).add(b).multiplyScalar(.5);o.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),b.clone().sub(a).normalize());return o;}
function palm(parent:T.Object3D,x:number,z:number,h=10,seed=0){
  const tree=createPalm(PALM_VARIANTS[Math.round(seed/.6)%PALM_VARIANTS.length],h);tree.position.set(x,0,z);tree.rotation.y=seed*.7;parent.add(tree);return tree;
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
  const cargo=Props.crate();cargo.position.set(.85,1.05,.4);p.add(cargo);const cask=Props.barrel();cask.position.set(-.9,1.05,-.6);p.add(cask);
  const rudder=box(.13,.8,.9,railMaterial,0,.15,3.1,p);const tiller=new T.Group();tiller.position.copy(TILLER_BASE);p.add(tiller);cylinder(.045,.055,1.73,railMaterial,0,1.115,2.9,p,10);const grip=TILLER_GRIP.clone().sub(TILLER_BASE);lineBetween(new T.Vector3(),grip,.048,railMaterial,tiller);const handle=new T.Object3D();handle.position.copy(grip);tiller.add(handle);p.userData.tiller=tiller;p.userData.tillerHandle=handle;p.userData.rudder=rudder;return p;
}
export function characterModel(){return createExplorer();}
export class World {
  scene=new T.Scene(); camera=new T.PerspectiveCamera(52,1,.1,1600);renderer:T.WebGLRenderer;
  boat=boatModel();player=characterModel();reinforcement=new T.Group();float=new T.Group();pickups=new Map<string,T.Group>();landmarks:T.Group[]=[];palms:T.Group[]=[];solids:T.Object3D[]=[];solidBoxes:BoxObstacle[]=[];
  biomes:{island:Island;biome:Biome}[]=[];landObstacles:{x:number;z:number;r:number}[]=[];natureGroups:T.Group[]=[];lowGraphics=false;sky=sky();clouds=clouds();water:T.ShaderMaterial;sun:T.DirectionalLight;birds:T.Group; wake:T.Mesh; marker:T.Group; rocks:{x:number;z:number;r:number}[]=[];
  companions:Seabirds;ambient=new T.HemisphereLight('#d3eeff','#827041',1.5);lantern=new T.PointLight('#ffd183',.3,11,2);stars:T.Points;moon:T.Mesh;rain:T.LineSegments;floatingProps:T.Group[]=[];warmMaterials:T.MeshStandardMaterial[]=[];
  cloth:SailCloth;sailMesh:T.Mesh;flagMesh:T.Mesh;lamp:BoatLantern;
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
      if(p.type==='wood')g.add(Props.driftwood());
      else if(p.type==='fiber'){for(let j=0;j<5;j++){const curve=new T.CatmullRomCurve3([new T.Vector3((j-2)*.12,0,0),new T.Vector3((j-2)*.18,.6,.13),new T.Vector3((j-2)*.24,1.25,.35)]);mesh(new T.TubeGeometry(curve,8,.055,6,false),m,0,0,0,g);}const tie=mesh(new T.TorusGeometry(.34,.035,5,16),wood,0,.55,.08,g);tie.rotation.x=Math.PI/2;}
      else if(p.type==='rod'){lineBetween(new T.Vector3(-1,0,0),new T.Vector3(1,1.6,0),.06,wood,g);mesh(new T.TorusGeometry(.24,.07,6,10),coral,-.5,.3,0,g);}
      else if(p.type==='chart'){g.position.y+=.75;g.add(Props.chart());}
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
    for(let n=0;n<6;n++){const b=Props.buoy(n%2?'#cf7550':'#d7dfb4');b.position.set((80+n*9)*WORLD_SCALE,0,(-385-n*12)*WORLD_SCALE);this.scene.add(b);this.floatingProps.push(b);}
    this.birds=new T.Group();this.companions=new Seabirds(this.scene);
    this.lamp=new BoatLantern(this.boat);this.lantern=this.lamp.light;
    const starVertices:number[]=[];for(let j=0;j<160;j++){const a=j*2.399,b=.15+(j%17)/17*1.2;starVertices.push(Math.cos(a)*Math.cos(b)*600,Math.sin(b)*600,Math.sin(a)*Math.cos(b)*600);}const starGeometry=new T.BufferGeometry();starGeometry.setAttribute('position',new T.Float32BufferAttribute(starVertices,3));this.stars=new T.Points(starGeometry,new T.PointsMaterial({color:'#fff0c9',size:1.2,transparent:true,opacity:0,fog:false,depthWrite:false}));this.scene.add(this.stars);this.moon=mesh(new T.SphereGeometry(10,16,12),new T.MeshBasicMaterial({color:'#fff4d4',transparent:true,opacity:0,fog:false}),-210,280,-330,this.scene);this.moon.castShadow=false;
    const drops:number[]=[];for(let j=0;j<100;j++){const x=Math.sin(j*42.7)*12,z=Math.cos(j*21.2)*12,y=j%20;drops.push(x,y,z,x+.12,y-.8,z+.04);}const rainGeometry=new T.BufferGeometry();rainGeometry.setAttribute('position',new T.Float32BufferAttribute(drops,3));this.rain=new T.LineSegments(rainGeometry,new T.LineBasicMaterial({color:'#d6e8e9',transparent:true,opacity:0,depthWrite:false}));this.rain.frustumCulled=false;this.scene.add(this.rain);
    addEventListener('resize',()=>this.resize());this.resize();
  }
  island(i:Island){
    const g=new T.Group();g.position.set(i.x,0,i.z);this.scene.add(g);this.landmarks.push(g);
    const surface=terrain(i);g.add(surface);this.solids.push(surface);const vegetation=biome(i);g.add(vegetation.objects);this.biomes.push({island:i,biome:vegetation});
    for(let j=0;j<8;j++){const a=j*2.39+.5,rad=i.radius*(.42+(j%3)*.13);const x=Math.cos(a)*rad,z=Math.sin(a)*rad;if(x>8&&z>14||PICKUPS.some(p=>p.island===i.id&&Math.hypot(p.x-i.x-x,p.z-i.z-z)<3.2))continue;const tree=palm(g,x,z,9+(j%3)*1.5,j*.6);tree.position.y=localHeight(i,x,z);this.palms.push(tree);this.solids.push(...tree.children.filter(c=>c.userData.cameraSolid));this.landObstacles.push(...palmColliders(tree));}
    g.add(flowerField(i));
    const dx=i.dock[0]-i.x,dz=i.dock[1]-i.z;for(const zz of [dz-3,dz-9.5,dz-16,dz-23])for(const xx of [-2,2])this.landObstacles.push({x:i.x+dx+xx,z:i.z+zz,r:.22});
    const jetty=Props.dock();jetty.position.set(dx,0,dz);g.add(jetty);const sign=Props.sign(i.name);sign.position.set(dx-4,1.5,dz-13);g.add(sign);this.landObstacles.push({x:i.x+dx-4,z:i.z+dz-13,r:.14});this.solidBoxes.push({x:i.x+dx-4,z:i.z+dz-13,hx:1.4,hz:.1});
    // A ring marks the sheltered fishing spot by each jetty.
    const fishing=mesh(new T.RingGeometry(1.7,1.85,32),new T.MeshBasicMaterial({color:'#eaf4ca',transparent:true,opacity:.65,side:T.DoubleSide}),dx+5,.08,dz-2,g);fishing.rotation.x=-Math.PI/2;
    if(i.landmark==='wreck'){this.solidBoxes.push({x:i.x-4,z:i.z-4,hx:2.8,hz:6.2,angle:.8});
      const wreck=boatModel();wreck.position.set(-4,localHeight(i,-4,-4)+.5,-4);wreck.rotation.set(.3,.8,.65);wreck.scale.set(2,1.2,2);g.add(wreck);this.solids.push(wreck);for(let j=0;j<5;j++)box(1.4,.2,4,wood,-9+j*3,2,5,g).rotation.y=j*.7;
    }
    if(i.landmark==='lookout'){
      for(const x of [-3,3])for(const z of [-3,3])this.landObstacles.push({x:i.x+x,z:i.z+z-9,r:.28});this.landObstacles.push({x:i.x-15,z:i.z-12,r:4});this.solidBoxes.push({x:i.x,z:i.z-6,hx:1,hz:.65});for(const x of [-3,3])this.solidBoxes.push({x:i.x+x,z:i.z-9,hx:.12,hz:3});
      const hill=mesh(new T.SphereGeometry(4,14,10),rockMat,-15,localHeight(i,-15,-12)+1,-12,g);hill.scale.set(1,.8,1);const tower=Props.lookout();tower.getObjectByName('chart-table')!.position.y=localHeight(i,0,-6);g.add(tower);this.solids.push(tower);const board=Props.sign('Harbor charts');board.position.set(-3.2,localHeight(i,-3.2,-3),-3);board.scale.setScalar(.65);g.add(board);this.solidBoxes.push({x:i.x-3.2,z:i.z-3,hx:.91,hz:.07});
    }
    if(i.landmark==='harbor'){
      this.landObstacles.push({x:i.x-12,z:i.z-12,r:4});const lighthouse=Props.lighthouse();lighthouse.position.set(-12,localHeight(i,-12,-12),-12);g.add(lighthouse);this.solids.push(lighthouse);this.warmMaterials.push(...lighthouse.userData.nightMaterials);
      for(let j=0;j<3;j++){const x=7+j*9,z=-8+(j%2)*13;this.solidBoxes.push({x:i.x+x,z:i.z+z,hx:3.5,hz:3.5});const house=Props.harborHouse(j%2?'#e6bb88':'#f4e1b4');house.position.set(x,localHeight(i,x,z),z);g.add(house);this.solids.push(house);this.warmMaterials.push(...house.userData.nightMaterials);}
      for(let j=0;j<3;j++){const x=29+j*1.1,z=17;const cargo=j%2?Props.barrel():Props.crate();cargo.position.set(x,localHeight(i,x,z),z);g.add(cargo);this.landObstacles.push({x:i.x+x,z:i.z+z,r:.36});this.solids.push(cargo);}
    }
    if(i.landmark==='shell'){for(let j=0;j<5;j++){const s=mesh(new T.SphereGeometry(1,6,4),mat('#efb9a3'),-9+j*3,1.6,15+Math.sin(j)*2,g);s.scale.set(1,.4,1);}}
  }
  resize(){this.camera.aspect=innerWidth/innerHeight;this.camera.updateProjectionMatrix();this.renderer.setSize(innerWidth,innerHeight);}
  updateSail(dt:number,time:number,speed:number,heading:number,reduced:boolean){this.cloth.advance(dt,time,speed,heading,this.sky.material.uniforms.storm.value,this.lowGraphics,reduced);this.sailMesh.geometry.attributes.position.needsUpdate=true;this.sailMesh.geometry.computeVertexNormals();const flag=this.flagMesh.geometry.attributes.position;for(let vertex=0;vertex<flag.count;vertex++)flag.setZ(vertex,reduced?0:Math.sin(time*5+flag.getX(vertex)*3)*flag.getX(vertex)*.16);flag.needsUpdate=true;this.flagMesh.geometry.computeVertexNormals();}
  setAtmosphere(seconds:number,storm:boolean){const {night,sunset}=daylightAt(seconds);this.sky.material.uniforms.night.value=night;this.sky.material.uniforms.sunset.value=sunset;this.water.uniforms.night.value=night;this.ambient.intensity=1.5-night*.55;this.ambient.color.set(night>.5?'#a6d4ef':'#d3eeff');this.sun.intensity=(3.2-night*2.2)*(storm?.55:1);this.sun.color.set(night>.5?'#c2dbf2':sunset>.1?'#ffd5a1':'#fff0cf');this.lantern.intensity=.3+night*5;for(const material of this.warmMaterials)material.emissiveIntensity=night*.8+.05;(this.stars.material as T.PointsMaterial).opacity=night*.8;(this.moon.material as T.MeshBasicMaterial).opacity=night;this.stars.position.copy(this.camera.position);this.moon.position.copy(this.camera.position).add(new T.Vector3(-210,280,-330));const horizon=horizonAt(night,sunset,this.sky.material.uniforms.storm.value);this.scene.fog!.color.setRGB(...horizon,T.SRGBColorSpace);(this.scene.fog as T.FogExp2).density=seaFogDensity(night);this.water.uniforms.horizon.value.set(...horizon);this.water.uniforms.fogDensity.value=seaFogDensity(night);}
  async loadNature(progress:(done:number)=>void){const assets=await loadNature(progress);for(const {island,biome:b}of this.biomes){const nature=plantNature(island,b,assets);this.scene.add(nature.group);this.natureGroups.push(nature.group);this.landObstacles.push(...nature.colliders);nature.group.traverse(object=>{if(object.userData.cameraSolid)this.solids.push(object);});}this.quality(this.lowGraphics);this.scene.updateMatrixWorld(true);}
  quality(low:boolean){this.lowGraphics=low;for(const group of this.natureGroups)group.traverse(child=>{if(child.userData.lowDetailHide)child.visible=!low;if(child instanceof T.InstancedMesh&&child.userData.fullCount)child.count=low?child.userData.lowDensityCount:child.userData.fullCount;});this.renderer.setPixelRatio(Math.min(devicePixelRatio,low?1:1.5));this.renderer.shadowMap.enabled=!low;this.sun.castShadow=!low;for(const {biome:b} of this.biomes)b.grass.count=low?b.grass.userData.lowDensityCount:b.grass.userData.fullCount;this.resize();}
  render(time:number,reduced:boolean,dt=.016){
    this.lamp.update(dt,time,this.boat.rotation.z,this.boat.rotation.x,this.sky.material.uniforms.night.value,reduced);
    this.water.uniforms.time.value=reduced?0:time;for(const prop of this.floatingProps){prop.position.y=reduced?0:Math.sin(time*.9+prop.position.x)*.13;prop.rotation.z=reduced?0:Math.sin(time*.7+prop.position.z)*.04;}this.sky.dome.position.copy(this.camera.position);this.clouds.position.x=reduced?0:Math.sin(time*.012)*15;
    const rainStrength=this.sky.material.uniforms.storm.value;this.rain.visible=rainStrength>.03;(this.rain.material as T.LineBasicMaterial).opacity=rainStrength*.2;this.rain.position.copy(this.boat.position);const dropPositions=this.rain.geometry.attributes.position;for(let j=0;j<(this.lowGraphics?40:100);j++){const y=((j%20-(reduced?0:time*12))%20+20)%20;dropPositions.setY(j*2,y);dropPositions.setY(j*2+1,y-.8);}dropPositions.needsUpdate=true;this.rain.geometry.setDrawRange(0,this.lowGraphics?80:200);
    this.marker.rotation.y=time;this.marker.position.y+=reduced?0:Math.sin(time*2)*.2;
    setPalmWind(time,reduced);
    for(const island of this.landmarks)island.visible=Math.hypot(island.position.x-this.camera.position.x,island.position.z-this.camera.position.z)<300;for(const group of this.natureGroups)group.visible=Math.hypot(group.position.x-this.camera.position.x,group.position.z-this.camera.position.z)<300;
    for(const {island,biome:b}of this.biomes){const distance=Math.hypot(island.x-this.camera.position.x,island.z-this.camera.position.z);b.objects.visible=distance<750;b.grass.visible=distance<145;b.wind.value=reduced?0:time;}
    const focus=this.player.visible?this.player.position:this.boat.position;this.sun.position.set(focus.x-48,82,focus.z+55);this.sun.target.position.set(focus.x,0,focus.z);this.renderer.render(this.scene,this.camera);
  }
}
