const smooth=(a:number,b:number,x:number)=>{const t=Math.max(0,Math.min(1,(x-a)/(b-a)));return t*t*(3-2*t);};
export function daylightAt(seconds:number){const phase=(seconds%1080)/1080;const night=smooth(.49,.65,phase)*(1-smooth(.88,1,phase));const sunset=Math.max(0,1-Math.abs(phase-.55)/.13)*(1-night*.7);return {night,sunset};}

/** Display-space RGB of the sky shader at the horizon (h=0). Scene fog and
 * ocean haze use the same value, including the dusk and storm transitions. */
export function horizonAt(night:number,sunset=0,storm=0):[number,number,number]{
  const clamp=(x:number)=>Math.max(0,Math.min(1,x)),mix=(a:number,b:number,t:number)=>a+(b-a)*t;
  const day=[.667,.796,.816],cloud=[.39,.49,.54],moon=[.08,.18,.27],warm=[.86,.57,.34];
  return day.map((v,n)=>mix(mix(mix(v,cloud[n],clamp(storm)*.72),moon[n],clamp(night)*.86),warm[n],clamp(sunset)*.45)) as [number,number,number];
}
export function seaFogDensity(night:number){return .0075+Math.max(0,Math.min(1,night))*.003;}
