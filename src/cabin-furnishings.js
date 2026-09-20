import * as THREE from 'three';
import {GLTFLoader} from 'three/examples/jsm/loaders/GLTFLoader.js';

export function furnishCabin(parent,palette,onReady){
 const group=new THREE.Group();parent.add(group);
 const wood=palette.teak,dark=palette.teakDark;
 const box=(w,h,d,x,y,z,material=wood)=>{const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),material);m.position.set(x,y,z);m.castShadow=m.receiveShadow=true;group.add(m);return m;};
 // Loft's open living / dining / study plan, with a timber envelope.
 box(13.3,4.65,.16,0,2.32,4.18,palette.plaster);
 for(const x of [-6.62,6.83]){
  box(.12,4.8,9.65,x,2.4,-.58,palette.plaster);
  box(.16,1.0,9.4,x,.52,-.55,dark);
  box(.19,.065,9.4,x,1.05,-.55,wood);
 }
 box(13.3,1.05,.14,0,.53,4.04,dark);
 for(let x=-6.5;x<6.6;x+=.38)box(.018,.98,.025,x,.52,3.95,wood);
 box(13.3,.065,.18,0,1.08,3.97,wood);
 box(13.3,.16,.18,0,.09,3.96,dark);
 box(13.5,.18,10,0,4.83,-.55,palette.cream);
 for(const z of [-4.7,-1.8,1.15,3.8])box(13.2,.25,.2,0,4.63,z,dark);
 for(const x of [-6.42,6.7])box(.16,4.65,.2,x,2.32,3.99,dark);
 // Raised skirting and a timber door on the rear side of the dining area.
 box(1.2,2.5,.1,4.4,1.25,4.04,wood);
 for(const y of [.6,1.75])box(.93,.82,.035,4.4,y,3.97,dark);
 const handle=new THREE.Mesh(new THREE.SphereGeometry(.045,12,8),palette.brass);handle.position.set(4.83,1.12,3.9);group.add(handle);
 // Window wall: tall glazing, a low timber sill and deep reveals.
 box(13.3,.26,.30,0,.13,-5.24,dark);
 box(13.3,.55,.30,0,4.52,-5.24,wood);
 for(const x of [-6.45,-.7,6.68])box(.21,4.3,.30,x,2.15,-5.24,dark);
 box(13.3,.10,.46,0,.31,-5.2,wood);
 // Aged console for the keepsakes, behind the lounge.
 box(1.5,.09,.65,-5.45,.91,2.63,wood);
 for(const x of [-6.06,-4.84])for(const z of [2.39,2.87])box(.08,.87,.08,x,.45,z,dark);
 box(1.32,.15,.54,-5.45,.78,2.63,dark);
 box(1.68,.09,1.06,-3.92,.54,-1.35,wood);
 for(const x of [-4.59,-3.25])for(const z of [-1.76,-.94])box(.08,.48,.08,x,.26,z,dark);
 // Natural woven rug beneath the lounge table.
 const rug=box(4.6,.018,3.65,-4.08,.055,-1.9,palette.rug);
 for(let i=0;i<38;i++)box(.025,.006,3.55,-6.31+i*.12,.067,-1.9,i%3?palette.rug:palette.linen);

 new GLTFLoader().load('/assets/tiny-furnishings.glb',({scene})=>{
  scene.updateMatrixWorld(true);
  const parts=[];scene.traverse(o=>{if(o.isMesh)parts.push(o);});
  const materials=new Map();
  function place(prefixes,origin,scale,position,rotation=0){
   const pivot=new THREE.Group(),content=new THREE.Group();pivot.add(content);group.add(pivot);
   for(const source of parts.filter(m=>prefixes.some(p=>m.name.startsWith(p)))){
    const mesh=source.clone();mesh.matrix.copy(source.matrixWorld);mesh.matrix.decompose(mesh.position,mesh.quaternion,mesh.scale);
    if(!materials.has(source.material)){
     const m=source.material.clone();m.color.set('#fff5e7');m.emissiveIntensity=1;m.aoMapIntensity=.28;m.metalness=0;m.roughness=.85;
     m.transparent=false;m.alphaTest=.35;m.depthWrite=true;materials.set(source.material,m);
    }
    mesh.material=materials.get(source.material);mesh.castShadow=mesh.receiveShadow=true;content.add(mesh);
   }
   content.position.set(-origin[0],-origin[1],-origin[2]);pivot.scale.setScalar(scale);pivot.rotation.y=rotation;pivot.position.set(...position);
  }
  // Keep the original carved drawers, textiles and louvered doors from Tiny.
  place(['bed_','mattress_','blanket_','pillow_'],[-199,0,90],.0065,[-4.85,.06,-3.35],-Math.PI/2);
  place(['desk_','cupboards_','book_','plant_big_','fan_','timer_'],[-100,0,-240],.0055,[5.83,.03,-2.1],-Math.PI/2);
  place(['pouf_'],[-40,0,-180],.006,[4.6,.03,-2.0],-Math.PI/2);
  place(['wardrobe_'],[199,0,-232.5],.0058,[5.87,.03,2.65],-Math.PI/2);
  place(['plant_big_'],[35,180,-233],.007,[-1.55,.35,-4.65]);
  place(['box_','toy_'],[-240,0,-240],.005,[-5.55,.08,2.65]);
  onReady?.();
 },undefined,error=>console.warn('Tiny furnishings could not load',error));
 return group;
}
