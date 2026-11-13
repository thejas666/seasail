import {mkdir,writeFile} from 'node:fs/promises';
import {GLTFExporter} from 'three/addons/exporters/GLTFExporter.js';
import {Mesh,Vector3} from 'three';
import {createPalmExport,PALM_VARIANTS} from '../src/assets/palm-tree';
import {createMossRock,createSandstone,createCoastalPlant} from '../src/assets/coastal-nature';
class BinaryFileReader{result:ArrayBuffer|null=null;onloadend:(()=>void)|null=null;readAsArrayBuffer(blob:Blob){void blob.arrayBuffer().then(buffer=>{this.result=buffer;this.onloadend?.();});}}
Object.assign(globalThis,{FileReader:BinaryFileReader});
await mkdir('public/assets/models',{recursive:true});
const models=[...PALM_VARIANTS.map(variant=>({name:`palm-${variant}`,model:createPalmExport(variant)})),{name:'moss-rock',model:createMossRock()},{name:'sandstone',model:createSandstone()},...(['grass','reeds','seedgrass'] as const).map(kind=>({name:`coastal-${kind}`,model:createCoastalPlant(kind)}))];
for(const {name,model}of models){model.traverse(o=>{if(o instanceof Mesh){const normals=o.geometry.getAttribute('normal'),p=new Vector3();for(let n=0;n<normals.count;n++){p.fromBufferAttribute(normals,n);if(p.lengthSq()<1e-10)p.set(0,1,0);else p.normalize();normals.setXYZ(n,p.x,p.y,p.z);}}});const glb=await new GLTFExporter().parseAsync(model,{binary:true,onlyVisible:true});if(!(glb instanceof ArrayBuffer))throw new Error('Expected a binary model.');await writeFile(`public/assets/models/${name}.glb`,Buffer.from(glb));console.log(`${name}.glb · ${Math.round(glb.byteLength/1024)} KB`);}
