import {animeBoulderGeometry,animeSpireGeometry,animeStoneMaterial} from './anime-rocks';
import * as T from 'three';
import {PICKUPS,type Island} from './data';
import {ART_STYLE} from './art-style';
import {grassTuftGeometry,GRASS_FIELD_COUNT,GRASS_FIELD_LOW_COUNT} from './assets/grass-tuft';

export const SKY_COLOR = '#aacbd0';
export const rand = (seed:number) => {
  let value = seed >>> 0;
  return () => { value = (Math.imul(value,1664525)+1013904223) >>> 0; return value / 4294967296; };
};
const smooth = (a:number,b:number,x:number) => {const t=T.MathUtils.clamp((x-a)/(b-a),0,1);return t*t*(3-2*t);};
/** 0…1: how squarely a point faces the cliff coast (the side away from the jetty). */
export const cliffSide=(x:number,z:number)=>smooth(.5,.85,(x*-.6+z*-.8)/(Math.hypot(x,z)||1));
/** How far the meadow reaches toward the shore, as a fraction of the island radius. */
export const meadowEdge=(x:number,z:number)=>ANIME?.84+.08*cliffSide(x,z):.76;
export function localHeight(i:Island,x:number,z:number) {
  const d=Math.hypot(x,z)/i.radius;
  const beach=1.35*(1-smooth(.83,1.08,d));
  const inland=1-smooth(.55,.84,d);
  const hill=Math.exp(-((x+i.radius*.25)**2+(z+i.radius*.35)**2)/(i.radius*i.radius*.17));
  // The anime style has real landforms: a flat-topped bluff that ends in a sea cliff on the far side from
  // the jetty, and a level knoll beside the path where the ruins stand.
  if(ANIME){
    const c=cliffSide(x,z),high=1-smooth(.62+.3*c,.88+.075*c,d),knoll=Math.exp(-((x-i.radius*.3)**2+(z+i.radius*.12)**2)/(i.radius*i.radius*.05));
    // Palm Island: the back of the island is a level plateau that runs right to the cliff edge, so the
    // ground stays high until it drops away at the sea cliff instead of sloping down toward it.
    const plateau=i.id==='palm'?smooth(.12,.5,(x*-.6+z*-.8)/i.radius):0,top=Math.max(smooth(0,.72,hill),plateau);
    return beach+high*(1.5+top*6.6+smooth(0,.8,knoll)*2.5+Math.sin(x*.19)*Math.cos(z*.16)*(.5-plateau*.3));
  }
  return beach+inland*(1.5+hill*4.5+Math.sin(x*.19)*Math.cos(z*.16)*.45);
}
export const groundHeight=(i:Island,x:number,z:number)=> {
  if(Math.abs(x-i.dock[0])<3 && z>i.z+i.radius*.7) return 1.5;
  return localHeight(i,x-i.x,z-i.z);
};
function grainTexture(){
  const canvas=document.createElement('canvas');canvas.width=canvas.height=128;
  const context=canvas.getContext('2d')!;const data=context.createImageData(128,128);const random=rand(171);
  for(let p=0;p<data.data.length;p+=4){const v=225+random()*30;data.data[p]=v;data.data[p+1]=v;data.data[p+2]=v;data.data[p+3]=255;}
  context.putImageData(data,0,0);const texture=new T.CanvasTexture(canvas);texture.wrapS=texture.wrapT=T.RepeatWrapping;texture.repeat.set(24,24);texture.colorSpace=T.SRGBColorSpace;return texture;
}
let terrainTexture:T.CanvasTexture|undefined;
const ANIME=ART_STYLE==='anime';
// The anime style uses a brighter lime meadow and paler sand.
const SAND=new T.Color(ANIME?'#f1dfa8':'#ddc58b'),GREEN=new T.Color(ANIME?'#6fc230':'#6f983c'),LIGHT_GREEN=new T.Color(ANIME?'#b4e044':'#8ba850');
export const ANIME_GRASS_COUNT=7000,ANIME_GRASS_LOW_COUNT=1800;
const rockCache=new Map<string,T.BufferGeometry>();
/** Faceted, painterly rock: pale blue-lilac tops, mid-blue sides, deep blue undersides. Stacks get a grassy cap. */
export function animeRockGeometry(variant:number,stretch=1,grassCap=false){
  const key=`${variant}:${stretch}:${grassCap}`;if(rockCache.has(key))return rockCache.get(key)!;
  const g=new T.IcosahedronGeometry(1,1).toNonIndexed(),p=g.attributes.position,v=new T.Vector3();
  const hash=(x:number,y:number,z:number)=>{const h=Math.sin(x*12.9898+y*78.233+z*37.719+variant*4.1)*43758.5453;return h-Math.floor(h);};
  for(let n=0;n<p.count;n++){v.fromBufferAttribute(p,n);const k=1+(hash(Math.round(v.x*50),Math.round(v.y*50),Math.round(v.z*50))-.5)*(stretch>1?.5:.62);v.multiplyScalar(k);v.x*=1+.25*Math.sin(variant*2.1);v.y=Math.max(v.y,-.35)*stretch;if(stretch>1){const t=T.MathUtils.clamp(v.y/stretch,0,1);v.x*=1-.45*t;v.z*=1-.45*t;v.x+=t*.35*Math.sin(variant);}p.setXYZ(n,v.x,v.y,v.z);}
  g.computeVertexNormals();const normal=g.attributes.normal,colors=new Float32Array(p.count*3),top=new T.Color('#b9c7f4'),side=new T.Color('#6580d2'),low=new T.Color('#3f58ad'),cap=new T.Color('#8fd445'),c=new T.Color();
  for(let n=0;n<p.count;n+=3){const ny=normal.getY(n),shade=.93+hash(n,variant,7)*.14;if(grassCap&&ny>.6)c.copy(cap);else if(ny>.5)c.copy(top);else if(ny>-.2)c.copy(side).lerp(top,Math.max(0,ny)*.6);else c.copy(low);c.multiplyScalar(shade);for(let k=0;k<3;k++)colors.set([c.r,c.g,c.b],(n+k)*3);}
  g.setAttribute('color',new T.BufferAttribute(colors,3));g.computeBoundingSphere();rockCache.set(key,g);return g;
}
let rockMaterial:T.MeshStandardMaterial|undefined;
export const animeRockMaterial=()=>rockMaterial??=new T.MeshStandardMaterial({vertexColors:true,flatShading:true,roughness:1});
const pathOffset=(i:Island,z:number)=>i.dock[0]-i.x+Math.sin(z*.14)*2;
/** Vertex colour of the island floor at local (x,z), before the grain texture is applied. */
const ROCK=new T.Color('#6f86cc'),ROCK_DARK=new T.Color('#4a62ad'),WET=new T.Color('#cdb27a');
/** Steepness of the ground (rise over run). */
export function slopeAt(i:Island,x:number,z:number){const e=.6;return Math.hypot(localHeight(i,x+e,z)-localHeight(i,x-e,z),localHeight(i,x,z+e)-localHeight(i,x,z-e))/(2*e);}
/** Anime style: distance to the walking route — the strip from the jetty plus a spur to the ruins on the knoll. */
export function pathDistance(i:Island,x:number,z:number){
  let d=z>-9?Math.abs(x-pathOffset(i,z)):Infinity;if(!ANIME)return d;
  const ax=pathOffset(i,-4),az=-4,bx=i.radius*.3+3.2,bz=-i.radius*.12,t=T.MathUtils.clamp(((x-ax)*(bx-ax)+(z-az)*(bz-az))/((bx-ax)**2+(bz-az)**2),0,1);
  return Math.min(d,Math.hypot(x-(ax+(bx-ax)*t),z-(az+(bz-az)*t))+.4);
}
export const ruinsSite=(i:Island)=>({x:i.radius*.3,z:-i.radius*.12});
export function groundColor(i:Island,x:number,z:number,r=Math.hypot(x,z),target=new T.Color()){
  const edge=meadowEdge(x,z);let grass=1-smooth(edge-.11,edge+.03,r/i.radius);const route=pathDistance(i,x,z);if(route<3)grass*=smooth(1.2,2.5,route)*.8+.2;
  target.copy(GREEN).lerp(LIGHT_GREEN,(Math.sin(x*.35+z*.22)+1)*.25);target.copy(SAND.clone().lerp(target,grass));
  if(ANIME){
    // Wet sand at the waterline, and bare blue rock wherever the ground is too steep to hold grass.
    target.lerp(WET,smooth(.96,1.03,r/i.radius)*.75);const steep=smooth(.75,1.25,slopeAt(i,x,z));
    if(steep>0)target.lerp(ROCK.clone().lerp(ROCK_DARK,(Math.sin(localHeight(i,x,z)*2.4+x*.5)+1)*.3),steep);
  }
  return target.multiplyScalar(.94+Math.sin(x*2.7+z*3.1)*.035);
}
export function terrain(i:Island){
  const segments=ANIME?160:112,rings=ANIME?64:38,vertices:number[]=[],colors:number[]=[],uv:number[]=[],indices:number[]=[];
  for(let ring=0;ring<=rings;ring++)for(let a=0;a<=segments;a++){
    const angle=a/segments*Math.PI*2;
    const edge=1.055+Math.sin(angle*5+.3)*.025+Math.cos(angle*9)*.018;
    const r=ring/rings*i.radius*edge,x=Math.cos(angle)*r,z=Math.sin(angle)*r;
    vertices.push(x,localHeight(i,x,z),z);uv.push(x/i.radius*.5+.5,z/i.radius*.5+.5);
    const c=groundColor(i,x,z,r);colors.push(c.r,c.g,c.b);
    if(ring<rings&&a<segments){const n=ring*(segments+1)+a;indices.push(n,n+1,n+segments+1,n+1,n+segments+2,n+segments+1);}
  }
  const geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.Float32BufferAttribute(vertices,3));geometry.setAttribute('color',new T.Float32BufferAttribute(colors,3));geometry.setAttribute('uv',new T.Float32BufferAttribute(uv,2));geometry.setIndex(indices);geometry.computeVertexNormals();
  // The radial mesh uses clockwise rings when seen from above.
  const material=new T.MeshStandardMaterial({vertexColors:true,map:terrainTexture??=grainTexture(),roughness:1});
  const surface=new T.Mesh(geometry,material);surface.receiveShadow=true;surface.castShadow=true;return surface;
}
/**
 * Vertex-coloured foliage that sways with the wind and is lit like the ground: normals bend toward
 * straight up so plants take the floor's shading instead of turning dark or bright with each blade's angle.
 */
export function foliageMaterial(wind:{value:number},sway:number){
  const material=new T.MeshStandardMaterial({color:'#ffffff',vertexColors:true,roughness:1,side:T.DoubleSide});
  material.onBeforeCompile=shader=>{shader.uniforms.uWind=wind;shader.vertexShader='uniform float uWind;\n'+shader.vertexShader;shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>',`#include <begin_vertex>
    transformed.x += sin(uWind*1.3+instanceMatrix[3].x*.35+instanceMatrix[3].z*.24)*position.y*position.y*${sway.toFixed(3)};
    transformed.z += cos(uWind*.9+instanceMatrix[3].z*.3)*position.y*position.y*${(sway*.64).toFixed(3)};`);
    shader.vertexShader=shader.vertexShader.replace('#include <beginnormal_vertex>',`#include <beginnormal_vertex>
    objectNormal = normalize(mix(vec3(0.0,1.0,0.0), objectNormal, clamp(position.y*.12,0.0,.2)));`);
    // Both faces keep the upward normal (DoubleSide would otherwise flip it and darken back faces).
    shader.fragmentShader=shader.fragmentShader.replace('#include <normal_fragment_begin>',`#include <normal_fragment_begin>
    normal = normalize(vNormal); nonPerturbedNormal = normal;`);};
  return material;
}
export type FlowerPatch={x:number;z:number;r:number;kind:'orange'|'lavender'};
const patchCache=new Map<string,FlowerPatch[]>();
/** Flower drifts in island-local space: along the path from the jetty, near the beach edge, and in grass clearings. */
export function flowerPatches(i:Island){
  const cached=patchCache.get(i.id);if(cached)return cached;
  const random=rand(i.id.split('').reduce((a,c)=>a+c.charCodeAt(0)*7,19)),patches:FlowerPatch[]=[];
  const clear=(x:number,z:number,r:number)=>Math.abs(x-pathOffset(i,z))>2.3+r*.6&&Math.hypot(x+6,z+5)>2.4+r&&!PICKUPS.some(p=>p.island===i.id&&Math.hypot(p.x-i.x-x,p.z-i.z-z)<2.8+r)&&patches.every(p=>Math.hypot(p.x-x,p.z-z)>p.r+r+1);
  for(let attempt=0;attempt<400&&patches.length<16;attempt++){
    const band=patches.length%3,r=1.1+random()*1.3;let x:number,z:number;
    if(band===0){z=-6+random()*(i.radius*.72);const side=random()<.5?-1:1;x=pathOffset(i,z)+side*(2.6+r*.7+random()*1.4);}
    else{const a=random()*Math.PI*2,d=band===1?.5+random()*.12:.25+random()*.3;x=Math.cos(a)*i.radius*d;z=Math.sin(a)*i.radius*d;}
    if(Math.hypot(x,z)>i.radius*.74||!clear(x,z,r))continue;
    patches.push({x,z,r,kind:patches.length%2?'lavender':'orange'});
  }
  patchCache.set(i.id,patches);return patches;
}
export type Biome={grass:T.InstancedMesh;wind:{value:number};objects:T.Group;obstacles:{x:number;z:number;r:number}[]};
export function biome(i:Island):Biome{
  const random=rand(i.id.split('').reduce((a,c)=>a+c.charCodeAt(0),7));const objects=new T.Group();
  const grassGeometry=grassTuftGeometry(3);const patches=flowerPatches(i);const obstacles:{x:number;z:number;r:number}[]=[];
  const area=T.MathUtils.clamp((i.radius/33)**2,.6,2),fieldCount=ANIME?Math.round(ANIME_GRASS_COUNT*area):GRASS_FIELD_COUNT;
  if(ANIME){
    // Clusters of boulders around the meadow (carved stone on Palm Island, blue faceted elsewhere), kept off the path, pickups and landmarks.
    const rocks=new T.Group(),rockRandom=rand(i.id.length*977+i.radius);
    for(let attempt=0,placed=0;attempt<400&&placed<Math.round(9*area);attempt++){
      const a=rockRandom()*Math.PI*2,d=.34+rockRandom()*.38,x=Math.cos(a)*i.radius*d,z=Math.sin(a)*i.radius*d,size=1+rockRandom()*1.3;
      if(pathDistance(i,x,z)<4+size||Math.hypot(x-i.radius*.3,z+i.radius*.12)<8||slopeAt(i,x,z)>.6||Math.hypot(x+6,z+5)<5||Math.hypot(x+12,z+12)<9||Math.hypot(x,z+8)<8||x>4&&z>10||PICKUPS.some(p=>p.island===i.id&&Math.hypot(p.x-i.x-x,p.z-i.z-z)<4.5+size)||patches.some(p=>Math.hypot(x-p.x,z-p.z)<p.r+size+1)||obstacles.some(o=>Math.hypot(x-o.x,z-o.z)<o.r+size+3))continue;
      placed++;obstacles.push({x,z,r:size*.95});
      for(let k=0;k<3;k++){const s=k?size*(.35+rockRandom()*.3):size,ox=k?Math.cos(a+k*2.3)*size*1.15:0,oz=k?Math.sin(a+k*2.3)*size*1.15:0,carved=i.id==='palm',rock=carved?new T.Mesh(animeBoulderGeometry((placed*3+k)%6),animeStoneMaterial()):new T.Mesh(animeRockGeometry((placed*3+k)%6),animeRockMaterial());rock.position.set(x+ox,localHeight(i,x+ox,z+oz)-(carved?.12:.05)*s,z+oz);if(carved)rock.scale.set(s*.85,s*(.8+rockRandom()*.3),s*.85);else rock.scale.set(s,s*(.75+rockRandom()*.35),s);rock.rotation.y=rockRandom()*6.28;rock.castShadow=rock.receiveShadow=true;rock.userData.cameraSolid=!k;rocks.add(rock);if(k)obstacles.push({x:x+ox,z:z+oz,r:s*.9});}
    }
    objects.add(rocks);
  }
  const wind={value:0};const material=foliageMaterial(wind,.055);
  const grass=new T.InstancedMesh(grassGeometry,material,fieldCount);grass.receiveShadow=true;grass.castShadow=false;
  const dummy=new T.Object3D(),color=new T.Color();let count=0;
  for(let attempt=0;attempt<(ANIME?200000:14000)&&count<fieldCount;attempt++){
    const span=ANIME?.92:.76,x=(random()*2-1)*i.radius*span,z=(random()*2-1)*i.radius*span,d=Math.hypot(x,z)/i.radius,edge=meadowEdge(x,z);
    const pathX=pathOffset(i,z),route=pathDistance(i,x,z);
    if(d>edge||random()<smooth(edge-.13,edge+.02,d)||route<(ANIME?1.9:2.2)||ANIME&&slopeAt(i,x,z)>.7||Math.hypot(x+6,z+5)<2.4||patches.some(p=>Math.hypot(x-p.x,z-p.z)<p.r*.8)||obstacles.some(o=>Math.hypot(x-o.x,z-o.z)<o.r*.8)||PICKUPS.some(p=>p.island===i.id&&Math.hypot(p.x-i.x-x,p.z-i.z-z)<2.6))continue;
    dummy.position.set(x,localHeight(i,x,z)-.025,z);dummy.rotation.y=random()*Math.PI*2;const spread=.8+random()*.4;
    // Taper tufts toward the beach and the path so the field thins into the floor instead of ending in a wall.
    const fade=Math.min(1-smooth(edge-.16,edge,d),smooth(2.2,4.5,route)),height=(.95+random()*.1)*(.45+.55*fade)*(ANIME?.2+random()*.1:1);
    {const wide=ANIME?.95:1;dummy.scale.set(spread*(.75+.25*fade)*wide,height,spread*(.75+.25*fade)*wide);}dummy.updateMatrix();grass.setMatrixAt(count,dummy.matrix);
    // Tint each tuft with the floor colour beneath it; the geometry only adds a root-to-tip ramp.
    groundColor(i,x,z,Math.hypot(x,z),color).multiplyScalar(.97+random()*.06);grass.setColorAt(count++,color);
  }
  grass.count=count;grass.userData.fullCount=count;grass.userData.lowDensityCount=Math.min(count,ANIME?Math.round(ANIME_GRASS_LOW_COUNT*area):GRASS_FIELD_LOW_COUNT);grass.computeBoundingSphere();objects.add(grass);
  const pebbles=new T.InstancedMesh(new T.DodecahedronGeometry(1,0),new T.MeshStandardMaterial({color:ANIME?'#8b9cc9':'#bd9675',roughness:1,flatShading:ANIME}),85);
  pebbles.castShadow=pebbles.receiveShadow=true;let pebbleCount=0;
  for(let j=0;j<85;j++){const a=random()*Math.PI*2,r=i.radius*(.78+random()*.2),x=Math.cos(a)*r,z=Math.sin(a)*r;if(Math.abs(x-(i.dock[0]-i.x))<4&&z>0)continue;dummy.position.set(x,localHeight(i,x,z)+.08,z);dummy.rotation.set(random(),random()*6,random());const size=.12+random()*.32;dummy.scale.set(size,size*.55,size*.8);dummy.updateMatrix();pebbles.setMatrixAt(pebbleCount++,dummy.matrix);}
  pebbles.count=pebbleCount;pebbles.computeBoundingSphere();objects.add(pebbles);
  return {grass,wind,objects,obstacles};
}

export function sky(){
  const material=new T.ShaderMaterial({side:T.BackSide,depthWrite:false,uniforms:{storm:{value:0},night:{value:0},sunset:{value:0},anime:{value:0},sunDir:{value:new T.Vector3(-.4,.7,.5)},haze:{value:new T.Vector3(.667,.796,.816)}},vertexShader:'varying vec3 vDirection;void main(){vDirection=position;gl_Position=projectionMatrix*viewMatrix*modelMatrix*vec4(position,1.);}',fragmentShader:`varying vec3 vDirection;uniform float storm;uniform float night;uniform float sunset;uniform float anime;uniform vec3 sunDir;uniform vec3 haze;void main(){vec3 d=normalize(vDirection);float h=max(d.y,0.);vec3 c=mix(vec3(.56,.82,.91),vec3(.025,.38,.66),pow(h,.42));vec3 a=mix(vec3(.99,.87,.62),vec3(.52,.79,.96),smoothstep(0.,.28,h));a=mix(a,vec3(.1,.38,.86),smoothstep(.22,1.,h));c=mix(c,a,anime);float sunDot=max(dot(d,normalize(sunDir)),0.);float sun=pow(sunDot,130.);c+=(vec3(1.,.86,.55)*pow(sunDot,22.)*.16+vec3(1.,.9,.7)*pow(sunDot,600.)*.25+vec3(1.,.97,.86)*smoothstep(.9984,.9991,sunDot)*.7)*anime*(1.-night)*(1.-storm);c+=vec3(1.,.85,.55)*sun*.55;c=mix(c,haze,exp(-h*22.)*.94);c=mix(c,vec3(.39,.49,.54),storm*.72);vec3 nightSky=mix(vec3(.08,.18,.27)+h*.035,mix(vec3(.13,.25,.5),vec3(.025,.07,.22),pow(h,.55)),anime);c=mix(c,nightSky,night*mix(.86,.96,anime));
  c=mix(c,vec3(.86,.57,.34),sunset*exp(-h*9.)*.45*(1.-anime));
  // Golden hour (anime): the whole sky warms, gold low down and around the sun, peach and soft violet overhead.
  vec3 gold=mix(vec3(1.,.74,.36),vec3(1.,.6,.5),smoothstep(.05,.35,h));gold=mix(gold,vec3(.58,.52,.78),smoothstep(.35,1.,h));gold+=vec3(1.,.8,.45)*pow(sunDot,5.)*.45+vec3(1.,.93,.7)*pow(sunDot,60.)*.6;
  c=mix(c,gold,sunset*.82*anime*(1.-night));
  gl_FragColor=vec4(c,1.);}`});
  const dome=new T.Mesh(new T.SphereGeometry(1450,24,16),material);dome.frustumCulled=false;return {dome,material};
}
function cartoonClouds(){
  const random=rand(702),g=new T.Group();const geometry=new T.IcosahedronGeometry(1,2),material=new T.MeshStandardMaterial({color:'#ffffff',roughness:1,emissive:ANIME?'#f0b9a0':'#94b4c6',emissiveIntensity:ANIME?.42:.28,fog:false});
  const instances=new T.InstancedMesh(geometry,material,23*17),dummy=new T.Object3D();let count=0;
  for(let j=0;j<23;j++){
    const a=j/23*Math.PI*2,dist=320+random()*650,cx=Math.cos(a)*dist,cz=Math.sin(a)*dist,cy=95+random()*100;
    for(let k=0;k<17;k++){
      dummy.position.set(cx+(k-3)*13,cy+(3-Math.abs(k-3))*5,cz+Math.cos(k)*8);dummy.scale.set(14+random()*10,(k>1&&k<5?12:8)+random()*8,10+random()*8);dummy.rotation.set(0,random(),0);dummy.updateMatrix();instances.setMatrixAt(count++,dummy.matrix);
    }
  }
  instances.count=count;instances.frustumCulled=false;g.add(instances);return g;
}
/** Anime style: tall cumulus with flat bases and stacked crowns, lilac beneath and warm where the sun catches them. */
function animeClouds(){
  // Big fair-weather cumulus: sunlit tops, soft blue-grey undersides and a bright rim toward the sun. The world
  // sets the lit and shadow colours through the day (white and blue by day, peach and rose at sunset, blue at night).
  const random=rand(911),g=new T.Group(),geometry=new T.IcosahedronGeometry(1,3);
  const uniforms={lit:{value:new T.Color('#ffffff')},shade:{value:new T.Color('#a8bde3')},sunDir:{value:new T.Vector3(-.52,.3,.66).normalize()}};
  const material=new T.ShaderMaterial({uniforms,vertexShader:`varying vec3 vNormal;varying vec3 vWorld;void main(){vec4 w=modelMatrix*instanceMatrix*vec4(position,1.);vWorld=w.xyz;vNormal=normalize(mat3(modelMatrix)*mat3(instanceMatrix)*normal);gl_Position=projectionMatrix*viewMatrix*w;}`,
    fragmentShader:`uniform vec3 lit;uniform vec3 shade;uniform vec3 sunDir;varying vec3 vNormal;varying vec3 vWorld;void main(){vec3 n=normalize(vNormal),v=normalize(cameraPosition-vWorld);
      float light=clamp(dot(n,normalize(sunDir))*.45+.45+n.y*.35,0.,1.);vec3 c=mix(shade,lit,smoothstep(.05,.95,light));
      float rim=pow(1.-max(dot(n,v),0.),3.);c+=lit*rim*.35*smoothstep(-.2,.6,dot(-v,normalize(sunDir))+.4);gl_FragColor=vec4(c,1.);}`});
  g.userData.cloud=uniforms;g.userData.glow={value:1};
  const puffs:number[][]=[];
  const cloud=(cx:number,cy:number,cz:number,size:number,facing:number)=>{
    const ux=-Math.sin(facing),uz=Math.cos(facing),count=11+Math.floor(random()*6);
    // A flat-bottomed base of overlapping puffs, then billowing crowns that pile up toward the middle.
    for(let k=0;k<count;k++){const t=count>1?k/(count-1)*2-1:0,crown=1-t*t,w=size*(.3+.28*crown+random()*.12),h=w*(.6+.25*crown);puffs.push([cx+ux*t*size*1.3+(random()-.5)*size*.25,cy+h*.5,cz+uz*t*size*1.3+(random()-.5)*size*.35,w,h,w*.85]);}
    for(let k=0;k<6;k++){const t=(random()-.5)*1.1,lift=1-Math.abs(t),w=size*(.26+random()*.16+lift*.12);puffs.push([cx+ux*t*size+(random()-.5)*size*.2,cy+size*(.45+lift*.5+random()*.2),cz+uz*t*size+(random()-.5)*size*.25,w,w*.9,w*.85]);}
  };
  // Clouds scattered across the sky, and a wall of big towers low on the horizon.
  for(let j=0;j<26;j++){const a=j/26*Math.PI*2+random()*.5,d=300+random()*520;cloud(Math.cos(a)*d,140+random()*110,Math.sin(a)*d,17+random()*16,a);}
  for(let j=0;j<20;j++){const a=j/20*Math.PI*2+random()*.3,d=960+random()*240;cloud(Math.cos(a)*d,24+random()*60,Math.sin(a)*d,40+random()*38,a);}
  const instances=new T.InstancedMesh(geometry,material,puffs.length),dummy=new T.Object3D();
  puffs.forEach(([x,y,z,sx,sy,sz],n)=>{dummy.position.set(x,y,z);dummy.scale.set(sx,sy,sz);dummy.rotation.set(0,random()*6.28,0);dummy.updateMatrix();instances.setMatrixAt(n,dummy.matrix);});
  instances.frustumCulled=false;g.add(instances);return g;
}
export function clouds(){return ANIME?animeClouds():cartoonClouds();}
/** Anime style: far-off flocks gliding in a V around the archipelago, wings beating. */
export function birdFlocks(centerX:number,centerZ:number){
  const group=new T.Group(),time={value:0},random=rand(77);
  const wing=new T.BufferGeometry();wing.setAttribute('position',new T.Float32BufferAttribute([0,0,.35, -1.5,0,-.15, 0,0,-.25,  0,0,.35, 0,0,-.25, 1.5,0,-.15],3));
  const material=new T.MeshBasicMaterial({color:'#3a4a6b',side:T.DoubleSide,fog:true});
  material.onBeforeCompile=shader=>{shader.uniforms.uTime=time;shader.vertexShader='uniform float uTime;\n'+shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\n  float beat=sin(uTime*5.5+instanceMatrix[3].x*.7+instanceMatrix[3].z*.5);transformed.y+=abs(position.x)*(.2+beat*.55);');};
  const flocks:{pivot:T.Group;speed:number}[]=[];
  for(let f=0;f<4;f++){
    const size=5+Math.floor(random()*5),mesh=new T.InstancedMesh(wing,material,size),dummy=new T.Object3D(),pivot=new T.Group();
    for(let n=0;n<size;n++){const row=Math.ceil(n/2),side=n%2?1:-1;dummy.position.set(side*row*3.2+(random()-.5),(random()-.5)*1.2,-row*3+(random()-.5));dummy.scale.setScalar(.8+random()*.4);dummy.updateMatrix();mesh.setMatrixAt(n,dummy.matrix);}
    mesh.frustumCulled=false;const radius=150+random()*260;mesh.position.set(radius,38+random()*40,0);mesh.rotation.y=0;pivot.position.set(centerX,0,centerZ);pivot.rotation.y=random()*6.28;pivot.add(mesh);group.add(pivot);flocks.push({pivot,speed:(.012+random()*.012)*(f%2?1:-1)});
    if(f%2===1)mesh.rotation.y=Math.PI;
  }
  return {group,update(seconds:number,dt:number){time.value=seconds;for(const f of flocks)f.pivot.rotation.y+=f.speed*dt;}};
}

export function ocean(){
  return new T.ShaderMaterial({uniforms:{time:{value:0},night:{value:0},horizon:{value:new T.Vector3(.667,.796,.816)},fogDensity:{value:.0075},anime:{value:0},sunDir:{value:new T.Vector3(-.4,.7,.5)},islands:{value:[] as T.Vector3[]}},vertexShader:`varying vec3 vWorld;varying float vHeight;uniform float time;void main(){vec3 p=position;vec4 w=modelMatrix*vec4(p,1.);w.y+=sin(w.x*.09+time*.8)*.17+cos(w.z*.065+time*.65)*.18+sin(w.x*.26-w.z*.18+time*1.4)*.055;vWorld=w.xyz;vHeight=w.y;gl_Position=projectionMatrix*viewMatrix*w;}`,fragmentShader:`varying vec3 vWorld;varying float vHeight;uniform float time;uniform float night;uniform vec3 horizon;uniform float fogDensity;uniform float anime;uniform vec3 sunDir;uniform vec3 islands[5];
float hash21(vec2 q){return fract(sin(dot(q,vec2(127.1,311.7)))*43758.5453);}
float vnoise(vec2 q){vec2 i=floor(q),f=fract(q);f=f*f*(3.-2.*f);return mix(mix(hash21(i),hash21(i+vec2(1.,0.)),f.x),mix(hash21(i+vec2(0.,1.)),hash21(i+vec2(1.,1.)),f.x),f.y);}
vec2 hash22(vec2 q){return fract(sin(vec2(dot(q,vec2(127.1,311.7)),dot(q,vec2(269.5,183.3))))*43758.5453);}
// Distance between the two nearest moving cell centres: small along cell borders, which draws the light web.
float web(vec2 q,float t){vec2 i=floor(q),f=fract(q);float d1=8.,d2=8.;for(int y=-1;y<=1;y++)for(int x=-1;x<=1;x++){vec2 g=vec2(float(x),float(y)),o=hash22(i+g);o=.5+.42*sin(t+6.2831*o);float d=length(g+o-f);if(d<d1){d2=d1;d1=d;}else if(d<d2)d2=d;}return d2-d1;}
float ripple(vec2 q,float t){return vnoise(q*.55+vec2(t*.35,t*.12))*.6+vnoise(q*1.3-vec2(t*.3,-t*.42))*.3+vnoise(q*3.1+vec2(-t*.5,t*.6))*.1;}
void main(){float shore=1000.;for(int i=0;i<5;i++){shore=min(shore,length(vWorld.xz-islands[i].xy)-islands[i].z);}vec2 p=vWorld.xz;float n=sin(p.x*.16+time*.8)*cos(p.y*.19-time*.6)+sin(p.x*.41+p.y*.3+time)*.25;vec3 deep=mix(vec3(.045,.43,.68),vec3(.03,.27,.6),anime),shallow=mix(vec3(.12,.66,.78),vec3(.1,.74,.82),anime);vec3 c=mix(shallow,deep,smoothstep(0.,60.,shore));c+=n*.025;float caustic=pow(1.-abs(sin(p.x*.32+cos(p.y*.21+time*.2))*cos(p.y*.36+sin(p.x*.17-time*.2))),16.);c+=vec3(.16,.18,.16)*caustic*(1.-smoothstep(0.,50.,shore))*mix(1.,.4,anime);vec3 viewDir=normalize(cameraPosition-vWorld);float fresnel=pow(1.-max(viewDir.y,0.),4.);c=mix(c,vec3(.35,.68,.79),fresnel*.6);float glint=pow(max(sin(p.x*1.4+p.y*.6+time)*sin(p.y*1.7-time*.9),0.),30.);c+=vec3(.7,.85,.81)*glint*.12;vec3 refl=reflect(-viewDir,vec3(0.,1.,0.));float path=pow(max(dot(refl,normalize(sunDir)),0.),18.);vec2 cell=floor(vec2(p.x*.9+p.y*.35,p.y*2.2)+vec2(time*.3,0.));float rnd=fract(sin(dot(cell,vec2(127.1,311.7)))*43758.5453);float sparkle=step(.8,fract(rnd+time*.3*(.4+rnd)));float path2=pow(max(dot(refl,normalize(sunDir)),0.),60.);c+=vec3(1.,.92,.68)*(path*.22+path2*sparkle*1.5)*anime*(1.-night);
// Anime style surface detail: moving ripples that tilt the surface, so it catches sky reflection, facet
// shading and sharp sun glitter; pale shallows; and thin drifting crest lines. All of it fades with distance.
if(anime>.5){
  float dist=length(cameraPosition-vWorld),near=exp(-dist*.006);
  float h0=ripple(p,time),hx=ripple(p+vec2(.35,0.),time),hz=ripple(p+vec2(0.,.35),time);
  vec3 N=normalize(vec3((h0-hx)*1.7*near,1.,(h0-hz)*1.7*near)),S=normalize(sunDir);
  // Clear water bands: pale aqua at the waterline, turquoise shallows over a sandy floor, rich blue offshore.
  vec3 base=mix(vec3(.6,.93,.93),vec3(.27,.8,.88),smoothstep(-1.,6.,shore));
  base=mix(base,vec3(.12,.56,.9),smoothstep(6.,30.,shore));base=mix(base,vec3(.06,.32,.78),smoothstep(30.,95.,shore));
  float bed=vnoise(p*.11)*.6+vnoise(p*.37)*.4;base*=1.+(bed-.5)*.2*(1.-smoothstep(3.,28.,shore));
  c=base+n*.018;
  c*=1.+clamp((dot(N,S)-S.y)*1.3,-.16,.22);
  vec3 R=reflect(-viewDir,N);float fr=pow(1.-max(dot(viewDir,N),0.),5.);
  c=mix(c,mix(horizon,vec3(.22,.52,.92),smoothstep(0.,.45,R.y)),fr*.6*(1.-night*.7));
  c+=vec3(1.,.93,.72)*pow(max(dot(R,S),0.),180.)*1.6*(1.-night);
  float ridge=1.-abs(2.*vnoise(p*.42+vec2(time*.11,time*.05))-1.);
  float lines=smoothstep(.972,.992,ridge)*smoothstep(.4,.65,vnoise(p*.09-vec2(time*.02)))*exp(-dist*.011);
  c=mix(c,vec3(.9,.98,.97),lines*.4*(1.-night*.6));
  c+=vec3(0.,.07,.06)*smoothstep(.1,.38,vHeight)*near;
  // The web of sunlight over the shallows, wobbling as the surface moves, fading out with depth.
  vec2 q=p*.28+vec2(vnoise(p*.21+time*.12),vnoise(p*.21-time*.1+3.7))*1.3;
  float w1=1.-smoothstep(.035,.11,web(q,time*.7)),w2=1.-smoothstep(.02,.07,web(q*1.85+5.3,time*.95));
  float shallowWeb=(1.-smoothstep(6.,38.,shore))*smoothstep(-1.5,1.,shore);
  c=mix(c,vec3(.94,.99,1.),(w1*.55+w2*.22)*shallowWeb*exp(-dist*.008)*(1.-night*.75));
  // Twinkling glints scattered over the water.
  vec2 gc=floor(p*1.7+vec2(time*.15,0.));float gr=hash21(gc),tw=step(.982,gr)*pow(max(0.,sin(time*2.6+gr*60.)),10.);
  c+=vec3(1.,.97,.9)*tw*near*1.3*(1.-night);
}
float wave=sin(shore*1.5-time*1.8+n*.35);float foam=smoothstep(.55,.9,wave)*(1.-smoothstep(0.,5.,shore))*smoothstep(-2.,.2,shore);float lace=smoothstep(.72,.98,sin(shore*.85-time*1.1+n*.8))*(1.-smoothstep(3.,11.,shore))*smoothstep(-1.,1.5,shore);c=mix(c,vec3(.82,.94,.85),foam*mix(.8,1.,anime));c=mix(c,vec3(.93,.99,.97),lace*.55*anime);float fog=1.-exp(-pow(length(cameraPosition.xz-vWorld.xz)*fogDensity,2.));c=mix(c,c*mix(.42,.16,anime)+mix(vec3(.02,.065,.08),vec3(.008,.022,.045),anime),night);c=mix(c,horizon,fog);gl_FragColor=vec4(c,1.);}`});
}
