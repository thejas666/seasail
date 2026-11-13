import {test} from 'node:test';
import assert from 'node:assert/strict';
import {advanceSailing,waterPose,spring,advanceJump} from '../src/systems/physics';
test('sailing builds momentum gradually and coasts after releasing the throttle',()=>{
  let m={heading:0,speed:0,turnRate:0};m=advanceSailing(m,1,0,.05,false,false);assert.ok(m.speed>0&&m.speed<.1);
  for(let i=0;i<300;i++)m=advanceSailing(m,1,0,.05,false,false);assert.equal(m.speed,4.5);
  const released=advanceSailing(m,0,0,.05,false,false);assert.ok(released.speed<m.speed&&released.speed>4);
});
test('rudder response has inertia and the anchor stops throttle and turning',()=>{
  let m={heading:0,speed:4,turnRate:0};m=advanceSailing(m,1,1,.05,true,false);assert.ok(m.turnRate>0&&m.turnRate<.3);
  for(let i=0;i<200;i++)m=advanceSailing(m,1,1,.05,true,true);assert.equal(m.speed,0);assert.ok(Math.abs(m.turnRate)<.001);
});
test('wave-driven buoyancy stays bounded and a damped hull settles',()=>{
  for(let t=0;t<30;t+=.1){const p=waterPose(30,-50,1.2,t);assert.ok(Math.abs(p.height)<.5);assert.ok(Math.abs(p.pitch)<.15);assert.ok(Math.abs(p.roll)<.15);}
  let value=0,velocity=0;for(let i=0;i<300;i++){const next=spring(value,velocity,.25,1/60);value=next.value;velocity=next.velocity;}assert.ok(Math.abs(value-.25)<.001);
});
test('a hop follows gravity and lands without sinking',()=>{
  let p={height:.01,velocity:4.6},peak=0;for(let i=0;i<150;i++){p=advanceJump(p.height,p.velocity,1/60);peak=Math.max(peak,p.height);}assert.ok(peak>.5&&peak<1.2);assert.deepEqual(p,{height:0,velocity:0});
});
