import * as THREE from 'three';
import {mergeGeometries} from 'three/examples/jsm/utils/BufferGeometryUtils.js';

export function addHarbourBlooms(world){
 const materials=['#ed6980','#fff0cf','#eab851','#668c39','#9bb458'].map(color=>new THREE.MeshStandardMaterial({color,roughness:.85}));
 const buckets=materials.map(()=>[]),sphere=new THREE.SphereGeometry(1,9,6);
 function oval(x,y,z,sx,sy,sz,rotation,material){const g=sphere.clone();g.scale(sx,sy,sz);g.rotateZ(rotation);g.translate(x,y,z);buckets[material].push(g);}
 function bloom(x,y,z,size,type,angle){
  const count=type===0?5:type===1?5:9;
  for(let i=0;i<count;i++){
   const a=i/count*Math.PI*2+angle,r=size*.60;
   oval(x+Math.cos(a)*r,y+Math.sin(a)*r,z,size*(type===2?.51:.67),size*(type===2?.17:.43),size*.15,a,type===0?0:1);
  }
  oval(x,y,z+size*.16,size*.20,size*.20,size*.15,0,2);
  if(type===0){const g=new THREE.CylinderGeometry(size*.035,size*.04,size*.8,5);g.rotateX(Math.PI/2);g.translate(x,y,z+size*.45);buckets[2].push(g);}
 }
 // Large hibiscus around the entrance, tiny daisies in loose ground clusters.
 for(let i=0;i<26;i++){
  const side=i%2?-1:1,x=15.0+side*(2.1+.65*Math.sin(i*1.7)),z=.6+((i*7)%13)*.22,y=.68+(i%4)*.15;
  const type=i%3,size=type===0?.22:.095;
  bloom(x,y,z,size,type,i*.9);
  for(let j=0;j<3;j++)oval(x+(j-1)*.13,y-.14,z-.05,.12,.24,.035,(j-1)*.8,3+j%2);
 }
 // Bougainvillea spills from the eaves in unequal strands, away from windows.
 for(const [x,z,length]of [[11.98,.96,1.55],[17.57,1.0,1.15],[12.65,-3.72,.75]]){
  for(let i=0;i<12;i++){
   const t=i/11,xx=x+Math.sin(t*6)*.14,y=3.66-t*length;
   oval(xx,y,z,.17,.13,.05,i*.9,3+i%2);
   if(i%3!==1)bloom(xx+.09*Math.sin(i*2),y,z+.10,.10+(i%3)*.018,0,i);
  }
 }
 for(let i=0;i<buckets.length;i++){if(!buckets[i].length)continue;const g=mergeGeometries(buckets[i].map(g=>g.index?g.toNonIndexed():g));const m=new THREE.Mesh(g,materials[i]);m.castShadow=m.receiveShadow=true;world.add(m);buckets[i].forEach(g=>g.dispose());}
 sphere.dispose();
}
