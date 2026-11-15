import * as T from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {PICKUPS,type Island} from './data';
import {animeRockGeometry,animeRockMaterial,cliffSide,localHeight,pathDistance,rand,ruinsSite,slopeAt} from './environment';

// Anime-style island dressing: stepping stones along the route, overgrown ruins on the knoll, round
// leafy trees, bright bushes, and small rocks at the waterline.
type Obstacle={x:number;z:number;r:number};
const stone=new T.MeshStandardMaterial({color:'#c3c9e0',roughness:1,flatShading:true}),stoneDark=new T.MeshStandardMaterial({color:'#98a2c8',roughness:1,flatShading:true});
const bark=new T.MeshStandardMaterial({color:'#8a5a3c',roughness:1}),leaves=new T.MeshStandardMaterial({vertexColors:true,roughness:1});
function shaded(mesh:T.Mesh){mesh.castShadow=mesh.receiveShadow=true;return mesh;}
/** A clump of soft spheres coloured from a darker underside to a sunlit top. */
function foliage(blobs:[number,number,number,number][],low:string,high:string){
  const a=new T.Color(low),b=new T.Color(high),c=new T.Color(),parts=blobs.map(([x,y,z,r])=>{const g=new T.IcosahedronGeometry(r,2);g.scale(1,.86,1);g.translate(x,y,z);return g;}),merged=mergeGeometries(parts,false)!;
  merged.computeBoundingBox();const p=merged.attributes.position,min=merged.boundingBox!.min.y,span=merged.boundingBox!.max.y-min,colors=new Float32Array(p.count*3);
  for(let n=0;n<p.count;n++){c.copy(a).lerp(b,Math.pow((p.getY(n)-min)/span,.8));colors.set([c.r,c.g,c.b],n*3);}
  merged.setAttribute('color',new T.BufferAttribute(colors,3));for(const g of parts)g.dispose();return merged;
}
const block=(w:number,h:number,d:number,material:T.Material,parent:T.Object3D,x:number,y:number,z:number)=>{const m=shaded(new T.Mesh(new T.BoxGeometry(w,h,d),material));m.position.set(x,y+h/2,z);parent.add(m);return m;};
export function decorateAnimeIsland(i:Island,existing:Obstacle[]){
  const random=rand(i.id.split('').reduce((a,c)=>a*33+c.charCodeAt(0),11)),group=new T.Group(),obstacles:Obstacle[]=[],solids:T.Object3D[]=[],site=ruinsSite(i),dockX=i.dock[0]-i.x,dockZ=i.dock[1]-i.z;
  const area=T.MathUtils.clamp((i.radius/33)**2,.6,2);
  const nearPickup=(x:number,z:number,r:number)=>PICKUPS.some(p=>p.island===i.id&&Math.hypot(p.x-i.x-x,p.z-i.z-z)<r);
  const taken=(x:number,z:number,r:number)=>[...existing,...obstacles].some(o=>Math.hypot(x-o.x,z-o.z)<o.r+r);
  const landmark=(x:number,z:number)=>Math.hypot(x+6,z+5)<5||Math.hypot(x+12,z+12)<9||Math.hypot(x,z+8)<8||Math.hypot(x+4,z+4)<8||x>4&&z>10;

  // Stepping stones: down the strip from the jetty, then along the spur to the ruins.
  const route:[number,number][]=[];for(let z=dockZ-25;z>-4;z-=1.55)route.push([dockX+Math.sin(z*.14)*2,z]);
  {const ax=dockX+Math.sin(-4*.14)*2,bx=site.x+3.2,bz=site.z,steps=Math.ceil(Math.hypot(bx-ax,bz+4)/1.55);for(let n=1;n<=steps;n++)route.push([ax+(bx-ax)*n/steps,-4+(bz+4)*n/steps]);}
  const stones=new T.InstancedMesh(new T.DodecahedronGeometry(1,0),stoneDark,route.length*2),dummy=new T.Object3D();let count=0;
  for(const [px,pz] of route)for(let k=0;k<2;k++){if(k&&random()<.45)continue;const x=px+(k?.55:-.45)+(random()-.5)*.5,z=pz+(random()-.5)*.6,s=.34+random()*.2;dummy.position.set(x,localHeight(i,x,z)+.015,z);dummy.rotation.set(0,random()*6.28,0);dummy.scale.set(s*1.25,.07,s);dummy.updateMatrix();stones.setMatrixAt(count++,dummy.matrix);}
  stones.count=count;stones.receiveShadow=true;stones.computeBoundingSphere();group.add(stones);

  // Ruins: a broken archway, a ring of pillars, a fallen column, low walls and old paving.
  const ruins=new T.Group();ruins.position.set(site.x,0,site.z);ruins.rotation.y=random()*6.28;group.add(ruins);
  const world=(x:number,z:number)=>{const v=new T.Vector3(x,0,z).applyEuler(ruins.rotation);return {x:site.x+v.x,z:site.z+v.z};},ground=(x:number,z:number)=>{const w=world(x,z);return localHeight(i,w.x,w.z)-.12;};
  const solid=(x:number,z:number,r:number)=>{const w=world(x,z);obstacles.push({x:w.x,z:w.z,r});};
  for(const side of [-1,1]){const x=side*1.55,h=side<0?3.5:2.3,pillar=block(.78,h,.78,stone,ruins,x,ground(x,0),0);block(.95,.28,.95,stoneDark,ruins,x,ground(x,0),0);if(side<0)block(.95,.3,.95,stoneDark,ruins,x,ground(x,0)+h,0);else pillar.rotation.z=-.05;solid(x,0,.6);solids.push(pillar);}
  const lintel=block(2.5,.55,.85,stone,ruins,-.75,ground(-1.55,0)+3.8,0);lintel.rotation.z=-.06;const fallen=block(1.7,.55,.85,stoneDark,ruins,2.9,ground(2.9,.9)-.05,.9);fallen.rotation.set(.2,.5,.12);solid(2.9,.9,.9);
  for(const [a,h] of [[1.1,2.9],[2.5,1.3],[3.9,3.3],[5.3,.8]] as const){const x=Math.cos(a)*4.3,z=Math.sin(a)*4.3,column=shaded(new T.Mesh(new T.CylinderGeometry(.36,.42,h,8),stone));column.position.set(x,ground(x,z)+h/2,z);column.rotation.set((random()-.5)*.08,random(),(random()-.5)*.08);ruins.add(column);block(.95,.24,.95,stoneDark,ruins,x,ground(x,z),z);if(h>2.5)block(.9,.26,.9,stoneDark,ruins,x,ground(x,z)+h,z);solid(x,z,.55);solids.push(column);}
  {const x=-3.2,z=-2.6,column=shaded(new T.Mesh(new T.CylinderGeometry(.36,.36,2.7,8),stone));column.position.set(x,ground(x,z)+.42,z);column.rotation.set(0,.7,Math.PI/2);ruins.add(column);solid(x,z,1.1);}
  for(const [x,z,ry,w] of [[-1.2,3.6,.25,2.6],[1.7,3.3,-.2,1.7],[-4.1,1.2,1.35,2.1]] as const){const wall=block(w,.5+random()*.6,.6,stone,ruins,x,ground(x,z),z);wall.rotation.y=ry;block(w*.5,.32,.6,stoneDark,ruins,x+.3,wall.position.y+(wall.geometry as T.BoxGeometry).parameters.height/2,z).rotation.y=ry;solid(x,z,w*.42);}
  for(let n=0;n<9;n++){const a=n*2.4,d=.6+random()*2.6,x=Math.cos(a)*d,z=Math.sin(a)*d,slab=block(.8+random()*.5,.08,.7+random()*.4,stoneDark,ruins,x,ground(x,z)+.1,z);slab.rotation.y=random()*.6;slab.castShadow=false;}

  // Round leafy trees in small groups; about one in five is golden.
  for(let attempt=0,placed=0;attempt<600&&placed<Math.round(6*area);attempt++){
    const a=random()*6.28,d=.2+random()*.5,x=Math.cos(a)*i.radius*d,z=Math.sin(a)*i.radius*d;
    if(pathDistance(i,x,z)<4||Math.hypot(x-site.x,z-site.z)<8.5||landmark(x,z)||nearPickup(x,z,4.5)||taken(x,z,3.2)||slopeAt(i,x,z)>.45)continue;
    const golden=placed%5===3,h=2.6+random()*1.4,size=1.5+random()*.7,tree=new T.Group();tree.position.set(x,localHeight(i,x,z)-.1,z);tree.rotation.y=random()*6.28;
    const trunk=shaded(new T.Mesh(new T.CylinderGeometry(.17,.32,h,7),bark));trunk.position.y=h/2;trunk.rotation.z=(random()-.5)*.16;tree.add(trunk);
    for(const side of [-1,1]){const branch=shaded(new T.Mesh(new T.CylinderGeometry(.07,.13,1.3,5),bark));branch.position.set(side*.42,h*.8,0);branch.rotation.z=-side*.85;tree.add(branch);}
    const canopy=shaded(new T.Mesh(foliage([[0,h+size*.5,0,size],[size*.75,h+size*.15,.2,size*.72],[-size*.7,h+size*.2,-.25,size*.7],[.1,h+size*.2,size*.7,size*.66],[-.15,h+size*.1,-size*.7,size*.62],[size*.2,h+size*1.05,-.1,size*.6]],golden?'#d99a1c':'#2f9a34',golden?'#ffe75a':'#a8e63c'),leaves));tree.add(canopy);
    group.add(tree);obstacles.push({x,z,r:.4});solids.push(trunk);placed++;
  }
  // Bushes along the meadow's edges and around rocks.
  for(let attempt=0,placed=0;attempt<700&&placed<Math.round(18*area);attempt++){
    const a=random()*6.28,d=.22+random()*.6,x=Math.cos(a)*i.radius*d,z=Math.sin(a)*i.radius*d;
    if(pathDistance(i,x,z)<2.6||Math.hypot(x-site.x,z-site.z)<3.5||landmark(x,z)&&Math.hypot(x,z)<i.radius*.45||nearPickup(x,z,2.8)||slopeAt(i,x,z)>.8||x>4&&z>10)continue;
    const s=.55+random()*.5,yellow=placed%6===4,bush=shaded(new T.Mesh(foliage([[0,s*.55,0,s],[s*.8,s*.4,.1,s*.7],[-s*.7,s*.4,-.2,s*.66],[.1,s*.45,s*.7,s*.6]],yellow?'#c9a418':'#3da22f',yellow?'#f6e04a':'#9fe33a'),leaves));
    bush.position.set(x,localHeight(i,x,z)-.08,z);bush.rotation.y=random()*6.28;group.add(bush);placed++;
  }
  // The sea cliff: a wall of tall boulders along the foot of the bluff on the far side from the jetty.
  for(let n=0,total=Math.round(i.radius*.75);n<total;n++){
    const a=Math.atan2(-.8,-.6)+(n/(total-1)-.5)*1.5+(random()-.5)*.05,face=cliffSide(Math.cos(a),Math.sin(a));if(face<.25)continue;
    const d=.955+random()*.02,x=Math.cos(a)*i.radius*d,z=Math.sin(a)*i.radius*d,s=(1.7+random()*1.5)*(.6+.4*face),top=localHeight(i,Math.cos(a)*i.radius*.9,Math.sin(a)*i.radius*.9);
    const rock=shaded(new T.Mesh(animeRockGeometry(n%6),animeRockMaterial()));rock.position.set(x,localHeight(i,x,z)+top*.28,z);rock.scale.set(s*1.15,top*.62*(.85+random()*.3),s);rock.rotation.y=a+random()*.8;group.add(rock);obstacles.push({x,z,r:s*.8});
  }
  // Small rocks scattered at the waterline, clear of the jetty.
  for(let n=0;n<Math.round(14*Math.sqrt(area));n++){
    const a=random()*6.28,d=.95+random()*.08,x=Math.cos(a)*i.radius*d,z=Math.sin(a)*i.radius*d;if(Math.abs(x-dockX)<8&&z>0)continue;
    const s=.3+random()*.55,rock=shaded(new T.Mesh(animeRockGeometry(n%6),animeRockMaterial()));rock.position.set(x,localHeight(i,x,z)-.08,z);rock.scale.set(s,s*.7,s);rock.rotation.y=random()*6.28;group.add(rock);
  }
  return {group,obstacles,solids};
}
