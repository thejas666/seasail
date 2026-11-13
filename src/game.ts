import * as T from 'three';
import {MAP,PICKUPS,FISH,RESOURCE_LABELS,WORLD_SCALE,type Island} from './data';
import {freshState,loadState,saveState,collect,available,upgrade,eat,repair,objective,type GameState} from './state';
import {World} from './world';
import {UI,icon,type Panel} from './ui';
import {OceanAudio} from './audio';
import {tickSurvival,recoverBoat} from './systems/survival';
import {tickFishing,catchFish,type Fishing} from './systems/fishing';
import {walkable,canEnterChannel,CHANNEL_Z} from './systems/navigation';
import {groundHeight,SKY_COLOR} from './environment';
import {readSettings,saveSettings} from './state';
import {advanceSailing,waterPose,spring,advanceJump} from './systems/physics';
import {blockedAt} from './systems/collision';
import {ExplorerAnimator} from './systems/explorer-animation';
import type {ExplorerRig} from './explorer-model';
const clamp=T.MathUtils.clamp;
export class Game {
  ui:UI;world:World;state:GameState;audio=new OceanAudio();playing=false;aboard=true;firstPerson=false;
  pos=new T.Vector3();boatPos=new T.Vector3();heading=0;speed=0;cameraYaw=.5;pitch=.16;distance=16;dragging=false;keys=new Set<string>();
  fishing:Fishing|null=null;nearPickup:string|null=null;nearDock:Island|null=null;interaction='';time=0;last=0;hudAt=0;saveAt=0;hitAt=0;gateAt=0;squall=0;saveWarned=false;mutedVolume=.35;
  turnRate=0;anchored=false;heave=0;heaveVelocity=0;jumpHeight=0;jumpVelocity=0;walkVelocity=new T.Vector3();cameraRay=new T.Raycaster();
  animator:ExplorerAnimator;pickupApproach:string|null=null;pendingPickup:string|null=null;approachAge=0;actualWalkSpeed=0;fishingTarget=new T.Vector3();
  constructor(root:HTMLElement){
    const saved=loadState();this.state=saved.state??freshState();this.state.settings=readSettings(this.state.settings);this.ui=new UI(root,!!saved.state,saved.error);this.world=new World(this.ui.el('world'));this.animator=new ExplorerAnimator(this.world.player.userData.rig as ExplorerRig,this.world.scene);this.placeAtDock();this.world.quality(this.state.settings.lowGraphics);this.ui.onAction=(action,value)=>this.action(action,value);this.bind();this.syncPickups();this.ui.update(this.state,this.pos.x,this.pos.z,this.heading,this.aboard);
    for(const i of MAP.islands){const label=document.createElement('div');label.className='island-label';label.id=`label-${i.id}`;label.innerHTML=`<small>${i.id==='palm'?'A GOOD PLACE TO BEGIN':'A LITTLE FURTHER ALONG'}</small><strong>${i.name}</strong><span></span>`;this.ui.el('labels').append(label);}
    this.world.camera.position.set(64,18,77);this.world.camera.lookAt(-9,6,0);this.world.boat.position.copy(this.boatPos);this.world.companions.onChirp=()=>{if(this.playing&&!this.ui.panel)this.audio.chirp();};requestAnimationFrame(t=>this.frame(t));
  }
  placeAtDock(){const dock=MAP.islands.find(i=>i.id===this.state.lastDock)!;this.boatPos.set(dock.dock[0],0,dock.dock[1]);this.pos.copy(this.boatPos);this.heading=Math.PI/2;this.cameraYaw=.55;this.aboard=true;this.speed=0;this.turnRate=0;this.anchored=false;this.jumpHeight=this.jumpVelocity=0;this.walkVelocity.set(0,0,0);this.actualWalkSpeed=0;this.pickupApproach=this.pendingPickup=null;this.animator.cancelPickup();this.animator.cancelFishing();}
  persist(){saveSettings(this.state.settings);if(this.playing&&!saveState(this.state)&&!this.saveWarned){this.ui.toast('Your browser could not save this journey. Keep this tab open to continue.');this.saveWarned=true;}}
  start(reset=false){this.firstPerson=false;this.distance=16;this.pitch=.16;this.ui.el('camera-label').textContent='Third person';if(reset){const settings={...this.state.settings};this.state=freshState();this.state.settings=settings;this.placeAtDock();this.syncPickups();this.world.quality(settings.lowGraphics);}else this.placeAtDock();this.playing=true;this.ui.setPlaying(true);this.panel(null);this.audio.start(this.state.settings.volume);this.world.camera.position.copy(this.boatPos).add(new T.Vector3(12,7,16));this.persist();this.ui.toast('Welcome aboard. Press E to step ashore, and take your time.');}
  panel(panel:Panel){this.keys.clear();this.dragging=false;if(panel){this.cancelGather();this.cancelFishing(false);if(document.pointerLockElement)document.exitPointerLock();this.audio.pause();}else if(this.playing)this.audio.start(this.state.settings.volume);this.ui.showPanel(panel,this.state,this.aboard,this.pos.x,this.pos.z,this.heading);}
  action(action:string,value?:string){
    if(action==='start')return this.start(true);if(action==='continue')return this.start();
    if(action==='new'){
      this.panel('pause');this.ui.el('modal').innerHTML=`<section class="panel" role="dialog" aria-modal="true" aria-label="Start a new voyage"><div class="eyebrow">A FRESH HORIZON</div><h2>Another little adventure?</h2><p class="panel-lead">Starting again replaces your saved journey. Your current voyage stays safe until you choose to begin.</p><button class="primary" data-action="restart">Start a new voyage ${icon('arrow')}</button><button class="text-button" data-action="close">Keep this journey</button></section>`;return;
    }
    if(action==='restart'){this.firstPerson=false;this.world.player.visible=false;this.fishing=null;this.squall=0;this.start(true);return;}
    if(action==='close'){this.panel(null);return;}
    if(action==='settings'||action==='controls'){this.panel(action);return;}
    if(action==='interact'&&this.playing&&!this.ui.panel){this.interact();return;}
    if(action==='anchor'&&this.playing&&this.aboard&&!this.ui.panel){this.anchored=!this.anchored;this.ui.el('anchor-label').textContent=this.anchored?'Raise anchor':'Drop anchor';this.ui.toast(this.anchored?'Anchor lowered. Let the boat settle, then cast a line.':'Anchor raised. Catch the breeze.');return;}
    if(action==='menu-back'){this.panel(this.playing?'pause':null);return;}
    if(action==='main-menu'){this.persist();this.playing=false;this.keys.clear();this.audio.pause();this.ui.setPlaying(false);this.panel(null);this.placeAtDock();const menu=this.ui.el('welcome').querySelector('.main-menu')!;if(!menu.querySelector('[data-action="continue"]')){menu.insertAdjacentHTML('afterbegin',`<button class="menu-button continue-button" data-action="continue"><span>${icon('boat')} Continue journey</span>${icon('arrow')}</button>`);const start=menu.querySelector<HTMLElement>('[data-action="start"]');if(start){start.dataset.action='new';start.classList.add('secondary-start');}}return;}
    if(action==='sound'){if(this.state.settings.volume>0){this.mutedVolume=this.state.settings.volume;this.state.settings.volume=0;}else this.state.settings.volume=this.mutedVolume||.35;this.audio.start(this.state.settings.volume);this.ui.toast(this.state.settings.volume?'Ocean sounds on':'A quieter moment. Sound muted.');this.persist();return;}
    if(action==='pause'){this.panel(this.ui.panel?null:this.playing?'pause':'settings');return;}
    if(!this.playing&&action!=='setting')return;
    if(action==='journal'||action==='map'){this.panel(this.ui.panel===action?null:action);return;}
    if(action==='tab'){this.ui.tab=value!;this.panel('journal');return;}
    if(action==='camera'&&!this.ui.panel){this.firstPerson=!this.firstPerson;this.pitch=this.firstPerson?.05:.16;if(this.firstPerson&&this.aboard)this.cameraYaw=this.heading;this.ui.el('camera-label').textContent=this.firstPerson?'First person':'Third person';if(!this.firstPerson&&document.pointerLockElement)document.exitPointerLock();this.ui.toast(this.firstPerson?'First person · Click the world to look freely. V to switch back.':'Third person · Drag to look around. Scroll to zoom.');return;}
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
      if(!this.playing&&!this.ui.panel&&e.key!=='Escape')return;
      if(['Tab',' ','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.key))e.preventDefault();
      if(e.repeat)return;const k=e.key.toLowerCase();if(k==='escape'){if(this.ui.panel)this.panel(null);else if(this.playing){if(this.fishing)this.cancelFishing();else this.panel('pause');}return;}
      if(k==='tab'){if(this.playing)this.action('journal');return;}if(k==='m'){this.action('map');return;}if(this.ui.panel||!this.playing)return;
      if(k==='v'){this.action('camera');return;}if(k==='e'){this.interact();return;}if(k==='f'){this.fish();return;}if(k===' '&&this.fishing){this.fish();return;}
      if(k==='x'){this.action('anchor');return;}if(k===' '&&!this.aboard&&!this.animator.busy&&!this.pickupApproach&&this.jumpHeight===0){this.jumpVelocity=4.6;this.jumpHeight=.01;return;}
      const hotkeys:Record<string,[string,string?]>={'1':['interact'],'2':['fish'],'3':['eat','fruit'],'4':['repair'],'5':['journal'],'6':['map'],'7':['anchor'],'8':['camera']};if(hotkeys[k]){this.action(...hotkeys[k]);return;}
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
    canvas.addEventListener('wheel',e=>{e.preventDefault();this.distance=clamp(this.distance+e.deltaY*.02,7,48);},{passive:false});
    this.ui.el('modal').addEventListener('keydown',e=>{if(e.key!=='Tab')return;const items=[...this.ui.el('modal').querySelectorAll<HTMLElement>('button:not([disabled]),input')];const i=items.indexOf(document.activeElement as HTMLElement);if(!items.length)return;e.preventDefault();items[(i+(e.shiftKey?-1:1)+items.length)%items.length].focus();});
  }
  syncPickups(){for(const [id,g]of this.world.pickups)g.visible=available(this.state,id);}
  closestIsland(){return [...MAP.islands].sort((a,b)=>Math.hypot(a.x-this.pos.x,a.z-this.pos.z)-Math.hypot(b.x-this.pos.x,b.z-this.pos.z))[0];}
  updateInteraction(){
    this.nearPickup=null;this.nearDock=null;this.interaction='';
    if(!this.playing||this.fishing||this.ui.panel||this.animator.busy||this.pickupApproach){this.ui.prompt('');return;}
    if(this.aboard){for(const i of MAP.islands){if(this.boatPos.distanceTo(new T.Vector3(i.dock[0],0,i.dock[1]))<13){this.nearDock=i;this.interaction=`Dock at ${i.name} & step ashore`;break;}}}
    else{
      let nearest=5.5;for(const p of PICKUPS){const d=Math.hypot(p.x-this.pos.x,p.z-this.pos.z);if(d<nearest&&available(this.state,p.id)){nearest=d;this.nearPickup=p.id;this.interaction=p.type==='rod'?'Pick up fishing rod':p.type==='chart'?'Discover the harbor chart':`Gather ${RESOURCE_LABELS[p.type].toLowerCase()} +${p.amount}`;}}
      const i=MAP.islands.find(i=>i.id===this.state.lastDock)!;if(!this.nearPickup&&Math.hypot(this.pos.x-i.dock[0],this.pos.z-(i.dock[1]-11))<7){this.nearDock=i;this.interaction='Step aboard your sailboat';}
    }
    this.ui.prompt(this.interaction);
  }
  interact(){
    if(this.fishing||this.ui.panel||this.animator.busy||this.pickupApproach)return;this.updateInteraction();
    if(this.nearPickup){this.pickupApproach=this.nearPickup;this.approachAge=0;this.keys.clear();return;}
    if(this.nearDock){
      this.cancelFishing(false);const i=this.nearDock;
      if(this.aboard){
        this.boatPos.set(i.dock[0],0,i.dock[1]);this.speed=0;this.aboard=false;this.distance=10;this.cameraYaw=.08;this.pitch=.12;this.pos.set(i.dock[0],0,i.dock[1]-12);this.state.lastDock=i.id;
        if(!this.state.visited.includes(i.id)){this.state.visited.push(i.id);this.ui.toast(`${i.name}. ${i.subtitle}`);}else this.ui.toast('A little time ashore. WASD to explore, E to gather.');
        if(!this.state.discovered.includes(i.id))this.state.discovered.push(i.id);
        if(i.id==='harbor'&&!this.state.completed&&this.state.chart&&this.state.reinforced){this.state.completed=true;this.persist();this.panel('complete');}
      }else{this.aboard=true;this.distance=16;this.pos.copy(this.boatPos);this.heading=Math.PI/2;this.ui.toast('Back aboard. W to catch the breeze. A / D to steer.');}
      this.persist();this.syncPickups();return;
    }
    this.ui.toast(this.aboard?'Sail close to the end of a wooden jetty to dock.':'Move close to a highlighted item to gather it.');
  }
  cancelGather(){this.pickupApproach=this.pendingPickup=null;this.animator.cancelPickup();this.walkVelocity.set(0,0,0);this.actualWalkSpeed=0;}
  grantPickup(id:string){const p=PICKUPS.find(p=>p.id===id)!;if(collect(this.state,id)){this.audio.tone(p.type==='chart'?784:620,.2);this.ui.toast(p.type==='rod'?'Your fishing rod. Press F near the water to cast a line.':p.type==='chart'?'The Sunhaven chart! Follow the northern passage to the lighthouse.':`A useful little find. +${p.amount} ${RESOURCE_LABELS[p.type].toLowerCase()}`);this.syncPickups();this.persist();}}
  fish(){
    if(this.ui.panel||this.animator.busy||this.pickupApproach)return;
    if(this.fishing){if(this.fishing.phase==='bite'){const result=catchFish(this.state,this.fishing)!;this.animator.reel();this.audio.tone(784,.3);this.persist();this.ui.toast(result.discovered?`A new ocean neighbor: ${FISH[result.fish].name}! Added to your journal.`:`A lovely ${FISH[result.fish].name}. +1 fresh fish.`);this.fishingUI();}else if(this.fishing.phase==='waiting'){this.ui.toast('Let the float settle. Wait for the bite cue.');}else this.cancelFishing(false);return;}
    if(!this.state.rod){this.ui.toast('Find the fishing rod by the jetty on Palm Island first.');return;}
    if(this.aboard&&Math.abs(this.speed)>.35){this.ui.toast('Press X to lower the anchor. Let the boat settle before casting.');return;}
    const i=this.closestIsland();const d=Math.hypot(this.pos.x-i.x,this.pos.z-i.z);
    if(!this.aboard&&d<i.radius*.72){this.ui.toast('Head to the beach or jetty to cast your line.');return;}
    const direction=new T.Vector3(this.pos.x-i.x,0,this.pos.z-i.z).normalize();if(d>i.radius+40)direction.set(-Math.sin(this.heading),0,-Math.cos(this.heading));this.fishingTarget.copy(this.pos).addScaledVector(direction,Math.max(7,i.radius+7-d));this.fishingTarget.y=.1;this.animator.cast();this.walkVelocity.set(0,0,0);this.actualWalkSpeed=0;
    const j=MAP.islands.indexOf(i);this.fishing={phase:'waiting',timer:4+Math.random()*5,fish:j};this.speed=0;this.keys.clear();this.fishingUI();this.audio.tone(350,.15);
  }
  fishingUI(){const f=this.fishing,el=this.ui.el('fishing');el.classList.toggle('visible',!!f);if(!f)return;el.innerHTML=`${icon('fish')}<div class="eyebrow" style="justify-content:center">A QUIET MOMENT</div><h3>${f.phase==='waiting'?'Just you and the tide.':f.phase==='bite'?'A little nibble!':f.phase==='caught'?FISH[f.fish].name:'One that got away.'}</h3>${f.phase==='bite'?'<button class="bite small-button" data-action="fish">Press F or click to catch!</button>':`<p>${f.phase==='waiting'?'Watch the float. A bite is on its way…':f.phase==='caught'?'+1 fresh fish · A lovely little catch.':'No worries. There are more fish in the sea.'}</p>`}<button class="small-button" data-action="cancel-fish">${f.phase==='caught'||f.phase==='missed'?'Back to the journey':'Put the rod away'}</button>`;}
  cancelFishing(message=true){this.animator.cancelFishing();if(!this.fishing)return;this.fishing=null;this.fishingUI();if(message)this.ui.toast('The ocean will still be here.');}
  movement(dt:number){
    this.actualWalkSpeed=0;if(this.fishing||this.animator.busy)return;
    const forward=(this.keys.has('w')||this.keys.has('arrowup')?1:0)-(this.keys.has('s')||this.keys.has('arrowdown')?1:0);
    const side=(this.keys.has('a')||this.keys.has('arrowleft')?1:0)-(this.keys.has('d')||this.keys.has('arrowright')?1:0);
    if(this.aboard){
      const motion=advanceSailing({heading:this.heading,speed:this.speed,turnRate:this.turnRate},forward,side,dt,this.state.reinforced,this.anchored);if(this.firstPerson)this.cameraYaw+=motion.heading-this.heading;this.heading=motion.heading;this.speed=motion.speed;this.turnRate=motion.turnRate;
      const next=this.boatPos.clone().add(new T.Vector3(-Math.sin(this.heading),0,-Math.cos(this.heading)).multiplyScalar(this.speed*dt));
      if(!this.anchored)next.add(new T.Vector3(.055,0,-.025).multiplyScalar(dt*(this.squall>0?3:1)));
      let blocked=false;for(const i of MAP.islands){if(Math.hypot(next.x-i.x,next.z-i.z)<i.radius+3){blocked=true;if(this.time-this.hitAt>6&&Math.abs(this.speed)>2.5){this.ui.toast('Softly now. Find the wooden jetty to step ashore.');this.hitAt=this.time;}break;}}
      for(const r of this.world.rocks){const d=Math.hypot(next.x-r.x,next.z-r.z);if(d<r.r+3){blocked=true;if(this.time-this.hitAt>2&&Math.abs(this.speed)>.9){this.state.condition=Math.max(0,this.state.condition-(Math.abs(this.speed)-.8)*4);this.ui.toast('A little scrape. Give the rocks some room; repair with wood in your journal.');this.hitAt=this.time;this.persist();}}else if(d<r.r+13&&this.time-this.hitAt>7){this.ui.toast('Rocks ahead. A little room to the side keeps your hull happy.');this.hitAt=this.time;}}
      if(!blocked)this.boatPos.copy(next);else{this.speed*=-.22;this.turnRate*=.4;}
      if(this.boatPos.z<CHANNEL_Z&&!canEnterChannel(this.state)){
        this.boatPos.z=CHANNEL_Z+10;this.heading=Math.PI;this.speed=1;this.cameraYaw=.5;if(this.time-this.gateAt>5){this.ui.toast('The outer current guides you back. You need a reinforced boat and the harbor chart.');this.gateAt=this.time;}
      }
      if(this.boatPos.z<CHANNEL_Z&&canEnterChannel(this.state)&&!this.state.squallDone&&this.squall===0){this.squall=14;this.ui.toast('A passing squall. Your reinforced boat can handle it. Keep following the buoys.');}
      if(Math.hypot(this.boatPos.x,this.boatPos.z+250*WORLD_SCALE)>MAP.bounds){this.boatPos.x=clamp(this.boatPos.x,-450*WORLD_SCALE,450*WORLD_SCALE);this.boatPos.z=clamp(this.boatPos.z,-650*WORLD_SCALE,100*WORLD_SCALE);this.speed=-.4;if(this.time-this.gateAt>5){this.ui.toast('The gentle current points you back toward the archipelago.');this.gateAt=this.time;}}
      this.pos.copy(this.boatPos);
    }else{
      const direction=new T.Vector3(-Math.sin(this.cameraYaw)*forward-Math.cos(this.cameraYaw)*side,0,-Math.cos(this.cameraYaw)*forward+Math.sin(this.cameraYaw)*side);
      if(this.pickupApproach){if(forward||side)this.pickupApproach=null;else{const pickup=PICKUPS.find(p=>p.id===this.pickupApproach)!;direction.set(pickup.x-this.pos.x,0,pickup.z-this.pos.z);this.approachAge+=dt;if(direction.length()<(pickup.type==='chart'?1.45:1.0)){this.pendingPickup=pickup.id;this.pickupApproach=null;this.walkVelocity.set(0,0,0);this.world.player.rotation.y=Math.atan2(direction.x,direction.z);this.animator.startPickup(this.world.pickups.get(pickup.id)!,this.world.pickups.get(pickup.id)!.position.y-groundHeight(this.closestIsland(),this.pos.x,this.pos.z));return;}if(this.approachAge>3){this.pickupApproach=null;this.ui.toast('Step a little closer to reach that item.');return;}}}
      if(direction.lengthSq()>0)direction.normalize().multiplyScalar(this.pickupApproach?2.7:this.state.nourishment>0?(this.keys.has('shift')?3.2:2.1):1.6);
      this.walkVelocity.lerp(direction,1-Math.exp(-dt*10));
      const next=this.pos.clone().addScaledVector(this.walkVelocity,dt),i=MAP.islands.find(i=>i.id===this.state.lastDock)!;
      const valid=(x:number,z:number)=>walkable(x,z,i)&&!blockedAt(x,z,this.world.landObstacles,this.world.solidBoxes);
      const previous=this.pos.clone();if(valid(next.x,next.z))this.pos.copy(next);else if(valid(next.x,this.pos.z))this.pos.x=next.x;else if(valid(this.pos.x,next.z))this.pos.z=next.z;else this.walkVelocity.set(0,0,0);this.actualWalkSpeed=this.pos.distanceTo(previous)/Math.max(dt,.001);
      if(this.walkVelocity.lengthSq()>.05){const target=Math.atan2(this.walkVelocity.x,this.walkVelocity.z),delta=Math.atan2(Math.sin(target-this.world.player.rotation.y),Math.cos(target-this.world.player.rotation.y));this.world.player.rotation.y+=delta*(1-Math.exp(-dt*12));}
      const jump=advanceJump(this.jumpHeight,this.jumpVelocity,dt);this.jumpHeight=jump.height;this.jumpVelocity=jump.velocity;
    }
  }
  simulation(dt:number){
    tickSurvival(this.state,dt);const animationEvents=this.animator.advance(dt);if(animationEvents.contact&&this.pendingPickup)this.grantPickup(this.pendingPickup);if(animationEvents.finished)this.pendingPickup=null;this.movement(dt);
    for(const i of MAP.islands){if(Math.hypot(this.pos.x-i.x,this.pos.z-i.z)<i.radius+60&&!this.state.discovered.includes(i.id)){this.state.discovered.push(i.id);this.ui.toast(`Land ahoy. ${i.name} is on your map.`);this.audio.tone(587);this.persist();}}
    if(this.squall>0){this.squall=Math.max(0,this.squall-dt);this.state.condition=Math.max(0,this.state.condition-dt*.75);if(this.squall===0){this.state.squallDone=true;this.ui.toast('Blue skies ahead. Sunhaven is just beyond the lighthouse.');this.persist();}}
    if(recoverBoat(this.state)){this.squall=0;this.placeAtDock();this.cancelFishing(false);this.ui.toast('A kind current brought you back to your last dock. All your supplies are safe.');this.persist();}
    if(this.fishing){const change=tickFishing(this.fishing,dt);if(change==='finished')this.cancelFishing(false);else if(change==='changed'){if(this.fishing.phase==='bite')this.audio.tone(880,.35);this.fishingUI();}}
    if(this.state.playTime>this.saveAt){this.saveAt=this.state.playTime+20;this.persist();this.syncPickups();}
    this.audio.update(this.state.playTime);
  }
  camera(dt:number){
    const camera=this.world.camera;
    if(!this.playing){const orbit=this.state.settings.reducedMotion?0:Math.sin(this.time*.025)*.07;camera.position.set(62+Math.sin(orbit)*18,17,76+Math.cos(orbit)*3);camera.lookAt(-12,6,0);return;}
    const p=this.pos.clone();const island=this.closestIsland();const ground=groundHeight(island,this.pos.x,this.pos.z);p.y=this.aboard?3.2+(this.state.settings.reducedMotion?0:this.heave):ground+this.jumpHeight+(this.firstPerson?1.8:1.35);if(this.firstPerson&&this.aboard)p.add(new T.Vector3(1.15,0,2.1).applyAxisAngle(new T.Vector3(0,1,0),this.heading));
    if(this.firstPerson){camera.position.copy(p);const look=new T.Vector3(-Math.sin(this.cameraYaw)*Math.cos(this.pitch),-Math.sin(this.pitch),-Math.cos(this.cameraYaw)*Math.cos(this.pitch));camera.lookAt(p.clone().add(look));}
    else{const d=this.distance;const desired=p.clone().add(new T.Vector3(Math.sin(this.cameraYaw)*d*Math.cos(this.pitch),d*Math.sin(this.pitch)+(this.aboard?2.5:1.1),Math.cos(this.cameraYaw)*d*Math.cos(this.pitch)));const ray=desired.clone().sub(p).normalize();this.cameraRay.set(p,ray);this.cameraRay.far=desired.distanceTo(p);const obstruction=this.cameraRay.intersectObjects(this.world.solids,true)[0];if(obstruction&&obstruction.distance>1)desired.copy(obstruction.point).addScaledVector(ray,-.6);camera.position.lerp(desired,this.state.settings.reducedMotion?1:1-Math.exp(-dt*6));camera.lookAt(p);}
  }
  visuals(dt:number){
    const w=this.world,red=this.state.settings.reducedMotion;w.boat.position.copy(this.boatPos);const pose=waterPose(this.boatPos.x,this.boatPos.z,this.heading,this.time);const heave=spring(this.heave,this.heaveVelocity,pose.height,dt);this.heave=heave.value;this.heaveVelocity=heave.velocity;w.boat.position.y=red?0:this.heave;w.boat.rotation.set(red?0:pose.pitch*.7,this.heading,red?0:pose.roll*.7-this.turnRate*this.speed*.018);w.boat.visible=true;const groundIsland=this.closestIsland();const feetHeight=groundHeight(groundIsland,this.pos.x,this.pos.z);w.player.position.set(this.pos.x,this.aboard?1.15+(red?0:this.heave):feetHeight+this.jumpHeight,this.pos.z);if(this.aboard){w.boat.updateMatrixWorld(true);w.player.position.copy(w.boat.localToWorld(new T.Vector3(0,1.15,1.4)));if(!this.fishing)w.player.rotation.y=this.heading+Math.PI;w.player.rotation.x=red?0:-w.boat.rotation.x;w.player.rotation.z=red?0:-w.boat.rotation.z;}else{w.player.rotation.x=0;w.player.rotation.z=0;}w.player.visible=this.playing;if(!this.playing)w.boat.position.set(MAP.islands[0].dock[0],w.boat.position.y,MAP.islands[0].dock[1]);w.wake.position.set(this.boatPos.x,.09,this.boatPos.z);w.wake.rotation.z=this.heading;w.wake.visible=this.aboard&&Math.abs(this.speed)>.3;w.wake.scale.set(1+(Math.sin(this.time*2)*.05),1.4+Math.abs(this.speed)*.13,1);
    const o=objective(this.state),i=MAP.islands.find(i=>i.id===o.island)!;w.marker.position.set(i.dock[0],6,i.dock[1]-12);w.marker.visible=this.playing&&this.pos.distanceTo(w.marker.position)<120;
    this.camera(dt);
    if(this.fishing){const delta=this.fishingTarget.clone().sub(w.player.position);const target=Math.atan2(delta.x,delta.z);w.player.rotation.y+=Math.atan2(Math.sin(target-w.player.rotation.y),Math.cos(target-w.player.rotation.y))*(1-Math.exp(-dt*10));}
    const tiller=w.boat.userData.tiller as T.Group;tiller.rotation.y=T.MathUtils.damp(tiller.rotation.y,this.turnRate*.4,8,dt);(w.boat.userData.rudder as T.Object3D).rotation.y=tiller.rotation.y*1.5;w.boat.updateMatrixWorld(true);
    this.animator.update({dt,time:this.time,walkSpeed:this.actualWalkSpeed,aboard:this.aboard,boatRoll:w.boat.rotation.z,boatPitch:w.boat.rotation.x,turn:this.turnRate,jump:this.jumpHeight,fishing:this.fishing,firstPerson:this.firstPerson,reduced:red,paused:!!this.ui.panel||!this.playing,tiller:this.aboard?(w.boat.userData.tillerHandle as T.Object3D).getWorldPosition(new T.Vector3()):null,floatTarget:this.fishingTarget});
    for(const i of MAP.islands){const el=this.ui.el(`label-${i.id}`);const p=new T.Vector3(i.x,19,i.z);const d=p.distanceTo(w.camera.position);p.project(w.camera);el.style.display=(p.z<1&&Math.abs(p.x)<1.2&&Math.abs(p.y)<1.2&&d<240&&(!this.playing||d>45)&&this.state.discovered.includes(i.id))?'block':'none';el.style.left=`${(p.x*.5+.5)*innerWidth}px`;el.style.top=`${(-p.y*.5+.5)*innerHeight}px`;}
    w.reinforcement.visible=this.state.reinforced;w.float.visible=!!this.fishing;w.updateSail(dt,this.time,this.speed,this.heading,red);
    if(this.fishing){const el=w.wake;w.float.visible=this.fishing.phase==='waiting'||this.fishing.phase==='bite'||this.animator.reelAge<1.1;w.float.position.copy(this.animator.bobber);if(this.animator.castAge>.85&&this.animator.reelAge>1.2)w.float.position.y+=Math.sin(this.time*(this.fishing.phase==='bite'?12:2))*.09;el.visible=this.animator.castAge>.85&&this.animator.reelAge>1.2;el.position.set(this.fishingTarget.x,.09,this.fishingTarget.z);el.scale.setScalar(1+Math.sin(this.time*3)*.05);}
    const storm=this.squall>0;const color=new T.Color(storm?'#839da5':SKY_COLOR);w.sky.material.uniforms.storm.value=T.MathUtils.damp(w.sky.material.uniforms.storm.value,storm?1:0,.4,dt);(w.scene.background as T.Color).lerp(color,dt*.3);w.setAtmosphere(this.playing?this.state.playTime:120,storm);w.companions.update(this.time,dt,w.boat,this.speed,w.sky.material.uniforms.storm.value,red,this.pos,this.state.settings.lowGraphics);w.render(this.time,red,dt);
  }
  frame(t:number){const dt=Math.min((t-this.last)/1000,.05);this.last=t;this.time+=dt;if(this.playing&&!this.ui.panel)this.simulation(dt);if(this.time>this.hudAt){this.hudAt=this.time+.2;(this.ui.el('action-bar').querySelector('[data-action=anchor]') as HTMLButtonElement).disabled=!this.aboard;this.ui.el('anchor-label').textContent=this.anchored?'Raise anchor':'Drop anchor';this.updateInteraction();this.ui.update(this.state,this.pos.x,this.pos.z,this.heading,this.aboard);}this.visuals(dt);requestAnimationFrame(next=>this.frame(next));}
}
