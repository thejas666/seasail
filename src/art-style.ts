// Two complete looks for the game. The choice is stored on this device and applied when the page loads.
export type ArtStyle='cartoon'|'anime';
export const STYLE_KEY='seasurvival.style.v1';
function read():ArtStyle{
  // Outside a browser (tests, asset export) the cartoon models are the reference.
  if(typeof localStorage==='undefined')return 'cartoon';
  try{return localStorage.getItem(STYLE_KEY)==='cartoon'?'cartoon':'anime';}catch{return 'anime';}
}
export const ART_STYLE:ArtStyle=read();
// Which character model the anime style wears.
export type Character='male'|'female';
export const CHARACTER_KEY='seasurvival.character.v1';
export function getCharacter():Character{try{return typeof localStorage!=='undefined'&&localStorage.getItem(CHARACTER_KEY)==='female'?'female':'male';}catch{return 'male';}}
// The explorer's name, chosen when a voyage starts.
export const NAME_KEY='seasurvival.name.v1';
export function getPlayerName(){try{return (typeof localStorage!=='undefined'&&localStorage.getItem(NAME_KEY)||'').slice(0,16);}catch{return '';}}
export function savePlayerName(name:string){const clean=name.replace(/[<>&"']/g,'').trim().slice(0,16);try{localStorage.setItem(NAME_KEY,clean);}catch{/* the name just won't be remembered */}return clean;}
export function saveCharacter(character:Character){try{localStorage.setItem(CHARACTER_KEY,character);return true;}catch{return false;}}
export function saveArtStyle(style:ArtStyle){try{localStorage.setItem(STYLE_KEY,style);return true;}catch{return false;}}
