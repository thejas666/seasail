import './style.css';
import './game-theme.css';
import './hud.css';
const loading=document.createElement('section');loading.id='loading';loading.className='loading-screen';loading.setAttribute('aria-label','Loading SeaSurvival');
loading.innerHTML=`<div class="loading-top"><span>AN OPEN OCEAN. A FRESH START.</span><span>CHAPTER 01</span></div><div class="loading-art"><div class="loading-sun"></div><div class="loading-island"></div><svg class="loading-boat" viewBox="0 0 200 180" aria-hidden="true"><path d="M25 133h150l-25 31H52Z" fill="#bc8655"/><path d="M40 136h120l-18 18H57Z" fill="#164e56"/><path d="M95 21v112" stroke="#e1c28b" stroke-width="4"/><path d="M88 32v86H32Z" fill="#f5ebc9"/><path d="m102 26 62 92h-62Z" fill="#e5d6ad"/><path d="m98 17 26 8-26 8Z" fill="#dc9f58"/><path d="M12 172c15-12 27 12 42 0s27 12 42 0 27 12 42 0 27 12 42 0" fill="none" stroke="#79bcbb" stroke-width="2"/></svg><div class="loading-wave wave-one"></div><div class="loading-wave wave-two"></div></div><h1>SEA<span>SURVIVAL</span></h1><p class="loading-subtitle">THE SUNHAVEN PASSAGE</p><div class="loading-progress"><div class="loading-track" role="progressbar" aria-label="Game loading" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0"><i></i></div><div class="loading-status"><span id="loading-stage">Packing a little adventure…</span><span id="loading-percent">0%</span></div></div><p class="loading-tip">A gentle reminder: you don’t have to follow the shortest route.</p>`;
document.body.append(loading);
document.getElementById('app')!.inert=true;
function progress(value:number,label:string){loading.querySelector<HTMLElement>('.loading-track i')!.style.width=`${value}%`;loading.querySelector('[role=progressbar]')!.setAttribute('aria-valuenow',String(value));document.getElementById('loading-stage')!.textContent=label;document.getElementById('loading-percent')!.textContent=`${value}%`;}
const paint=()=>new Promise<void>(resolve=>requestAnimationFrame(()=>resolve()));
async function boot(){
  try{
    await paint();progress(12,'Unfolding the sea chart…');
    const {Game}=await import('./game');progress(42,'Growing a little wilderness…');await paint();await paint();
    const game=new Game(document.getElementById('app')!);progress(55,'Unpacking the island wilderness…');await paint();await paint();
    await game.world.loadNature(done=>progress(55+Math.round(done*30),'Unpacking trees, ferns, and coastal rocks…'));progress(88,'Warming the sunlight…');await paint();await paint();
    await game.world.renderer.compileAsync(game.world.scene,game.world.camera);progress(100,'Your horizon is ready.');await paint();await paint();
    document.getElementById('app')!.inert=false;game.ui.ready();loading.addEventListener('transitionend',event=>{if(event.target===loading)loading.remove();});
  }catch(error){console.error(error);loading.className='loading-screen loading-failed';loading.innerHTML='<h1>A calmer sea<br>is just ahead.</h1><p>We couldn’t prepare the 3D world. Use a desktop browser with hardware acceleration enabled, then try again.</p><button class="primary" id="retry">Try again</button>';document.getElementById('retry')!.onclick=()=>location.reload();}
}
void boot();
