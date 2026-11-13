import * as T from 'three';
import {mergeGeometries,mergeVertices} from 'three/addons/utils/BufferGeometryUtils.js';
import {createPerchedGull} from './perched-gull';

export type BirdRig={body:T.SkinnedMesh;neck:T.Bone;head:T.Bone;eyes:T.Group[];beak:T.Group;wings:T.Group[];wrists:T.Bone[];wingMeshes:T.SkinnedMesh[];feet:T.Group[];tail:T.Group;spread:number};
type Template={body:T.BufferGeometry;wings:T.BufferGeometry[];legs:T.BufferGeometry[];tail:T.BufferGeometry;details:T.BufferGeometry;upperBill:T.BufferGeometry;lowerBill:T.BufferGeometry;eyes:{center:T.Vector3;geometry:T.BufferGeometry}[];material:T.Material};
let template:Template|undefined;
const neckPivot=new T.Vector3(0,.71,-.21),headPivot=new T.Vector3(0,.91,-.32),billPivot=new T.Vector3(0,.952,-.452);
function merged(parts:T.Mesh[],origin=new T.Vector3()){
  const geometries=parts.map(p=>{const g=p.geometry.index?p.geometry.toNonIndexed():p.geometry.clone();g.deleteAttribute('uv');return g.applyMatrix4(p.matrixWorld).translate(-origin.x,-origin.y,-origin.z);});
  const result=mergeGeometries(geometries,false);geometries.forEach(g=>g.dispose());if(!result)throw new Error('Could not assemble the custom gull rig.');const indexed=mergeVertices(result,1e-5);result.dispose();return indexed;
}
function collect(object:T.Object3D){const parts:T.Mesh[]=[];object.traverse(o=>{if(o instanceof T.Mesh)parts.push(o);});return parts;}
function skin(geometry:T.BufferGeometry,weight:(p:T.Vector3)=>[number,number,number]){
  const position=geometry.getAttribute('position'),indices:number[]=[],weights:number[]=[],p=new T.Vector3();
  for(let n=0;n<position.count;n++){p.fromBufferAttribute(position,n);const w=weight(p);indices.push(0,1,2,0);weights.push(w[0],w[1],w[2],0);}
  geometry.setAttribute('skinIndex',new T.Uint16BufferAttribute(indices,4));geometry.setAttribute('skinWeight',new T.Float32BufferAttribute(weights,4));
}
function billHalf(source:T.Mesh,lower:boolean){
  const g=source.geometry.index?source.geometry.toNonIndexed():source.geometry.clone(),attributes=['position','normal','color'],data=attributes.map(()=>[] as number[]),p=g.getAttribute('position');
  for(let n=0;n<p.count;n+=3){let distance=0;for(let k=0;k<3;k++)distance+=p.getY(n+k)-(.953+(p.getZ(n+k)+.462)*.12);if((distance<0)!==lower)continue;for(let j=0;j<attributes.length;j++){const a=g.getAttribute(attributes[j]);for(let k=0;k<3;k++)data[j].push(a.getX(n+k),a.getY(n+k),a.getZ(n+k));}}
  g.dispose();const result=new T.BufferGeometry();attributes.forEach((a,j)=>result.setAttribute(a,new T.Float32BufferAttribute(data[j],3)));const pivot=lower?billPivot:headPivot;return result.translate(-pivot.x,-pivot.y,-pivot.z);
}
function templates(){
  if(template)return template;
  const source=createPerchedGull(),all=collect(source),body=merged([source.getObjectByName('continuous-body-neck-head') as T.Mesh]);
  skin(body,p=>{const upper=T.MathUtils.smoothstep(p.y,.65,.83),head=T.MathUtils.smoothstep(p.y,.81,.93);return [1-upper,upper*(1-head),upper*head];});
  const flightBody=body.clone(),bodyPositions=flightBody.getAttribute('position'),skinWeights=body.getAttribute('skinWeight');
  // Build the desired continuous airborne contour, then compensate for the
  // neck's flight bone transforms. This avoids squeezing upright chest rings
  // through one another when the neck is tucked down.
  const neckFlight=new T.Matrix4().makeTranslation(0,.647,-.21).multiply(new T.Matrix4().makeRotationX(-.6)).multiply(new T.Matrix4().makeTranslation(0,-.71,.21));
  const headFlight=new T.Matrix4().makeTranslation(0,.647,-.21).multiply(new T.Matrix4().makeRotationX(-.6)).multiply(new T.Matrix4().makeTranslation(0,.2,-.11)).multiply(new T.Matrix4().makeRotationX(.6)).multiply(new T.Matrix4().makeTranslation(0,-.91,.32));
  const inverseBlend=new T.Matrix4(),identity=new T.Matrix4(),point=new T.Vector3();
  const sections=new Map<string,{minZ:number;maxZ:number;width:number}>();
  for(let n=0;n<bodyPositions.count;n++){const key=bodyPositions.getY(n).toFixed(6),s=sections.get(key)??{minZ:Infinity,maxZ:-Infinity,width:0};s.minZ=Math.min(s.minZ,bodyPositions.getZ(n));s.maxZ=Math.max(s.maxZ,bodyPositions.getZ(n));s.width=Math.max(s.width,Math.abs(bodyPositions.getX(n)));sections.set(key,s);}
  const flightProfile=[
    [.224,.38,.055,.005,.015],[.239,.391,.04,.065,.15],[.275,.413,.025,.125,.27],
    [.335,.445,.01,.16,.34],[.405,.48,-.005,.177,.38],[.48,.52,-.03,.17,.38],
    [.545,.56,-.06,.15,.35],[.60,.60,-.1,.13,.30],[.67,.64,-.15,.105,.24],
    [.75,.68,-.245,.078,.14],[.825,.705,-.36,.073,.10],[.875,.715,-.410,.092,.102],
  ];
  const sample=(y:number)=>{const n=Math.max(0,flightProfile.findIndex((r,j)=>j<flightProfile.length-1&&y>=r[0]&&y<flightProfile[j+1][0])),a=flightProfile[Math.max(0,n-1)],b=flightProfile[n],c=flightProfile[n+1],d=flightProfile[Math.min(flightProfile.length-1,n+2)],t=T.MathUtils.clamp((y-b[0])/(c[0]-b[0]),0,1);return b.slice(1).map((v,j)=>{const k=j+1;return .5*(2*v+(-a[k]+c[k])*t+(2*a[k]-5*v+4*c[k]-d[k])*t*t+(-a[k]+3*v-3*c[k]+d[k])*t*t*t);});};
  for(let n=0;n<bodyPositions.count;n++){
    const x=bodyPositions.getX(n),y=bodyPositions.getY(n),z=bodyPositions.getZ(n);
    if(y>=.875)point.set(x,y-.16,z-.094);
    else{const s=sections.get(y.toFixed(6))!,[targetY,center,width,depth]=sample(y),nz=(z-(s.minZ+s.maxZ)*.5)/Math.max(.001,(s.maxZ-s.minZ)*.5);point.set(x/Math.max(.001,s.width)*Math.max(.002,width),targetY,center+nz*Math.max(.002,depth));}
    const weights=[skinWeights.getX(n),skinWeights.getY(n),skinWeights.getZ(n)];
    for(let k=0;k<16;k++)inverseBlend.elements[k]=identity.elements[k]*weights[0]+neckFlight.elements[k]*weights[1]+headFlight.elements[k]*weights[2];
    point.applyMatrix4(inverseBlend.invert());bodyPositions.setXYZ(n,point.x,point.y,point.z);
  }
  flightBody.computeVertexNormals();body.morphAttributes.position=[bodyPositions.clone()];body.morphAttributes.normal=[flightBody.getAttribute('normal').clone()];flightBody.dispose();
  const wings=[-1,1].map(side=>{
    const origin=new T.Vector3(side*.13,.62,-.18),group=source.getObjectByName(side<0?'folded-wing-left':'folded-wing-right')!,geometry=merged(collect(group),origin),flight=geometry.clone(),p=flight.getAttribute('position');
    skin(geometry,local=>{const q=T.MathUtils.clamp((local.z+origin.z+.22)/.9,0,1),w=T.MathUtils.smoothstep(q,.35,.85);return [1-w,w,0];});
    for(let n=0;n<p.count;n++){const x=p.getX(n)+origin.x,y=p.getY(n)+origin.y,z=p.getZ(n)+origin.z,q=T.MathUtils.clamp((z+.22)/.9,0,1);p.setXYZ(n,side*(.15+q*1.1+(Math.abs(x)-.15)*.16)-origin.x,.62+Math.sin(q*Math.PI)*.10-q*.04+(Math.abs(x)-.16)*.07-origin.y,-.18+(.71-y)*.85+q*.12-origin.z);}
    flight.computeVertexNormals();geometry.morphAttributes.position=[p.clone()];geometry.morphAttributes.normal=[flight.getAttribute('normal').clone()];flight.dispose();return geometry;
  });
  const legs=[-1,1].map(side=>merged(collect(source.getObjectByName(side<0?'leg-left':'leg-right')!),new T.Vector3(side*.069,.27,side<0?-.035:-.115)));
  const eyes=[-1,1].map(side=>{const eye=all.find(o=>o.name==='black-eye'&&Math.sign(o.geometry.getAttribute('position').getX(0))===side)!,glint=all.find(o=>o.name==='eye-catchlight'&&Math.sign(o.geometry.getAttribute('position').getX(0))===side)!;eye.geometry.computeBoundingBox();const center=eye.geometry.boundingBox!.getCenter(new T.Vector3());return {center,geometry:merged([eye,glint],center)};});
  const bill=source.getObjectByName('tapered-curved-beak') as T.Mesh;
  template={body,wings,legs,eyes,tail:merged([source.getObjectByName('tapered-white-tail') as T.Mesh],new T.Vector3(0,.29,.28)),details:merged(all.filter(o=>o.name==='bill-seam'||o.name==='small-nostril'),headPivot),upperBill:billHalf(bill,false),lowerBill:billHalf(bill,true),material:(all[0].material as T.Material)};
  return template;
}
function staticMesh(geometry:T.BufferGeometry,material:T.Material,parent:T.Object3D,name:string){const mesh=new T.Mesh(geometry,material);mesh.name=name;mesh.castShadow=mesh.receiveShadow=true;parent.add(mesh);return mesh;}
export function createAnimatedGull(){
  const t=templates(),root=new T.Group();root.name='custom-reference-gull';root.userData={assetSource:'reference-perched-gull',blend:0,calling:false};
  const body=new T.SkinnedMesh(t.body,t.material),base=new T.Bone(),neck=new T.Bone(),head=new T.Bone();body.name='continuous-skinned-plumage';base.name='body';neck.name='neck';head.name='head';neck.position.copy(neckPivot);head.position.copy(headPivot).sub(neckPivot);base.add(neck);neck.add(head);body.add(base);root.add(body);body.bind(new T.Skeleton([base,neck,head]));body.castShadow=body.receiveShadow=true;body.frustumCulled=false;
  staticMesh(t.details,t.material,head,'face-details');staticMesh(t.upperBill,t.material,head,'upper-bill');
  const beak=new T.Group();beak.name='lower-bill';beak.position.copy(billPivot).sub(headPivot);head.add(beak);staticMesh(t.lowerBill,t.material,beak,'lower-bill-surface');
  const eyes=t.eyes.map(e=>{const group=new T.Group();group.name='blinking-eye';group.position.copy(e.center).sub(headPivot);head.add(group);staticMesh(e.geometry,t.material,group,'eye-and-catchlight');return group;});
  const wings:T.Group[]=[],wrists:T.Bone[]=[],wingMeshes:T.SkinnedMesh[]=[],feet:T.Group[]=[];
  for(let n=0;n<2;n++){
    const side=n===0?-1:1,wing=new T.Group();wing.name=side<0?'articulated-wing-left':'articulated-wing-right';wing.position.set(side*.13,.62,-.18);root.add(wing);
    const surface=new T.SkinnedMesh(t.wings[n],t.material),shoulder=new T.Bone(),wrist=new T.Bone(),unused=new T.Bone();wrist.name='wrist';wrist.position.set(side*.48,0,.12);shoulder.add(wrist);shoulder.add(unused);surface.add(shoulder);wing.add(surface);surface.bind(new T.Skeleton([shoulder,wrist,unused]));surface.castShadow=true;surface.frustumCulled=false;surface.morphTargetInfluences![0]=0;wings.push(wing);wrists.push(wrist);wingMeshes.push(surface);
    const foot=new T.Group();foot.name=side<0?'tucking-leg-left':'tucking-leg-right';foot.position.set(side*.069,.27,side<0?-.035:-.115);root.add(foot);staticMesh(t.legs[n],t.material,foot,'leg-and-webbed-toes');feet.push(foot);
  }
  const tail=new T.Group();tail.name='tail-fan';tail.position.set(0,.29,.28);root.add(tail);staticMesh(t.tail,t.material,tail,'painted-tail');
  const rig:BirdRig={body,neck,head,eyes,beak,wings,wrists,wingMeshes,feet,tail,spread:0};root.userData.rig=rig;root.updateMatrixWorld(true);return root;
}

export type GullPose={time:number;dt:number;perch:number;glide?:boolean;landing?:boolean;yaw?:number;pitch?:number;calling?:boolean;shuffle?:boolean;reduced?:boolean};
export function poseGull(rig:BirdRig,input:GullPose){
  const {time,dt,reduced=false}=input,perch=T.MathUtils.clamp(input.perch,0,1),spread=1-T.MathUtils.smoothstep(perch,.35,.98),flight=1-perch;
  rig.spread=spread;rig.body.morphTargetInfluences![0]=flight;const flap=reduced?0:Math.sin(time*(input.landing?8:6.5))*(input.glide?.045:input.landing?.8:.63);
  rig.neck.position.y=.71-flight*.063;
  rig.neck.rotation.x=T.MathUtils.damp(rig.neck.rotation.x,-flight*.6+(reduced?0:.25*(input.pitch??0))*perch,10,dt);
  rig.neck.rotation.y=T.MathUtils.damp(rig.neck.rotation.y,reduced?0:(input.yaw??0)*.32*perch,7,dt);
  rig.head.rotation.x=T.MathUtils.damp(rig.head.rotation.x,flight*.6+(reduced?0:(input.pitch??0)*.75*perch),10,dt);
  rig.head.rotation.y=T.MathUtils.damp(rig.head.rotation.y,reduced?0:(input.yaw??0)*.68*perch,7,dt);
  for(let n=0;n<2;n++){
    const side=n===0?-1:1;rig.wingMeshes[n].morphTargetInfluences![0]=spread;
    rig.wings[n].rotation.z=side*(flap+.10)*spread;rig.wings[n].rotation.y=-side*.06*spread;
    const wristFlap=reduced?0:input.glide?Math.sin(time*.7)*.018:Math.sin(time*(input.landing?8:6.5)-.45)*.18;
    rig.wrists[n].rotation.z=side*wristFlap*spread;rig.wrists[n].rotation.y=side*(.07+Math.max(0,flap)*.14)*spread;
    const shuffle=!reduced&&input.shuffle?Math.sin(time*16+n*Math.PI)*.16:0;
    rig.feet[n].rotation.x=T.MathUtils.damp(rig.feet[n].rotation.x,-flight*1.5+shuffle*perch,10,dt);
    rig.feet[n].position.y=.27+flight*.09;
  }
  const blink=!reduced&&time%5.3<.12;for(const eye of rig.eyes)eye.scale.y=blink?.09:1;
  rig.beak.rotation.x=input.calling?-.19*(.7+Math.sin(time*31)*.3):0;
  rig.tail.rotation.x=reduced?0:(input.landing?-.2:Math.sin(time*.9)*.035)*flight;rig.tail.scale.x=1+(input.landing?.45:.15)*flight;
}
