import * as THREE from 'three';
import {mergeGeometries} from 'three/examples/jsm/utils/BufferGeometryUtils.js';

export function addHarbourBlooms(world){
 const materials=['#ed6980','#fff0cf','#eab851','#668c39','#9bb458'].map(color=>new THREE.MeshStandardMaterial({color,roughness:.85}));
 const buckets=materials.map(()=>[]),sphere=new THREE.SphereGeometry(1,9,6);
 function oval(x,y,z,sx,sy,sz,rotation,material){const g=sphere.clone();g.scale(sx,sy,sz);g.rotateZ(rotation);g.translate(x,y,z);buckets[material].push(g);}
 function bloom(x,y,z,size,type,angle){
  const starts=buckets.map(b=>b.length);
  const count=type===0?5:type===1?5:11;
  for(let i=0;i<count;i++){
   const a=i/count*Math.PI*2+angle,r=size*(type===1?.48:.60);
   const variation=1+.13*Math.sin(i*2.7+angle);
   // Broad cupped hibiscus, overlapping pinwheel petals, slender daisies.
   oval(Math.cos(a)*r,Math.sin(a)*r,type===0?size*.16*Math.cos(i*1.8):0,
    size*(type===2?.51:type===1?.58:.67)*variation,
    size*(type===2?.13:type===1?.29:.43),size*(type===0?.22:.12),a+(type===1?.50:0),type===0?0:1);
  }
  oval(0,0,size*.16,size*.20,size*.20,size*.15,0,2);
  if(type===0){const g=new THREE.CylinderGeometry(size*.035,size*.04,size*.8,5);g.rotateX(Math.PI/2);g.translate(0,0,size*.45);buckets[2].push(g);}
  const orientation=new THREE.Matrix4().makeRotationFromEuler(new THREE.Euler(-.35-.45*Math.sin(angle*1.3),.65*Math.sin(angle*.83),.18*Math.cos(angle)));
  orientation.setPosition(x,y,z);
  buckets.forEach((bucket,i)=>{for(let j=starts[i];j<bucket.length;j++)bucket[j].applyMatrix4(orientation);});
 }
 function blade(x,y,z,length,width,angle,lean,material){
  const p=[],uv=[],indices=[];
  for(let k=0;k<=10;k++){
   const t=k/10,w=width*Math.pow(Math.sin(Math.PI*t),.8);
   for(const side of [-1,0,1]){p.push(side*w,t*length,lean*t*t+(side===0?.035*Math.sin(Math.PI*t):0));uv.push((side+1)/2,t);}
   if(k<10)for(let s=0;s<2;s++){const a=k*3+s;indices.push(a,a+3,a+1,a+1,a+3,a+4);}
  }
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(p,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.setIndex(indices);g.computeVertexNormals();g.rotateY(angle);g.translate(x,y,z);buckets[material].push(g);
 }
 materials[3].side=materials[4].side=THREE.DoubleSide;
 // Large hibiscus around the entrance, tiny daisies in loose ground clusters.
 for(let i=0;i<26;i++){
  const side=i%2?-1:1,x=15.0+side*(2.1+.65*Math.sin(i*1.7)),z=.6+((i*7)%13)*.22,y=.68+(i%4)*.15;
  const type=i%3,size=(type===0?.22:type===1?.14:.095)*(1+.20*Math.sin(i*2.3));
  bloom(x,y,z,size,type,i*.9);
  for(let j=0;j<4+i%3;j++){
   const narrow=i%3===2,a=j*2.399+i;
   blade(x+Math.cos(a)*.12,.48,z+Math.sin(a)*.12,
    (narrow?.48:.30)+.16*(1+Math.sin(i+j*1.7)),narrow?.025:.075+.035*(j%2),a,.12+.22*(j%3),3+j%2);
  }
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
