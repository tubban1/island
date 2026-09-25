import * as THREE from 'three';
import {mergeGeometries} from 'three/examples/jsm/utils/BufferGeometryUtils.js';

// One lived-in garden corner, leaving the front-door / pier route clear.
export function createIslandRetreat(world){
 const group=new THREE.Group();group.name='Palm hammock garden';world.add(group);
 const sand=[];world.traverse(o=>{if(o.isMesh&&o.material.name==='Warm lagoon sand')sand.push(o);});
 world.updateMatrixWorld(true);const ray=new THREE.Raycaster();
 const ground=(x,z)=>{ray.set(new THREE.Vector3(x,8,z),new THREE.Vector3(0,-1,0));return ray.intersectObjects(sand)[0]?.point.y??.3;};
 const material=(color)=>new THREE.MeshStandardMaterial({color,roughness:.86});
 const wood=material('#9d7449'),ivory=material('#f5e6c5'),teal=material('#397e80'),stone=material('#968e7a');
 wood.userData.ageKind='wood';stone.userData.ageKind='stone';
 const greens=['#47743a','#6b9342','#91a650'].map(material),pink=material('#e48776');
 const add=(g,m,x,y,z)=>{const o=new THREE.Mesh(g,m);o.position.set(x,y,z);o.castShadow=o.receiveShadow=true;group.add(o);return o;};
 function beam(a,b,r,m=wood){const av=new THREE.Vector3(...a),bv=new THREE.Vector3(...b),delta=bv.clone().sub(av);const o=add(new THREE.CylinderGeometry(r,r*1.12,delta.length(),8),m,...av.clone().add(bv).multiplyScalar(.5).toArray());o.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),delta.normalize());}
 const sphere=new THREE.SphereGeometry(1,10,7);
 function leaf(x,y,z,length,angle,m){const o=add(sphere,m,x,y,z);o.scale.set(.13,length,.035);o.rotation.set(.65,angle,.7*Math.sin(angle));return o;}
 const baseY=ground(7,-3.8);
 // Curved trunks, with narrow overlapping leaflets rather than solid green fans.
 for(const [x,z,side] of [[4.8,-3.8,-1],[9.2,-3.8,1]]){
  const y=ground(x,z),curve=new THREE.CatmullRomCurve3([new THREE.Vector3(x,y,z),new THREE.Vector3(x+side*.28,y+1.65,z),new THREE.Vector3(x+side*.60,y+3.4,z-.12)]);
  add(new THREE.TubeGeometry(curve,16,.13,8,false),wood,0,0,0);
  const crown=curve.getPoint(1);
  for(let f=0;f<9;f++){
   const a=f*Math.PI*2/9;
   for(let k=1;k<=10;k++){
    const t=k/10,r=t*1.65,yy=Math.sin(t*Math.PI)*.40-t*t*.45;
    for(const side of [-1,1]){
     const pos=crown.clone().add(new THREE.Vector3(Math.cos(a)*r,yy,Math.sin(a)*r));
     const l=leaf(pos.x,pos.y,pos.z,.22*Math.sin(t*Math.PI)+.07,a+side*.8,greens[f%3]);l.rotation.z=1.0;l.rotation.x=a+side*.6;
    }
   }
  }
 }
 const hammock=new THREE.Group();hammock.position.set(7,baseY+1.1,-3.8);group.add(hammock);
 const vertices=[],uv=[],indices=[];
 for(let i=0;i<=32;i++)for(let j=0;j<=10;j++){
  const u=i/32,v=j/10,x=(u-.5)*3.8,z=(v-.5)*.95*Math.sin(Math.PI*u);
  vertices.push(x,-.64*Math.sin(Math.PI*u)+.16*Math.pow((v-.5)*2,2),z);uv.push(u,v);
  if(i<32&&j<10){const n=i*11+j;indices.push(n,n+11,n+1,n+1,n+11,n+12);}
 }
 const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));geo.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));geo.setIndex(indices);geo.computeVertexNormals();
 ivory.side=THREE.DoubleSide;const cloth=new THREE.Mesh(geo,ivory);cloth.castShadow=cloth.receiveShadow=true;hammock.add(cloth);
 for(const side of [-1,1])beam([7+side*1.9,baseY+1.1,-3.8],[7+side*2.2,baseY+1.5,-3.8],.024,ivory);
 const pillow=new THREE.Mesh(new THREE.SphereGeometry(1,14,8),teal);pillow.position.set(-1.1,-.37,0);pillow.scale.set(.32,.09,.28);hammock.add(pillow);
 // Small breakfast spot: weathered round table, stools, ceramic cup and fruit.
 const tx=7.8,tz=.3,ty=ground(tx,tz);
 add(new THREE.CylinderGeometry(.65,.65,.10,24),wood,tx,ty+.72,tz);
 beam([tx,ty,tz],[tx,ty+.7,tz],.12);
 for(const a of [.7,3.4]){const x=tx+Math.cos(a),z=tz+Math.sin(a),y=ground(x,z);add(new THREE.CylinderGeometry(.27,.30,.42,12),wood,x,y+.21,z);}
 add(new THREE.CylinderGeometry(.085,.06,.13,12),ivory,tx-.24,ty+.835,tz);
 add(new THREE.CylinderGeometry(.23,.20,.035,20),teal,tx+.19,ty+.79,tz);
 for(let i=0;i<3;i++){const fruit=add(sphere,pink,tx+.12+i*.08,ty+.85,tz+(i%2)*.08);fruit.scale.setScalar(.075);}
 // Loose ground-cover clusters: tall leaves in back, smaller plants at the edge.
 for(let i=0;i<22;i++){
  const a=i*2.39996,x=7+Math.cos(a)*(2.7+(i%3)*.23),z=-2.2+Math.sin(a)*2.6;
  if(z>-.1&&x>7)continue;
  const y=ground(x,z);if(y<.12)continue;
  for(let j=0;j<5;j++){const b=j*2.4+i;leaf(x+Math.cos(b)*.15,y+.20+(j%3)*.10,z+Math.sin(b)*.15,.24+(j%3)*.10,b,greens[(i+j)%3]);}
  if(i%4===0){const r=add(new THREE.IcosahedronGeometry(1,1),stone,x+.35,y+.1,z);r.scale.set(.30,.23,.28);}
 }
 // Batch static props by material; the cloth is the only moving garden object.
 const batches=new Map();
 for(const o of [...group.children]){if(!o.isMesh)continue;o.updateMatrix();const g=o.geometry.index?o.geometry.toNonIndexed():o.geometry.clone();g.applyMatrix4(o.matrix);for(const key of Object.keys(g.attributes))if(!['position','normal','uv'].includes(key))g.deleteAttribute(key);if(!batches.has(o.material))batches.set(o.material,[]);batches.get(o.material).push(g);group.remove(o);}
 for(const [m,geometries]of batches){const merged=new THREE.Mesh(mergeGeometries(geometries),m);merged.castShadow=merged.receiveShadow=true;group.add(merged);geometries.forEach(g=>g.dispose());}
 return {update(t){hammock.rotation.x=Math.sin(t*.63)*.035;}};
}
