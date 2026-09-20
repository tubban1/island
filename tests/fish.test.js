import assert from 'node:assert/strict';
import { createFishSimulation } from '../src/fish.js';
const sim=createFishSimulation(),f=sim.fish[0],hull={x:f.x+.7,z:f.z,fx:1,fz:0,speed:5};
const initial=Math.hypot(f.x-hull.x,f.z-hull.z);
for(let i=0;i<30;i++)sim.update(1/60,i/60,hull);
assert.ok(f.panic>.5);assert.ok(Math.hypot(f.x-hull.x,f.z-hull.z)>initial);
const slow=createFishSimulation();slow.update(1/30,0,{x:-8,z:1.5,fx:0,fz:1,speed:1});assert.ok(slow.fish.some(f=>f.mode==='follow'));
const stopped=createFishSimulation();stopped.update(1/30,0,{x:-8,z:1.5,fx:0,fz:1,speed:0});assert.ok(stopped.fish.every(f=>f.mode!=='follow'));
const click=createFishSimulation();click.attract(-8,6);const far={x:40,z:30,fx:0,fz:1,speed:0};click.update(1/30,0,far);assert.ok(click.fish.some(f=>f.mode==='curious'));
for(let i=1;i<400;i++)click.update(1/30,i/30,far);
assert.ok(click.fish.every(f=>f.mode!=='curious' && f.y<-.18 && [f.x,f.y,f.z,f.vx,f.vz].every(Number.isFinite)));
console.log('Passed: hull avoidance, slow escort, stop, click attraction, expiry, stable submerged positions.');

assert.equal(new Set(sim.fish.map(f=>f.species)).size,4);
const shelf=createFishSimulation();
for(let i=0;i<240;i++)shelf.update(1/30,i/30,far);
for(const f of shelf.fish){
 const r=Math.hypot((f.x-13.5)/(10.15*Math.SQRT2),f.z/(7.65*Math.SQRT2)),floor=-.38-Math.max(0,r-.90)*4.5;
 if(r>1.02)assert.ok(f.y>=floor+.21, 'Fish should remain above the sandy shelf');
}
console.log('Passed: four species and fish clearance above submerged sand.');
