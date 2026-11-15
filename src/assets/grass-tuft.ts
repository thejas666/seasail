import * as T from 'three';

// The explorer is about 2.08 m to the hat; the field grass reaches 75% of that.
export const COASTAL_GRASS_HEIGHT=1.56;
export const GRASS_FIELD_COUNT=1400;
export const GRASS_FIELD_LOW_COUNT=500;
// Vertex colours are only a brightness ramp: the root matches the grain-textured ground (about .87 in
// linear light) and the tips catch more sun. Each tuft's hue comes from the floor colour beneath it.
const cache=new Map<number,T.BufferGeometry>();
export function grassTuftGeometry(steps=8){
  if(cache.has(steps))return cache.get(steps)!;
  const positions:number[]=[],colors:number[]=[],indices:number[]=[],heightScale=COASTAL_GRASS_HEIGHT/(1.16*.87);
  for(let n=0;n<15;n++){
    const angle=n*2.399,length=.7+(n%5)*.115,reach=.20+(n%4)*.12,width=.055+(n%3)*.017,base=positions.length/3,root=.04+(n%4)*.025;
    for(let k=0;k<=steps;k++){const t=k/steps,y=(t*length-t*t*t*length*.13)*heightScale,r=t*t*reach,half=Math.sin(t*Math.PI)*width;for(const u of [-1,0,1]){positions.push(Math.sin(angle)*(r+root)+Math.cos(angle)*u*half,y+(u===0?.025*Math.sin(t*Math.PI):0),Math.cos(angle)*(r+root)-Math.sin(angle)*u*half);const ramp=Math.pow(t,1.5)*.6,side=u<0?1.04:u>0?.94:1;colors.push(.87*side*(1+ramp*.75),.87*side*(1+ramp*.6),.87*side*(1+ramp*.3));}}
    for(let k=0;k<steps;k++)for(let j=0;j<2;j++){const a=base+k*3+j,b=a+3;indices.push(a,b,a+1,a+1,b,b+1);}
  }
  const geometry=new T.BufferGeometry();geometry.name='reference-coastal-grass-tuft';geometry.setAttribute('position',new T.Float32BufferAttribute(positions,3));geometry.setAttribute('color',new T.Float32BufferAttribute(colors,3));geometry.setIndex(indices);geometry.computeVertexNormals();geometry.computeBoundingBox();cache.set(steps,geometry);return geometry;
}
