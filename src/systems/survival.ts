import type {GameState} from '../state';
export function tickSurvival(s:GameState,dt:number){s.playTime+=dt;s.nourishment=Math.max(0,s.nourishment-dt*.035);}
export function recoverBoat(s:GameState){if(s.condition>0)return false;s.condition=65;return true;}
