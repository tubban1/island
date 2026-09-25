import * as THREE from 'three';
import {applyPalmBreeze} from './sea-breeze.js';
import {RoundedBoxGeometry} from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import {mergeGeometries} from 'three/examples/jsm/utils/BufferGeometryUtils.js';

function wovenCanvas(){
 const canvas=document.createElement('canvas');canvas.width=canvas.height=512;
 const ctx=canvas.getContext('2d');ctx.fillStyle='#eee0bc';ctx.fillRect(0,0,512,512);
 // Long woven borders and narrow blue-green stripes read even at island scale.
 for(const y of [35,61,438,464]){ctx.fillStyle='#427f7e';ctx.fillRect(0,y,512,y===35||y===464?13:5);}
 for(let i=0;i<512;i+=4){
  ctx.fillStyle='rgba(255,250,227,.26)';ctx.fillRect(i,0,1,512);
  ctx.fillStyle='rgba(100,79,47,.16)';ctx.fillRect(0,i,512,1);
 }
 for(let y=0;y<512;y+=8)for(let x=0;x<512;x+=8){ctx.fillStyle=(x+y)%16?'rgba(255,252,228,.18)':'rgba(125,99,67,.14)';ctx.fillRect(x,y,3,2);}
 const map=new THREE.CanvasTexture(canvas);map.colorSpace=THREE.SRGBColorSpace;map.anisotropy=8;
 const bump=map.clone();bump.colorSpace=THREE.NoColorSpace;bump.needsUpdate=true;
 return {map,bumpMap:bump,bumpScale:.0018};
}
export function createDetailedHammock(){
 const group=new THREE.Group();group.name='Woven linen hammock';
 const clothMaterial=new THREE.MeshStandardMaterial({color:'#ffffff',...wovenCanvas(),roughness:.96,side:THREE.DoubleSide});
 const rope=new THREE.MeshStandardMaterial({color:'#e1cda6',roughness:1});
 const wood=new THREE.MeshStandardMaterial({color:'#b88b57',roughness:.92});
 const pillowMaterial=clothMaterial.clone();pillowMaterial.color.set('#81b4ac');
 const surface=(u,v)=>new THREE.Vector3((u-.5)*3.3,-.28-.48*Math.sin(Math.PI*u)+.065*Math.pow((v-.5)*2,2),(v-.5)*(.85+.40*Math.sin(Math.PI*u)));
 function add(g,m){const o=new THREE.Mesh(g,m);o.castShadow=o.receiveShadow=true;group.add(o);return o;}
 function cord(points,r=.018,mat=rope){return add(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points),Math.max(10,points.length*2),r,6,false),mat);}
 const p=[],uv=[],indices=[],nx=48,ny=18;
 for(let i=0;i<=nx;i++)for(let j=0;j<=ny;j++){
  const u=i/nx,v=j/ny,a=surface(u,v);
  a.y+=Math.sin(u*44+v*5)*.009*Math.pow(Math.abs(v-.5)*2,4)*Math.sin(Math.PI*u);
  p.push(...a.toArray());uv.push(u,v);
  if(i<nx&&j<ny){const k=i*(ny+1)+j;indices.push(k,k+ny+1,k+1,k+1,k+ny+1,k+ny+2);}
 }
 const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(p,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.setIndex(indices);g.computeVertexNormals();add(g,clothMaterial);
 for(const v of [0,1]){
  cord(Array.from({length:33},(_,i)=>surface(i/32,v)),.022);
  for(let i=0;i<17;i++){
   const u=.07+i*.052,a=surface(u,v),b=surface(u+.035,v),m=a.clone().lerp(b,.5);m.y-=.115;m.z+=(v===0?-1:1)*.025;
   cord([a,m,b],.009);
  }
 }
 for(const u of [0,1]){
  const side=u===0?-1:1,anchor=new THREE.Vector3(side*2.47,0,0);
  cord([surface(u,0),surface(u,.5),surface(u,1)],.039,wood);
  for(let i=0;i<7;i++)cord([surface(u,i/6),anchor.clone().lerp(surface(u,i/6),.45).add(new THREE.Vector3(0,-.035,0)),anchor],.013);
  // A visible knot wraps each suspension eye; anchors stay still while cloth sways.
  for(let i=0;i<3;i++){
   const knot=add(new THREE.TorusGeometry(.06,.015,6,16),rope);knot.rotation.y=Math.PI/2;knot.position.copy(anchor);knot.position.x+=side*i*.024;
  }
 }
 const pillow=add(new RoundedBoxGeometry(.54,.16,.39,4,.075),pillowMaterial);pillow.position.set(-.94,-.52,0);pillow.rotation.z=-.12;
 // Preserve the entire suspension assembly as one moving group, four draw calls.
 const batches=new Map();
 for(const o of [...group.children]){o.updateMatrix();const g=o.geometry.index?o.geometry.toNonIndexed():o.geometry.clone();g.applyMatrix4(o.matrix);if(!batches.has(o.material))batches.set(o.material,[]);batches.get(o.material).push(g);group.remove(o);o.geometry.dispose();}
 for(const [m,gs]of batches){add(mergeGeometries(gs),m);gs.forEach(g=>g.dispose());}
 return group;
}

export function createRetreatPalmCrown(crown,seed=0){
 const positions=[],colors=[],uv=[];
 // Match the neighbouring harbour palms: same four colours, broad folded
 // leaflets and central ridge. Only the crown silhouette varies per tree.
 const palette=['#779e40','#94b747','#aacb57','#bdd26b'].map(c=>new THREE.Color(c));
 function tri(a,b,c,color){for(const v of [a,b,c]){positions.push(...v.toArray());colors.push(color.r,color.g,color.b);uv.push(0,0);}}
 const baseLength=seed===0?2.35:2.08,arch=seed===0?.49:.64,droop=seed===0?.77:.58;
 for(let f=0;f<11;f++){
  const angle=f*Math.PI*2/11+seed*.71+Math.sin(f*3.7)*.11;
  const length=baseLength*(.90+.16*Math.sin(f*2.3+1+seed*.35));
  const dir=new THREE.Vector3(Math.cos(angle),0,Math.sin(angle)),side=new THREE.Vector3(-dir.z,0,dir.x);
  const curve=t=>crown.clone().addScaledVector(dir,t*length)
   .add(new THREE.Vector3(0,arch*Math.sin(t*Math.PI)-(droop+(f%3)*.14)*t*t,0));
  const color=palette[(f+seed)%palette.length];
  for(let k=0;k<18;k++){
   const t=k/18,a=curve(t),b=curve((k+1)/18),w=.027*(1-t)+.006;
   tri(a.clone().addScaledVector(side,-w),a.clone().addScaledVector(side,w),b,color);
  }
  for(let k=1;k<20;k++)for(const sign of [-1,1]){
   const t=k/21,root=curve(t),width=Math.pow(Math.sin(Math.PI*t),.7)*length*.19;
   const tip=root.clone().addScaledVector(side,sign*width).addScaledVector(dir,length*.095).add(new THREE.Vector3(0,-.10-width*.24,0));
   const ridge=root.clone().lerp(tip,.48);ridge.y+=.07;
   const back=curve(Math.max(0,t-.029)),front=curve(Math.min(1,t+.029));
   tri(back,ridge,tip,color);tri(ridge,front,tip,color);tri(back,front,ridge,color);
  }
 }
 const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));g.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.computeVertexNormals();
 const mesh=new THREE.Mesh(g,new THREE.MeshStandardMaterial({vertexColors:true,roughness:.82,side:THREE.DoubleSide}));mesh.name='Arching feathered palm';mesh.castShadow=mesh.receiveShadow=true;
 return applyPalmBreeze(mesh,[[crown.x,crown.y,crown.z,baseLength]]);
}
