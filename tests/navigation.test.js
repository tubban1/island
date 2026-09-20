import assert from 'node:assert/strict';
import {canSail,canMove,createSailingRoute,circleHitsPolygon,HULL_RADIUS,dockPolygon} from '../src/navigation.js';
assert.equal(canSail(14,0),false,'island interior blocked');
assert.equal(canSail(14,-8),false,'expanded rear beach blocked');
assert.equal(canSail(15.05,9.5),false,'aligned pier deck blocked');
assert.equal(canSail(17.1,10),false,'bow cannot overlap aligned pier');
assert.equal(canMove({x:12,z:10},{x:19,z:10}),false,'sweep cannot tunnel through pier');
assert.equal(canMove({x:-2,z:0},{x:29,z:0}),false,'sweep cannot tunnel through island');
assert.equal(canSail(-6,4),true,'open water stays navigable');
assert.equal(circleHitsPolygon(15.05,16.8,HULL_RADIUS,dockPolygon),true,'stern clearance at pier end');
assert.equal(canSail(7.14,14.28),false,'relocated moored boat blocked');
assert.equal(canSail(8.5,15),false,'mooring post blocked');
assert.equal(canSail(33,9.05),true,'outer channel is free water');
const route=createSailingRoute();let previous=route.getPointAt(0);
for(let i=0;i<=2500;i++){
 const p=route.getPointAt(i/2500);
 assert.ok(canSail(p.x,p.z),`auto route blocked at ${i}: ${p.x}, ${p.z}`);
 assert.ok(canMove(previous,p),`auto sweep blocked at ${i}`);previous=p;
}
console.log('Passed: shore, rear beach, pier, hull radius, swept collisions, full automatic route.');
