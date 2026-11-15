import './style.css';
import './game-theme.css';
import './hud.css';
import './title-screen.css';
import './panels.css';
import './hud-cartoon.css';
import './anime.css';
import {ART_STYLE} from './art-style';
document.documentElement.classList.add(`style-${ART_STYLE}`);
const loading=document.createElement('section');loading.id='loading';loading.className='loading-screen';loading.setAttribute('aria-label','Loading SeaSurvival');
loading.innerHTML=`<div class="loading-art"><div class="loading-sun"></div><svg class="loading-boat" viewBox="0 0 200 180" aria-hidden="true"><g stroke="#13314a" stroke-width="6" stroke-linejoin="round" stroke-linecap="round"><path d="M95 21v112" fill="none"/><path d="M88 34v84H34Z" fill="#ffffff"/><path d="m102 28 60 90h-60Z" fill="#ffe2a6"/><path d="m98 17 26 8-26 8Z" fill="#e8622c"/><path d="M22 128h156l-26 34H50Z" fill="#c9824a"/><path d="M38 140h124" fill="none"/></g></svg><svg class="loading-sea" viewBox="0 0 400 60" preserveAspectRatio="none" aria-hidden="true"><path d="M0 22c25-14 42 14 67 0s42 14 66 0 42 14 67 0 42 14 67 0 42 14 66 0 42 14 67 0v38H0Z" fill="#2fa6c9" stroke="#13314a" stroke-width="5"/></svg></div><h1 class="game-logo loading-logo" aria-label="Sea Survival"><span class="logo-sea" aria-hidden="true">Sea</span><span class="logo-survival" aria-hidden="true">Survival</span><span class="logo-ribbon" aria-hidden="true"><span>The Sunhaven Passage</span></span></h1><div class="loading-progress"><div class="loading-track" role="progressbar" aria-label="Game loading" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0"><i></i></div><div class="loading-status"><span id="loading-stage">Packing a little adventure…</span><span id="loading-percent">0%</span></div></div><p class="loading-tip"><b>Tip</b> You don’t have to follow the shortest route.</p>`;
document.body.append(loading);
document.getElementById('app')!.inert=true;
function progress(value:number,label:string){loading.querySelector<HTMLElement>('.loading-track i')!.style.width=`${value}%`;loading.querySelector('[role=progressbar]')!.setAttribute('aria-valuenow',String(value));document.getElementById('loading-stage')!.textContent=label;document.getElementById('loading-percent')!.textContent=`${value}%`;}
const paint=()=>new Promise<void>(resolve=>requestAnimationFrame(()=>resolve()));
async function boot(){
  try{
    await paint();progress(12,'Unfolding the sea chart…');
    const {Game}=await import('./game');progress(42,'Growing a little wilderness…');await paint();await paint();
    const game=new Game(document.getElementById('app')!);progress(55,'Unpacking the island wilderness…');await paint();await paint();
    await game.world.loadNature(done=>progress(55+Math.round(done*30),'Unpacking trees, ferns, and coastal rocks…'));progress(86,'Dressing your explorer…');await game.world.loadAvatar();progress(88,'Warming the sunlight…');await paint();await paint();
    await game.world.renderer.compileAsync(game.world.scene,game.world.camera);progress(100,'Your horizon is ready.');await paint();await paint();
    document.getElementById('app')!.inert=false;game.ui.ready();loading.addEventListener('transitionend',event=>{if(event.target===loading)loading.remove();});
  }catch(error){console.error(error);loading.className='loading-screen loading-failed';loading.innerHTML='<h1 class="loading-error-title">A calmer sea<br>is just ahead.</h1><p>We couldn’t prepare the 3D world. Use a desktop browser with hardware acceleration enabled, then try again.</p><button class="primary" id="retry">Try again</button>';document.getElementById('retry')!.onclick=()=>location.reload();}
}
void boot();
