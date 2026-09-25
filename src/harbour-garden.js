import * as THREE from 'three';
import {applyPalmBreeze} from './sea-breeze.js';

// The source GLB batches foliage by material. Remove only crown triangles,
// preserving the low garden foliage and the original curved trunks.
export function refineHarbourGarden(world) {
 const crowns=[[9.72,5.52,.64,3.35],[20.04,4.78,-1.4,2.85],[19.08,3.76,-3.6,2.2]];
 world.traverse(mesh=>{
  if(!mesh.isMesh)return;
  const name=mesh.material.name, g=mesh.geometry, p=g.attributes.position;
  if(/^Palm (leaf|lime)$/.test(name)){
   const source=g.index?Array.from(g.index.array):Array.from({length:p.count},(_,i)=>i), kept=[];
   for(let i=0;i<source.length;i+=3){
    const tri=source.slice(i,i+3);
    if(!tri.every(j=>p.getY(j)>3.15))kept.push(...tri);
   }
   g.setIndex(kept);
  }
  if(/^Flower |^Palm (leaf|lime|dark)$/.test(name)){
   // A continuous displacement keeps petals and foliage together, while
   // breaking up the straight flower-bed perimeter on either side of the hut.
   for(let i=0;i<p.count;i++){
    const x=p.getX(i),y=p.getY(i),z=p.getZ(i);
    if(y>1.65||z>4.35||z< -3.6)continue;
    const side=x<12?-1:x>17.7?1:0;
    const fade=1.-THREE.MathUtils.smoothstep(y,1.25,1.65);
    const spread=(.12+.38*(.5+.5*Math.sin(z*2.1+x*.7)))*fade;
    p.setX(i,x+side*spread);
    p.setZ(i,z+side*.10*Math.sin(z*2.1)*fade);
   }
   p.needsUpdate=true;g.computeBoundingSphere();
  }
 });

 const positions=[],colors=[];
 const palette=['#779e40','#94b747','#aacb57','#bdd26b'].map(c=>new THREE.Color(c));
 function triangle(a,b,c,color){for(const p of [a,b,c]){positions.push(...p);colors.push(color.r,color.g,color.b);}}
 crowns.forEach(([x,y,z,length],tree)=>{
  for(let frond=0;frond<11;frond++){
   const angle=frond*Math.PI*2/11+tree*.71+Math.sin(frond*3.7)*.11;
   const len=length*(.90+.16*Math.sin(frond*2.3+1));
   const dir=new THREE.Vector3(Math.cos(angle),0,Math.sin(angle));
   const side=new THREE.Vector3(-dir.z,0,dir.x);
   const curve=t=>new THREE.Vector3(x,y,z).addScaledVector(dir,len*t)
    .add(new THREE.Vector3(0,Math.sin(t*Math.PI)*.54-t*t*(.65+(frond%3)*.14),0));
   const color=palette[(frond+tree)%palette.length];
   for(let k=0;k<18;k++){
    const t0=k/18,t1=(k+1)/18,a=curve(t0),b=curve(t1),w=.027*(1-t0)+.006;
    triangle(a.clone().addScaledVector(side,-w).toArray(),a.clone().addScaledVector(side,w).toArray(),b.toArray(),color);
   }
   for(let k=1;k<20;k++){
    const t=k/21,width=Math.sin(Math.PI*t)**.7*len*.19;
    for(const sign of [-1,1]){
     const root=curve(t), tip=root.clone().addScaledVector(side,width*sign)
      .addScaledVector(dir,len*.095).add(new THREE.Vector3(0,-.10-width*.24,0));
     const mid=root.clone().lerp(tip,.48);mid.y+=.07;
     const back=curve(Math.max(0,t-.029)),front=curve(Math.min(1,t+.029));
     triangle(back.toArray(),mid.toArray(),tip.toArray(),color);
     triangle(mid.toArray(),front.toArray(),tip.toArray(),color);
     triangle(back.toArray(),front.toArray(),mid.toArray(),color);
    }
   }
  }
 });
 const geometry=new THREE.BufferGeometry();
 geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
 geometry.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));geometry.computeVertexNormals();
 const leaves=new THREE.Mesh(geometry,new THREE.MeshStandardMaterial({vertexColors:true,roughness:.82,side:THREE.DoubleSide}));
 leaves.name='Feathered palm crowns';leaves.castShadow=true;leaves.receiveShadow=true;applyPalmBreeze(leaves,crowns);world.add(leaves);

 const timber=new THREE.MeshStandardMaterial({color:'#aa7846',roughness:.94});
 function beam(a,b,width,depth){
  const start=new THREE.Vector3(...a),end=new THREE.Vector3(...b),delta=end.clone().sub(start);
  const mesh=new THREE.Mesh(new THREE.BoxGeometry(width,delta.length(),depth),timber);
  mesh.position.copy(start).add(end).multiplyScalar(.5);
  mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),delta.normalize());
  mesh.castShadow=true;mesh.receiveShadow=true;world.add(mesh);
 }
 // Fascia on both gables: visible thickness from front, side and rear views.
 for(const z of [-3.83,1.12]){
  beam([11.67,3.65,z],[14.8,5.39,z],.13,.15);
  beam([14.8,5.39,z],[17.93,3.65,z],.13,.15);
 }
 for(const x of [11.7,17.9])beam([x,3.66,-3.86],[x,3.66,1.16],.13,.18);

 const sand=[];world.updateMatrixWorld(true);
 world.traverse(o=>{if(o.isMesh&&o.material.name==='Warm lagoon sand')sand.push(o);});
 const ray=new THREE.Raycaster(),stone=new THREE.IcosahedronGeometry(1,1);
 const stoneMaterial=new THREE.MeshStandardMaterial({color:'#b6ae97',roughness:1,flatShading:true});
 for(const [i,[x,z,s]] of [[10.3,1.8,.40],[10.7,2.2,.25],[18.8,2.8,.43],[19.1,3.1,.22],[18.9,-2.6,.31]].entries()){
  ray.set(new THREE.Vector3(x,5,z),new THREE.Vector3(0,-1,0));
  const hit=ray.intersectObjects(sand,false)[0];if(!hit)continue;
  const rock=new THREE.Mesh(stone,stoneMaterial);rock.position.set(x,hit.point.y+s*.24,z);
  rock.scale.set(s,s*.65,s*.82);rock.rotation.set(.2,i*1.7,.13);rock.castShadow=true;rock.receiveShadow=true;world.add(rock);
 }
}
