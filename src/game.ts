import * as T from 'three';
import {MAP,PICKUPS,FISH,RESOURCE_LABELS,WORLD_SCALE,type Island} from './data';
import {freshState,loadState,saveState,collect,available,upgrade,eat,repair,objective,type GameState} from './state';
import {World} from './world';
import {UI,icon,type Panel} from './ui';
import {OceanAudio} from './audio';
import {tickSurvival,recoverBoat} from './systems/survival';
import {tickFishing,catchFish,type Fishing} from './systems/fishing';
import {walkable,canEnterChannel,CHANNEL_Z} from './systems/navigation';
const clamp=T.MathUtils.clamp;
export class Game {
  ui:UI;world:World;state:GameState;audio=new OceanAudio();playing=false;aboard=true;firstPerson=false;
  pos=new T.Vector3();boatPos=new T.Vector3();heading=0;speed=0;cameraYaw=.5;pitch=.35;distance=25;dragging=false;keys=new Set<string>();
  fishing:Fishing|null=null;nearPickup:string|null=null;nearDock:Island|null=null;interaction='';time=0;last=0;hudAt=0;saveAt=0;hitAt=0;gateAt=0;squall=0;saveWarned=false;mutedVolume=.35;
  constructor(root:HTMLElement){
    const saved=loadState();this.state=saved.state??freshState();this.ui=new UI(root,!!saved.state,saved.error);this.world=new World(this.ui.el('world'));this.placeAtDock();this.world.quality(this.state.settings.lowGraphics);this.ui.onAction=(action,value)=>this.action(action,value);this.bind();this.syncPickups();this.ui.update(this.state,this.pos.x,this.pos.z,this.heading,this.aboard);
    for(const i of MAP.islands){const label=document.createElement('div');label.className='island-label';label.id=`label-${i.id}`;label.innerHTML=`<small>${i.id==='palm'?'A GOOD PLACE TO BEGIN':'A LITTLE FURTHER ALONG'}</small><strong>${i.name}</strong><span></span>`;this.ui.el('labels').append(label);}
    this.world.camera.position.set(78,53,95);this.world.camera.lookAt(0,0,4);this.world.boat.position.copy(this.boatPos);requestAnimationFrame(t=>this.frame(t));this.ui.ready();
  }
  placeAtDock(){const dock=MAP.islands.find(i=>i.id===this.state.lastDock)!;this.boatPos.set(dock.dock[0],0,dock.dock[1]);this.pos.copy(this.boatPos);this.heading=Math.PI/2;this.cameraYaw=.55;this.aboard=true;this.speed=0;}
  persist(){if(!saveState(this.state)&&!this.saveWarned){this.ui.toast('Your browser could not save this journey. Keep this tab open to continue.');this.saveWarned=true;}}
  start(reset=false){if(reset){this.state=freshState();this.placeAtDock();this.syncPickups();this.world.quality(false);}this.playing=true;this.ui.setPlaying(true);this.panel(null);this.audio.start(this.state.settings.volume);this.world.camera.position.copy(this.boatPos).add(new T.Vector3(18,15,24));this.persist();this.ui.toast('Welcome aboard. Press E to step ashore, and take your time.');}
  panel(panel:Panel){this.keys.clear();this.dragging=false;if(panel){this.cancelFishing(false);if(document.pointerLockElement)document.exitPointerLock();this.audio.pause();}else if(this.playing)this.audio.start(this.state.settings.volume);this.ui.showPanel(panel,this.state,this.aboard,this.pos.x,this.pos.z,this.heading);}
  action(action:string,value?:string){
    if(action==='start')return this.start(true);if(action==='continue')return this.start();
    if(action==='new'){
      this.panel('pause');this.ui.el('modal').innerHTML=`<section class="panel" role="dialog" aria-modal="true" aria-label="Start a new voyage"><div class="eyebrow">A FRESH HORIZON</div><h2>Another little adventure?</h2><p class="panel-lead">Starting again replaces your saved journey. Your current voyage stays safe until you choose to begin.</p><button class="primary" data-action="restart">Start a new voyage ${icon('arrow')}</button><button class="text-button" data-action="close">Keep this journey</button></section>`;return;
    }
    if(action==='restart'){this.firstPerson=false;this.world.player.visible=false;this.fishing=null;this.squall=0;this.start(true);return;}
    if(action==='close'){this.panel(null);return;}
    if(action==='sound'){if(this.state.settings.volume>0){this.mutedVolume=this.state.settings.volume;this.state.settings.volume=0;}else this.state.settings.volume=this.mutedVolume||.35;this.audio.start(this.state.settings.volume);this.ui.toast(this.state.settings.volume?'Ocean sounds on':'A quieter moment. Sound muted.');this.persist();return;}
    if(action==='pause'){if(this.playing)this.panel(this.ui.panel==='pause'?null:'pause');return;}
    if(!this.playing)return;
    if(action==='journal'||action==='map'){this.panel(this.ui.panel===action?null:action);return;}
    if(action==='tab'){this.ui.tab=value!;this.panel('journal');return;}
    if(action==='camera'&&!this.ui.panel){this.firstPerson=!this.firstPerson;this.pitch=this.firstPerson?.05:.35;if(this.firstPerson&&this.aboard)this.cameraYaw=this.heading;this.ui.el('camera-label').textContent=this.firstPerson?'First person':'Third person';if(!this.firstPerson&&document.pointerLockElement)document.exitPointerLock();this.ui.toast(this.firstPerson?'First person · Click the world to look freely. V to switch back.':'Third person · Drag to look around. Scroll to zoom.');return;}
    if(action==='fish'&&!this.ui.panel){this.fish();return;}
    if(action==='cancel-fish'){this.cancelFishing();return;}
    if(action==='eat'){const ok=eat(this.state,value as 'fruit'|'fish');if(ok){this.audio.tone(520);this.persist();}this.refreshPanel();return;}
    if(action==='repair'){if(repair(this.state)){this.audio.tone(390);this.ui.toast('A little care goes a long way. Boat condition restored.');this.persist();}this.refreshPanel();return;}
    if(action==='upgrade'&&this.aboard){if(upgrade(this.state)){this.state.condition=100;this.audio.tone(523);setTimeout(()=>this.audio.tone(784),180);this.ui.toast('Ready for open water. Your little boat is reinforced.');this.persist();}this.refreshPanel();return;}
    if(action==='setting'){
      const [k,v]=value!.split(':');if(k==='volume'){this.state.settings.volume=Number(v);this.audio.volume(Number(v));}if(k==='sensitivity')this.state.settings.sensitivity=Number(v);if(k==='reducedMotion')this.state.settings.reducedMotion=v==='true';if(k==='lowGraphics'){this.state.settings.lowGraphics=v==='true';this.world.quality(v==='true');}this.persist();
    }
  }
  refreshPanel(){if(this.ui.panel)this.ui.showPanel(this.ui.panel,this.state,this.aboard,this.pos.x,this.pos.z,this.heading);this.syncPickups();}
  bind(){
    addEventListener('keydown',e=>{
      if(e.defaultPrevented)return;
      if(this.ui.panel&&e.key!=='Escape'&&e.key!=='Tab')return;
      if(['Tab',' ','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.key))e.preventDefault();
      if(e.repeat)return;const k=e.key.toLowerCase();if(k==='escape'){if(this.playing){if(this.fishing)this.cancelFishing();else this.panel(this.ui.panel?null:'pause');}return;}
      if(k==='tab'){if(this.playing)this.action('journal');return;}if(k==='m'){this.action('map');return;}if(this.ui.panel||!this.playing)return;
      if(k==='v'){this.action('camera');return;}if(k==='e'){this.interact();return;}if(k==='f'){this.fish();return;}if(k===' '&&this.fishing){this.fish();return;}
      this.keys.add(k);
    });
    addEventListener('keyup',e=>this.keys.delete(e.key.toLowerCase()));
    addEventListener('blur',()=>{this.keys.clear();if(this.playing&&!this.ui.panel)this.panel('pause');});
    document.addEventListener('visibilitychange',()=>{if(document.hidden&&this.playing){this.persist();this.panel('pause');}});
    addEventListener('beforeunload',()=>{if(this.playing)this.persist();});
    const canvas=this.world.renderer.domElement;
    canvas.addEventListener('pointerdown',e=>{if(!this.playing||this.ui.panel)return;if(this.firstPerson){if(!document.pointerLockElement)void canvas.requestPointerLock()?.catch(()=>this.ui.toast('Drag the mouse to look around.'));}else{this.dragging=true;canvas.setPointerCapture(e.pointerId);}});
    canvas.addEventListener('pointerup',()=>this.dragging=false);canvas.addEventListener('pointercancel',()=>this.dragging=false);
    addEventListener('pointermove',e=>{if(!this.playing||this.ui.panel||(!this.dragging&&!document.pointerLockElement))return;this.cameraYaw-=e.movementX*.003*this.state.settings.sensitivity;this.pitch=clamp(this.pitch+e.movementY*.002*this.state.settings.sensitivity,this.firstPerson?-.9:.1,this.firstPerson?.9:1.05);});
    canvas.addEventListener('wheel',e=>{e.preventDefault();this.distance=clamp(this.distance+e.deltaY*.03,12,65);},{passive:false});
    this.ui.el('modal').addEventListener('keydown',e=>{if(e.key!=='Tab')return;const items=[...this.ui.el('modal').querySelectorAll<HTMLElement>('button:not([disabled]),input')];const i=items.indexOf(document.activeElement as HTMLElement);if(!items.length)return;e.preventDefault();items[(i+(e.shiftKey?-1:1)+items.length)%items.length].focus();});
  }
  syncPickups(){for(const [id,g]of this.world.pickups)g.visible=available(this.state,id);}
  closestIsland(){return [...MAP.islands].sort((a,b)=>Math.hypot(a.x-this.pos.x,a.z-this.pos.z)-Math.hypot(b.x-this.pos.x,b.z-this.pos.z))[0];}
  updateInteraction(){
    this.nearPickup=null;this.nearDock=null;this.interaction='';
    if(!this.playing||this.fishing||this.ui.panel){this.ui.prompt('');return;}
    if(this.aboard){for(const i of MAP.islands){if(this.boatPos.distanceTo(new T.Vector3(i.dock[0],0,i.dock[1]))<13){this.nearDock=i;this.interaction=`Dock at ${i.name} & step ashore`;break;}}}
    else{
      let nearest=5.5;for(const p of PICKUPS){const d=Math.hypot(p.x-this.pos.x,p.z-this.pos.z);if(d<nearest&&available(this.state,p.id)){nearest=d;this.nearPickup=p.id;this.interaction=p.type==='rod'?'Pick up fishing rod':p.type==='chart'?'Discover the harbor chart':`Gather ${RESOURCE_LABELS[p.type].toLowerCase()} +${p.amount}`;}}
      const i=MAP.islands.find(i=>i.id===this.state.lastDock)!;if(!this.nearPickup&&Math.hypot(this.pos.x-i.dock[0],this.pos.z-(i.dock[1]-11))<7){this.nearDock=i;this.interaction='Step aboard your sailboat';}
    }
    this.ui.prompt(this.interaction);
  }
  interact(){
    if(this.fishing||this.ui.panel)return;this.updateInteraction();
    if(this.nearPickup){const p=PICKUPS.find(p=>p.id===this.nearPickup)!;if(collect(this.state,p.id)){this.audio.tone(p.type==='chart'?784:620,.2);this.ui.toast(p.type==='rod'?'Your fishing rod. Press F near the water to cast a line.':p.type==='chart'?'The Sunhaven chart! Follow the northern passage to the lighthouse.':`A useful little find. +${p.amount} ${RESOURCE_LABELS[p.type].toLowerCase()}`);this.syncPickups();this.persist();}return;}
    if(this.nearDock){
      this.cancelFishing(false);const i=this.nearDock;
      if(this.aboard){
        this.boatPos.set(i.dock[0],0,i.dock[1]);this.speed=0;this.aboard=false;this.pos.set(i.dock[0],0,i.dock[1]-12);this.state.lastDock=i.id;
        if(!this.state.visited.includes(i.id)){this.state.visited.push(i.id);this.ui.toast(`${i.name}. ${i.subtitle}`);}else this.ui.toast('A little time ashore. WASD to explore, E to gather.');
        if(!this.state.discovered.includes(i.id))this.state.discovered.push(i.id);
        if(i.id==='harbor'&&!this.state.completed&&this.state.chart&&this.state.reinforced){this.state.completed=true;this.persist();this.panel('complete');}
      }else{this.aboard=true;this.pos.copy(this.boatPos);this.heading=Math.PI/2;this.ui.toast('Back aboard. W to catch the breeze. A / D to steer.');}
      this.persist();this.syncPickups();return;
    }
    this.ui.toast(this.aboard?'Sail close to the end of a wooden jetty to dock.':'Move close to a highlighted item to gather it.');
  }
  fish(){
    if(this.ui.panel)return;
    if(this.fishing){if(this.fishing.phase==='bite'){const result=catchFish(this.state,this.fishing)!;this.audio.tone(784,.3);this.persist();this.ui.toast(result.discovered?`A new ocean neighbor: ${FISH[result.fish].name}! Added to your journal.`:`A lovely ${FISH[result.fish].name}. +1 fresh fish.`);this.fishingUI();}else if(this.fishing.phase==='waiting'){this.ui.toast('Let the float settle. Wait for the bite cue.');}else this.cancelFishing(false);return;}
    if(!this.state.rod){this.ui.toast('Find the fishing rod by the jetty on Palm Island first.');return;}
    if(this.aboard&&Math.abs(this.speed)>.35){this.ui.toast('Let your boat slow down before casting. Release W and wait a moment.');return;}
    const i=this.closestIsland();const d=Math.hypot(this.pos.x-i.x,this.pos.z-i.z);
    if(!this.aboard&&d<i.radius*.72){this.ui.toast('Head to the beach or jetty to cast your line.');return;}
    const j=MAP.islands.indexOf(i);this.fishing={phase:'waiting',timer:4+Math.random()*5,fish:j};this.speed=0;this.keys.clear();this.fishingUI();this.audio.tone(350,.15);
  }
  fishingUI(){const f=this.fishing,el=this.ui.el('fishing');el.classList.toggle('visible',!!f);if(!f)return;el.innerHTML=`${icon('fish')}<div class="eyebrow" style="justify-content:center">A QUIET MOMENT</div><h3>${f.phase==='waiting'?'Just you and the tide.':f.phase==='bite'?'A little nibble!':f.phase==='caught'?FISH[f.fish].name:'One that got away.'}</h3>${f.phase==='bite'?'<button class="bite small-button" data-action="fish">Press F or click to catch!</button>':`<p>${f.phase==='waiting'?'Watch the float. A bite is on its way…':f.phase==='caught'?'+1 fresh fish · A lovely little catch.':'No worries. There are more fish in the sea.'}</p>`}<button class="small-button" data-action="cancel-fish">${f.phase==='caught'||f.phase==='missed'?'Back to the journey':'Put the rod away'}</button>`;}
  cancelFishing(message=true){if(!this.fishing)return;this.fishing=null;this.fishingUI();if(message)this.ui.toast('The ocean will still be here.');}
  movement(dt:number){
    if(this.fishing)return;
    const forward=(this.keys.has('w')||this.keys.has('arrowup')?1:0)-(this.keys.has('s')||this.keys.has('arrowdown')?1:0);
    const side=(this.keys.has('a')||this.keys.has('arrowleft')?1:0)-(this.keys.has('d')||this.keys.has('arrowright')?1:0);
    if(this.aboard){
      const dh=side*dt*.65*(this.speed<-.2?-1:1);this.heading+=dh;if(this.firstPerson)this.cameraYaw+=dh;
      const target=forward*(forward<0?1.8:this.state.reinforced?5.2:4.5);this.speed=T.MathUtils.damp(this.speed,target,forward?1.1:1.8,dt);
      const next=this.boatPos.clone().add(new T.Vector3(-Math.sin(this.heading),0,-Math.cos(this.heading)).multiplyScalar(this.speed*dt));
      let blocked=false;for(const i of MAP.islands){if(Math.hypot(next.x-i.x,next.z-i.z)<i.radius+3){blocked=true;if(this.time-this.hitAt>6&&Math.abs(this.speed)>2.5){this.ui.toast('Softly now. Find the wooden jetty to step ashore.');this.hitAt=this.time;}break;}}
      for(const r of this.world.rocks){const d=Math.hypot(next.x-r.x,next.z-r.z);if(d<r.r+3){blocked=true;if(this.time-this.hitAt>2){this.state.condition=Math.max(0,this.state.condition-9);this.ui.toast('A little scrape. Give the rocks some room; repair with wood in your journal.');this.hitAt=this.time;this.persist();}}else if(d<r.r+13&&this.time-this.hitAt>7){this.ui.toast('Rocks ahead. A little room to the side keeps your hull happy.');this.hitAt=this.time;}}
      if(!blocked)this.boatPos.copy(next);else this.speed*=.8;
      if(this.boatPos.z<CHANNEL_Z&&!canEnterChannel(this.state)){
        this.boatPos.z=CHANNEL_Z+10;this.heading=Math.PI;this.speed=1;this.cameraYaw=.5;if(this.time-this.gateAt>5){this.ui.toast('The outer current guides you back. You need a reinforced boat and the harbor chart.');this.gateAt=this.time;}
      }
      if(this.boatPos.z<CHANNEL_Z&&canEnterChannel(this.state)&&!this.state.squallDone&&this.squall===0){this.squall=14;this.ui.toast('A passing squall. Your reinforced boat can handle it. Keep following the buoys.');}
      if(Math.hypot(this.boatPos.x,this.boatPos.z+250*WORLD_SCALE)>MAP.bounds){this.boatPos.x=clamp(this.boatPos.x,-450*WORLD_SCALE,450*WORLD_SCALE);this.boatPos.z=clamp(this.boatPos.z,-650*WORLD_SCALE,100*WORLD_SCALE);this.speed=-.4;if(this.time-this.gateAt>5){this.ui.toast('The gentle current points you back toward the archipelago.');this.gateAt=this.time;}}
      this.pos.copy(this.boatPos);
    }else{
      const direction=new T.Vector3(-Math.sin(this.cameraYaw)*forward-Math.cos(this.cameraYaw)*side,0,-Math.cos(this.cameraYaw)*forward+Math.sin(this.cameraYaw)*side);
      if(direction.lengthSq()>0){direction.normalize().multiplyScalar(dt*(this.state.nourishment>0?5:3.6));const next=this.pos.clone().add(direction);const i=MAP.islands.find(i=>i.id===this.state.lastDock)!;if(walkable(next.x,next.z,i))this.pos.copy(next);this.world.player.rotation.y=Math.atan2(direction.x,direction.z);}
    }
  }
  simulation(dt:number){
    tickSurvival(this.state,dt);this.movement(dt);
    for(const i of MAP.islands){if(Math.hypot(this.pos.x-i.x,this.pos.z-i.z)<i.radius+60&&!this.state.discovered.includes(i.id)){this.state.discovered.push(i.id);this.ui.toast(`Land ahoy. ${i.name} is on your map.`);this.audio.tone(587);this.persist();}}
    if(this.squall>0){this.squall=Math.max(0,this.squall-dt);this.state.condition=Math.max(0,this.state.condition-dt*.75);if(this.squall===0){this.state.squallDone=true;this.ui.toast('Blue skies ahead. Sunhaven is just beyond the lighthouse.');this.persist();}}
    if(recoverBoat(this.state)){this.squall=0;this.placeAtDock();this.cancelFishing(false);this.ui.toast('A kind current brought you back to your last dock. All your supplies are safe.');this.persist();}
    if(this.fishing){const change=tickFishing(this.fishing,dt);if(change==='finished')this.cancelFishing(false);else if(change==='changed'){if(this.fishing.phase==='bite')this.audio.tone(880,.35);this.fishingUI();}}
    if(this.state.playTime>this.saveAt){this.saveAt=this.state.playTime+20;this.persist();this.syncPickups();}
    this.audio.update(this.state.playTime);
  }
  camera(dt:number){
    const camera=this.world.camera;
    if(!this.playing){const orbit=Math.sin(this.time*.025)*.12;camera.position.set(78+Math.sin(orbit)*25,53,95+Math.cos(orbit)*3);camera.lookAt(-29,0,20);return;}
    const p=this.pos.clone();const island=this.closestIsland();const ground=Math.hypot(this.pos.x-island.x,this.pos.z-island.z)<island.radius*.7?2.45:1.5;p.y=this.aboard?3.2:ground+1.8;if(this.firstPerson&&this.aboard)p.add(new T.Vector3(1.15,0,2.1).applyAxisAngle(new T.Vector3(0,1,0),this.heading));
    if(this.firstPerson){camera.position.copy(p);const look=new T.Vector3(-Math.sin(this.cameraYaw)*Math.cos(this.pitch),-Math.sin(this.pitch),-Math.cos(this.cameraYaw)*Math.cos(this.pitch));camera.lookAt(p.clone().add(look));}
    else{const d=this.distance;const desired=p.clone().add(new T.Vector3(Math.sin(this.cameraYaw)*d*Math.cos(this.pitch),d*Math.sin(this.pitch)+5,Math.cos(this.cameraYaw)*d*Math.cos(this.pitch)));camera.position.lerp(desired,this.state.settings.reducedMotion?1:1-Math.exp(-dt*6));camera.lookAt(p);}
  }
  visuals(dt:number){
    const w=this.world,red=this.state.settings.reducedMotion;w.boat.position.copy(this.boatPos);w.boat.position.y=red?0:Math.sin(this.time*1.3)*.1;w.boat.rotation.set(red?0:Math.sin(this.time*.9)*.012,this.heading,red?0:Math.cos(this.time*1.2)*.025);w.boat.visible=true;const groundIsland=this.closestIsland();const groundHeight=Math.hypot(this.pos.x-groundIsland.x,this.pos.z-groundIsland.z)<groundIsland.radius*.7?2.45:1.5;w.player.position.set(this.pos.x,this.aboard?1.15:groundHeight,this.pos.z);if(this.aboard){w.player.position.add(new T.Vector3(Math.sin(this.heading)*1.4,0,Math.cos(this.heading)*1.4));w.player.rotation.y=this.heading+Math.PI;}w.player.visible=!this.firstPerson;w.wake.position.set(this.boatPos.x,.09,this.boatPos.z);w.wake.rotation.z=this.heading;w.wake.visible=this.aboard&&Math.abs(this.speed)>.3;w.wake.scale.set(1+(Math.sin(this.time*2)*.05),1.4+Math.abs(this.speed)*.13,1);
    const o=objective(this.state),i=MAP.islands.find(i=>i.id===o.island)!;w.marker.position.set(i.dock[0],6,i.dock[1]-12);w.marker.visible=this.playing&&this.pos.distanceTo(w.marker.position)<120;
    this.camera(dt);
    for(const i of MAP.islands){const el=this.ui.el(`label-${i.id}`);const p=new T.Vector3(i.x,19,i.z);const d=p.distanceTo(w.camera.position);p.project(w.camera);el.style.display=(p.z<1&&Math.abs(p.x)<1.2&&Math.abs(p.y)<1.2&&d<240&&(!this.playing||d>45)&&this.state.discovered.includes(i.id))?'block':'none';el.style.left=`${(p.x*.5+.5)*innerWidth}px`;el.style.top=`${(-p.y*.5+.5)*innerHeight}px`;}
    w.reinforcement.visible=this.state.reinforced;w.float.visible=!!this.fishing;
    if(this.fishing){const el=w.wake;el.visible=true;el.position.set(this.pos.x+5,.09,this.pos.z-2);el.scale.setScalar(1+Math.sin(this.time*3)*.05);w.float.position.set(this.pos.x+5,.1+Math.sin(this.time*(this.fishing.phase==='bite'?12:2))*.13,this.pos.z-2);}
    const storm=this.squall>0;const color=new T.Color(storm?'#9fb6b2':'#b7ded6');(w.scene.background as T.Color).lerp(color,dt*.3);w.sun.intensity=T.MathUtils.damp(w.sun.intensity,storm?1.4:3.1,.4,dt);w.render(this.time,red);
  }
  frame(t:number){const dt=Math.min((t-this.last)/1000,.05);this.last=t;this.time+=dt;if(this.playing&&!this.ui.panel)this.simulation(dt);if(this.time>this.hudAt){this.hudAt=this.time+.2;this.updateInteraction();this.ui.update(this.state,this.pos.x,this.pos.z,this.heading,this.aboard);}this.visuals(dt);requestAnimationFrame(next=>this.frame(next));}
}
