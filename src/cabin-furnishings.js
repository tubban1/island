import * as THREE from 'three';
import {furnishReferenceRoom} from './reference-room.js';
import {applyInteriorPatina} from './interior-patina.js';

export function furnishCabin(parent,palette,onReady){
 const group=new THREE.Group();parent.add(group);
 const wood=palette.teak,dark=palette.teakDark;
 const box=(w,h,d,x,y,z,material=wood)=>{
  if(material===palette.plaster)applyInteriorPatina(material,'wall');
  else if(material.map===wood.map)applyInteriorPatina(material,'wood');
  const geometry=new THREE.BoxGeometry(w,h,d);
  if(material.map===wood.map){
   const p=geometry.attributes.position,n=geometry.attributes.normal,uv=geometry.attributes.uv;
   for(let i=0;i<p.count;i++){
    if(Math.abs(n.getY(i))>.5)uv.setXY(i,p.getZ(i)/.45,p.getX(i)/2.2);
    else if(Math.abs(n.getX(i))>.5)uv.setXY(i,p.getZ(i)/.45,p.getY(i)/2.2);
    else uv.setXY(i,p.getX(i)/.45,p.getY(i)/2.2);
   }
  }
  const m=new THREE.Mesh(geometry,material);m.position.set(x,y,z);m.castShadow=m.receiveShadow=true;group.add(m);return m;
 };
 // Loft's open living / dining / study plan, with a timber envelope.
 box(13.6,4.8,.16,.1,2.4,4.18,palette.plaster);
 box(.12,4.8,9.65,6.83,2.4,-.58,palette.plaster);
 // Real opening in the side wall, rather than a window laid over an opaque wall.
 box(.12,4.8,2.64,-6.62,2.4,-4.085,palette.plaster);
 box(.12,4.8,3.54,-6.62,2.4,2.475,palette.plaster);
 box(.12,2.58,3.47,-6.62,1.29,-1.03,palette.plaster);
 box(.12,.45,3.47,-6.62,4.575,-1.03,palette.plaster);
 for(const x of [-6.62,6.83]){
  box(.16,1.0,9.4,x,.52,-.55,dark);
  box(.19,.065,9.4,x,1.05,-.55,wood);
 }
 for(const z of [-2.77,.705])box(.23,1.88,.105,-6.51,3.465,z,dark);
 for(const y of [2.57,4.35])box(.23,.105,3.58,-6.51,y,-1.03,dark);
 box(.39,.10,3.72,-6.43,2.52,-1.03,wood);
 box(.13,1.77,.064,-6.50,3.465,-1.03,wood);
 const skyCanvas=document.createElement('canvas');skyCanvas.width=768;skyCanvas.height=384;
 const skyCtx=skyCanvas.getContext('2d'),blue=skyCtx.createLinearGradient(0,0,0,384);
 blue.addColorStop(0,'#74bfea');blue.addColorStop(1,'#e7f6fa');skyCtx.fillStyle=blue;skyCtx.fillRect(0,0,768,384);
 const halo=skyCtx.createRadialGradient(470,130,6,470,130,240);halo.addColorStop(0,'#ffffff');halo.addColorStop(.16,'#fffdebf5');halo.addColorStop(.45,'#fff8d475');halo.addColorStop(1,'#fff8d400');skyCtx.fillStyle=halo;skyCtx.fillRect(0,0,768,384);
 const skyTexture=new THREE.CanvasTexture(skyCanvas);skyTexture.colorSpace=THREE.SRGBColorSpace;
 const outside=new THREE.Mesh(new THREE.PlaneGeometry(7,5.5),new THREE.MeshBasicMaterial({map:skyTexture,toneMapped:false}));
 outside.position.set(-6.95,3.55,-1.03);outside.rotation.y=Math.PI/2;group.add(outside);
 for(let i=0;i<3;i++){const slat=box(.10,.055,3.5,-6.38,4.23-i*.09,-1.03,wood);slat.rotation.z=-.25;}
 // A gathered cotton curtain catches the side light without covering the view.
 const curtainGeo=new THREE.PlaneGeometry(.43,1.78,12,20),cp=curtainGeo.attributes.position;
 for(let i=0;i<cp.count;i++)cp.setZ(i,Math.cos(cp.getX(i)*55)*.045);
 curtainGeo.computeVertexNormals();const cotton=palette.linen.clone();cotton.side=THREE.DoubleSide;
 const sideCurtain=new THREE.Mesh(curtainGeo,cotton);sideCurtain.position.set(-6.30,3.46,.53);sideCurtain.rotation.y=Math.PI/2;sideCurtain.castShadow=true;group.add(sideCurtain);
 // A faint scattering veil makes the high side-window sunlight visible in air.
 const sunlight=new THREE.ShaderMaterial({transparent:true,depthWrite:false,side:THREE.DoubleSide,blending:THREE.AdditiveBlending,
  vertexShader:'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
  fragmentShader:'varying vec2 vUv;void main(){float a=pow(sin(vUv.x*3.14159265),2.)*pow(1.-vUv.y,1.5)*.065;gl_FragColor=vec4(1.,.95,.78,a);}'
 });
 for(const z of [-2.3,-.1]){
  const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute([-6.35,4.20,z,-6.35,2.70,z,-1.8,.085,z+2.35,.9,.085,z+3.75],3));
  geo.setAttribute('uv',new THREE.Float32BufferAttribute([0,0,1,0,1,1,0,1],2));geo.setIndex([0,1,2,0,2,3]);
  const shaft=new THREE.Mesh(geo,sunlight);shaft.renderOrder=2;group.add(shaft);
 }
 box(13.3,1.05,.14,0,.53,4.04,dark);
 for(let x=-6.5;x<6.6;x+=.38)box(.018,.98,.025,x,.52,3.95,wood);
 box(13.3,.065,.18,0,1.08,3.97,wood);
 box(13.3,.16,.18,0,.09,3.96,dark);
 // Pitched timber ceiling and solid gables close the roof above the beams.
 for(const side of [-1,1]){
  const roof=box(6.86,.14,10,side*3.36,5.32,-.55,palette.cream);
  roof.rotation.z=-side*Math.atan2(1.2,6.72);
 }
 for(const z of [-5.24,4.18]){
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute([-6.72,4.70,z,6.72,4.70,z,0,5.95,z],3));g.computeVertexNormals();
  const m=palette.plaster.clone();m.side=THREE.DoubleSide;const gable=new THREE.Mesh(g,m);gable.castShadow=gable.receiveShadow=true;group.add(gable);
 }
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
 for(let i=0;i<4;i++){
  const worn=wood.clone();worn.color.offsetHSL(0,-.02,(i%3-1)*.035);
  const plank=box(1.68,.09,.258,-3.92,.54+(i%2)*.001,-1.745+i*.267,worn);plank.rotation.y=(i-1.5)*.002;
  // Recessed old nail heads at the plank ends.
  for(const x of [-4.63,-3.21]){const nail=new THREE.Mesh(new THREE.CylinderGeometry(.008,.008,.003,8),dark);nail.position.set(x,.587,-1.745+i*.267);group.add(nail);}
 }
 for(const x of [-4.59,-3.25])for(const z of [-1.76,-.94]){const leg=box(.10,.48,.10,x,.26,z,dark);leg.rotation.z=x<-4?.025:-.025;}
 // A faded, incomplete cup ring embedded in the old tabletop finish.
 const ringCanvas=document.createElement('canvas');ringCanvas.width=ringCanvas.height=128;
 const ringCtx=ringCanvas.getContext('2d');
 for(let i=0;i<3;i++){
  ringCtx.strokeStyle=`rgba(92,66,36,${.10-i*.022})`;ringCtx.lineWidth=1.5+i;
  ringCtx.beginPath();ringCtx.ellipse(64,64,43+i,40+i,.12,.3+i*.12,5.9-i*.19);ringCtx.stroke();
 }
 const ringMap=new THREE.CanvasTexture(ringCanvas);ringMap.colorSpace=THREE.SRGBColorSpace;
 const cupRing=new THREE.Mesh(new THREE.PlaneGeometry(.25,.25),new THREE.MeshBasicMaterial({map:ringMap,transparent:true,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-1}));
 cupRing.rotation.x=-Math.PI/2;cupRing.position.set(-4.44,.589,-1.16);group.add(cupRing);
 furnishReferenceRoom(group,palette,onReady);
 return group;
}
