import {mkdir,writeFile} from 'node:fs/promises';
import {GLTFExporter} from 'three/addons/exporters/GLTFExporter.js';
import {createPerchedGullExport} from '../src/assets/perched-gull';

// GLTFExporter uses the browser FileReader API to assemble its binary Blob.
// No image/canvas emulation is needed: all plumage colors are vertex painted.
class BinaryFileReader {
  result:ArrayBuffer|null=null;
  onloadend:(()=>void)|null=null;
  readAsArrayBuffer(blob:Blob){void blob.arrayBuffer().then(buffer=>{this.result=buffer;this.onloadend?.();});}
}
Object.assign(globalThis,{FileReader:BinaryFileReader});
const asset=await new GLTFExporter().parseAsync(createPerchedGullExport(),{binary:true,onlyVisible:true});
if(!(asset instanceof ArrayBuffer))throw new Error('Expected a binary glTF model.');
await mkdir('public/assets/models',{recursive:true});
await writeFile('public/assets/models/perched-gull.glb',Buffer.from(asset));
console.log(`Exported perched-gull.glb (${Math.round(asset.byteLength/1024)} KB), static vertex-painted mesh.`);
