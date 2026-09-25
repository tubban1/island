import * as THREE from 'three';
import {surfRings as rings} from './coast-shape.js';

// Travel between randomly selected coasts via offshore arcs, never straight through the island.
export function createTurtleSimulation(random=Math.random){
 const tau=Math.PI*2;
 const point=(angle,radius)=>{
  const index=((angle%tau+tau)%tau)/tau*rings[2].length,i=Math.floor(index),f=index-i;
  const a=rings[2][i%rings[2].length],b=rings[2][(i+1)%rings[2].length];
  return {x:13.5+(THREE.MathUtils.lerp(a[0],b[0],f)-13.5)*radius,z:THREE.MathUtils.lerp(a[2],b[2],f)*radius};
 };
 const safeLanding=angle=>{
  // Keep the whole beach approach clear of furniture, garden, path, pier and mooring.
  for(let r=.65;r<=1.45;r+=.035){
   const {x,z}=point(angle,r);
   if((x>9 && x<20.3 && z>-5.6 && z<5.2)||(x>19.5&&x<25&&z>-.8&&z<5.8)||(x>13.1&&x<17&&z>4&&z<17.5)||Math.hypot(x-7.14,z-14.28)<2.1)return false;
  }
  return true;
 };
 let angle=2.4,radius=.84,rest=2+random()*3,waypoints=[],speed=.27;
 const state={...point(angle,radius),heading:0,moving:false,destination:'land',visits:0};
 function choose(){
  state.destination=state.destination==='land'?'water':'land';
  waypoints=[];
  if(state.destination==='water'){
   waypoints.push(point(angle,1.45));
   let next=angle;
   for(let attempt=0;attempt<40;attempt++){const candidate=random()*tau;if(safeLanding(candidate)){next=candidate;break;}}
   const delta=Math.atan2(Math.sin(next-angle),Math.cos(next-angle));
   const count=Math.max(1,Math.ceil(Math.abs(delta)/.10));
   for(let i=1;i<=count;i++)waypoints.push(point(angle+delta*i/count,1.45));
   angle=next;radius=1.45;speed=.78+random()*.30;
  }else{
   radius=.65+random()*.18;waypoints.push(point(angle,radius));speed=.32+random()*.09;
  }
  state.moving=true;
 }
 return {state,update(dt){
  dt=Math.min(Math.max(dt,0),.06);
  if(!state.moving){rest-=dt;if(rest<=0)choose();return state;}
  const target=waypoints[0],dx=target.x-state.x,dz=target.z-state.z,distance=Math.hypot(dx,dz);
  const range=Math.hypot(state.x-13.5,state.z);
  const localShore=point(Math.atan2(state.z,state.x-13.5),1);
  const onBeach=range<Math.hypot(localShore.x-13.5,localShore.z)*.99;
  const step=(onBeach?Math.min(speed,.34):speed)*dt;
  const wanted=Math.atan2(dx,dz),delta=Math.atan2(Math.sin(wanted-state.heading),Math.cos(wanted-state.heading));
  state.heading+=delta*(1-Math.exp(-dt*3.4));
  if(distance<=step){
   state.x=target.x;state.z=target.z;waypoints.shift();
   if(!waypoints.length){state.moving=false;state.visits++;rest=(state.destination==='land'?5:3)+random()*13;}
  }else{state.x+=dx/distance*step;state.z+=dz/distance*step;}
  return state;
 }};
}

export function createSeaTurtle(scene,world,applyUnderwater){
 const group=new THREE.Group();group.name='Wandering sea turtle';scene.add(group);
 const sphere=new THREE.SphereGeometry(1,16,10);
 const skin=new THREE.MeshStandardMaterial({color:0x929d56,roughness:.83});
 const shell=new THREE.MeshStandardMaterial({color:0x59643a,roughness:.88});
 const scute=new THREE.MeshStandardMaterial({color:0x88915a,roughness:.9});
 const dark=new THREE.MeshStandardMaterial({color:0x222d20,roughness:.6});
 for(const mat of [skin,shell,scute,dark])applyUnderwater(mat);
 function oval(parent,mat,pos,scale){const mesh=new THREE.Mesh(sphere,mat);mesh.position.set(...pos);mesh.scale.set(...scale);mesh.castShadow=true;mesh.receiveShadow=true;parent.add(mesh);return mesh;}
 oval(group,skin,[0,.13,0],[.40,.14,.56]);
 oval(group,shell,[0,.22,-.02],[.43,.23,.58]);
 for(let i=0;i<3;i++)oval(group,scute,[0,.435-Math.abs(i-1)*.04,-.31+i*.28],[.16,.025,.125]);
 for(const side of [-1,1])for(let i=0;i<3;i++){
  const plate=oval(group,scute,[side*.245,.365-Math.abs(i-1)*.035,-.31+i*.27],[.13,.025,.13]);plate.rotation.z=-side*.5;
 }
 oval(group,skin,[0,.16,.62],[.15,.12,.24]);
 for(const side of [-1,1])oval(group,dark,[side*.119,.215,.75],[.025,.025,.025]);
 oval(group,skin,[0,.12,-.65],[.055,.055,.16]);
 const flippers=[];
 for(const side of [-1,1])for(const front of [true,false]){
  const pivot=new THREE.Group();pivot.position.set(side*.29,.11,front?.30:-.36);group.add(pivot);
  const fin=oval(pivot,skin,[side*.18,0,front?.04:-.09],[front?.32:.23,.045,front?.135:.10]);fin.rotation.y=side*(front?-.40:.45);
  flippers.push({pivot,side,front});
 }
 const simulation=createTurtleSimulation(),groundMeshes=[];
 world.traverse(o=>{if(o.isMesh && ['Warm lagoon sand','Submerged sand'].includes(o.material.name))groundMeshes.push(o);});
 world.updateMatrixWorld(true);const ray=new THREE.Raycaster();let ground=.15,probe=0,started=false;
 return {simulation,update(dt,time){
  const state=simulation.update(dt);probe-=dt;
  if(probe<=0){ray.set(new THREE.Vector3(state.x,5,state.z),new THREE.Vector3(0,-1,0));ground=ray.intersectObjects(groundMeshes,false)[0]?.point.y ?? -2;probe=.12;}
  const swimming=THREE.MathUtils.smoothstep(-ground,.20,.65);
  const y=THREE.MathUtils.lerp(ground+.035,Math.max(ground+.10,-.78+Math.sin(time*.6)*.13),swimming);
  group.position.x=state.x;group.position.z=state.z;
  group.position.y=started?THREE.MathUtils.lerp(group.position.y,y,1-Math.exp(-dt*7)):y;started=true;
  group.rotation.y=state.heading;
  group.rotation.z=state.moving?Math.sin(time*3.7)*.025*(1-swimming):0;
  for(const {pivot,side,front} of flippers){
   const stroke=Math.sin(time*(swimming>0.5?2.4:4.4)+(side>0?Math.PI:0)+(front?0:Math.PI));
   pivot.rotation.y=stroke*(state.moving?.42:.045);
   pivot.rotation.z=side*stroke*swimming*(state.moving?.24:.06);
  }
 }};
}
