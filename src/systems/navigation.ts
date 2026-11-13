import {WORLD_SCALE,type Island} from '../data';
import type {GameState} from '../state';
export const CHANNEL_Z=-400*WORLD_SCALE;
export function canEnterChannel(s:GameState){return s.chart&&s.reinforced;}
export function walkable(x:number,z:number,i:Island){return Math.hypot(x-i.x,z-i.z)<i.radius-1||(Math.abs(x-i.dock[0])<3&&z>i.z&&z<i.dock[1]-3);}
