import * as T from 'three';
import {PICKUPS,type Island} from './data';
import {animeBush,animeTree,BUSH_PALETTES,type AnimeTreeKind} from './anime-trees';
import {animeBlockGeometry,animeBoulderGeometry,animeColumnGeometry,animeSpireGeometry,animeStone,animeStoneMaterial} from './anime-rocks';
import {animeRockGeometry,animeRockMaterial,cliffSide,localHeight,pathDistance,rand,ruinsSite,slopeAt} from './environment';

// Anime-style island dressing: stepping stones along the route, overgrown ruins on the knoll, round
// painted leaf-card trees and bushes, and small rocks at the waterline.
type Obstacle={x:number;z:number;r:number};
const stone=new T.MeshStandardMaterial({color:'#c3c9e0',roughness:1,flatShading:true}),stoneDark=new T.MeshStandardMaterial({color:'#98a2c8',roughness:1,flatShading:true});
function shaded(mesh:T.Mesh){mesh.castShadow=mesh.receiveShadow=true;return mesh;}
// On the style test island the ruins are cut from the same carved stone as the pillars and boulders.
let carvedRuins=false,carvedCount=0;
const block=(w:number,h:number,d:number,material:T.Material,parent:T.Object3D,x:number,y:number,z:number)=>{
  const m=shaded(carvedRuins?new T.Mesh(animeBlockGeometry(carvedCount++%8,material===stoneDark?.84:1),animeStoneMaterial()):new T.Mesh(new T.BoxGeometry(w,h,d),material));
  if(carvedRuins){m.scale.set(w,h,d);m.userData.platform=true;}m.userData.h=h;m.position.set(x,y+h/2,z);parent.add(m);return m;};
const carvedColumn=(radiusTop:number,radiusBottom:number,h:number)=>{const m=shaded(carvedRuins?new T.Mesh(animeColumnGeometry(carvedCount++%6,radiusTop,radiusBottom,h),animeStoneMaterial()):new T.Mesh(new T.CylinderGeometry(radiusTop,radiusBottom,h,8),stone));if(carvedRuins)m.userData.platform=true;return m;};
export function decorateAnimeIsland(i:Island,existing:Obstacle[]){
  carvedRuins=i.id==='palm';carvedCount=0;
  const random=rand(i.id.split('').reduce((a,c)=>a*33+c.charCodeAt(0),11)),group=new T.Group(),obstacles:Obstacle[]=[],solids:T.Object3D[]=[],site=ruinsSite(i),dockX=i.dock[0]-i.x,dockZ=i.dock[1]-i.z;
  const area=T.MathUtils.clamp((i.radius/33)**2,.6,2);
  // Palm Island is the style test bed: carved stone pillars and boulders replace the rounded rocks.
  const carved=i.id==='palm';
  const nearPickup=(x:number,z:number,r:number)=>PICKUPS.some(p=>p.island===i.id&&Math.hypot(p.x-i.x-x,p.z-i.z-z)<r);
  const taken=(x:number,z:number,r:number)=>[...existing,...obstacles].some(o=>Math.hypot(x-o.x,z-o.z)<o.r+r);
  const landmark=(x:number,z:number)=>Math.hypot(x+6,z+5)<5||Math.hypot(x+12,z+12)<9||Math.hypot(x,z+8)<8||Math.hypot(x+4,z+4)<8||x>4&&z>10;

  // Stepping stones: down the strip from the jetty, then along the spur to the ruins.
  const route:[number,number][]=[];for(let z=dockZ-25;z>-4;z-=1.55)route.push([dockX+Math.sin(z*.14)*2,z]);
  {const ax=dockX+Math.sin(-4*.14)*2,bx=site.x+3.2,bz=site.z,steps=Math.ceil(Math.hypot(bx-ax,bz+4)/1.55);for(let n=1;n<=steps;n++)route.push([ax+(bx-ax)*n/steps,-4+(bz+4)*n/steps]);}
  const stones=carvedRuins?new T.InstancedMesh(animeBoulderGeometry(9,0),animeStoneMaterial(),route.length*2):new T.InstancedMesh(new T.DodecahedronGeometry(1,0),stoneDark,route.length*2),dummy=new T.Object3D();let count=0;
  for(const [px,pz] of route)for(let k=0;k<2;k++){if(k&&random()<.45)continue;const x=px+(k?.55:-.45)+(random()-.5)*.5,z=pz+(random()-.5)*.6,s=.34+random()*.2;dummy.position.set(x,localHeight(i,x,z)+(carvedRuins?-.03:.015),z);dummy.rotation.set(0,random()*6.28,0);if(carvedRuins)dummy.scale.set(s*.62,.1,s*.5);else dummy.scale.set(s*1.25,.07,s);dummy.updateMatrix();stones.setMatrixAt(count++,dummy.matrix);}
  stones.count=count;stones.receiveShadow=true;stones.computeBoundingSphere();group.add(stones);

  // Ruins: a broken archway, a ring of pillars, a fallen column, low walls and old paving.
  const ruins=new T.Group();ruins.position.set(site.x,0,site.z);ruins.rotation.y=random()*6.28;group.add(ruins);
  const world=(x:number,z:number)=>{const v=new T.Vector3(x,0,z).applyEuler(ruins.rotation);return {x:site.x+v.x,z:site.z+v.z};},ground=(x:number,z:number)=>{const w=world(x,z);return localHeight(i,w.x,w.z)-.12;};
  const solid=(x:number,z:number,r:number)=>{const w=world(x,z);obstacles.push({x:w.x,z:w.z,r});};
  for(const side of [-1,1]){const x=side*1.55,h=side<0?3.5:2.3,pillar=block(.78,h,.78,stone,ruins,x,ground(x,0),0);block(.95,.28,.95,stoneDark,ruins,x,ground(x,0),0);if(side<0)block(.95,.3,.95,stoneDark,ruins,x,ground(x,0)+h,0);else pillar.rotation.z=-.05;solid(x,0,.6);solids.push(pillar);}
  const lintel=block(2.5,.55,.85,stone,ruins,-.75,ground(-1.55,0)+3.8,0);lintel.rotation.z=-.06;const fallen=block(1.7,.55,.85,stoneDark,ruins,2.9,ground(2.9,.9)-.05,.9);fallen.rotation.set(.2,.5,.12);solid(2.9,.9,.9);
  for(const [a,h] of [[1.1,2.9],[2.5,1.3],[3.9,3.3],[5.3,.8]] as const){const x=Math.cos(a)*4.3,z=Math.sin(a)*4.3,column=carvedColumn(.36,.42,h);column.position.set(x,ground(x,z)+h/2,z);column.rotation.set((random()-.5)*.08,random(),(random()-.5)*.08);ruins.add(column);block(.95,.24,.95,stoneDark,ruins,x,ground(x,z),z);if(h>2.5)block(.9,.26,.9,stoneDark,ruins,x,ground(x,z)+h,z);solid(x,z,.55);solids.push(column);}
  {const x=-3.2,z=-2.6,column=carvedColumn(.36,.36,2.7);column.position.set(x,ground(x,z)+.42,z);column.rotation.set(0,.7,Math.PI/2);ruins.add(column);solid(x,z,1.1);}
  for(const [x,z,ry,w] of [[-1.2,3.6,.25,2.6],[1.7,3.3,-.2,1.7],[-4.1,1.2,1.35,2.1]] as const){const wall=block(w,.5+random()*.6,.6,stone,ruins,x,ground(x,z),z);wall.rotation.y=ry;block(w*.5,.32,.6,stoneDark,ruins,x+.3,wall.position.y+(wall.userData.h as number)/2,z).rotation.y=ry;solid(x,z,w*.42);}
  for(let n=0;n<9;n++){const a=n*2.4,d=.6+random()*2.6,x=Math.cos(a)*d,z=Math.sin(a)*d,slab=block(.8+random()*.5,.08,.7+random()*.4,stoneDark,ruins,x,ground(x,z)+.1,z);slab.rotation.y=random()*.6;slab.castShadow=false;}

  // Painted meadow trees: wide deep-green hero trees with fresh and lime-green broadleaves between them.
  const meadowKinds:AnimeTreeKind[]=['green','deep','lime','green','deep','lime','green'];
  for(let attempt=0,placed=0;attempt<600&&placed<Math.round(6*area);attempt++){
    const a=random()*6.28,d=.2+random()*.5,x=Math.cos(a)*i.radius*d,z=Math.sin(a)*i.radius*d;
    if(pathDistance(i,x,z)<4||Math.hypot(x-site.x,z-site.z)<8.5||landmark(x,z)||nearPickup(x,z,4.5)||taken(x,z,4)||slopeAt(i,x,z)>.45)continue;
    const kind=meadowKinds[placed%meadowKinds.length],h=(kind==='deep'?5.4:4.3)+random()*1.3,{group:tree,trunk}=animeTree(kind,i.id.length*97+placed*13+attempt,h);
    tree.position.set(x,localHeight(i,x,z)-.1,z);tree.rotation.y=random()*6.28;group.add(tree);obstacles.push({x,z,r:.45});solids.push(trunk);placed++;
  }
  // Bushes along the meadow's edges and around rocks.
  for(let attempt=0,placed=0;attempt<700&&placed<Math.round(18*area);attempt++){
    const a=random()*6.28,d=.22+random()*.6,x=Math.cos(a)*i.radius*d,z=Math.sin(a)*i.radius*d;
    if(pathDistance(i,x,z)<2.6||Math.hypot(x-site.x,z-site.z)<3.5||landmark(x,z)&&Math.hypot(x,z)<i.radius*.45||nearPickup(x,z,2.8)||slopeAt(i,x,z)>.8||x>4&&z>10)continue;
    const s=.55+random()*.5,bush=animeBush(placed*17+i.id.length,s,BUSH_PALETTES.green);
    bush.position.set(x,localHeight(i,x,z)-.08,z);bush.rotation.y=random()*6.28;group.add(bush);placed++;
  }
  // The sea cliff: a wall of tall boulders along the foot of the bluff on the far side from the jetty.
  for(let n=0,total=Math.round(i.radius*.75);n<total;n++){
    const a=Math.atan2(-.8,-.6)+(n/(total-1)-.5)*1.5+(random()-.5)*.05,face=cliffSide(Math.cos(a),Math.sin(a));if(face<.25)continue;
    const d=.955+random()*.02,x=Math.cos(a)*i.radius*d,z=Math.sin(a)*i.radius*d,s=(1.7+random()*1.5)*(.6+.4*face),top=localHeight(i,Math.cos(a)*i.radius*.9,Math.sin(a)*i.radius*.9);
    if(carved){const h=top*.9+2+random()*4.5,pillar=animeStone(animeSpireGeometry(n%6,6,1,1.5));pillar.position.set(x,localHeight(i,x,z)-.3,z);pillar.scale.set(s*.72,h/6,s*.72);pillar.rotation.y=a+random()*.8;group.add(pillar);solids.push(pillar);obstacles.push({x,z,r:s*.9});continue;}
    const rock=shaded(new T.Mesh(animeRockGeometry(n%6),animeRockMaterial()));rock.position.set(x,localHeight(i,x,z)+top*.28,z);rock.scale.set(s*1.15,top*.62*(.85+random()*.3),s);rock.rotation.y=a+random()*.8;group.add(rock);obstacles.push({x,z,r:s*.8});
  }
  // Small rocks scattered at the waterline, clear of the jetty.
  for(let n=0;n<Math.round(14*Math.sqrt(area));n++){
    const a=random()*6.28,d=.95+random()*.08,x=Math.cos(a)*i.radius*d,z=Math.sin(a)*i.radius*d;if(Math.abs(x-dockX)<8&&z>0)continue;
    const s=.3+random()*.55,rock=carved?animeStone(animeBoulderGeometry(n%6,.5)):shaded(new T.Mesh(animeRockGeometry(n%6),animeRockMaterial()));rock.position.set(x,localHeight(i,x,z)-.08,z);rock.scale.set(s,s*.7,s);rock.rotation.y=random()*6.28;group.add(rock);
  }
  if(carved){
    // Tall stone pillars on the cliff side of the island, like sea stacks that ended up ashore.
    const back=Math.atan2(-.8,-.6);
    for(let attempt=0,placed=0;attempt<300&&placed<3;attempt++){
      const a=back+(random()-.5)*1.6,d=.6+random()*.22,x=Math.cos(a)*i.radius*d,z=Math.sin(a)*i.radius*d;
      if(pathDistance(i,x,z)<5||Math.hypot(x-site.x,z-site.z)<7||landmark(x,z)||nearPickup(x,z,5)||taken(x,z,3.5))continue;
      const h=10+random()*7,w=1.6+random()*.6,pillar=animeStone(animeSpireGeometry(placed+7,h,1,w));pillar.position.set(x,localHeight(i,x,z)-.4,z);pillar.rotation.y=random()*6.28;
      group.add(pillar);solids.push(pillar);obstacles.push({x,z,r:w*1.1});placed++;
    }
    // Carved boulders scattered through the meadow, some in pairs.
    for(let attempt=0,placed=0;attempt<300&&placed<7;attempt++){
      const a=random()*6.28,d=.25+random()*.55,x=Math.cos(a)*i.radius*d,z=Math.sin(a)*i.radius*d;
      if(pathDistance(i,x,z)<3||Math.hypot(x-site.x,z-site.z)<6||landmark(x,z)||nearPickup(x,z,3.5)||taken(x,z,2.2)||slopeAt(i,x,z)>.6)continue;
      const s=.8+random()*.9,rock=animeStone(animeBoulderGeometry(placed%6));rock.position.set(x,localHeight(i,x,z)-.15,z);rock.scale.setScalar(s);rock.rotation.y=random()*6.28;group.add(rock);solids.push(rock);obstacles.push({x,z,r:s*1.05});
      if(placed%2===0){const b=animeStone(animeBoulderGeometry(placed%6+3,.8)),bx=x+Math.cos(a+1.4)*s*1.4,bz=z+Math.sin(a+1.4)*s*1.4;b.position.set(bx,localHeight(i,bx,bz)-.1,bz);b.scale.setScalar(s*.45);b.rotation.y=random()*6.28;group.add(b);}
      placed++;
    }
  }
  return {group,obstacles,solids};
}
