import {test} from 'node:test';
import assert from 'node:assert/strict';
import {blockedAt} from '../src/systems/collision';
import {daylightAt} from '../src/systems/atmosphere';
test('trunks and rocks collide with the player capsule rather than only its center',()=>{const trees=[{x:0,z:0,r:.3}];assert.equal(blockedAt(.5,0,trees,[]),true);assert.equal(blockedAt(.8,0,trees,[]),false);});
test('buildings and rotated wrecks stop movement, while passing beside a wall stays possible',()=>{const boxes=[{x:0,z:0,hx:3,hz:2,angle:Math.PI/4}];assert.equal(blockedAt(0,0,[],boxes),true);assert.equal(blockedAt(5,5,[],boxes),false);assert.equal(blockedAt(2.9,0,[],[{x:0,z:0,hx:3,hz:2}]),true);assert.equal(blockedAt(3.5,0,[],[{x:0,z:0,hx:3,hz:2}]),false);});
test('day and night cycle is continuous, repeats, and leaves gameplay time unconstrained',()=>{assert.equal(daylightAt(0).night,0);assert.equal(daylightAt(800).night,1);assert.deepEqual(daylightAt(1080),daylightAt(0));assert.ok(daylightAt(600).sunset>0);for(let t=0;t<1080;t+=5){const a=daylightAt(t),b=daylightAt(t+1);assert.ok(Math.abs(a.night-b.night)<.02);}});
