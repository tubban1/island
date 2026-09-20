import assert from 'node:assert/strict';
import {createTurtleSimulation} from '../src/turtle.js';
let seed=291;const random=()=>((seed=(1664525*seed+1013904223)>>>0)/4294967296);
const sim=createTurtleSimulation(random),arrivals=[];let visits=0,paused=0;
for(let i=0;i<48000;i++){
 const before={...sim.state},s=sim.update(.05);
 assert.ok([s.x,s.z,s.heading].every(Number.isFinite));
 assert.ok(Math.hypot(s.x-before.x,s.z-before.z)<=.055,'no teleporting between land and water');
 if(!s.moving)paused++;
 if(s.visits!==visits){arrivals.push({...s});visits=s.visits;}
}
assert.ok(arrivals.length>=6,'repeatedly enters and leaves water');
assert.ok(paused>100,'rests between trips');
assert.ok(new Set(arrivals.map(s=>s.x.toFixed(1))).size>3,'landing positions vary');
for(let i=1;i<arrivals.length;i++)assert.notEqual(arrivals[i].destination,arrivals[i-1].destination);
assert.ok(Math.max(...arrivals.map(s=>s.x))-Math.min(...arrivals.map(s=>s.x))>20,'visits distant island coasts');
assert.ok(arrivals.some(s=>s.z<0)&&arrivals.some(s=>s.z>0),'visits front and rear shores');
console.log('Passed: turtle alternates shore/water, varies destinations, pauses and moves continuously.');
