import * as T from 'three';
import {PICKUPS,type Island} from './data';

export const SKY_COLOR = '#aacbd0';
export const rand = (seed:number) => {
  let value = seed >>> 0;
  return () => { value = (Math.imul(value,1664525)+1013904223) >>> 0; return value / 4294967296; };
};
const smooth = (a:number,b:number,x:number) => {const t=T.MathUtils.clamp((x-a)/(b-a),0,1);return t*t*(3-2*t);};
export function localHeight(i:Island,x:number,z:number) {
  const d=Math.hypot(x,z)/i.radius;
  const beach=1.35*(1-smooth(.83,1.08,d));
  const inland=1-smooth(.55,.84,d);
  const hill=Math.exp(-((x+i.radius*.25)**2+(z+i.radius*.35)**2)/(i.radius*i.radius*.17));
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
export function terrain(i:Island){
  const segments=112,rings=38,vertices:number[]=[],colors:number[]=[],uv:number[]=[],indices:number[]=[];
  const sand=new T.Color('#ddc58b'),green=new T.Color('#6f983c'),lightGreen=new T.Color('#8ba850');
  for(let ring=0;ring<=rings;ring++)for(let a=0;a<=segments;a++){
    const angle=a/segments*Math.PI*2;
    const edge=1.055+Math.sin(angle*5+.3)*.025+Math.cos(angle*9)*.018;
    const r=ring/rings*i.radius*edge,x=Math.cos(angle)*r,z=Math.sin(angle)*r;
    vertices.push(x,localHeight(i,x,z),z);uv.push(x/i.radius*.5+.5,z/i.radius*.5+.5);
    let grass=1-smooth(.65,.79,r/i.radius);const pathX=i.dock[0]-i.x+Math.sin(z*.14)*2;if(z>-9)grass*=smooth(1.2,2.5,Math.abs(x-pathX))*.8+.2;const c=sand.clone().lerp(green.clone().lerp(lightGreen,(Math.sin(x*.35+z*.22)+1)*.25),grass);
    c.multiplyScalar(.94+Math.sin(x*2.7+z*3.1)*.035);colors.push(c.r,c.g,c.b);
    if(ring<rings&&a<segments){const n=ring*(segments+1)+a;indices.push(n,n+1,n+segments+1,n+1,n+segments+2,n+segments+1);}
  }
  const geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.Float32BufferAttribute(vertices,3));geometry.setAttribute('color',new T.Float32BufferAttribute(colors,3));geometry.setAttribute('uv',new T.Float32BufferAttribute(uv,2));geometry.setIndex(indices);geometry.computeVertexNormals();
  // The radial mesh uses clockwise rings when seen from above.
  const material=new T.MeshStandardMaterial({vertexColors:true,map:terrainTexture??=grainTexture(),roughness:1});
  const surface=new T.Mesh(geometry,material);surface.receiveShadow=true;surface.castShadow=true;return surface;
}
export type Biome={grass:T.InstancedMesh;wind:{value:number};objects:T.Group;obstacles:{x:number;z:number;r:number}[]};
export function biome(i:Island):Biome{
  const random=rand(i.id.split('').reduce((a,c)=>a+c.charCodeAt(0),7));const objects=new T.Group();
  const grassGeometry=new T.BufferGeometry(),positions:number[]=[];
  for(let b=0;b<4;b++){
    const angle=b*Math.PI*.76,dx=Math.cos(angle),dz=Math.sin(angle),w=.028;
    const ox=Math.sin(b*4)*.14,oz=Math.cos(b*3)*.14,h=.31+b*.032;
    const point=(t:number,side:number)=>{const width=w*(1-t);return [ox+dx*.14*t*t-dz*width*side,t*h,oz+dz*.14*t*t+dx*width*side];};
    for(let segment=0;segment<3;segment++){
      const t=segment/3,next=(segment+1)/3;
      positions.push(...point(t,-1),...point(t,1),...point(next,-1),...point(next,-1),...point(t,1),...point(next,1));
    }
  }
  grassGeometry.setAttribute('position',new T.Float32BufferAttribute(positions,3));grassGeometry.computeVertexNormals();
  const wind={value:0};const material=new T.MeshStandardMaterial({color:'#ffffff',roughness:1,side:T.DoubleSide});
  material.onBeforeCompile=shader=>{shader.uniforms.uWind=wind;shader.vertexShader='uniform float uWind;\n'+shader.vertexShader;shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>',`#include <begin_vertex>
    transformed.x += sin(uWind*1.3+instanceMatrix[3].x*.35+instanceMatrix[3].z*.24)*position.y*position.y*.32;
    transformed.z += cos(uWind*.9+instanceMatrix[3].z*.3)*position.y*position.y*.16;`);};
  const grass=new T.InstancedMesh(grassGeometry,material,8000);grass.receiveShadow=true;grass.castShadow=false;
  const dummy=new T.Object3D(),color=new T.Color();let count=0;
  for(let attempt=0;attempt<55000&&count<8000;attempt++){
    const x=(random()*2-1)*i.radius*.76,z=(random()*2-1)*i.radius*.76,d=Math.hypot(x,z)/i.radius;
    const pathX=i.dock[0]-i.x+Math.sin(z*.14)*2;
    if(d>.76||random()<smooth(.63,.78,d)||Math.abs(x-pathX)<1.8&&z>-9||Math.hypot(x+6,z+5)<2.4)continue;
    dummy.position.set(x,localHeight(i,x,z)-.025,z);dummy.rotation.y=random()*Math.PI*2;dummy.scale.setScalar(.7+random()*.9);dummy.updateMatrix();grass.setMatrixAt(count,dummy.matrix);
    color.setHSL(.23+random()*.045,.4+random()*.2,.26+random()*.12);grass.setColorAt(count++,color);
  }
  grass.count=count;grass.computeBoundingSphere();objects.add(grass);
  const pebbles=new T.InstancedMesh(new T.DodecahedronGeometry(1,0),new T.MeshStandardMaterial({color:'#a1a59a',roughness:1}),85);
  pebbles.castShadow=pebbles.receiveShadow=true;let pebbleCount=0;
  for(let j=0;j<85;j++){const a=random()*Math.PI*2,r=i.radius*(.78+random()*.2),x=Math.cos(a)*r,z=Math.sin(a)*r;if(Math.abs(x-(i.dock[0]-i.x))<4&&z>0)continue;dummy.position.set(x,localHeight(i,x,z)+.08,z);dummy.rotation.set(random(),random()*6,random());const size=.12+random()*.32;dummy.scale.set(size,size*.55,size*.8);dummy.updateMatrix();pebbles.setMatrixAt(pebbleCount++,dummy.matrix);}
  pebbles.count=pebbleCount;pebbles.computeBoundingSphere();objects.add(pebbles);
  const obstacles:{x:number;z:number;r:number}[]=[];
  return {grass,wind,objects,obstacles};
}

export function sky(){
  const material=new T.ShaderMaterial({side:T.BackSide,depthWrite:false,uniforms:{storm:{value:0},night:{value:0},sunset:{value:0}},vertexShader:'varying vec3 vDirection;void main(){vDirection=position;gl_Position=projectionMatrix*viewMatrix*modelMatrix*vec4(position,1.);}',fragmentShader:`varying vec3 vDirection;uniform float storm;uniform float night;uniform float sunset;void main(){vec3 d=normalize(vDirection);float h=max(d.y,0.);vec3 c=mix(vec3(.56,.82,.91),vec3(.025,.38,.66),pow(h,.42));float sun=pow(max(dot(d,normalize(vec3(-.4,.7,.5))),0.),130.);c+=vec3(1.,.85,.55)*sun*.55;c=mix(c,vec3(.667,.796,.816),exp(-h*22.)*.94);c=mix(c,vec3(.39,.49,.54),storm*.72);c=mix(c,vec3(.08,.18,.27)+h*.035,night*.86);c=mix(c,vec3(.86,.57,.34),sunset*exp(-h*9.)*.45);gl_FragColor=vec4(c,1.);}`});
  const dome=new T.Mesh(new T.SphereGeometry(1450,24,16),material);dome.frustumCulled=false;return {dome,material};
}
export function clouds(){
  const random=rand(702),g=new T.Group();const geometry=new T.IcosahedronGeometry(1,2),material=new T.MeshStandardMaterial({color:'#ffffff',roughness:1,emissive:'#94b4c6',emissiveIntensity:.28,fog:false});
  const instances=new T.InstancedMesh(geometry,material,160),dummy=new T.Object3D();let count=0;
  for(let j=0;j<23;j++){
    const a=j/23*Math.PI*2,dist=320+random()*650,cx=Math.cos(a)*dist,cz=Math.sin(a)*dist,cy=95+random()*100;
    for(let k=0;k<17;k++){
      dummy.position.set(cx+(k-3)*13,cy+(3-Math.abs(k-3))*5,cz+Math.cos(k)*8);dummy.scale.set(14+random()*10,(k>1&&k<5?12:8)+random()*8,10+random()*8);dummy.rotation.set(0,random(),0);dummy.updateMatrix();instances.setMatrixAt(count++,dummy.matrix);
    }
  }
  instances.count=count;instances.frustumCulled=false;g.add(instances);return g;
}

export function ocean(){
  return new T.ShaderMaterial({uniforms:{time:{value:0},night:{value:0},islands:{value:[] as T.Vector3[]}},vertexShader:`varying vec3 vWorld;varying float vHeight;uniform float time;void main(){vec3 p=position;vec4 w=modelMatrix*vec4(p,1.);w.y+=sin(w.x*.09+time*.8)*.17+cos(w.z*.065+time*.65)*.18+sin(w.x*.26-w.z*.18+time*1.4)*.055;vWorld=w.xyz;vHeight=w.y;gl_Position=projectionMatrix*viewMatrix*w;}`,fragmentShader:`varying vec3 vWorld;varying float vHeight;uniform float time;uniform float night;uniform vec3 islands[5];void main(){float shore=1000.;for(int i=0;i<5;i++){shore=min(shore,length(vWorld.xz-islands[i].xy)-islands[i].z);}vec2 p=vWorld.xz;float n=sin(p.x*.16+time*.8)*cos(p.y*.19-time*.6)+sin(p.x*.41+p.y*.3+time)*.25;vec3 deep=vec3(.045,.43,.68),shallow=vec3(.12,.66,.78);vec3 c=mix(shallow,deep,smoothstep(0.,60.,shore));c+=n*.025;float caustic=pow(1.-abs(sin(p.x*.32+cos(p.y*.21+time*.2))*cos(p.y*.36+sin(p.x*.17-time*.2))),16.);c+=vec3(.16,.18,.16)*caustic*(1.-smoothstep(0.,50.,shore));vec3 viewDir=normalize(cameraPosition-vWorld);float fresnel=pow(1.-max(viewDir.y,0.),4.);c=mix(c,vec3(.35,.68,.79),fresnel*.6);float glint=pow(max(sin(p.x*1.4+p.y*.6+time)*sin(p.y*1.7-time*.9),0.),30.);c+=vec3(.7,.85,.81)*glint*.12;float wave=sin(shore*1.5-time*1.8+n*.35);float foam=smoothstep(.55,.9,wave)*(1.-smoothstep(0.,5.,shore))*smoothstep(-2.,.2,shore);c=mix(c,vec3(.82,.94,.85),foam*.8);float fog=1.-exp(-pow(length(cameraPosition.xz-vWorld.xz)*.0075,2.));c=mix(c,vec3(.667,.796,.816),fog);c=mix(c,c*.42+vec3(.02,.065,.08),night);gl_FragColor=vec4(c,1.);}`});
}
