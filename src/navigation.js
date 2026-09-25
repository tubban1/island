import * as THREE from 'three';
import layout from './harbour-layout.json' with {type:'json'};
import {shoreline} from './coast-shape.js';

// Radius encloses the complete hull at any heading, including bow and stern.
export const HULL_RADIUS=1.38;
export const dockPolygon=[[-1.40,-.3],[1.40,-.3],[1.40,layout.dock.length+.3],[-1.40,layout.dock.length+.3]].map(([x,z])=>[
 layout.dock.x+x*Math.cos(layout.dock.angle)+z*Math.sin(layout.dock.angle),
 layout.dock.z-x*Math.sin(layout.dock.angle)+z*Math.cos(layout.dock.angle)
]);
function inside(x,z,poly){
 let hit=false;
 for(let i=0,j=poly.length-1;i<poly.length;j=i++){
  const [ax,az]=poly[i],[bx,bz]=poly[j];
  if((az>z)!==(bz>z) && x<(bx-ax)*(z-az)/(bz-az)+ax)hit=!hit;
 }
 return hit;
}
export function circleHitsPolygon(x,z,radius,poly){
 if(inside(x,z,poly))return true;
 for(let i=0;i<poly.length;i++){
  const [ax,az]=poly[i],[bx,bz]=poly[(i+1)%poly.length],dx=bx-ax,dz=bz-az;
  const t=Math.max(0,Math.min(1,((x-ax)*dx+(z-az)*dz)/(dx*dx+dz*dz)));
  if(Math.hypot(x-ax-t*dx,z-az-t*dz)<=radius)return true;
 }
 return false;
}
export function canSail(x,z){
 return Math.abs(x)<47 && Math.abs(z)<34 && !circleHitsPolygon(x,z,HULL_RADIUS,shoreline) && !circleHitsPolygon(x,z,HULL_RADIUS,dockPolygon) && Math.hypot(x-layout.mooring.x,z-layout.mooring.z)>2.45 && Math.hypot(x-layout.mooring.postX,z-layout.mooring.postZ)>HULL_RADIUS+.2;
}
// Sweep the entire move to prevent tunneling across land or the pier at low frame rates.
export function canMove(from,to){
 const steps=Math.max(1,Math.ceil(Math.hypot(to.x-from.x,to.z-from.z)/.18));
 for(let i=1;i<=steps;i++)if(!canSail(THREE.MathUtils.lerp(from.x,to.x,i/steps),THREE.MathUtils.lerp(from.z,to.z,i/steps)))return false;
 return true;
}
export function createSailingRoute(){
 return new THREE.CatmullRomCurve3([
  [-5,3],[-5,12],[-10,12],[-10,-5],[-5,-18],[12,-19],[30,-17],[33,0],[31,20],[18,22],[5,22],[-5,12],[-5,3]
 ].map(([x,z])=>new THREE.Vector3(x,.15,z)),false,'catmullrom',.32);
}
