import * as THREE from 'three';
import {RoundedBoxGeometry} from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import {mergeGeometries} from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import layout from './harbour-layout.json' with {type:'json'};

export function createHarbourStories(world){
 const group=new THREE.Group();group.name='Coastal life and pier details';
 const surfaces=[];world.updateMatrixWorld(true);world.traverse(o=>{if(o.isMesh)surfaces.push(o);});
 const ray=new THREE.Raycaster();
 const height=(x,z)=>{ray.set(new THREE.Vector3(x,8,z),new THREE.Vector3(0,-1,0));return ray.intersectObjects(surfaces,false)[0]?.point.y;};
 const mat=(color,roughness=.9)=>new THREE.MeshStandardMaterial({color,roughness});
 const wood=mat('#a47b50'),cream=mat('#eee1bf'),blue=mat('#3c8789'),red=mat('#c56848'),rope=mat('#bfa57a');
 wood.userData.ageKind='wood';
 const grass=mat('#6d8543');grass.side=THREE.DoubleSide;
 const stones=['#a49c88','#8b8c82','#b4ab94'].map(c=>mat(c));
 stones.forEach(m=>m.userData.ageKind='stone');
 function mesh(g,m,x,y,z){const o=new THREE.Mesh(g,m);o.position.set(x,y,z);o.castShadow=o.receiveShadow=true;group.add(o);return o;}
 const box=(w,h,d,x,y,z,m=wood)=>mesh(new RoundedBoxGeometry(w,h,d,2,Math.min(.022,w*.18,h*.18,d*.18)),m,x,y,z);
 const {x,z,length,width}=layout.dock,deck=height(x,z+length-.7);
 if(Number.isFinite(deck)){
  // A sideways bench along the pier edge leaves its middle open for arrival.
  const bx=x+width/2-.30,bz=z+length-1.0;
  for(let i=0;i<3;i++)box(.15,.07,1.65,bx-.17+i*.17,deck+.48,bz);
  for(const dz of [-.66,.66])for(const dx of [-.16,.16])box(.085,.45,.085,bx+dx,deck+.23,bz+dz);
  for(let i=0;i<3;i++)box(.07,.12,1.65,bx+.28,deck+.68+i*.14,bz);
  for(const dz of [-.66,.66])box(.08,.86,.08,bx+.28,deck+.44,bz+dz);
  box(.42,.06,.48,bx-.02,deck+.545,bz-.39,blue);
  // Sun hat on the seat, book beside it.
  mesh(new THREE.CylinderGeometry(.20,.22,.025,24),rope,bx,deck+.535,bz+.39);
  mesh(new THREE.CylinderGeometry(.10,.13,.13,18),rope,bx,deck+.60,bz+.39);
  box(.18,.035,.26,bx,deck+.53,bz+.02,cream);
  const ring=mesh(new THREE.TorusGeometry(.32,.085,8,32),cream,x-width/2-.06,deck-.05,z+length-1.1);ring.rotation.y=Math.PI/2;
  for(let i=0;i<4;i++){const arc=mesh(new THREE.TorusGeometry(.322,.089,8,6,.32),red,...ring.position.toArray());arc.rotation.set(i*Math.PI/2,Math.PI/2,0);}
  for(let i=0;i<4;i++){const coil=mesh(new THREE.TorusGeometry(.16+i*.028,.017,5,24),rope,x-width/2+.30,deck+.022,z+length-.48);coil.rotation.x=Math.PI/2;}
 }
 // Dry shore rock gardens: entirely on the existing land collision footprint.
 for(const [index,[cx,cz]] of [[1.8,-.4],[25.6,-5.3],[19.6,-10.1]].entries()){
  for(let i=0;i<5;i++){
   const a=i*2.4,xx=cx+Math.cos(a)*.55,zz=cz+Math.sin(a)*.48,y=height(xx,zz);
   if(y===undefined||y<.08)continue;
   const r=.34+(i%3)*.17,rock=mesh(new THREE.IcosahedronGeometry(1,1),stones[(index+i)%3],xx,y+r*.33,zz);
   rock.scale.set(r,r*.76,r*.82);rock.rotation.set(.2,i*1.7,.13);
   if(i%2===0)for(let b=0;b<7;b++){
    const a=b*2.4,h=.21+(b%3)*.08;
    const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute([0,0,0,.045,0,0,Math.cos(a)*.14,h,Math.sin(a)*.14],3));
    g.setAttribute('uv',new THREE.Float32BufferAttribute([0,0,1,0,.5,1],2));g.computeVertexNormals();
    const blade=mesh(g,grass,xx+r*.8,y,zz);blade.rotation.y=a;
   }
  }
 }
 // A few objects form a single little story beside the breakfast spot.
 const gy=height(8.6,1.4);
 if(gy!==undefined){
  const basket=mesh(new THREE.CylinderGeometry(.23,.18,.27,14),rope,8.6,gy+.135,1.4);basket.rotation.z=.21;
  for(let i=0;i<5;i++){const fruit=mesh(new THREE.SphereGeometry(.07,8,6),red,8.3-i*.10,gy+.07,1.42+Math.sin(i)*.10);fruit.scale.y=.85;}
 }
 // One material batch per surface keeps these small props inexpensive to draw.
 const batches=new Map();
 for(const o of [...group.children]){o.updateMatrix();const g=o.geometry.index?o.geometry.toNonIndexed():o.geometry.clone();g.applyMatrix4(o.matrix);if(!batches.has(o.material))batches.set(o.material,[]);batches.get(o.material).push(g);group.remove(o);o.geometry.dispose();}
 for(const [m,geometries]of batches){const o=new THREE.Mesh(mergeGeometries(geometries),m);o.castShadow=o.receiveShadow=true;group.add(o);geometries.forEach(g=>g.dispose());}
 world.add(group);
}
