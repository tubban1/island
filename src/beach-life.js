import islandSize from './island-size.json' with {type:'json'};
const ISLAND_SCALE=islandSize.linearScale;
import * as THREE from 'three';

// Small shore inhabitants share geometry; their paths stay on the exposed sand.
export function createBeachLife(scene,world){
 const shell=new THREE.MeshStandardMaterial({color:0xdc6945,roughness:.85});
 const dark=new THREE.MeshStandardMaterial({color:0x253b32,roughness:.8});
 const sphere=new THREE.SphereGeometry(1,8,6),limb=new THREE.CylinderGeometry(1,1,1,5);
 const crabs=[];
 const sandMeshes=[];world.traverse(o=>{if(o.isMesh && o.material.name==='Warm lagoon sand')sandMeshes.push(o);});
 // Sample the actual sloping beach, so shells and feet sit on the surface.
 world.updateMatrixWorld(true);const groundRay=new THREE.Raycaster();
 const groundAt=(x,z)=>{groundRay.set(new THREE.Vector3(x,4,z),new THREE.Vector3(0,-1,0));return groundRay.intersectObjects(sandMeshes,false)[0]?.point.y ?? .37;};
 const shellMat=new THREE.MeshStandardMaterial({color:0xffefd3,roughness:.9,side:THREE.DoubleSide});
 const pinkMat=new THREE.MeshStandardMaterial({color:0xedb39b,roughness:.9,side:THREE.DoubleSide});
 const vertices=[0,.12,0],indices=[];
 for(let j=0;j<=16;j++){const a=-1.15+j/16*2.3,r=j%2?.87:1;vertices.push(Math.sin(a)*r,0,Math.cos(a)*r);if(j)indices.push(0,j+1,j);}
 const fan=new THREE.BufferGeometry();fan.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));fan.setIndex(indices);fan.computeVertexNormals();
 for(let i=0;i<42;i++){
  const a=i*2.39996,r=.74+((i*17)%11)/100,x=13.5+9.4*ISLAND_SCALE*r*Math.cos(a),z=7.1*ISLAND_SCALE*r*Math.sin(a),mesh=new THREE.Mesh(fan,i%3? shellMat:pinkMat);
  mesh.position.set(x,groundAt(x,z)+.012,z);mesh.rotation.y=i*1.31;mesh.scale.setScalar(.075+(i%5)*.014);scene.add(mesh);
 }
 function oval(parent,material,position,scale){const mesh=new THREE.Mesh(sphere,material);mesh.position.set(...position);mesh.scale.set(...scale);mesh.castShadow=true;parent.add(mesh);return mesh;}
 function segment(parent,a,b,r){const start=new THREE.Vector3(...a),end=new THREE.Vector3(...b),dir=end.clone().sub(start),mesh=new THREE.Mesh(limb,shell);mesh.position.copy(start).add(end).multiplyScalar(.5);mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),dir.clone().normalize());mesh.scale.set(r,dir.length(),r);parent.add(mesh);}
 for(let i=0;i<9;i++){
  const angle=.5+i*.64,r=.80+(i%3)*.016,x=13.5+9.4*ISLAND_SCALE*r*Math.cos(angle),z=7.1*ISLAND_SCALE*r*Math.sin(angle),group=new THREE.Group();
  oval(group,shell,[0,.1,0],[.15,.075,.105]);
  const legs=[];
  for(const side of [-1,1]){
   for(let j=0;j<4;j++){
    const leg=new THREE.Group();group.add(leg);const zz=(j-1.5)*.057;
    segment(leg,[side*.09,.09,zz],[side*.22,.09,zz+(j-1.5)*.04],.014);
    segment(leg,[side*.22,.09,zz+(j-1.5)*.04],[side*.28,.0,zz+(j-1.5)*.06],.011);legs.push(leg);
   }
   segment(group,[side*.10,.1,.06],[side*.22,.14,.18],.023);
   oval(group,shell,[side*.22,.15,.21],[.065,.04,.075]);
   oval(group,shell,[side*.25,.15,.27],[.027,.025,.05]);
   oval(group,shell,[side*.19,.15,.265],[.023,.025,.042]);
   segment(group,[side*.05,.13,.065],[side*.055,.19,.1],.012);
   oval(group,dark,[side*.055,.19,.1],[.022,.022,.022]);
  }
  group.position.set(x,groundAt(x,z)+.012,z);group.rotation.y=-angle;group.scale.setScalar(.75+(i%3)*.14);scene.add(group);crabs.push({group,legs,x,z,angle});
 }
 return {update(time){crabs.forEach(({group,legs,x,z,angle},i)=>{
  const phase=time*.7+i*2,motion=Math.sin(phase)*.20;
  group.position.x=x+Math.sin(angle)*motion;group.position.z=z-Math.cos(angle)*motion;
  legs.forEach((leg,j)=>leg.rotation.y=Math.sin(time*9+i+j*2)*.13*Math.abs(Math.cos(phase)));
 });}};
}
