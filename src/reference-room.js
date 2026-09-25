import * as THREE from 'three';
import {RoundedBoxGeometry} from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import {mergeGeometries} from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import {applyInteriorPatina} from './interior-patina.js';

// Reference room: lounge left, bed right, a clear central route to the sea.
export function furnishReferenceRoom(parent,palette,onReady){
 const room=new THREE.Group();room.name='Coastal reference furnishings';parent.add(room);
 const mat=(color,roughness=.85)=>new THREE.MeshStandardMaterial({color,roughness});
 const timber=palette.teak, dark=palette.teakDark, linen=palette.linen;
 const wornTimber=timber.clone(),wornDark=dark.clone();
 for(const m of [wornTimber,wornDark]){m.userData.chippedPaint=true;applyInteriorPatina(m,'furniture');}
 const teal=mat('#388a91'),cream=mat('#f8edda'),rattan=mat('#b98d51'),rope=mat('#c7a46c');
 const coral=mat('#d7816f'),leaf=mat('#417338'),leafLight=mat('#779845');
 const brass=mat('#9c7139',.4),ceramic=mat('#619a91',.36);
 const flowerPink=mat('#ed6f81'),flowerWhite=mat('#fff1d0'),yellow=mat('#e9b94c');
 const floral=linen.clone();floral.color.set('#ffffff');
 for(const m of [linen,teal,cream,coral,floral])applyInteriorPatina(m,'fabric');
 for(const m of [rattan,rope])applyInteriorPatina(m,'wicker');
 applyInteriorPatina(brass,'metal');
 new THREE.TextureLoader().load('/assets/coastal-floral.jpg',t=>{t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=4;floral.map=t;floral.needsUpdate=true;onReady?.();});
 function add(geometry,material,pos,scale,rotation){const m=new THREE.Mesh(geometry,material);m.position.set(...pos);if(scale)m.scale.set(...scale);if(rotation)m.rotation.set(...rotation);m.castShadow=m.receiveShadow=true;room.add(m);return m;}
 function box(w,h,d,x,y,z,m=timber,r=.035){
  if(m===timber)m=wornTimber;else if(m===dark)m=wornDark;
  const geometry=new RoundedBoxGeometry(w,h,d,r>=.1?5:2,Math.min(r,w/3,h/3,d/3));
  if(m.userData.chippedPaint){
   const p=geometry.attributes.position,edge=new Float32Array(p.count);
   for(let i=0;i<p.count;i++){
    // Distance to the second closest face isolates actual edges, not whole faces.
    const distances=[w/2-Math.abs(p.getX(i)),h/2-Math.abs(p.getY(i)),d/2-Math.abs(p.getZ(i))].sort((a,b)=>a-b);
    edge[i]=1-THREE.MathUtils.smoothstep(distances[1],.004,.036);
   }
   geometry.setAttribute('wearEdge',new THREE.BufferAttribute(edge,1));
   // Small hand-worn irregularities affect the silhouette, not just the colour.
   for(let i=0;i<p.count;i++){
    const px=p.getX(i),py=p.getY(i),pz=p.getZ(i),wear=edge[i];
    const amount=Math.min(.005,Math.min(w,h,d)*.035)*wear;
    p.setXYZ(i,px+Math.sin(py*17+pz*11+x)*amount,py+Math.sin(px*13+pz*19+z)*amount*.5,pz+Math.sin(px*15+py*9)*amount);
   }
   geometry.computeVertexNormals();
  }
  return add(geometry,m,[x,y,z]);
 }

 const sphere=new THREE.SphereGeometry(1,14,10);
 function oval(x,y,z,sx,sy,sz,m){return add(sphere,m,[x,y,z],[sx,sy,sz]);}
 function tube(points,r,m){return add(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(...p))),Math.max(12,points.length*3),r,5,false),m,[0,0,0]);}
 function leg(x,y,z,h=.45){box(.10,h,.10,x,y,z,timber,.018);}
 function ring(x,y,z,r,t,m=rope){const o=add(new THREE.TorusGeometry(r,t,5,48),m,[x,y,z]);o.rotation.x=Math.PI/2;return o;}
 function cushion(w,h,d,x,y,z,m,angle=0){
  const o=box(w,h,d,x,y,z,m,.13),p=o.geometry.attributes.position;
  for(let i=0;i<p.count;i++){
   const px=p.getX(i),py=p.getY(i),pz=p.getZ(i),u=px/(w*.5),v=pz/(d*.5);
   const top=THREE.MathUtils.smoothstep(py/h,-.1,.4);
   const sit=Math.exp(-u*u*3.-v*v*3.)*Math.min(.045,h*.13);
   const crease=Math.sin(u*24.+v*3.)*Math.exp(-Math.pow((Math.abs(v)-.76)*8.,2))*.009;
   p.setY(i,py-top*(sit+crease));
   p.setZ(i,pz+Math.sin(u*13.+py*9.)*.006*(1-Math.min(1,Math.abs(u))));
  }
  o.geometry.computeVertexNormals();o.rotation.set(-.13,angle,.035*Math.sin(x*8));return o;
 }

 function basket(x,y,z,r=.36,h=.48){
  add(new THREE.CylinderGeometry(r*.96,r*.82,h,24),rattan,[x,y+h/2,z]);
  for(let j=0;j<12;j++)ring(x,y+.025+j*h/12,z,r*(.83+j*.011),.016,rope);
  for(let j=0;j<24;j++){const a=j/24*Math.PI*2;tube([[x+Math.cos(a)*r*.82,y,z+Math.sin(a)*r*.82],[x+Math.cos(a)*r*.98,y+h,z+Math.sin(a)*r*.98]],.012,rattan);}
 }
 function lantern(x,y,z,s=1){
  box(.28*s,.05*s,.28*s,x,y,z,brass);
  box(.28*s,.055*s,.28*s,x,y+.39*s,z,brass);
  for(const dx of [-.115,.115])for(const dz of [-.115,.115])legMetal(x+dx*s,y+.20*s,z+dz*s,.38*s,.015*s);
  const glow=new THREE.MeshStandardMaterial({color:'#ffe2a3',emissive:'#ffc570',emissiveIntensity:1.2});
  add(new THREE.CylinderGeometry(.055*s,.057*s,.22*s,12),glow,[x,y+.14*s,z]);
  const loop=add(new THREE.TorusGeometry(.07*s,.01*s,5,16),brass,[x,y+.5*s,z]);
  loop.rotation.y=.2;
 }
 function legMetal(x,y,z,h,r){add(new THREE.CylinderGeometry(r,r,h,6),brass,[x,y,z]);}
 function plant(x,y,z,s=1,flowers=false){
  add(new THREE.LatheGeometry([[.12,0],[.19,.03],[.23,.28],[.20,.38]].map(p=>new THREE.Vector2(p[0]*s,p[1]*s)),18),ceramic,[x,y,z]);
  for(let i=0;i<13;i++){
   const a=i*2.39996,h=(.38+(i%4)*.13)*s,w=(.25+(i%3)*.07)*s;
   const tip=[x+Math.cos(a)*w,y+.35*s+h,z+Math.sin(a)*w];
   tube([[x,y+.30*s,z],[(x+tip[0])/2,y+.55*s,(z+tip[2])/2],tip],.012*s,leaf);
   const l=oval(...tip,.11*s,.28*s,.023*s,i%3?leaf:leafLight);l.rotation.set(.6*Math.cos(a),a,.8*Math.sin(a));
   if(flowers&&i%3===0){
    for(let p=0;p<5;p++){const b=p*Math.PI*2/5;const petal=oval(tip[0]+Math.cos(b)*.10*s,tip[1]+Math.sin(b)*.10*s,tip[2]+.05*s,.105*s,.065*s,.035*s,i%2?flowerWhite:flowerPink);petal.rotation.z=b;}
    oval(tip[0],tip[1],tip[2]+.09*s,.035*s,.035*s,.035*s,yellow);
   }
  }
 }
 function vine(x,y,z){
  const points=[];for(let i=0;i<12;i++)points.push([x+Math.sin(i*.8)*.13,y-i*.12,z+Math.sin(i*.4)*.06]);tube(points,.013,leaf);
  for(let i=1;i<12;i++){const p=points[i],l=oval(p[0]+(i%2?.075:-.075),p[1],p[2],.095,.12,.022,leaf);l.rotation.z=i%2?.65:-.65;}
 }
 function books(x,y,z){for(let i=0;i<3;i++){const b=box(.34,.055,.24,x,y+i*.056,z,[teal,cream,coral][i]);b.rotation.y=i*.16;}}

 // Individual staggered oak planks give the sunlight a warm, readable grain.
 const floorMats=Array.from({length:5},(_,i)=>{
  const m=timber.clone();m.color.set(['#c7955e','#d6aa72','#bc8955','#dfb681','#cfa06b'][i]);
  m.roughness=.62;applyInteriorPatina(m,'floor');return m;
 });
 for(let row=0;row<30;row++){
  const z=-5.0+row*.305;
  for(let col=0;col<6;col++){
   const left=Math.max(-6.58,-7.7+col*2.6+(row%3)*.77),right=Math.min(6.70,-5.1+col*2.6+(row%3)*.77);
   if(right<=left)continue;
   const plank=box(right-left-.012,.038,.295,(left+right)/2,.018,z,floorMats[(row*3+col)%5],.006);
   const pos=plank.geometry.attributes.position,n=plank.geometry.attributes.normal,uv=plank.geometry.attributes.uv;
   for(let i=0;i<pos.count;i++)uv.setXY(i,pos.getZ(i)/.4,pos.getX(i)/2.4);
  }
 }

 // Linen L-sofa around the original interactive coffee table.
 box(3.5,.22,1.04,-4.30,.32,-3.17,timber);
 box(3.5,.70,.18,-4.30,.84,-3.68,rattan);
 for(let i=0;i<3;i++)cushion(1.08,.25,.91,-5.43+i*1.11,.56,-3.12,linen);
 box(1.02,.22,2.10,-5.57,.32,-1.60,timber);
 cushion(.92,.26,1.96,-5.57,.56,-1.60,linen);
 box(.18,.72,3.28,-6.14,.82,-2.06,rattan);
 for(let j=0;j<26;j++){
  const x=-5.99+j*.13;tube([[x,.61,-3.73],[x,1.15,-3.73]],.016,rope);
 }
 for(let j=0;j<24;j++){const z=-3.55+j*.13;tube([[-6.18,.58,z],[-6.18,1.16,z]],.015,rope);}
 for(const [x,z] of [[-5.8,-3.5],[-2.8,-3.5],[-5.8,-.7],[-5.1,-.7]])leg(x,.17,z,.30);
 for(let i=0;i<5;i++)cushion(.62,.61,.22,-5.60+i*.62,.96,-3.43,[teal,floral,cream,floral,teal][i],(i-2)*.05);
 cushion(.23,.63,.66,-5.9,.98,-1.4,floral);
 // Linen throw drapes over the chaise, with a fringed end.
 box(.83,.035,1.2,-5.52,.715,-1.12,teal,.012);
 box(.83,.47,.035,-5.52,.48,-.52,teal,.012);
 for(let i=0;i<22;i++)tube([[-5.91+i*.036,.25,-.50],[-5.91+i*.036,.13,-.48]],.009,cream);
 // Thick reclaimed planks visually wrap the existing table without moving its hotspots.
 for(const x of [-4.70,-3.15])for(const z of [-1.79,-.91])box(.17,.49,.17,x,.27,z,dark);
 box(1.72,.18,.08,-3.92,.48,-.84,timber);
 plant(-4.49,.59,-1.65,.65,true);lantern(-3.23,.60,-.98,.70);

 // Jute rugs, round woven ottoman and foot-of-bed bench.
 const jute=palette.rug.clone();jute.color.set('#c19b68');applyInteriorPatina(jute,'fabric');
 new THREE.TextureLoader().load('/assets/coastal-jute.jpg',t=>{
  t.colorSpace=THREE.SRGBColorSpace;t.wrapS=t.wrapT=THREE.RepeatWrapping;t.repeat.set(5,5);t.anisotropy=4;
  jute.map=t;jute.color.set('#ffffff');jute.bumpMap=t.clone();jute.bumpMap.colorSpace=THREE.NoColorSpace;jute.bumpMap.needsUpdate=true;jute.bumpScale=.025;jute.needsUpdate=true;onReady?.();
 });
 box(4.7,.035,4.1,-3.9,.055,-1.45,jute,.015);
 for(let i=0;i<66;i++)for(const z of [-3.55,.64])tube([[-6.20+i*.07,.079,z],[-6.20+i*.07,.077,z+(z>0?.12:-.12)]],.009,rope);
 oval(-2.25,.34,.45,.68,.34,.68,rattan);
 for(let i=0;i<18;i++){const t=i/17,r=.66*Math.sqrt(1-Math.pow((t-.5)*1.7,2));ring(-2.25,.08+t*.53,.45,r,.022,rope);}
 for(let i=1;i<15;i++)ring(-2.25,.65-i*.002,.45,i*.043,.021,rope);
 box(3.7,.035,4.4,3.9,.055,-.20,jute,.015);
 box(2.9,.30,3.25,4.0,.38,-.35,timber);
 box(3.0,1.45,.15,4.0,1.02,-2.10,timber);
 for(let i=0;i<16;i++)box(.12,1.35,.06,2.58+i*.19,1.01,-1.99,rattan,.02);
 cushion(2.85,.35,3.15,4.0,.72,-.32,cream);
 // Curved cloth mesh: real folds on the bedspread and its hanging foot.
 const clothGeo=new THREE.PlaneGeometry(2.93,3.44,40,48),cp=clothGeo.attributes.position;
 for(let i=0;i<cp.count;i++){const x=cp.getX(i),v=cp.getY(i),drop=Math.max(0,Math.abs(x)-1.34)*1.65+Math.max(0,-v-1.24)*1.5;cp.setXYZ(i,x,.91-drop+.027*Math.sin(x*15+v*2)*Math.sin(v*7),-.32-v);}
 clothGeo.computeVertexNormals();const bedding=cream.clone();bedding.side=THREE.DoubleSide;add(clothGeo,bedding,[4,0,0]);
 const runner=box(2.94,.035,1.13,4.0,.966,.42,floral,.012);
 box(2.93,.35,.035,4.0,.79,1.015,teal,.012);
 for(let i=0;i<55;i++)tube([[2.57+i*.053,.62,1.045],[2.57+i*.053,.50,1.065]],.009,cream);
 for(const x of [3.25,4.70])cushion(1.25,.45,.65,x,1.04,-1.43,linen);
 for(const x of [3.45,4.55])cushion(.66,.58,.20,x,1.23,-1.11,floral,x<4?-.08:.08);
 box(3.05,.14,.65,4.0,.51,1.88,timber);for(const x of [2.62,5.38])for(const z of [1.65,2.10])leg(x,.25,z,.48);
 basket(4,.08,1.90,.43,.34);books(3.0,.61,1.88);
 // A woven straw hat on the bench.
 ring(4.95,.60,1.89,.25,.046,rattan);oval(4.95,.68,1.89,.18,.12,.18,rattan);ring(4.95,.65,1.89,.18,.015,teal);

 // Window-side writing nook and plant-filled wall shelving.
 box(1.7,.10,.82,4.35,.91,-4.12,timber);
 for(const x of [3.60,5.10])for(const z of [-4.45,-3.79])leg(x,.45,z,.90);
 box(.67,.10,.66,4.35,.47,-3.25,rattan);
 for(const x of [4.08,4.62])for(const z of [-3.50,-3.00])leg(x,.24,z,.43);
 tube([[4.0,.47,-2.96],[4.0,1.08,-2.96],[4.68,1.08,-2.96],[4.68,.47,-2.96]],.035,rattan);
 for(let i=0;i<9;i++)tube([[4.04+i*.075,.53,-2.96],[4.04+i*.075,1.02,-2.96]],.012,rope);
 cushion(.59,.09,.58,4.35,.56,-3.25,floral);plant(4.65,.97,-4.10,.43,true);books(3.85,.98,-4.15);
 for(const x of [-6.34,6.55])for(const y of [1.85,2.75,3.65]){
  box(.48,.10,2.05,x,y,.65,timber);
  plant(x,y+.07,.1,.43,y<3);books(x,y+.09,1.25);vine(x+(x<0?.15:-.15),y+.30,.65);
 }
 plant(5.95,.04,-3.70,1.65);plant(-6.0,.04,-4.38,1.10);plant(-1.4,.04,-4.60,.85,true);
 plant(-5.55,.98,2.62,.65,true);lantern(-5.10,.98,2.60,.75);
 box(.65,.62,.65,5.98,.35,-1.55,timber);lantern(5.98,.71,-1.55,.9);
 plant(-6.02,.04,1.7,1.0,true);plant(6.25,.04,2.45,.8,true);
 // Actual porch depth and tropical foliage between the glazing and sea view.
 for(let i=0;i<34;i++)box(.37,.07,1.25,-6.1+i*.37,-.02,-5.91,timber,.008);
 plant(-4.9,.025,-5.90,1.10,true);plant(5.45,.025,-5.93,1.35,true);
 plant(-2.5,.025,-6.10,.60,true);plant(2.0,.025,-6.10,.65,true);

 // A compact vintage kitchenette on the rear wall (the second reference).
 const painted=teal.clone();painted.map=timber.map;painted.bumpMap=timber.bumpMap;painted.bumpScale=.012;painted.userData.chippedPaint=true;applyInteriorPatina(painted,'paint');
 box(2.6,.82,.66,.2,.44,3.60,painted);box(2.75,.09,.76,.2,.90,3.60,timber);
 for(const x of [-.68,.18,1.04]){
  box(.76,.65,.045,x,.46,3.23,painted);box(.56,.43,.025,x,.45,3.20,timber);
  const knob=oval(x+.22,.66,3.16,.024,.024,.032,brass);
 }
 for(let row=0;row<4;row++)for(let col=0;col<12;col++)box(.216,.216,.027,-1.03+col*.224,1.07+row*.224,4.055,row%2?teal:ceramic,.005);
 box(.70,.07,.47,-.45,.94,3.58,cream);box(.52,.026,.32,-.45,.978,3.58,dark);
 tube([[-.45,.96,3.90],[-.45,1.32,3.90],[-.45,1.35,3.62],[-.45,1.19,3.59]],.021,brass);
 for(const x of [.45,.93])ring(x,.96,3.57,.15,.016,brass);
 for(const y of [2.08,3.46]){box(2.9,.11,.40,.15,y,3.85,timber);plant(-.80,y+.07,3.83,.40,true);lantern(.80,y+.09,3.82,.65);books(.05,y+.08,3.82);}
 box(.84,1.69,.76,2.13,.86,3.53,cream,.10);
 for(const y of [.60,1.38]){box(.77,y>1? .55:.87,.065,2.13,y,3.12,cream,.055);legMetal(1.86,y,3.06,.26,.018);}

 // Rattan pendant: open woven ribs, light visible through the lattice.
 tube([[-3.55,4.68,-1.30],[-3.55,3.97,-1.30]],.016,dark);
 const lampY=3.15;
 for(let j=0;j<12;j++){const t=j/11,r=.69*Math.sin(.35+t*1.45);ring(-3.55,lampY+.8-t*.8,-1.30,r,.020,rattan);}
 for(let i=0;i<28;i++){
  const a=i/28*Math.PI*2,points=[];
  for(let j=0;j<10;j++){const t=j/9,r=.69*Math.sin(.35+t*1.45);points.push([-3.55+Math.cos(a+t*.32)*r,lampY+.8-t*.8,-1.3+Math.sin(a+t*.32)*r]);}
  tube(points,.017,rattan);
 }
 oval(-3.55,3.51,-1.30,.11,.14,.11,new THREE.MeshStandardMaterial({color:'#ffe2a1',emissive:'#ffb75e',emissiveIntensity:2}));
 // Timber ceiling rafters and a simple vintage ceiling fan.
 for(const z of [-3.4,.0,3.15])box(13.1,.21,.20,0,4.40,z,timber);
 for(let x=-6;x<6.2;x+=1.3)box(.10,.10,9.1,x,5.85-Math.abs(x)*.178,-.5,timber);
 add(new THREE.CylinderGeometry(.17,.22,.22,16),brass,[1.6,4.19,-.3]);
 for(let i=0;i<4;i++){const a=i*Math.PI/2;const b=box(1.1,.045,.23,1.6+Math.cos(a)*.65,4.12,-.3+Math.sin(a)*.65,timber);b.rotation.y=-a;}
 // Batch static décor by material: detailed wicker without thousands of draw calls.
 room.updateMatrixWorld(true);const batches=new Map();
 for(const mesh of [...room.children]){
  if(!mesh.isMesh)continue;
  const g=mesh.geometry.clone().applyMatrix4(mesh.matrix);const plain=g.index?g.toNonIndexed():g;
  for(const attribute of Object.keys(plain.attributes))if(!['position','normal','uv','wearEdge'].includes(attribute))plain.deleteAttribute(attribute);
  if(!batches.has(mesh.material))batches.set(mesh.material,[]);batches.get(mesh.material).push(plain);room.remove(mesh);
 }
 for(const [material,geometries] of batches){const g=mergeGeometries(geometries);const m=new THREE.Mesh(g,material);m.castShadow=m.receiveShadow=true;room.add(m);geometries.forEach(g=>g.dispose());}
 onReady?.();return room;
}
