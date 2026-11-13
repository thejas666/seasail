type Link={a:number;b:number;length:number};
/** Small Verlet cloth membrane. The luff and boom stay attached to their rigging. */
export class SailCloth {
  readonly rest:Float32Array;readonly previous:Float32Array;readonly fixed:Uint8Array;readonly links:Link[]=[];accumulator=0;
  constructor(public positions:Float32Array,public rows:number,public columns:number){
    this.rest=positions.slice();this.previous=positions.slice();this.fixed=new Uint8Array(positions.length/3);
    const link=(a:number,b:number)=>{const n=a*3,m=b*3,length=Math.hypot(this.rest[n]-this.rest[m],this.rest[n+1]-this.rest[m+1],this.rest[n+2]-this.rest[m+2]);if(length>1e-5)this.links.push({a,b,length});};
    for(let row=0;row<=rows;row++)for(let col=0;col<=columns;col++){const a=row*(columns+1)+col;this.fixed[a]=row===0||row===rows||col===0?1:0;if(col<columns)link(a,a+1);if(row<rows)link(a,a+columns+1);if(row<rows&&col<columns){link(a,a+columns+2);link(a+1,a+columns+1);}if(col<columns-1)link(a,a+2);if(row<rows-1)link(a,a+2*(columns+1));}
  }
  advance(dt:number,time:number,speed:number,heading:number,storm:number,low=false,reduced=false){
    if(reduced){this.positions.set(this.rest);this.previous.set(this.rest);this.accumulator=0;return;}
    const step=low?1/30:1/60;this.accumulator=Math.min(this.accumulator+dt,.1);
    while(this.accumulator>=step){this.integrate(step,time,speed,heading,storm,low?3:5);this.accumulator-=step;}
  }
  private integrate(dt:number,time:number,speed:number,heading:number,storm:number,iterations:number){
    const p=this.positions,previous=this.previous,rest=this.rest,wind=(1.8+Math.abs(speed)*.24+storm*1.2)*(.7+Math.abs(Math.cos(heading))*.3);
    for(let vertex=0;vertex<this.fixed.length;vertex++){
      const n=vertex*3;if(this.fixed[vertex])continue;
      const gust=1+Math.sin(time*1.8+rest[n+2]*1.6)*.4+Math.sin(time*4.1+rest[n+1]*2.3)*.18;
      for(let axis=0;axis<3;axis++){const index=n+axis,current=p[index],inertia=(current-previous[index])*.975;previous[index]=current;const force=axis===0?wind*gust:axis===1?-.65:Math.sin(time*2+rest[n+1])*.15;p[index]=current+inertia+force*dt*dt;}
    }
    for(let iteration=0;iteration<iterations;iteration++){
      for(const link of this.links){const a=link.a*3,b=link.b*3,dx=p[b]-p[a],dy=p[b+1]-p[a+1],dz=p[b+2]-p[a+2],distance=Math.hypot(dx,dy,dz);if(distance<1e-6)continue;const total=(this.fixed[link.a]?0:1)+(this.fixed[link.b]?0:1);if(!total)continue;const correction=(distance-link.length)/distance/total;if(!this.fixed[link.a]){p[a]+=dx*correction;p[a+1]+=dy*correction;p[a+2]+=dz*correction;}if(!this.fixed[link.b]){p[b]-=dx*correction;p[b+1]-=dy*correction;p[b+2]-=dz*correction;}}
      for(let vertex=0;vertex<this.fixed.length;vertex++)if(this.fixed[vertex]){const n=vertex*3;p[n]=rest[n];p[n+1]=rest[n+1];p[n+2]=rest[n+2];}
    }
  }
}
