import * as THREE from 'three';
import rings from './surf-rings.json' with {type:'json'};

export function createSeagrass(scene,world,applyUnderwater,time){
 let seed=7209;const random=()=>((seed=(1664525*seed+1013904223)>>>0)/4294967296);
 const floor=[];world.traverse(o=>{if(o.isMesh&&o.material.name==='Submerged sand')floor.push(o);});world.updateMatrixWorld(true);
 const ray=new THREE.Raycaster(),blades=[];
 for(let clump=0;clump<64;clump++){
  const index=Math.floor(random()*rings[2].length),edge=rings[2][index],r=1.04+random()*.26;
  const x=13.5+(edge[0]-13.5)*r,z=edge[2]*r;
  if((x>12.5&&x<18&&z>7)||Math.hypot(x-7.14,z-14.28)<2.2)continue;
  ray.set(new THREE.Vector3(x,4,z),new THREE.Vector3(0,-1,0));const hit=ray.intersectObjects(floor,false)[0];if(!hit)continue;
  const count=4+Math.floor(random()*8);
  for(let j=0;j<count;j++){
   const h=Math.min(.45+random()*.90,-.30-hit.point.y);
   if(h<.22)continue;
   blades.push({x:x+(random()-.5)*.75,y:hit.point.y-.035,z:z+(random()-.5)*.65,h,angle:random()*Math.PI*2,width:.055+random()*.07,tint:random()});
  }
 }
 const vertices=[],indices=[];
 for(let row=0;row<=7;row++){
  const y=row/7,width=Math.pow(1-y,.65);
  vertices.push(-width*.5,y,Math.sin(y*Math.PI)*.17,width*.5,y,Math.sin(y*Math.PI)*.17);
  if(row<7){const k=row*2;indices.push(k,k+2,k+1,k+1,k+2,k+3);}
 }
 const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));geometry.setIndex(indices);geometry.computeVertexNormals();
 const material=new THREE.MeshStandardMaterial({color:0xffffff,roughness:.9,side:THREE.DoubleSide});applyUnderwater(material);
 const underwater=material.onBeforeCompile;
 material.onBeforeCompile=shader=>{
  underwater(shader);shader.uniforms.uGrassTime=time;
  shader.vertexShader='uniform float uGrassTime;\n'+shader.vertexShader;
  shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>',`#include <begin_vertex>
   vec3 root=instanceMatrix[3].xyz;
   float bend=sin(uGrassTime*.85+root.x*.63+root.z*.48)*.22+sin(uGrassTime*.43+root.z)*.10;
   transformed.x+=bend*position.y*position.y/max(length(instanceMatrix[0].xyz),.03);
   transformed.z+=cos(uGrassTime*.65+root.x)*.08*position.y*position.y;
  `);
 };
 material.customProgramCacheKey=()=> 'anchored-seagrass-v1';
 const grass=new THREE.InstancedMesh(geometry,material,blades.length),dummy=new THREE.Object3D();
 blades.forEach((b,i)=>{
  dummy.position.set(b.x,b.y,b.z);dummy.rotation.set(0,b.angle,0);dummy.scale.set(b.width,b.h,1);dummy.updateMatrix();grass.setMatrixAt(i,dummy.matrix);
  grass.setColorAt(i,new THREE.Color().lerpColors(new THREE.Color(0x527440),new THREE.Color(0x98ad59),b.tint));
 });
 grass.receiveShadow=true;scene.add(grass);return grass;
}
