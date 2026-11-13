import * as T from 'three';
import {mergeGeometries,mergeVertices} from 'three/addons/utils/BufferGeometryUtils.js';

// Authored surfaces for the stationary reference study. Units are metres,
// feet rest at Y=0, and the beak points down local -Z. No animation is applied.
const paint=new T.MeshStandardMaterial({vertexColors:true,roughness:1,metalness:0,side:T.DoubleSide});
const C={white:new T.Color('#f7f8f4'),cool:new T.Color('#bdc8dc'),shade:new T.Color('#98a4bd'),wing:new T.Color('#7483a1'),wingLight:new T.Color('#c1cddd'),edge:new T.Color('#63718d'),black:new T.Color('#252e42'),rose:new T.Color('#ac7367'),web:new T.Color('#bd887c'),gold:new T.Color('#bd7e4e'),goldLight:new T.Color('#dfaa73')};
type Profile=[number,number,number,number]; // height, centre Z, half width, half depth
const bodyProfile:Profile[]=[
  [.224,.055,.005,.015],[.239,.06,.095,.20],[.275,.06,.162,.31],
  [.335,.045,.198,.365],[.405,.005,.218,.39],[.48,-.04,.217,.38],
  [.545,-.09,.196,.34],[.60,-.14,.169,.31],[.67,-.15,.147,.28],
  [.75,-.24,.10,.17],[.825,-.30,.073,.085],[.875,-.316,.092,.102],
  [.925,-.334,.117,.121],[.977,-.338,.121,.125],[1.022,-.333,.096,.108],
  [1.05,-.326,.055,.07],[1.061,-.322,.002,.004],
];
function cat(a:number,b:number,c:number,d:number,t:number){return .5*((2*b)+(-a+c)*t+(2*a-5*b+4*c-d)*t*t+(-a+3*b-3*c+d)*t*t*t);}
function mesh(name:string,positions:number[],indices:number[],colors:number[],parent:T.Object3D){
  const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(positions,3));geo.setAttribute('color',new T.Float32BufferAttribute(colors,3));geo.setIndex(indices);geo.computeVertexNormals();
  const result=new T.Mesh(geo,paint);result.name=name;result.castShadow=true;result.receiveShadow=true;parent.add(result);return result;
}
function addColor(out:number[],color:T.Color){out.push(color.r,color.g,color.b);}
function body(parent:T.Object3D){
  const p:number[]=[],c:number[]=[],idx:number[]=[],rings:Profile[]=[];const steps=4,radial=40;
  for(let n=0;n<bodyProfile.length-1;n++)for(let k=0;k<steps;k++){
    const a=bodyProfile[Math.max(0,n-1)],b=bodyProfile[n],d=bodyProfile[n+1],e=bodyProfile[Math.min(bodyProfile.length-1,n+2)];
    rings.push(b.map((_,j)=>cat(a[j],b[j],d[j],e[j],k/steps)) as Profile);
  }
  rings.push(bodyProfile.at(-1)!);
  for(const [y,z,rx,rz]of rings)for(let j=0;j<=radial;j++){
    const angle=j/radial*Math.PI*2,x=Math.cos(angle)*Math.max(.002,rx),depth=z+Math.sin(angle)*Math.max(.002,rz);
    p.push(x,y,depth);
    const underside=1-T.MathUtils.smoothstep(y,.24,.64),back=T.MathUtils.smoothstep(Math.sin(angle),-.2,.85);
    const color=C.white.clone().lerp(C.cool,underside*.65).lerp(C.shade,underside*back*.15);
    // A quiet painted blue shadow under the nape; no seams between body and neck.
    color.lerp(C.cool,T.MathUtils.smoothstep(y,.58,.78)*(1-T.MathUtils.smoothstep(y,.82,.93))*back*.22);
    addColor(c,color);
  }
  for(let r=0;r<rings.length-1;r++)for(let j=0;j<radial;j++){const a=r*(radial+1)+j,b=a+radial+1;idx.push(a,b,a+1,b,b+1,a+1);}
  mesh('continuous-body-neck-head',p,idx,c,parent);
}
function path(start:[number,number],segments:number[][]){
  const s=new T.Shape();s.moveTo(...start);for(const a of segments)s.bezierCurveTo(a[0],a[1],a[2],a[3],a[4],a[5]);s.closePath();return s;
}
const wingOutline=path([-.222,.518],[[-.229,.604,-.071,.635,.072,.588],[.209,.55,.32,.399,.493,.315],[.346,.293,.113,.288,-.031,.344],[-.159,.393,-.228,.446,-.222,.518]]);
function wingX(z:number,y:number){
  const index=Math.max(0,bodyProfile.findIndex((p,n)=>n<bodyProfile.length-1&&y>=p[0]&&y<bodyProfile[n+1][0]));
  const a=bodyProfile[Math.max(0,index-1)],b=bodyProfile[index],c=bodyProfile[index+1],d=bodyProfile[Math.min(bodyProfile.length-1,index+2)],t=T.MathUtils.clamp((y-b[0])/(c[0]-b[0]),0,1);
  const center=cat(a[1],b[1],c[1],d[1],t),width=cat(a[2],b[2],c[2],d[2],t),depth=cat(a[3],b[3],c[3],d[3],t);
  const flank=width*Math.sqrt(Math.max(0,1-((z-center)/depth)**2));
  const relief=.008+.013*Math.sqrt(Math.max(0,1-((z-.035)/.48)**2-((y-.467)/.205)**2));
  return Math.max(.048,flank)+relief;
}
const wingY=(y:number)=>.31+(y-.31)*1.3;
function wingPatch(name:string,shape:T.Shape,side:number,offset:number,light:T.Color,dark:T.Color,parent:T.Object3D,raiseCover=true){
  const points=shape.getSpacedPoints(48).slice(0,-1),center=new T.Vector2();for(const point of points)center.add(point);center.divideScalar(points.length);
  const positions:number[]=[],colors:number[]=[],indices:number[]=[],rings=5,n=points.length;
  const centerY=raiseCover?wingY(center.y):center.y;
  positions.push(side*(wingX(center.x,centerY)+offset),centerY,center.x);addColor(colors,light.clone().lerp(dark,.2));
  for(let ring=1;ring<=rings;ring++)for(const edge of points){const v=center.clone().lerp(edge,ring/rings),y=raiseCover?wingY(v.y):v.y;positions.push(side*(wingX(v.x,y)+offset),y,v.x);const shade=T.MathUtils.clamp((.59-v.y)*3.2+v.x*.18,0,1);addColor(colors,light.clone().lerp(dark,shade));}
  for(let j=0;j<n;j++)indices.push(0,1+j,1+(j+1)%n);
  for(let r=1;r<rings;r++)for(let j=0;j<n;j++){const a=1+(r-1)*n+j,b=1+(r-1)*n+(j+1)%n,d=1+r*n+j,e=1+r*n+(j+1)%n;indices.push(a,d,b,b,d,e);}
  mesh(name,positions,indices,colors,parent);
}
function stroke(name:string,points:T.Vector3[],radius:number,color:T.Color,parent:T.Object3D){
  const geometry=new T.TubeGeometry(new T.CatmullRomCurve3(points),20,radius,5,false);const colors:number[]=[];for(let n=0;n<geometry.attributes.position.count;n++)addColor(colors,color);geometry.setAttribute('color',new T.Float32BufferAttribute(colors,3));const line=new T.Mesh(geometry,paint);line.name=name;line.castShadow=true;parent.add(line);return line;
}
function foldedWing(side:number,parent:T.Object3D){
  const wing=new T.Group();wing.name=side<0?'folded-wing-left':'folded-wing-right';parent.add(wing);
  // Long black flights sit under the cover, rather than sitting on its surface.
  for(let j=0;j<4;j++){
    const y=.293+j*.011,z=.535+j*.023;
    const primary=path([.308,.337+j*.006],[[.41,.33+j*.009,z-.025,y+.012,z+.045,y],[z+.01,y-.01,.418,.276+j*.009,.308,.31+j*.006],[.293,.318,.292,.329,.308,.337+j*.006]]);
    wingPatch(`pointed-primary-${j}`,primary,side,-.014+j*.001,C.black,C.black,wing,false);
    const mark=path([z-.012,y+.004],[[z-.005,y+.019,z+.015,y+.013,z+.024,y+.002],[z+.015,y-.004,z+.004,y-.008,z-.012,y+.004]]);
    wingPatch(`pale-primary-mark-${j}`,mark,side,-.010+j*.001,C.white,C.cool,wing,false);
  }
  wingPatch('swept-wing-cover',wingOutline,side,0,C.wingLight,C.wing,wing);
  const shoulder=path([-.202,.524],[[-.191,.58,-.087,.605,.016,.577],[.083,.559,.087,.531,.037,.501],[-.04,.456,-.16,.469,-.202,.524]]);
  wingPatch('shoulder-feather',shoulder,side,.003,C.wingLight,C.wing,wing);
  // Broad, thin ribbons meet the wing surface with engraved sweeping boundaries.
  const feathers=[
    path([-.11,.484],[[-.014,.49,.095,.508,.168,.504],[.194,.48,.282,.392,.437,.326],[.24,.346,.008,.386,-.11,.484]]),
    path([-.165,.438],[[-.054,.422,.046,.442,.136,.462],[.193,.428,.251,.36,.366,.315],[.136,.316,-.045,.359,-.165,.438]]),
    path([-.157,.394],[[-.084,.385,-.005,.403,.065,.418],[.12,.392,.194,.342,.273,.307],[.073,.302,-.049,.343,-.157,.394]]),
  ];
  feathers.forEach((s,n)=>wingPatch(`long-secondary-${n}`,s,side,.004+n*.001,C.wingLight.clone().lerp(C.wing,n*.17),C.wing.clone().lerp(C.edge,.2),wing));
  const lines=[
    [[-.187,.511],[-.099,.481],[.011,.494],[.072,.532]],
    [[-.145,.454],[-.014,.412],[.145,.396],[.352,.333]],
    [[-.14,.41],[-.03,.369],[.126,.345],[.283,.315]],
  ];
  lines.forEach((line,n)=>{
    const curve=new T.CatmullRomCurve3(line.map(([z,y])=>new T.Vector3(z,y,0)));
    const contour=curve.getPoints(60).map(p=>new T.Vector3(side*(wingX(p.x,wingY(p.y))+.013),wingY(p.y),p.x));
    stroke(`feather-crease-${n}`,contour,.0014,C.edge.clone().lerp(C.wing,.45),wing);
    if(n>0)stroke(`feather-pale-edge-${n}`,contour.map(p=>new T.Vector3(p.x+side*.001,p.y+.003,p.z)),.0015,C.wingLight.clone().lerp(C.white,.6),wing);
  });
  stroke('wing-leading-highlight',[[-.214,.516],[-.19,.568],[-.095,.601],[.023,.596]].map(([z,y])=>new T.Vector3(side*(wingX(z,wingY(y))+.004),wingY(y),z)),.0023,C.wingLight.clone().lerp(C.white,.42),wing);
}
function ellipsoid(name:string,center:T.Vector3,radii:T.Vector3,color:T.Color,parent:T.Object3D){
  // Used only for tiny eye details; the bird silhouette is authored above.
  const geometry=new T.SphereGeometry(1,12,8);geometry.scale(radii.x,radii.y,radii.z);geometry.translate(center.x,center.y,center.z);const colors:number[]=[];for(let j=0;j<geometry.attributes.position.count;j++)addColor(colors,color);geometry.setAttribute('color',new T.Float32BufferAttribute(colors,3));const m=new T.Mesh(geometry,paint);m.name=name;parent.add(m);return m;
}
function beak(parent:T.Object3D){
  const profile=[[-.452,.958,.04,.025],[-.48,.959,.039,.029],[-.527,.954,.033,.023],[-.579,.946,.021,.014],[-.61,.936,.003,.003]];
  const p:number[]=[],c:number[]=[],idx:number[]=[],n=16;
  for(const [z,y,w,h]of profile)for(let j=0;j<=n;j++){const a=j/n*Math.PI*2;p.push(Math.cos(a)*w,y+Math.sin(a)*h,z);addColor(c,C.gold.clone().lerp(C.goldLight,T.MathUtils.clamp(.45+Math.sin(a)*.5,0,1)));}
  for(let r=0;r<profile.length-1;r++)for(let j=0;j<n;j++){const a=r*(n+1)+j,b=a+n+1;idx.push(a,b,a+1,a+1,b,b+1);}mesh('tapered-curved-beak',p,idx,c,parent);
  for(const side of [-1,1]){
    stroke('bill-seam',[new T.Vector3(side*.036,.953,-.462),new T.Vector3(side*.033,.948,-.507),new T.Vector3(side*.023,.94,-.566),new T.Vector3(side*.009,.936,-.6)],.0015,new T.Color('#916b52'),parent);
    ellipsoid('small-nostril',new T.Vector3(side*.037,.966,-.491),new T.Vector3(.0015,.0022,.006),new T.Color('#aa7b53'),parent);
  }
}
function feet(parent:T.Object3D){
  for(const side of [-1,1]){
    const x=side*.069,z=side<0?-.035:-.115,leg=new T.Group();leg.name=side<0?'leg-left':'leg-right';parent.add(leg);
    stroke('slender-shin',[new T.Vector3(x,.282,z+.014),new T.Vector3(x,.173,z+.024),new T.Vector3(x,.033,z+.006)],.009,C.rose,leg);
    ellipsoid('ankle',new T.Vector3(x,.037,z+.005),new T.Vector3(.011,.015,.011),C.rose,leg);
    const outline=[[-.009,.02],[-.049,-.077],[-.029,-.065],[-.018,-.092],[.003,-.079],[.022,-.094],[.029,-.068],[.05,-.077],[.011,.02]];
    const positions:number[]=[x,.018,z-.025],colors:number[]=[],indices:number[]=[];addColor(colors,C.web);
    for(const [dx,dz]of outline){positions.push(x+dx,.012+(dz>.0?.01:0),z+dz);addColor(colors,C.web.clone().lerp(C.rose,.3));}
    for(let n=0;n<outline.length;n++)indices.push(0,n+1,(n+1)%outline.length+1);mesh('webbed-foot',positions,indices,colors,leg);
    for(const [dx,dz]of [[-.047,-.075],[.001,-.085],[.026,-.087]])stroke('toe-ridge',[new T.Vector3(x,.023,z+.004),new T.Vector3(x+dx*.65,.019,z+dz*.7),new T.Vector3(x+dx,.015,z+dz)],.0032,C.rose,leg);
  }
}
function tail(parent:T.Object3D){
  const p=[-.087,.29,.28,.087,.29,.28,-.097,.277,.585,.078,.278,.573,0,.27,.63],c:number[]=[],idx=[0,1,2,2,1,3,2,3,4];for(let n=0;n<5;n++)addColor(c,n<2?C.white:C.cool);mesh('tapered-white-tail',p,idx,c,parent);
}
export function createPerchedGull(){
  const root=new T.Group();root.name='reference-perched-gull';root.userData={assetVersion:1,pose:'perched-static',forward:'-Z',feetY:0,animationReady:false};
  const plumage=new T.Group();plumage.name='plumage';root.add(plumage);body(plumage);tail(plumage);foldedWing(-1,plumage);foldedWing(1,plumage);beak(plumage);feet(plumage);
  for(const side of [-1,1]){
    ellipsoid('black-eye',new T.Vector3(side*.105,.986,-.397),new T.Vector3(.0045,.015,.0135),new T.Color('#202830'),plumage);
    ellipsoid('eye-catchlight',new T.Vector3(side*.109,.991,-.401),new T.Vector3(.001,.002,.002),C.white,plumage);
  }
  root.updateMatrixWorld(true);return root;
}

// Keep source parts named for later rigging; merge only the export copy so the
// stationary review asset uses one material and a single draw call.
export function createPerchedGullExport(){
  const source=createPerchedGull(),parts:T.BufferGeometry[]=[];
  source.traverse(o=>{if(o instanceof T.Mesh){const g=o.geometry.index?o.geometry.toNonIndexed():o.geometry.clone();g.deleteAttribute('uv');parts.push(g.applyMatrix4(o.matrixWorld));}});
  const merged=mergeGeometries(parts,false);for(const p of parts)p.dispose();if(!merged)throw new Error('Could not assemble the perched gull surface.');
  const indexed=mergeVertices(merged,1e-5);merged.dispose();const result=new T.Group();result.name=source.name;result.userData={...source.userData};const m=new T.Mesh(indexed,paint);m.name='painted-perched-gull';m.castShadow=true;m.receiveShadow=true;result.add(m);return result;
}
