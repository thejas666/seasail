import './style.css';
import { Game } from './game';
try {new Game(document.getElementById('app')!);}catch(error){
  console.error(error);const container=document.getElementById('app')!;
  container.innerHTML='<div class="loading error"><h1>A little calmer water ahead.</h1><p>This game needs WebGL to render its 3D ocean. Enable hardware acceleration in your browser, then reload to set sail.</p><button class="primary" onclick="location.reload()">Try again</button></div>';
}
