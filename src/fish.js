import islandSize from './island-size.json' with {type:'json'};
const ISLAND_SCALE=islandSize.linearScale;
import * as THREE from 'three';

export function createFishSimulation(seed=42){
 let state=seed>>>0;const random=()=>((state=(1664525*state+1013904223)>>>0)/4294967296);
 const homes=[[-2,4],[2,8],[2,-5],[20,9],[-6,-2],[7,12]].map(([x,z])=>[13.5+(x-13.5)*ISLAND_SCALE,z*ISLAND_SCALE]);
 const fish=homes.flatMap(([x,z],school)=>Array.from({length:16},(_,index)=>({x:x+(random()-.5)*3,z:z+(random()-.5)*2,y:-.6-random()*.7,vx:.6,vz:.3,school,index,species:(school+Math.floor(index/6))%4,size:.8+random()*.4,phase:random()*Math.PI*2,panic:0,mode:'school'})));
 let target=null;
 return {fish,attract(x,z){target={x,z,life:5};},update(dt,time,boat){
  dt=Math.min(dt,.05);if(target && (target.life-=dt)<=0)target=null;
  const old=fish.map(f=>({...f}));
  for(let i=0;i<fish.length;i++){
   const f=fish[i],[hx,hz]=homes[f.school],dx=f.x-boat.x,dz=f.z-boat.z,distance=Math.hypot(dx,dz);
   let tx=hx+Math.cos(time*.36+f.school)*1.8,tz=hz+Math.sin(time*.43+f.school)*1.3,cruise=1,ax=0,az=0;
   f.panic=Math.max(0,f.panic-dt*.65);const threat=2.1+Math.min(boat.speed*.27,1.3);
   if(distance<threat){f.panic=1;f.mode='flee';ax+=dx/(distance||1)*12;az+=dz/(distance||1)*12;cruise=3.8;}
   else if(distance<7 && boat.speed>.08 && boat.speed<2.4 && f.index%3===0){
    const side=f.index%2?1:-1;tx=boat.x-boat.fx*2.8+boat.fz*side*1.6;tz=boat.z-boat.fz*2.8-boat.fx*side*1.6;
    cruise=Math.min(2.8,boat.speed+.7);f.mode='follow';
   }else f.mode=f.panic>.1?'recover':'school';
   if(target && distance>threat && Math.hypot(target.x-f.x,target.z-f.z)<10){tx=target.x+Math.cos(time+f.phase)*1.25;tz=target.z+Math.sin(time+f.phase)*1.25;cruise=1.7;f.mode='curious';}
   let cx=0,cz=0,vx=0,vz=0,n=0;
   for(let j=f.school*16;j<(f.school+1)*16;j++){
    if(j===i)continue;const o=old[j],sx=f.x-o.x,sz=f.z-o.z,d2=sx*sx+sz*sz;
    if(d2<.42 && d2>.0001){ax+=sx/d2*.5;az+=sz/d2*.5;}cx+=o.x;cz+=o.z;vx+=o.vx;vz+=o.vz;n++;
   }
   if(n && f.mode!=='flee'){ax+=(cx/n-f.x)*.32+(vx/n-f.vx)*.4;az+=(cz/n-f.z)*.32+(vz/n-f.vz)*.4;}
   const toX=tx-f.x,toZ=tz-f.z,length=Math.hypot(toX,toZ)||1;ax+=toX/length*1.8;az+=toZ/length*1.8;
   const shore=((f.x-13.5)/(10.5*ISLAND_SCALE))**2+(f.z/(8.2*ISLAND_SCALE))**2;if(shore<1.22){ax+=(f.x-13.5)*3;az+=f.z*4;}
   f.vx+=ax*dt;f.vz+=az*dt;const velocity=Math.hypot(f.vx,f.vz)||1,desired=cruise+f.panic*1.4,blend=1-Math.exp(-4*dt);
   f.vx=THREE.MathUtils.lerp(f.vx,f.vx/velocity*desired,blend);f.vz=THREE.MathUtils.lerp(f.vz,f.vz/velocity*desired,blend);
   f.x+=f.vx*dt;f.z+=f.vz*dt;f.y=THREE.MathUtils.lerp(f.y,-.65-(f.index%4)*.16-f.panic*.65+Math.sin(time*2+f.phase)*.1,blend);
   const shelfRadius=Math.hypot((f.x-13.5)/(10.15*ISLAND_SCALE),f.z/(7.65*ISLAND_SCALE)),sandFloor=-.38-Math.max(0,shelfRadius-.90)*4.5;
   f.y=Math.min(-.40,Math.max(f.y,sandFloor+.22));
  }
 }};
}

// Distinct silhouettes, markings and tail rhythms; meshes stay instanced per species.
export function createFishSchools(scene,applyUnderwater){
 const simulation=createFishSimulation();
 const styles=[
  {color:0x39bbe7,shape:[.062,.068,.28],tail:[.12,.05,.14],beat:12},
  {color:0xffd447,shape:[.085,.16,.22],tail:[.10,.11,.12],beat:8},
  {color:0xff762e,shape:[.085,.10,.24],tail:[.12,.07,.12],beat:10},
  {color:0x47ddbb,shape:[.055,.18,.20],tail:[.09,.12,.14],beat:7}
 ];
 const sphere=new THREE.SphereGeometry(1,12,8),tailGeo=new THREE.ConeGeometry(1,1,3);tailGeo.rotateX(Math.PI/2);
 const dummy=new THREE.Object3D(),offset=new THREE.Vector3(),rotation=new THREE.Quaternion();
 const batches=styles.map((style,type)=>{
  const members=simulation.fish.filter(f=>f.species===type),mat=new THREE.MeshStandardMaterial({color:style.color,roughness:.55});
  applyUnderwater(mat);const seaHook=mat.onBeforeCompile;
  mat.onBeforeCompile=shader=>{
   seaHook(shader);
   shader.vertexShader='varying vec3 vFishLocal;\n'+shader.vertexShader;
   shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nvFishLocal=position;');
   shader.fragmentShader='varying vec3 vFishLocal;\n'+shader.fragmentShader;
   const marking=type===1?'mix(vec3(1.0),vec3(.12,.18,.20),step(.80,sin(vFishLocal.z*13.0)))':type===2?'mix(vec3(1.0),vec3(1.0),0.0)': 'vec3(1.0)';
   shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
    diffuseColor.rgb *= ${marking};
    ${type===2?'diffuseColor.rgb=mix(diffuseColor.rgb,vec3(.94,.96,.86),step(.76,cos(vFishLocal.z*11.0)));':''}
    ${type===0?'diffuseColor.rgb=mix(diffuseColor.rgb,vec3(.02,.19,.36),step(.86,vFishLocal.y));':''}
   `);
  };
  mat.customProgramCacheKey=()=>`reef-fish-${type}-v2`;
  const finMat=new THREE.MeshStandardMaterial({color:type===0?0xffdd70:style.color,roughness:.65});applyUnderwater(finMat);
  const eyeMat=new THREE.MeshStandardMaterial({color:0x142e34});applyUnderwater(eyeMat);
  const bodies=new THREE.InstancedMesh(sphere,mat,members.length),tails=new THREE.InstancedMesh(tailGeo,finMat,members.length),fins=new THREE.InstancedMesh(sphere,finMat,members.length),eyes=new THREE.InstancedMesh(sphere,eyeMat,members.length*2);
  for(const mesh of [bodies,tails,fins,eyes]){mesh.frustumCulled=false;mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);scene.add(mesh);}
  return {style,members,bodies,tails,fins,eyes};
 });
 return {simulation,update(dt,time,boat){
  simulation.update(dt,time,boat);
  for(const {style,members,bodies,tails,fins,eyes} of batches){
   members.forEach((f,i)=>{
    const heading=Math.atan2(f.vx,f.vz),wiggle=Math.sin(time*(style.beat+f.panic*9)+f.phase),[width,height,length]=style.shape;
    rotation.setFromAxisAngle(THREE.Object3D.DEFAULT_UP,heading);
    const place=(mesh,index,x,y,z,sx,sy,sz,turn=0)=>{
     offset.set(x*f.size,y*f.size,z*f.size).applyQuaternion(rotation);
     dummy.position.set(f.x+offset.x,f.y+offset.y,f.z+offset.z);dummy.rotation.set(0,heading+turn,0);dummy.scale.set(sx*f.size,sy*f.size,sz*f.size);dummy.updateMatrix();mesh.setMatrixAt(index,dummy.matrix);
    };
    place(bodies,i,0,0,0,width,height,length);
    place(tails,i,wiggle*.04,0,-length*1.03,...style.tail,wiggle*.45);
    place(fins,i,0,height*.78,-.03,width*.28,height*(f.species===3?1:.45),length*.60);
    for(let side=0;side<2;side++)place(eyes,i*2+side,(side?1:-1)*width*.73,height*.28,length*.62,.016,.018,.019);
   });
   for(const mesh of [bodies,tails,fins,eyes])mesh.instanceMatrix.needsUpdate=true;
  }
 }};
}
