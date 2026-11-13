import {Vector3} from 'three';

// Boat-local coordinates. Keep the head/hat to port of the sail and the boots
// behind the bench. The grip is reachable from the left shoulder at this stance.
export const HELM_STANCE=new Vector3(-.78,1.066,2.34);
export const TILLER_BASE=new Vector3(0,1.98,2.9);
export const TILLER_GRIP=new Vector3(-.42,1.98,2.17);
export const HELM_EYE=HELM_STANCE.clone().add(new Vector3(0,1.64,-.08));
