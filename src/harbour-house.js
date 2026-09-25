import * as THREE from 'three';
import {RoundedBoxGeometry} from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import {createWeatheredWood} from './weathered-wood.js';

// Work on whole connected pieces, keeping every tile/slab watertight.
function pieces(geometry){
 const p=geometry.attributes.position,parent=Array.from({length:p.count},(_,i)=>i);
 const root=i=>{while(parent[i]!==i){parent[i]=parent[parent[i]];i=parent[i];}return i;};
 const indices=geometry.index?.array??parent.slice();
 for(let i=0;i<indices.length;i+=3){const r=root(indices[i]);parent[root(indices[i+1])]=r;parent[root(indices[i+2])]=r;}
 const groups=new Map();
 for(let i=0;i<p.count;i++){const r=root(i);if(!groups.has(r))groups.set(r,[]);groups.get(r).push(i);}
 return [...groups.values()];
}

export function refineHarbourHouse(world){
 world.traverse(mesh=>{
  if(!mesh.isMesh)return;
  const name=mesh.material.name;
  if(!/^Roof tile|rock|Sunlit sand/i.test(name))return;
  const g=mesh.geometry,p=g.attributes.position;
  for(const group of pieces(g)){
   const bounds=new THREE.Box3();for(const i of group)bounds.expandByPoint(new THREE.Vector3().fromBufferAttribute(p,i));
   const c=bounds.getCenter(new THREE.Vector3()),size=bounds.getSize(new THREE.Vector3());
   const seed=Math.sin(c.x*17.13+c.z*39.7)*43758.5,random=seed-Math.floor(seed);
   const tile=name.startsWith('Roof tile');
   const slab=/rock/i.test(name)&&c.x>14&&c.x<16&&c.z>4.55&&c.z<8.5&&c.y<.6&&size.x>.5;
   const step=name==='Sunlit sand'&&c.x>14&&c.x<16&&c.z>3.2&&c.z<4.6&&size.x>1.5;
   if(!tile&&!slab&&!step)continue;
   const angle=(random-.5)*(tile?.018:slab?.12:0);
   for(const i of group){
    let x=p.getX(i)-c.x,y=p.getY(i),z=p.getZ(i)-c.z;
    if(step&&y>c.y){x*=.984;z*=.90;y-=.008*(.5+.5*Math.sin(x*9.));}
    p.setXYZ(i,c.x+x*Math.cos(angle)-z*Math.sin(angle)+(slab?(random-.5)*.15:0),
     y+(tile?(random-.5)*.035:slab&&y<c.y?-.045:0),
     c.z+x*Math.sin(angle)+z*Math.cos(angle)+(slab?(random-.5)*.10:tile?(random-.5)*.032:0));
   }
  }
  p.needsUpdate=true;g.computeVertexNormals();g.computeBoundingSphere();
 });
 const wood=new THREE.MeshStandardMaterial({color:'#d5b185',...createWeatheredWood()});
 wood.userData.ageKind='wood';
 const stone=new THREE.MeshStandardMaterial({color:'#c4b59c',roughness:1});
 stone.userData.ageKind='stone';
 function block(name,x,y,z,w,h,d,material,radius=.025){
  const mesh=new THREE.Mesh(new RoundedBoxGeometry(w,h,d,2,radius),material);
  mesh.name=name;mesh.position.set(x,y,z);mesh.castShadow=true;mesh.receiveShadow=true;world.add(mesh);return mesh;
 }
 // Projecting sills and outer casings frame the existing recessed glass.
 for(const x of [13.145,16.645]){
  block('Weathered window sill',x,1.96,1.04,1.04,.13,.34,wood);
  for(const dx of [-.45,.45])block('Window casing',x+dx,2.49,1.025,.10,1.12,.15,wood);
  block('Window lintel',x,3.045,1.035,1.02,.12,.19,wood);
 }
 for(const x of [14.59,15.51])block('Door jamb',x,1.94,1.01,.12,2.20,.21,wood);
 block('Door lintel',15.05,3.07,1.03,1.08,.15,.23,wood);
 block('Worn doorway threshold',15.05,.89,1.055,1.05,.105,.36,stone);
 // Open paired casements with a warm recessed interior, not an opaque teal pane.
 world.traverse(o=>{if(o.isMesh&&o.material.name==='Window glass')o.visible=false;});
 const frame=new THREE.MeshStandardMaterial({color:'#4e9690',roughness:.83});
 frame.userData.ageKind='wood';
 const glass=new THREE.MeshStandardMaterial({color:'#d1e2cf',transparent:true,opacity:.20,roughness:.22,side:THREE.DoubleSide,depthWrite:false});
 const inside=new THREE.MeshStandardMaterial({color:'#ae7948',emissive:'#ffbc60',emissiveIntensity:.38,roughness:1});
 for(const x of [13.145,16.645]){
  block('Warm room beyond open window',x,2.48,.943,.74,.96,.025,inside,.005);
  block('Inner window ledge',x,2.08,.976,.73,.055,.055,wood,.008);
  for(const side of [-1,1]){
   const sash=new THREE.Group();sash.position.set(x+side*.38,2.48,1.04);sash.rotation.y=side*1.10;world.add(sash);
   const local=(w,h,d,xx,yy,mat)=>{const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),mat);m.position.set(xx,yy,0);m.castShadow=mat!==glass;m.receiveShadow=true;sash.add(m);};
   const center=-side*.185;
   for(const edge of [-.175,.175])local(.045,.98,.065,center+edge,0,frame);
   for(const yy of [-.47,0,.47])local(.37,.045,.065,center,yy,frame);
   local(.31,.88,.015,center,0,glass);
  }
 }
 // Side windows use a local frame facing out of each side wall.
 for(const side of [-1,1]){
  const bay=new THREE.Group();bay.name='Open side casement';bay.position.set(side<0?11.88:17.72,2.45,-1.45);bay.rotation.y=side*Math.PI/2;world.add(bay);
  const localBlock=(w,h,d,x,y,z,mat)=>{const m=new THREE.Mesh(new RoundedBoxGeometry(w,h,d,2,.014),mat);m.position.set(x,y,z);m.castShadow=m.receiveShadow=true;bay.add(m);return m;};
  localBlock(1.28,1.26,.05,0,0,-.18,inside);
  for(const dx of [-.65,.65])localBlock(.11,1.45,.24,dx,0,-.035,wood);
  for(const yy of [-.68,.68])localBlock(1.40,.11,.24,0,yy,-.035,wood);
  localBlock(1.53,.12,.45,0,-.72,.06,wood);
  for(const hingeSide of [-1,1]){
   const sash=new THREE.Group();sash.position.set(hingeSide*.61,0,.065);sash.rotation.y=hingeSide*1.12;bay.add(sash);
   const part=(w,h,d,x,y,mat)=>{const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),mat);m.position.set(x,y,0);m.castShadow=mat!==glass;m.receiveShadow=true;sash.add(m);};
   const cx=-hingeSide*.30;
   for(const dx of [-.28,.28])part(.055,1.25,.075,cx+dx,0,frame);
   for(const yy of [-.60,0,.60])part(.61,.055,.075,cx,yy,frame);
   part(.51,1.12,.02,cx,0,glass);
  }
 }
 // Low masonry courses bridge the plaster walls and existing stepped base.
 for(const x of [11.90,17.70]){
  for(let i=0;i<7;i++)block('Foundation side course',x,.985,-3.4+i*.62,.16,.23,.595,stone,.035);
 }
 for(let i=0;i<8;i++)block('Foundation rear course',12.25+i*.73,.985,-3.77,.705,.23,.16,stone,.035);
}
