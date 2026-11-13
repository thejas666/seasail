import {test} from 'node:test';
import assert from 'node:assert/strict';
import {SailCloth} from '../src/systems/sail-cloth';
function sail(){const p:number[]=[];for(let row=0;row<=8;row++)for(let col=0;col<=8;col++){const t=row/8,u=col/8;p.push(.1+Math.sin(t*Math.PI)*Math.sin(u*Math.PI)*.4,5-t*4,u*t*2.5);}return new SailCloth(new Float32Array(p),8,8);}
test('wind deforms the sail while the mast and boom remain pinned',()=>{const cloth=sail();for(let frame=0;frame<300;frame++)cloth.advance(1/60,frame/60,3,.4,0);let moved=0;for(let i=0;i<cloth.fixed.length;i++){for(let axis=0;axis<3;axis++){const n=i*3+axis;assert.ok(Number.isFinite(cloth.positions[n]));if(cloth.fixed[i])assert.equal(cloth.positions[n],cloth.rest[n]);else moved=Math.max(moved,Math.abs(cloth.positions[n]-cloth.rest[n]));}}assert.ok(moved>.025);});
test('performance mode remains stable in gusts; reduced motion restores a steady sail',()=>{const cloth=sail();for(let frame=0;frame<500;frame++)cloth.advance(.05,frame*.05,5,1,1,true);assert.ok([...cloth.positions].every(Number.isFinite));assert.ok(Math.max(...cloth.positions)<8);cloth.advance(.05,30,0,0,0,true,true);assert.deepEqual(cloth.positions,cloth.rest);});
