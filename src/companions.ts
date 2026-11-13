import * as T from 'three';
const white=new T.MeshStandardMaterial({color:'#f5f1df',roughness:1}),grey=new T.MeshStandardMaterial({color:'#869da0',roughness:1,side:T.DoubleSide}),orange=new T.MeshStandardMaterial({color:'#daa853',roughness:1});
const bodyGeometry=new T.SphereGeometry(1,10,7);
function gull(){
  const g=new T.Group();const body=new T.Mesh(bodyGeometry,white);body.scale.set(.24,.22,.42);g.add(body);
  const head=new T.Mesh(bodyGeometry,white);head.position.set(0,.22,-.25);head.scale.setScalar(.18);g.add(head);
  const beak=new T.Mesh(new T.ConeGeometry(.06,.23,6),orange);beak.rotation.x=-Math.PI/2;beak.position.set(0,.21,-.48);g.add(beak);
  const wings:T.Group[]=[];for(const side of [-1,1]){const wing=new T.Group();const shape=new T.Shape();shape.moveTo(0,0);shape.quadraticCurveTo(side*.75,.25,side*1,.1);shape.lineTo(side*.52,-.21);shape.lineTo(0,-.12);const mesh=new T.Mesh(new T.ShapeGeometry(shape),grey);mesh.rotation.x=-Math.PI/2;wing.position.set(side*.15,.05,.02);wing.add(mesh);g.add(wing);wings.push(wing);}
  g.userData.wings=wings;return g;
}
export class Seabirds {
  birds:T.Group[]=[];perchBlend=0;
  constructor(scene:T.Scene){for(let j=0;j<9;j++){const b=gull();b.scale.setScalar(j<2?.75:.6);scene.add(b);this.birds.push(b);}}
  update(time:number,dt:number,boat:T.Group,speed:number,storm:number,reduced:boolean){
    const rest=Math.abs(speed)<1.4&&storm<.25&&(time%95>18&&time%95<72);
    this.perchBlend=T.MathUtils.damp(this.perchBlend,rest?1:0,1.1,dt);
    boat.updateMatrixWorld();
    for(const [j,b]of this.birds.entries()){
      const a=time*(.12+j*.008)+j*1.8,r=12+j*2.8;
      const target=new T.Vector3(boat.position.x+Math.sin(a)*r,8+(j%3)*4+Math.sin(a*2)*1.3,boat.position.z+Math.cos(a)*r);
      if(j<2){const perch=boat.localToWorld(new T.Vector3(j===0?-1.35:1.3,1.65,j===0?1.8:-1.65));target.lerp(perch,this.perchBlend);}
      b.position.lerp(target,Math.min(1,dt*4));b.rotation.y=j<2&&this.perchBlend>.85?boat.rotation.y+.4:Math.atan2(Math.cos(a),-Math.sin(a));
      const flap=reduced?0:Math.sin(time*6+j)*.55*(j<2?1-this.perchBlend:1);(b.userData.wings as T.Group[]).forEach((wing,k)=>wing.rotation.z=(k?1:-1)*(flap+(j<2?this.perchBlend*.9:0)));
    }
  }
}
