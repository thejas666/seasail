import type {GameState} from '../state';
export type Fishing={phase:'waiting'|'bite'|'caught'|'missed';timer:number;fish:number};
export function tickFishing(f:Fishing,dt:number):'unchanged'|'changed'|'finished'{
  f.timer-=dt;if(f.timer>0)return 'unchanged';
  if(f.phase==='waiting'){f.phase='bite';f.timer=3.5;return 'changed';}
  if(f.phase==='bite'){f.phase='missed';f.timer=3.5;return 'changed';}
  return 'finished';
}
export function catchFish(s:GameState,f:Fishing){
  if(f.phase!=='bite')return null;
  s.inventory.fish++;const discovered=!s.fishJournal.includes(f.fish);if(discovered)s.fishJournal.push(f.fish);
  f.phase='caught';f.timer=4;return {discovered,fish:f.fish};
}
