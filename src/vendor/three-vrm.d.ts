// Minimal types for the vendored @pixiv/three-vrm build (MIT, see THREE-VRM-LICENSE.txt).
import type {Object3D,Group} from 'three';
export class VRMLoaderPlugin{constructor(parser:unknown,options?:unknown);name:string;}
export interface VRM{scene:Group;meta:{metaVersion?:string};humanoid:{getNormalizedBoneNode(name:string):Object3D|null};update(delta:number):void;}
export const VRMUtils:{rotateVRM0(vrm:VRM):void;removeUnnecessaryVertices(root:Object3D):void;combineSkeletons(root:Object3D):void;deepDispose(root:Object3D):void};
