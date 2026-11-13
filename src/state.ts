import { COST, MAP, PICKUPS, type Inventory, type Resource } from './data';
export const SAVE_KEY = 'seasurvival.sunhaven.v1';
export const SETTINGS_KEY = 'seasurvival.settings.v1';
export type Settings = {volume: number; sensitivity: number; reducedMotion: boolean; lowGraphics: boolean};
export function readSettings(fallback:Settings):Settings {
  try{const raw=localStorage.getItem(SETTINGS_KEY);if(!raw)return fallback;const s=JSON.parse(raw);return {volume:typeof s.volume==='number'&&Number.isFinite(s.volume)?Math.max(0,Math.min(1,s.volume)):fallback.volume,sensitivity:typeof s.sensitivity==='number'&&Number.isFinite(s.sensitivity)?Math.max(.3,Math.min(2,s.sensitivity)):fallback.sensitivity,reducedMotion:typeof s.reducedMotion==='boolean'?s.reducedMotion:fallback.reducedMotion,lowGraphics:typeof s.lowGraphics==='boolean'?s.lowGraphics:fallback.lowGraphics};}catch{return fallback;}
}
export function saveSettings(s:Settings){try{localStorage.setItem(SETTINGS_KEY,JSON.stringify(s));return true;}catch{return false;}}
export type GameState = {
  version:1; map:string; inventory:Inventory; collected:Record<string,number>; visited:string[];
  discovered:string[]; fishJournal:number[]; rod:boolean; chart:boolean; reinforced:boolean;
  nourishment:number; condition:number; lastDock:string; completed:boolean; squallDone:boolean;
  playTime:number; settings:Settings;
};
export const freshState = ():GameState => ({version:1,map:MAP.id,inventory:{wood:0,fiber:0,scrap:0,fruit:2,fish:0,shell:0},collected:{},visited:['palm'],discovered:['palm'],fishJournal:[],rod:false,chart:false,reinforced:false,nourishment:100,condition:100,lastDock:'palm',completed:false,squallDone:false,playTime:0,settings:{volume:.35,sensitivity:1,reducedMotion:false,lowGraphics:false}});
export function canUpgrade(s:GameState) { return !s.reinforced && Object.entries(COST).every(([k,n])=>s.inventory[k as Resource]>=n); }
export function upgrade(s:GameState) { if(!canUpgrade(s))return false; for(const [k,n] of Object.entries(COST))s.inventory[k as Resource]-=n; s.reinforced=true; return true; }
export function eat(s:GameState,type:'fruit'|'fish') {if(s.inventory[type]<1 || s.nourishment>=100)return false;s.inventory[type]--;s.nourishment=Math.min(100,s.nourishment+(type==='fish'?35:24));return true;}
export function repair(s:GameState) {if(s.inventory.wood<1 || s.condition>=100)return false;s.inventory.wood--;s.condition=Math.min(100,s.condition+30);return true;}
export function available(s:GameState,id:string) {
  const p=PICKUPS.find(p=>p.id===id); if(!p)return false;
  if(s.collected[id]===undefined)return true;
  return ['wood','fiber','fruit'].includes(p.type) && s.playTime-s.collected[id]>=150;
}
export function collect(s:GameState,id:string) {
  if(!available(s,id))return false;
  const p=PICKUPS.find(p=>p.id===id)!;
  if(p.type==='rod')s.rod=true; else if(p.type==='chart')s.chart=true; else s.inventory[p.type]+=p.amount;
  s.collected[id]=s.playTime;return true;
}
export function objective(s:GameState):{title:string;detail:string;island:string} {
  if(s.completed)return {title:'The ocean is still yours',detail:'Revisit your favorite places. There’s no hurry.',island:'shell'};
  if(!s.rod)return {title:'A little preparation',detail:'Step ashore at Palm Island. Gather supplies and find the fishing rod.',island:'palm'};
  if(!s.reinforced && (s.inventory.wood<4 || s.inventory.fiber<4))return {title:'Make yourself at home',detail:'Gather 4 driftwood and 4 palm fiber for a stronger boat.',island:'palm'};
  if(!s.reinforced && s.inventory.scrap<2)return {title:'Something worth salvaging',detail:'Sail northeast to Wreck Island. Find 2 pieces of salvaged metal.',island:'wreck'};
  if(!s.reinforced)return {title:'Ready for bigger waters',detail:'Return aboard and reinforce your boat in the journal.',island:s.lastDock};
  if(!s.chart)return {title:'A view of what’s ahead',detail:'Sail northwest to Lookout Island and find the harbor chart.',island:'lookout'};
  return {title:'Follow the lighthouse',detail:'Your boat is ready. Sail northeast through the buoys to Sunhaven.',island:'harbor'};
}
export function parseSave(raw:string):GameState {
  const x=JSON.parse(raw);
  const ids=MAP.islands.map(i=>i.id);
  const finite=(v:unknown)=>typeof v==='number'&&Number.isFinite(v)&&v>=0;
  if(x?.version!==1||x.map!==MAP.id||!x.inventory||!Object.keys(freshState().inventory).every(k=>finite(x.inventory[k]))||!ids.includes(x.lastDock)||!Array.isArray(x.visited)||!x.visited.every((v:unknown)=>ids.includes(v as string))||!Array.isArray(x.discovered)||!x.discovered.every((v:unknown)=>ids.includes(v as string))||!Array.isArray(x.fishJournal)||!x.fishJournal.every((n:unknown)=>Number.isInteger(n)&&Number(n)>=0&&Number(n)<5)||!finite(x.playTime)||!finite(x.nourishment)||x.nourishment>100||!finite(x.condition)||x.condition>100||!x.collected||typeof x.collected!=='object'||Array.isArray(x.collected)||!Object.entries(x.collected).every(([k,v])=>PICKUPS.some(p=>p.id===k)&&finite(v))||!['rod','chart','reinforced','completed','squallDone'].every(k=>typeof x[k]==='boolean'))throw new Error('This saved journey could not be read. Your next adventure is ready whenever you are.');
  const s=freshState();return {...s,...x,settings:{...s.settings,...x.settings,volume:Math.min(1,Math.max(0,Number(x.settings?.volume)||0)),sensitivity:Math.min(2,Math.max(.3,Number(x.settings?.sensitivity)||1)),reducedMotion:x.settings?.reducedMotion===true,lowGraphics:x.settings?.lowGraphics===true}};
}
export function loadState():{state:GameState|null;error:string|null} {
  try {const raw=localStorage.getItem(SAVE_KEY);return {state:raw?parseSave(raw):null,error:null};}catch{return {state:null,error:'Your saved journey couldn’t be loaded. Start a new voyage to set sail again.'};}
}
export function saveState(s:GameState) {try{localStorage.setItem(SAVE_KEY,JSON.stringify(s));return true;}catch{return false;}}
