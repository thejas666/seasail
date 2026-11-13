export type CircleObstacle={x:number;z:number;r:number};
export type BoxObstacle={x:number;z:number;hx:number;hz:number;angle?:number};
export function blockedAt(x:number,z:number,circles:CircleObstacle[],boxes:BoxObstacle[],radius=.35){
  if(circles.some(o=>Math.hypot(x-o.x,z-o.z)<o.r+radius))return true;
  return boxes.some(o=>{const a=o.angle??0,dx=x-o.x,dz=z-o.z,lx=dx*Math.cos(a)-dz*Math.sin(a),lz=dx*Math.sin(a)+dz*Math.cos(a);const cx=Math.max(-o.hx,Math.min(o.hx,lx)),cz=Math.max(-o.hz,Math.min(o.hz,lz));return Math.hypot(lx-cx,lz-cz)<radius;});
}
