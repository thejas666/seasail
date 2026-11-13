import './coast-study.css';
import * as T from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {createPalm,PALM_VARIANTS,setPalmWind,type PalmVariant} from './assets/palm-tree';
import {createMossRock,createSandstone,createCoastalPlant} from './assets/coastal-nature';

document.querySelector('#coast-study')!.innerHTML=`<header><small>SEA SURVIVAL / COASTAL COLLECTION</small><h1>Little pieces of paradise</h1><p>Illustrated palms, painted stone, and soft coastal grasses.</p></header><div class="corner"><button id="wind">Wind on</button><a href="/">Back to game</a></div><footer><nav aria-label="Coastal asset selection"><button data-asset="all" aria-pressed="true">Palm collection</button><button data-asset="tall" aria-pressed="false">Tall palm</button><button data-asset="leaning" aria-pressed="false">Leaning palm</button><button data-asset="coconut" aria-pressed="false">Coconut palm</button><button data-asset="clump" aria-pressed="false">Palm cluster</button><button data-asset="moss" aria-pressed="false">Mossy rocks</button><button data-asset="sandstone" aria-pressed="false">Layered stone</button><button data-asset="foliage" aria-pressed="false">Grass & reeds</button></nav><p>Drag to rotate · Scroll to inspect <a id="download" href="/assets/models/palm-tall.glb" download>Download tall palm (.glb)</a></p></footer>`;
const scene=new T.Scene(),camera=new T.PerspectiveCamera(34,innerWidth/innerHeight,.05,300),renderer=new T.WebGLRenderer({antialias:true,alpha:true});renderer.setClearColor(0,0);renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));renderer.setSize(innerWidth,innerHeight);renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFSoftShadowMap;renderer.toneMapping=T.ACESFilmicToneMapping;document.querySelector('#coast-study')!.append(renderer.domElement);
const controls=new OrbitControls(camera,renderer.domElement);controls.enablePan=false;controls.maxPolarAngle=Math.PI*.54;
scene.add(new T.HemisphereLight('#fff9dc','#849174',2.2));const light=new T.DirectionalLight('#fff2d2',2.3);light.position.set(-10,22,14);light.castShadow=true;light.shadow.mapSize.set(1024,1024);light.shadow.camera.left=light.shadow.camera.bottom=-22;light.shadow.camera.right=light.shadow.camera.top=22;light.shadow.normalBias=.035;scene.add(light);
const floor=new T.Mesh(new T.PlaneGeometry(200,200),new T.ShadowMaterial({opacity:.14}));floor.rotation.x=-Math.PI/2;floor.position.y=-.02;floor.receiveShadow=true;scene.add(floor);let collection=new T.Group(),selected='all',wind=!matchMedia('(prefers-reduced-motion: reduce)').matches;
function render(){renderer.render(scene,camera);}
function select(kind:string){
  scene.remove(collection);collection=new T.Group();selected=kind;
  if(kind==='all')PALM_VARIANTS.forEach((variant,n)=>{const p=createPalm(variant,variant==='clump'?8.4:9);p.position.x=(n-1.5)*7.4;collection.add(p);});
  else if(PALM_VARIANTS.includes(kind as PalmVariant))collection.add(createPalm(kind as PalmVariant));
  else if(kind==='moss')collection.add(createMossRock());else if(kind==='sandstone')collection.add(createSandstone());
  else for(const [n,name]of (['grass','reeds','seedgrass'] as const).entries()){const plant=createCoastalPlant(name);plant.position.x=(n-1)*1.35;collection.add(plant);}
  scene.add(collection);const bounds=new T.Box3().setFromObject(collection),size=bounds.getSize(new T.Vector3()),center=bounds.getCenter(new T.Vector3()),extent=Math.max(size.y,size.x/camera.aspect)*(kind==='all'?1.30:1.60),distance=extent/(2*Math.tan(T.MathUtils.degToRad(camera.fov*.5)));
  controls.target.copy(center);camera.position.copy(center).add(new T.Vector3(kind==='all'?.17:.55,.24,1).normalize().multiplyScalar(distance));controls.minDistance=distance*.45;controls.maxDistance=distance*2.5;controls.update();
  document.querySelectorAll('[data-asset]').forEach(b=>b.setAttribute('aria-pressed',String((b as HTMLElement).dataset.asset===kind)));const file=kind==='moss'?'moss-rock':kind==='sandstone'?'sandstone':kind==='foliage'?'coastal-seedgrass':`palm-${kind==='all'?'tall':kind}`,link=document.querySelector<HTMLAnchorElement>('#download')!;link.href=`/assets/models/${file}.glb`;link.textContent=`Download ${file.replaceAll('-',' ')} (.glb)`;render();
}
document.querySelectorAll<HTMLButtonElement>('[data-asset]').forEach(b=>b.onclick=()=>select(b.dataset.asset!));document.querySelector<HTMLButtonElement>('#wind')!.onclick=()=>{wind=!wind;document.querySelector('#wind')!.textContent=wind?'Wind on':'Wind off';setPalmWind(performance.now()/1000,!wind);render();};document.querySelector('#wind')!.textContent=wind?'Wind on':'Wind off';
controls.addEventListener('change',render);addEventListener('resize',()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);select(selected);});select('all');
function frame(now:number){setPalmWind(now/1000,!wind);if(wind)render();requestAnimationFrame(frame);}requestAnimationFrame(frame);

