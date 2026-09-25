import shorelineSource from './shoreline.json' with {type:'json'};
import ringsSource from './surf-rings.json' with {type:'json'};

const smooth=(a,b,x)=>{const t=Math.max(0,Math.min(1,(x-a)/(b-a)));return t*t*(3-2*t);};
// One deformation shared by terrain, surf, water depth, navigation and turtles.
// The southern approach and house plateau stay fixed.
export function shapeCoast(x,z){
 const dx=x-13.5,r=Math.hypot(dx/15,z/12),angle=Math.atan2(z/12,dx/15);
 const lobe=(center,width)=>Math.exp(-Math.pow(Math.atan2(Math.sin(angle-center),Math.cos(angle-center))/width,2));
 const delta=(-1.6*lobe(-.10,.38)+1.25*lobe(-2.20,.31)-.65*lobe(-1.25,.30));
 const fade=smooth(.60,.94,r)*(1-smooth(1.45,2.2,r)),length=Math.hypot(dx,z)||1;
 return [x+dx/length*delta*fade,z+z/length*delta*fade];
}
export const shoreline=shorelineSource.map(([x,z])=>shapeCoast(x,z));
export const surfRings=ringsSource.map(ring=>ring.map(([x,y,z])=>{const p=shapeCoast(x,z);return [p[0],y,p[1]];}));
export function reshapeIslandTerrain(world){
 world.traverse(o=>{
  if(!o.isMesh)return;
  // The imported model is batched in world coordinates. Move every outer-coast
  // surface together so reef rocks / coral do not detach from the seabed.
  const g=o.geometry.clone(),p=g.attributes.position;
  for(let i=0;i<p.count;i++){const [x,z]=shapeCoast(p.getX(i),p.getZ(i));p.setX(i,x);p.setZ(i,z);}
  p.needsUpdate=true;g.computeVertexNormals();g.computeBoundingSphere();g.computeBoundingBox();o.geometry=g;
 });
}
