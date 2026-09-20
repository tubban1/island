import * as THREE from 'three';
import {ARRIVAL,DIFFICULTIES} from './gift-schema.js';
export function createGiftWorld(scene){
 const group=new THREE.Group();scene.add(group);group.visible=false;
 const wood=new THREE.MeshStandardMaterial({color:'#b98453'}),sand=new THREE.MeshStandardMaterial({color:'#e6c990'}),green=new THREE.MeshStandardMaterial({color:'#699143'});
 function box(w,h,d,x,y,z,m=wood){const mesh=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),m);mesh.position.set(x,y,z);mesh.castShadow=true;mesh.receiveShadow=true;group.add(mesh);return mesh;}
 const mainland=new THREE.Mesh(new THREE.CylinderGeometry(9,10,1.2,32),sand);mainland.scale.set(1,1,1.5);mainland.position.set(-40,-.1,20);group.add(mainland);
 for(let i=0;i<9;i++)box(.45,.15,2,-32+i*.44,.45,20);
 for(const x of [-32,-29])for(const z of [19,21])box(.18,1.3,.18,x,.55,z);
 for(const [x,z] of [[-35,16],[-40,24],[-37,26]]){
  box(.35,3,.35,x,1.7,z);for(let i=0;i<6;i++){const leaf=new THREE.Mesh(new THREE.SphereGeometry(1,8,6),green);leaf.scale.set(1.8,.15,.48);leaf.rotation.y=i*Math.PI/3;leaf.position.set(x+Math.cos(i*Math.PI/3)*.8,3.3,z+Math.sin(i*Math.PI/3)*.8);group.add(leaf);}
 }
 const canvas=document.createElement('canvas');canvas.width=512;canvas.height=128;const ctx=canvas.getContext('2d');ctx.fillStyle='#35675d';ctx.fillRect(0,0,512,128);ctx.fillStyle='#fff2ce';ctx.textAlign='center';ctx.font='bold 45px sans-serif';ctx.fillText('大陆 · 出发港',256,82);const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;
 const sign=new THREE.Mesh(new THREE.PlaneGeometry(3,.75),new THREE.MeshBasicMaterial({map:texture}));sign.position.set(-33,2,20);sign.rotation.y=.7;group.add(sign);
 const buoyGroup=new THREE.Group();group.add(buoyGroup);const buoys=[];
 function setDifficulty(key){
  for(const buoy of buoys){buoyGroup.remove(buoy);buoy.traverse(o=>{o.geometry?.dispose();o.material?.dispose();});}buoys.length=0;
  for(const [x,z] of [...DIFFICULTIES[key].checkpoints,[ARRIVAL.x,ARRIVAL.z]]){
   const buoy=new THREE.Group();buoy.position.set(x,0,z);const base=new THREE.Mesh(new THREE.CylinderGeometry(.32,.48,.32,12),new THREE.MeshStandardMaterial({color:'#ffc16e'}));base.position.y=.1;buoy.add(base);
   const pole=new THREE.Mesh(new THREE.CylinderGeometry(.035,.035,1.2,8),new THREE.MeshStandardMaterial({color:'#f4e7bf'}));pole.position.y=.7;buoy.add(pole);
   const flag=new THREE.Mesh(new THREE.BoxGeometry(.5,.3,.025),new THREE.MeshStandardMaterial({color:'#ea896a'}));flag.position.set(.2,1.15,0);buoy.add(flag);buoyGroup.add(buoy);buoys.push(buoy);
  }
 }
 const person=new THREE.Group();person.visible=false;scene.add(person);
 const body=new THREE.Mesh(new THREE.CapsuleGeometry(.16,.4,4,8),new THREE.MeshStandardMaterial({color:'#edab79'}));body.position.y=.48;person.add(body);
 const head=new THREE.Mesh(new THREE.SphereGeometry(.18,12,8),new THREE.MeshStandardMaterial({color:'#e6ba94'}));head.position.y=.97;person.add(head);
 const hat=new THREE.Mesh(new THREE.CylinderGeometry(.3,.3,.055,16),sand);hat.position.y=1.13;person.add(hat);
 return {group,person,setDifficulty,update(t,state,boat){buoys.forEach((b,i)=>{b.position.y=Math.sin(t*1.5+i)*.06;b.visible=state.phase==='sailing'&&i>=state.checkpoint&&(state.difficulty==='easy'||Math.hypot(b.position.x-boat.position.x,b.position.z-boat.position.z)<(state.difficulty==='hard'?9:15));});}};
}
