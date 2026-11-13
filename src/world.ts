import * as T from 'three';
import {MAP,PICKUPS,WORLD_SCALE,type Island} from './data';
const mat=(color:T.ColorRepresentation,extra:T.MeshStandardMaterialParameters={})=>new T.MeshStandardMaterial({color,roughness:.92,flatShading:true,...extra});
const sand=mat('#f6dfa4'),sandEdge=mat('#e8ce92'),wood=mat('#926748'),darkWood=mat('#674e3c'),leaf=mat('#548968'),leafLight=mat('#79a473'),cream=mat('#fff3d6'),coral=mat('#dc8265'),rockMat=mat('#8d9e8e');
export function mesh(g:T.BufferGeometry,m:T.Material,x=0,y=0,z=0,parent?:T.Object3D){const a=new T.Mesh(g,m);a.position.set(x,y,z);a.castShadow=true;a.receiveShadow=true;parent?.add(a);return a;}
function box(w:number,h:number,d:number,m:T.Material,x:number,y:number,z:number,p:T.Object3D){return mesh(new T.BoxGeometry(w,h,d),m,x,y,z,p);}
function cylinder(rt:number,rb:number,h:number,m:T.Material,x:number,y:number,z:number,p:T.Object3D,n=8){return mesh(new T.CylinderGeometry(rt,rb,h,n),m,x,y,z,p);}
function lineBetween(a:T.Vector3,b:T.Vector3,r:number,m:T.Material,p:T.Object3D){const o=cylinder(r,r,a.distanceTo(b),m,0,0,0,p,5);o.position.copy(a).add(b).multiplyScalar(.5);o.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),b.clone().sub(a).normalize());return o;}
function palm(parent:T.Object3D,x:number,z:number,h=10,seed=0) {
  const p=new T.Group();p.position.set(x,1.5,z);parent.add(p);
  for(let j=0;j<5;j++)lineBetween(new T.Vector3(Math.sin(j*.3+seed)*j*.24,j*h/5,0),new T.Vector3(Math.sin((j+1)*.3+seed)*(j+1)*.24,(j+1)*h/5,0),.29-j*.028,wood,p);
  const top=new T.Vector3(Math.sin(1.5+seed)*1.2,h,0);
  for(let j=0;j<8;j++){
    const a=j*Math.PI/4+seed,l=4.3+(j%3)*.45;
    const verts=[0,0,0,Math.cos(a-.25)*l*.5,.5,Math.sin(a-.25)*l*.5,Math.cos(a)*l,-1.2,Math.sin(a)*l,Math.cos(a+.25)*l*.5,.5,Math.sin(a+.25)*l*.5];
    const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(verts,3));g.setIndex([0,1,2,0,2,3]);g.computeVertexNormals();
    const m=(j%2?leaf:leafLight).clone();m.side=T.DoubleSide;const frond=mesh(g,m,top.x,top.y,top.z,p);frond.rotation.y=.15;
  }
  for(let j=0;j<3;j++)mesh(new T.IcosahedronGeometry(.4,0),mat('#a78b4e'),top.x+Math.cos(j*2)*.5,h-.4,Math.sin(j*2)*.5,p);
  return p;
}
function flower(p:T.Object3D,x:number,z:number,color:string){cylinder(.06,.08,.8,leaf,x,2,z,p,4);mesh(new T.IcosahedronGeometry(.35,0),mat(color),x,2.5,z,p);}
export function boatModel(){
  const p=new T.Group();
  const hullMat=mat('#397c79');
  const outline=new T.Shape();outline.moveTo(0,-3.4);outline.quadraticCurveTo(2.1,-2.3,1.65,2.6);outline.quadraticCurveTo(0,3.3,-1.65,2.6);outline.quadraticCurveTo(-2.1,-2.3,0,-3.4);
  const hull=mesh(new T.ExtrudeGeometry(outline,{depth:1.2,bevelEnabled:true,bevelSegments:1,steps:1,bevelSize:.22,bevelThickness:.3}),hullMat,0,.9,0,p);hull.rotation.x=Math.PI/2;
  const deck=mesh(new T.ShapeGeometry(outline),mat('#d6b583'),0,1.04,0,p);deck.rotation.x=-Math.PI/2;deck.rotation.z=Math.PI;
  for(let i=-2;i<=2;i++)box(2.6,.09,.12,wood,0,1.09,i,p);
  box(2.8,.2,.7,wood,0,1.3,1.2,p);box(2.4,.2,.6,wood,0,1.3,-1.6,p);
  cylinder(.12,.18,8.8,wood,0,5.2,-.6,p);
  const sg=new T.BufferGeometry();sg.setAttribute('position',new T.Float32BufferAttribute([.14,9.2,-.6,.14,2.3,-.6,.14,2.6,3.2,.75,5.4,1.1],3));sg.setIndex([0,1,3,1,2,3,2,0,3]);sg.computeVertexNormals();mesh(sg,mat('#fff2ce',{side:T.DoubleSide}),0,0,0,p);
  lineBetween(new T.Vector3(0,2.2,-.6),new T.Vector3(0,2.5,3.2),.06,wood,p);
  lineBetween(new T.Vector3(0,8.9,-.6),new T.Vector3(0,1.3,-3),.022,cream,p);
  const flagG=new T.BufferGeometry();flagG.setAttribute('position',new T.Float32BufferAttribute([0,9.5,-.6,0,8.6,-.6,0,9,1],3));flagG.computeVertexNormals();mesh(flagG,mat('#d78462',{side:T.DoubleSide}),0,0,0,p);
  box(.65,.55,.65,coral,-.7,1.5,.4,p);const ring=mesh(new T.TorusGeometry(.42,.12,5,12),cream,1.68,.8,1,p);ring.rotation.y=Math.PI/2;
  const rudder=box(.15,1,1,wood,0,.25,3.2,p);rudder.rotation.x=.25;
  return p;
}
export function characterModel(){const g=new T.Group();cylinder(.35,.27,.9,mat('#e7a581'),0,1.25,0,g);box(.7,.8,.4,mat('#f0e3c0'),0,.95,0,g);cylinder(.25,.25,.6,mat('#506f70'),-.2,.3,0,g,5);cylinder(.25,.25,.6,mat('#506f70'),.2,.3,0,g,5);cylinder(.72,.72,.08,mat('#c5a069'),0,1.85,0,g,12);cylinder(.4,.45,.35,mat('#d8b981'),0,2,0,g,8);return g;}
export class World {
  scene=new T.Scene(); camera=new T.PerspectiveCamera(52,1,.1,1600);renderer:T.WebGLRenderer;
  boat=boatModel();player=characterModel();reinforcement=new T.Group();float=new T.Group();pickups=new Map<string,T.Group>();landmarks:T.Group[]=[];palms:T.Group[]=[];
  water:T.ShaderMaterial;sun:T.DirectionalLight;birds:T.Group; wake:T.Mesh; marker:T.Group; rocks:{x:number;z:number;r:number}[]=[];
  constructor(container:HTMLElement){
    this.renderer=new T.WebGLRenderer({antialias:true,powerPreference:'high-performance'});this.renderer.setPixelRatio(Math.min(devicePixelRatio,1.75));this.renderer.setSize(innerWidth,innerHeight);this.renderer.shadowMap.enabled=true;this.renderer.shadowMap.type=T.PCFSoftShadowMap;this.renderer.outputColorSpace=T.SRGBColorSpace;this.renderer.toneMapping=T.ACESFilmicToneMapping;this.renderer.toneMappingExposure=1.18;container.append(this.renderer.domElement);
    this.scene.background=new T.Color('#b7ded6');this.scene.fog=new T.FogExp2('#b7ded6',.0018);
    this.scene.add(new T.HemisphereLight('#fff2d2','#438b85',2.4));this.sun=new T.DirectionalLight('#fff0cb',3.1);this.sun.position.set(-70,150,60);this.sun.castShadow=true;this.sun.shadow.mapSize.set(2048,2048);this.sun.shadow.camera.left=-85;this.sun.shadow.camera.right=85;this.sun.shadow.camera.top=85;this.sun.shadow.camera.bottom=-85;this.sun.shadow.camera.far=400;this.sun.shadow.normalBias=.06;this.scene.add(this.sun,this.sun.target);
    this.water=new T.ShaderMaterial({uniforms:{time:{value:0}},vertexShader:`varying vec3 vWorld;uniform float time;void main(){vec3 p=position;p.z+=sin(p.x*.055+time*.7)*.15+cos(p.y*.07+time*.6)*.14;vec4 world=modelMatrix*vec4(p,1.);vWorld=world.xyz;gl_Position=projectionMatrix*viewMatrix*world;}`,fragmentShader:`varying vec3 vWorld;uniform float time;void main(){float w=sin(vWorld.x*.12+vWorld.z*.15+time*.8)*sin(vWorld.z*.10-time*.5);vec3 c=mix(vec3(.10,.49,.52),vec3(.27,.68,.65),w*.5+.5);float glint=pow(max(0.,sin(vWorld.x*1.5+vWorld.z*.7+time)*sin(vWorld.z*1.9-time*.8)),35.);c+=vec3(.36,.48,.39)*glint*.48;float f=1.-exp(-pow(length(vWorld.xz-cameraPosition.xz)*.0018,2.));c=mix(c,vec3(.67,.83,.79),f);gl_FragColor=vec4(c,1.);}`});
    const sea=mesh(new T.PlaneGeometry(2800,2800,180,180),this.water,0,-.1,-200,this.scene);sea.rotation.x=-Math.PI/2;sea.castShadow=false;
    for(const i of MAP.islands)this.island(i);
    for(const p of PICKUPS){const g=new T.Group();g.position.set(p.x,2.3,p.z);g.userData={pickup:p.id};
      const colors={wood:'#ac8258',fiber:'#9eac68',scrap:'#809e9b',fruit:'#e7a05b',fish:'#8dbbbd',shell:'#f6c7b1',rod:'#d4b07c',chart:'#fff1c8'};
      const m=mat(colors[p.type]);
      if(p.type==='wood'){for(let j=0;j<3;j++){const log=cylinder(.23,.28,2,m,(j-1)*.4,.2+j*.08,0,g,6);log.rotation.x=Math.PI/2;log.rotation.z=j*.15;}}
      else if(p.type==='fiber'){for(let j=0;j<5;j++){const l=mesh(new T.ConeGeometry(.22,1.8,4),m,Math.sin(j)*.35,.45,Math.cos(j)*.35,g);l.rotation.z=(j-2)*.2;}}
      else if(p.type==='rod'){lineBetween(new T.Vector3(-1,0,0),new T.Vector3(1,1.6,0),.06,wood,g);mesh(new T.TorusGeometry(.24,.07,6,10),coral,-.5,.3,0,g);}
      else if(p.type==='chart'){box(1.5,.15,1.1,m,0,.1,0,g);box(.8,.17,.06,coral,0,.2,0,g);}
      else {const o=mesh(new T.IcosahedronGeometry(p.type==='scrap'?.7:.5,0),m,0,.25,0,g);o.scale.set(p.type==='shell'?1.3:1,.7,1);}
      const glow=mesh(new T.RingGeometry(1,1.15,24),new T.MeshBasicMaterial({color:'#fff3be',transparent:true,opacity:.75,side:T.DoubleSide}),0,-.2,0,g);glow.rotation.x=-Math.PI/2;this.pickups.set(p.id,g);this.scene.add(g);
    }
    this.scene.add(this.boat,this.player);this.player.visible=false;
    for(const x of [-1.5,1.5])for(const z of [-1.5,.2,1.8])box(.18,.8,.32,mat('#c0b47d'),x,.48,z,this.reinforcement);this.boat.add(this.reinforcement);this.reinforcement.visible=false;
    cylinder(.15,.15,.7,cream,0,.3,0,this.float,8);cylinder(.16,.16,.3,coral,0,.65,0,this.float,8);this.scene.add(this.float);this.float.visible=false;
    this.wake=mesh(new T.RingGeometry(2.2,2.8,36),new T.MeshBasicMaterial({color:'#e0f5df',transparent:true,opacity:.4,side:T.DoubleSide}),0,.07,0,this.scene);this.wake.rotation.x=-Math.PI/2;this.wake.scale.set(1,2,1);
    this.marker=new T.Group();const diamond=mesh(new T.OctahedronGeometry(.65,0),mat('#ffe4a3',{emissive:'#a17e35',emissiveIntensity:.3}),0,0,0,this.marker);diamond.scale.y=1.5;this.scene.add(this.marker);
    for(let [x,z,r] of [[86,-73,3],[114,-213,4],[-66,-208,3],[95,-396,4],[151,-433,3]] as number[][]){x*=WORLD_SCALE;z*=WORLD_SCALE;const rock=mesh(new T.DodecahedronGeometry(r,0),rockMat,x,.3,z,this.scene);rock.scale.y=.8;this.rocks.push({x,z,r});const ring=mesh(new T.RingGeometry(r+1,r+1.4,20),new T.MeshBasicMaterial({color:'#e4efd2',transparent:true,opacity:.5,side:T.DoubleSide}),x,.04,z,this.scene);ring.rotation.x=-Math.PI/2;}
    for(let n=0;n<6;n++){const z=(-385-n*12)*WORLD_SCALE,x=(80+n*9)*WORLD_SCALE;const b=new T.Group();b.position.set(x,0,z);cylinder(.5,.7,1.5,n%2?coral:cream,0,.6,0,b);cylinder(.07,.07,3,wood,0,2,0,b);mesh(new T.SphereGeometry(.18,6,4),cream,0,3.5,0,b);this.scene.add(b);}
    this.birds=new T.Group();for(let j=0;j<8;j++){const b=new T.Group();for(const side of [-1,1]){const wing=box(1.2,.08,.3,cream,side*.55,0,0,b);wing.rotation.z=side*.25;}b.position.set(j*9-35,28+(j%3)*3,Math.sin(j)*30);this.birds.add(b);}this.scene.add(this.birds);
    for(let j=0;j<14;j++){const c=new T.Group();for(let k=0;k<3;k++){const cloud=mesh(new T.IcosahedronGeometry(10+k*2,1),mat('#e9eee0'),k*12,0,0,c);cloud.scale.set(1,.32,.5);cloud.castShadow=false;}c.position.set(Math.sin(j*2.3)*500,85+(j%3)*9,-220+Math.cos(j*2.3)*520);this.scene.add(c);}
    addEventListener('resize',()=>this.resize());this.resize();
  }
  island(i:Island){
    const g=new T.Group();g.position.set(i.x,0,i.z);this.scene.add(g);this.landmarks.push(g);
    const shallow=mesh(new T.CircleGeometry(i.radius*1.48,48),new T.MeshBasicMaterial({color:'#7cc9b4',transparent:true,opacity:.48}),0,-.03,0,g);shallow.rotation.x=-Math.PI/2;
    const foam=mesh(new T.RingGeometry(i.radius*.99,i.radius*1.045,48),new T.MeshBasicMaterial({color:'#e7efd1',transparent:true,opacity:.58,side:T.DoubleSide}),0,.04,0,g);foam.rotation.x=-Math.PI/2;
    const beach=cylinder(i.radius*.94,i.radius,2.2,sand,0,.25,0,g,18);beach.rotation.y=.1;
    cylinder(i.radius*.66,i.radius*.83,1.4,sandEdge,-1,1.1,-2,g,15);
    const grass=mesh(new T.CylinderGeometry(i.radius*.63,i.radius*.72,1.1,13),mat(i.color),-2,1.85,-3,g);grass.rotation.y=.23;
    for(let j=0;j<7;j++){const a=j*2.39+1,rad=i.radius*(.32+(j%3)*.14);if(Math.cos(a)*rad>10&&Math.sin(a)*rad>15)continue;this.palms.push(palm(g,Math.cos(a)*rad,Math.sin(a)*rad,8+(j%3)*2,j*.6));}
    for(let j=0;j<13;j++){const a=j*2.4,rad=i.radius*(.18+(j%5)*.1);const o=mesh(new T.IcosahedronGeometry(1.5+(j%3)*.5,0),j%4===0?rockMat:leaf,Math.cos(a)*rad,2.3,Math.sin(a)*rad,g);o.scale.y=.6;}
    for(let j=0;j<12;j++)flower(g,Math.sin(j*7)*i.radius*.6,Math.cos(j*4)*i.radius*.6,j%2?'#eac380':'#e5a18a');
    const dx=i.dock[0]-i.x,dz=i.dock[1]-i.z;
    for(let j=0;j<26;j++)box(4.4,.25,.7,j%2?wood:mat('#a7855e'),dx,1.35,dz-3-j*.8,g);
    for(const zz of [dz-3,dz-11])for(const xx of [-2,2]){cylinder(.18,.24,3.8,darkWood,dx+xx,.3,zz,g);cylinder(.27,.27,.15,wood,dx+xx,2.2,zz,g);}
    const sign=new T.Group();sign.position.set(dx-4,1.5,dz-13);cylinder(.1,.1,2.5,wood,0,1,0,sign);box(2.5,.85,.18,wood,0,2,0,sign);g.add(sign);
    // A ring marks the sheltered fishing spot by each jetty.
    const fishing=mesh(new T.RingGeometry(1.7,1.85,32),new T.MeshBasicMaterial({color:'#eaf4ca',transparent:true,opacity:.65,side:T.DoubleSide}),dx+5,.08,dz-2,g);fishing.rotation.x=-Math.PI/2;
    if(i.landmark==='wreck'){
      const wreck=boatModel();wreck.position.set(-4,2,-4);wreck.rotation.set(.3,.8,.65);wreck.scale.set(2,1.2,2);g.add(wreck);for(let j=0;j<5;j++)box(1.4,.2,4,wood,-9+j*3,2,5,g).rotation.y=j*.7;
    }
    if(i.landmark==='lookout'){
      const hill=mesh(new T.DodecahedronGeometry(9,0),rockMat,-4,4,-12,g);hill.scale.set(1,.8,1);
      for(const x of [-3,3])for(const z of [-3,3])cylinder(.25,.35,9,wood,x,6,z-9,g);
      box(8,.35,8,wood,0,10,-9,g);const roof=mesh(new T.ConeGeometry(6,3,4),coral,0,13,-9,g);roof.rotation.y=Math.PI/4;
      for(let j=0;j<6;j++)box(2,.6,1.2,sand,-.5,2+j*.3,-1-j*1.2,g);
    }
    if(i.landmark==='harbor'){
      const lighthouse=new T.Group();lighthouse.position.set(-12,2,-12);cylinder(2.8,4,18,cream,0,9,0,lighthouse,12);cylinder(3.15,3.45,3,coral,0,9,0,lighthouse,12);cylinder(3.3,3.3,.6,wood,0,18,0,lighthouse,12);cylinder(2.2,2.2,3,mat('#9ac2b9'),0,20,0,lighthouse,8);cylinder(0,3.3,3,coral,0,23,0,lighthouse,12);mesh(new T.SphereGeometry(1,8,6),mat('#fff4bb',{emissive:'#ffc95b',emissiveIntensity:2}),0,20,0,lighthouse);g.add(lighthouse);
      for(let j=0;j<3;j++){const h=new T.Group();h.position.set(7+j*9,2,-8+(j%2)*13);box(7,5,7,mat(j%2?'#e6bb88':'#f4e1b4'),0,2.5,0,h);const roof=mesh(new T.ConeGeometry(6,3,4),mat('#b7785d'),0,6,0,h);roof.rotation.y=Math.PI/4;box(1.5,2.8,.1,mat('#527b76'),0,1.4,3.55,h);for(const xx of [-2,2])box(1,1,.1,mat('#92bcb6'),xx,3.3,3.56,h);g.add(h);}
    }
    if(i.landmark==='shell'){for(let j=0;j<5;j++){const s=mesh(new T.SphereGeometry(1,6,4),mat('#efb9a3'),-9+j*3,1.6,15+Math.sin(j)*2,g);s.scale.set(1,.4,1);}}
  }
  resize(){this.camera.aspect=innerWidth/innerHeight;this.camera.updateProjectionMatrix();this.renderer.setSize(innerWidth,innerHeight);}
  quality(low:boolean){this.renderer.setPixelRatio(Math.min(devicePixelRatio,low?1:1.75));this.renderer.shadowMap.enabled=!low;this.sun.castShadow=!low;this.resize();}
  render(time:number,reduced:boolean){this.water.uniforms.time.value=reduced?0:time;this.birds.rotation.y=time*.02;this.birds.position.set(this.boat.position.x*.4,0,this.boat.position.z*.4);this.marker.rotation.y=time;this.marker.position.y=6+(reduced?0:Math.sin(time*2)*.35);for(const [j,p]of this.palms.entries())p.rotation.z=reduced?0:Math.sin(time*.7+j)*.012;this.sun.position.set(this.boat.position.x-70,150,this.boat.position.z+60);this.sun.target.position.set(this.boat.position.x,0,this.boat.position.z);this.renderer.render(this.scene,this.camera);}
}
