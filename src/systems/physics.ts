export type SailingMotion={heading:number;speed:number;turnRate:number};
export function advanceSailing(m:SailingMotion,throttle:number,rudder:number,dt:number,reinforced:boolean,anchored:boolean):SailingMotion {
  const max=reinforced?5.2:4.5;
  const target=anchored?0:throttle*(throttle<0?1.8:max);
  const acceleration=anchored?3.4:throttle===0?.5:.85;
  const speed=m.speed+Math.max(-acceleration*dt,Math.min(acceleration*dt,target-m.speed));
  const control=anchored?0:Math.min(1,.22+Math.abs(speed)/max);
  const turnTarget=rudder*.62*control*(speed<-.2?-1:1);
  const turnRate=m.turnRate+(turnTarget-m.turnRate)*(1-Math.exp(-dt*3));
  return {heading:m.heading+turnRate*dt,speed:Math.abs(speed)<.025?0:speed,turnRate};
}
export function waveHeight(x:number,z:number,t:number){return Math.sin(x*.09+t*.8)*.17+Math.cos(z*.065+t*.65)*.18+Math.sin(x*.26-z*.18+t*1.4)*.055;}
export function waterPose(x:number,z:number,heading:number,t:number){
  const sx=Math.sin(heading),cz=Math.cos(heading),height=waveHeight(x,z,t);
  const bow=waveHeight(x-sx*2.5,z-cz*2.5,t),stern=waveHeight(x+sx*2.5,z+cz*2.5,t);
  const port=waveHeight(x-cz*1.3,z+sx*1.3,t),starboard=waveHeight(x+cz*1.3,z-sx*1.3,t);
  return {height,pitch:Math.atan2(stern-bow,5),roll:Math.atan2(port-starboard,2.6)};
}
export function spring(value:number,velocity:number,target:number,dt:number,stiffness=18,damping=7){const nextVelocity=velocity+((target-value)*stiffness-velocity*damping)*dt;return {value:value+nextVelocity*dt,velocity:nextVelocity};}
export function advanceJump(height:number,velocity:number,dt:number){const nextVelocity=velocity-12*dt;const nextHeight=height+nextVelocity*dt;return nextHeight<=0?{height:0,velocity:0}:{height:nextHeight,velocity:nextVelocity};}
