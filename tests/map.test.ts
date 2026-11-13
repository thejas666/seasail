import {test} from 'node:test';
import assert from 'node:assert/strict';
import {UI} from '../src/ui';
import {freshState} from '../src/state';
test('all island locations remain mapped while names reveal through discovery',()=>{const ui=Object.create(UI.prototype) as UI,s=freshState();let map=ui.mapSVG(s,0,0,0,true);assert.equal((map.match(/Unexplored island/g)||[]).length,4);assert.ok(map.includes('Palm Island'));assert.equal(map.includes('Wreck Island'),false);s.discovered.push('wreck');map=ui.mapSVG(s,0,0,0,true);assert.equal((map.match(/Unexplored island/g)||[]).length,3);assert.ok(map.includes('Wreck Island'));s.chart=true;map=ui.mapSVG(s,0,0,0,true);assert.ok(map.includes('Sunhaven Harbor'));});
