const smooth=(a:number,b:number,x:number)=>{const t=Math.max(0,Math.min(1,(x-a)/(b-a)));return t*t*(3-2*t);};
export function daylightAt(seconds:number){const phase=(seconds%1080)/1080;const night=smooth(.49,.65,phase)*(1-smooth(.88,1,phase));const sunset=Math.max(0,1-Math.abs(phase-.55)/.13)*(1-night*.7);return {night,sunset};}
