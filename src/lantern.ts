import * as T from 'three';
import {spring} from './systems/physics';
const brass=new T.MeshStandardMaterial({color:'#b58b4b',roughness:.7,metalness:.15}),dark=new T.MeshStandardMaterial({color:'#65543a',roughness:.85});
export class BoatLantern {
  root=new T.Group();light=new T.PointLight('#ffd183',.3,11,2);flame:T.Mesh;roll=0;rollVelocity=0;pitch=0;pitchVelocity=0;
  constructor(boat:T.Group){
    const part=(geometry:T.BufferGeometry,material:T.Material,x:number,y:number,z:number)=>{const mesh=new T.Mesh(geometry,material);mesh.position.set(x,y,z);mesh.castShadow=false;this.root.add(mesh);return mesh;};
    this.root.position.set(-1.15,2.5,.9);boat.add(this.root);
    part(new T.TorusGeometry(.11,.016,6,20,Math.PI),brass,0,-.23,0);part(new T.TorusGeometry(.037,.011,5,14),dark,0,-.075,0);
    part(new T.CylinderGeometry(.19,.21,.075,12),dark,0,-.76,0);part(new T.CylinderGeometry(.14,.19,.07,12),brass,0,-.7,0);part(new T.ConeGeometry(.22,.15,12),brass,0,-.3,0);part(new T.CylinderGeometry(.045,.07,.06,10),dark,0,-.2,0);
    for(const x of [-.135,.135])for(const z of [-.135,.135])part(new T.CylinderGeometry(.014,.018,.38,6),brass,x,-.52,z);
    const glass=new T.MeshStandardMaterial({color:'#ffe8b4',transparent:true,opacity:.22,roughness:.25,side:T.DoubleSide,depthWrite:false});for(const side of [-1,1]){part(new T.BoxGeometry(.26,.34,.012),glass,0,-.51,side*.143);part(new T.BoxGeometry(.012,.34,.26),glass,side*.143,-.51,0);}
    part(new T.CylinderGeometry(.045,.06,.06,10),brass,0,-.65,0);const flameMaterial=new T.MeshBasicMaterial({color:'#ffe6a0'});this.flame=part(new T.SphereGeometry(.07,10,7),flameMaterial,0,-.53,0);this.flame.scale.set(.55,1.3,.55);this.light.position.set(0,-.5,0);this.root.add(this.light);
    const post=new T.Mesh(new T.CylinderGeometry(.035,.045,1.45,8),dark);post.position.set(-1.4,1.76,.9);boat.add(post);const hook=new T.Mesh(new T.TubeGeometry(new T.CatmullRomCurve3([new T.Vector3(-1.4,2.46,.9),new T.Vector3(-1.34,2.57,.9),new T.Vector3(-1.15,2.56,.9),new T.Vector3(-1.15,2.5,.9)]),12,.023,6,false),brass);boat.add(hook);
  }
  update(dt:number,time:number,roll:number,pitch:number,night:number,reduced:boolean){const r=spring(this.roll,this.rollVelocity,reduced?0:-roll*.8+Math.sin(time*.7)*.015,dt,16,5);this.roll=r.value;this.rollVelocity=r.velocity;const p=spring(this.pitch,this.pitchVelocity,reduced?0:-pitch*.8,dt,16,5);this.pitch=p.value;this.pitchVelocity=p.velocity;this.root.rotation.set(this.pitch,0,this.roll);const flicker=reduced?1:1+Math.sin(time*9)*.025+Math.sin(time*13.3)*.015;this.flame.scale.y=1.3*flicker;this.light.intensity=(.3+night*5)*flicker;}
}
