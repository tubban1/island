import * as THREE from 'three';
import {RoundedBoxGeometry} from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import {GLTFLoader} from 'three/examples/jsm/loaders/GLTFLoader.js';
import {createWindowView} from './window-view.js';

export function createMemoryRoom(exterior){
 const scene=new THREE.Scene();scene.background=new THREE.Color('#222828');
 // 第一人称全景广角相机（默认 72° 视野，具有强烈空间沉浸感）
 const camera=new THREE.PerspectiveCamera(72,innerWidth/innerHeight,.1,80);
 const windowView=createWindowView(exterior,{profile:new URLSearchParams(location.search).has('perf')});
 
 // 室内全景柔和环境光与温暖海岛阳光
 scene.add(new THREE.HemisphereLight('#fffaf0','#998668',1.9));
 const sun=new THREE.DirectionalLight('#ffe8be',3.6);
 sun.position.set(-3.8,7.2,-7.5);
 sun.target.position.set(-3.8,0,-0.5);
 scene.add(sun,sun.target);
 sun.castShadow=true;sun.shadow.mapSize.set(1024,1024);
 Object.assign(sun.shadow.camera,{left:-9,right:9,top:9,bottom:-9,near:.1,far:24});
 sun.shadow.bias=-.0003;sun.shadow.normalBias=.025;sun.shadow.autoUpdate=false;sun.shadow.needsUpdate=true;
 
 // 客厅与茶几区域的柔和暖光补光
 const warmLamp=new THREE.PointLight('#ffbe7d',3.6,10,1.8);
 warmLamp.position.set(-3.9,2.8,-1.35);
 scene.add(warmLamp);
 const fill=new THREE.DirectionalLight('#f9efe1',.85);
 fill.position.set(2,3.5,6);
 scene.add(fill);

 const group=new THREE.Group();scene.add(group);
 const roomModelGroup=new THREE.Group();group.add(roomModelGroup);
 const interactiveGroup=new THREE.Group();group.add(interactiveGroup);

 function weave(){
   const c=document.createElement('canvas');c.width=c.height=128;const g=c.getContext('2d');
   g.fillStyle='#e4e1d6';g.fillRect(0,0,128,128);
   for(let i=0;i<128;i+=3){
     g.strokeStyle=i%2?'#cbc9bc':'#f5f2e6';g.lineWidth=.65;g.beginPath();
     g.moveTo(i,0);g.lineTo(i,128);g.moveTo(0,i);g.lineTo(128,i);g.stroke();
   }
   const t=new THREE.CanvasTexture(c);t.wrapS=t.wrapT=THREE.RepeatWrapping;t.repeat.set(4,4);return t;
 }
 const fabric=weave();
 const mat=(color,options={})=>new THREE.MeshStandardMaterial({color,roughness:.82,...options});

 // 复古原木海岛度假风格材质调色板
 const palette={
   teak:mat('#7f5533',{roughness:.52,metalness:.03}),
   teakDark:mat('#5c3a21',{roughness:.58,metalness:.02}),
   plaster:mat('#f5eee2',{roughness:.88}),
   cream:mat('#f4edd9',{roughness:.75}),
   linen:mat('#ece3cb',{roughness:.86,bumpMap:fabric,bumpScale:.018}),
   linenRose:mat('#c79f82',{roughness:.85,bumpMap:fabric,bumpScale:.02}),
   linenSage:mat('#8b9d75',{roughness:.85,bumpMap:fabric,bumpScale:.02}),
   brass:mat('#cda863',{metalness:.72,roughness:.36}),
   ceramic:mat('#faf4e8',{roughness:.38}),
   paper:mat('#fff5dc',{roughness:.92}),
   rug:mat('#cbba95',{roughness:.92,bumpMap:fabric,bumpScale:.025})
 };

 // ==================== 加载并重构 Loft 模型（复古原木海岛风） ====================
 const gltfLoader=new GLTFLoader();
 let loftModel=null;

 function applyCoastalVintageTheme(root){
   root.traverse(child=>{
     if(!child.isMesh)return;
     child.castShadow=true;child.receiveShadow=true;
     const name=child.name||'';
     const matName=child.material?.name||'';

     // 1. 外部天球/HDRI 球完全隐藏，透出窗外真实动态海洋
     if(name.includes('Sphere')||matName.includes('Material.017')){
       child.visible=false;
       return;
     }

     // 2. 地板 -> 温润做旧老柚木地板（Teak Wood）
     if(name.includes('Plane_Material.002')||matName==='Material.002'||name.includes('Plane.001__0')){
       child.material=palette.teak.clone();
       child.material.roughness=0.48;
       return;
     }

     // 3. 墙面与柱子 -> 海岛暖白海泥微水泥（Warm Sand Plaster）
     if(name.includes('Cube_Material.003')||matName==='Material.003'||name.includes('Cube.004')||name.includes('Cube.005')){
       child.material=palette.plaster.clone();
       return;
     }

     // 4. 金属构件、灯架、工业骨架 -> 做旧拉丝黄铜（Aged Brass）
     if(matName==='material'||matName==='Material.004'||matName==='Material.008'||name.includes('Cube.001')||name.includes('Cube.006')){
       child.material=palette.brass.clone();
       return;
     }

     // 5. 沙发与软垫 -> 燕麦色天然粗织亚麻（Boho Linen）
     if(matName==='Material.007'||matName==='Material.005'||name.includes('node_0.002')||name.includes('node_0_Material.005')){
       child.material=palette.linen.clone();
       return;
     }

     // 6. 地毯 -> 波西米亚剑麻编织地毯
     if(name.includes('Plane.002')||matName==='Material.012'){
       child.material=palette.rug.clone();
       return;
     }

     // 7. 茶几、置物架、木质边柜 -> 复古深柚木/胡桃木
     if(matName==='Material.011'||matName==='Material.010'||matName==='Material.009'||matName==='Material.006'||name.includes('node_0.006')||name.includes('node_0.004')||name.includes('node_0.005')){
       child.material=palette.teakDark.clone();
       return;
     }

     // 其余部件采用柔和暖调微调
     if(child.material){
       child.material.roughness=Math.max(child.material.roughness||0.5,0.45);
     }
   });
 }

 gltfLoader.load('assets/loft_interior_6_for_free.glb',gltf=>{
   loftModel=gltf.scene;
   applyCoastalVintageTheme(loftModel);
   roomModelGroup.add(loftModel);
 },undefined,err=>{
   console.warn('Loft model failed to load, keeping procedural room fallback:',err);
 });

 // ==================== 🪟 面海大窗与实时动态海景 ====================
 // 动态海景背景板（尺寸扩大，紧贴室外落地大窗）
 const windowMaterial=new THREE.MeshBasicMaterial({map:windowView.texture});
 const windowMesh=new THREE.Mesh(new THREE.PlaneGeometry(7.2,4.6),windowMaterial);
 windowMesh.position.set(-3.8,2.4,-5.8);
 interactiveGroup.add(windowMesh);

 // 左右开合活动木窗扇（完全向外推开，无中柱，拥抱海风）
 let isWindowOpen=false,windowAngle=0,targetWindowAngle=0;
 const windowLeftHinge=new THREE.Group();
 windowLeftHinge.position.set(-5.65,2.4,-5.12);
 interactiveGroup.add(windowLeftHinge);
 const leftCasement=new THREE.Mesh(new THREE.BoxGeometry(1.82,2.82,.035),mat('#f4ebd9',{roughness:.65}));
 leftCasement.position.set(.91,0,0);leftCasement.userData={action:'window',title:'推开海景大窗'};
 windowLeftHinge.add(leftCasement);
 const leftHandle=new THREE.Mesh(new THREE.CylinderGeometry(.01,.01,.14,8),palette.brass);
 leftHandle.position.set(1.75,0,.025);leftHandle.userData={action:'window',title:'推开海景大窗'};
 windowLeftHinge.add(leftHandle);

 const windowRightHinge=new THREE.Group();
 windowRightHinge.position.set(-1.95,2.4,-5.12);
 interactiveGroup.add(windowRightHinge);
 const rightCasement=new THREE.Mesh(new THREE.BoxGeometry(1.82,2.82,.035),mat('#f4ebd9',{roughness:.65}));
 rightCasement.position.set(-.91,0,0);rightCasement.userData={action:'window',title:'推开海景大窗'};
 windowRightHinge.add(rightCasement);
 const rightHandle=new THREE.Mesh(new THREE.CylinderGeometry(.01,.01,.14,8),palette.brass);
 rightHandle.position.set(-1.75,0,.025);rightHandle.userData={action:'window',title:'推开海景大窗'};
 windowRightHinge.add(rightHandle);

 // 窗户点击交互热点
 const windowHotspot=new THREE.Mesh(new THREE.PlaneGeometry(4.0,3.0),new THREE.MeshBasicMaterial({transparent:true,opacity:0,depthWrite:false,side:THREE.DoubleSide}));
 windowHotspot.position.set(-3.8,2.4,-4.95);
 windowHotspot.userData={action:'window',title:'推开海景大窗'};
 interactiveGroup.add(windowHotspot);

 // 柔和飘拂的半透明亚麻白纱窗帘
 const curtains=[];
 for(const x of [-5.75,-1.85]){
  const geo=new THREE.PlaneGeometry(.92,3.3,16,24),pos=geo.attributes.position;
  for(let i=0;i<pos.count;i++){
    const y=pos.getY(i),localX=pos.getX(i);
    pos.setZ(i,Math.cos(localX*43)*.065+.09*Math.cos(y*1.7));
    pos.setX(i,localX*(.73+.27*Math.abs(y)/1.55));
  }
  geo.computeVertexNormals();
  const material=mat('#fff6e5',{side:THREE.DoubleSide,bumpMap:fabric,bumpScale:.008});
  const curtain=new THREE.Mesh(geo,material);curtain.position.set(x,2.35,-4.82);
  interactiveGroup.add(curtain);curtains.push(curtain);
 }

 // ==================== ☕ 茶几焦点：信件 + 袅袅咖啡 ====================
 const tableCenter={x:-3.92,y:.585,z:-1.35};
 const paper=new THREE.Mesh(new THREE.BoxGeometry(.62,.014,.42),palette.paper);
 paper.position.set(tableCenter.x,tableCenter.y+.007,tableCenter.z);
 paper.rotation.y=.12;paper.userData.action='letter';
 interactiveGroup.add(paper);

 const envelope=new THREE.Mesh(new THREE.BoxGeometry(.44,.013,.28),palette.cream);
 envelope.position.set(tableCenter.x+.18,tableCenter.y+.015,tableCenter.z-.12);
 envelope.rotation.y=-.08;envelope.userData.action='letter';
 interactiveGroup.add(envelope);

 const letterHotspot=new THREE.Mesh(new THREE.PlaneGeometry(1.6,1.4),new THREE.MeshBasicMaterial({transparent:true,opacity:0,depthWrite:false,side:THREE.DoubleSide}));
 letterHotspot.rotation.x=-Math.PI/2;
 letterHotspot.position.set(tableCenter.x,tableCenter.y+.03,tableCenter.z);
 letterHotspot.userData.action='letter';
 interactiveGroup.add(letterHotspot);

 // 咖啡杯与托盘
 const cx=tableCenter.x-.38,cz=tableCenter.z+.16;
 const saucer=new THREE.Mesh(new THREE.CylinderGeometry(.13,.13,.018,20),palette.ceramic);
 saucer.position.set(cx,tableCenter.y+.009,cz);interactiveGroup.add(saucer);
 const cup=new THREE.Mesh(new THREE.CylinderGeometry(.075,.058,.12,20),palette.ceramic);
 cup.position.set(cx,tableCenter.y+.07,cz);interactiveGroup.add(cup);
 const coffeeLiquid=new THREE.Mesh(new THREE.CylinderGeometry(.068,.068,.006,20),palette.teakDark);
 coffeeLiquid.position.set(cx,tableCenter.y+.125,cz);interactiveGroup.add(coffeeLiquid);
 const cupHandle=new THREE.Mesh(new THREE.TorusGeometry(.045,.012,6,12),palette.ceramic);
 cupHandle.position.set(cx+.075,tableCenter.y+.07,cz);cupHandle.rotation.y=Math.PI/2;
 interactiveGroup.add(cupHandle);

 // ☕ 咖啡杯袅袅热气粒子系统
 const steamGroup=new THREE.Group();
 steamGroup.position.set(cx,tableCenter.y+.16,cz);
 interactiveGroup.add(steamGroup);
 const steamCanvas=document.createElement('canvas');steamCanvas.width=steamCanvas.height=64;
 const sCtx=steamCanvas.getContext('2d');
 const sGrad=sCtx.createRadialGradient(32,32,0,32,32,32);
 sGrad.addColorStop(0,'rgba(255,255,255,0.7)');sGrad.addColorStop(.35,'rgba(255,255,255,0.22)');sGrad.addColorStop(1,'rgba(255,255,255,0)');
 sCtx.fillStyle=sGrad;sCtx.fillRect(0,0,64,64);
 const steamTexture=new THREE.CanvasTexture(steamCanvas);
 const steamParticles=[];
 const steamMat=new THREE.SpriteMaterial({map:steamTexture,transparent:true,opacity:.35,depthWrite:false});
 for(let i=0;i<14;i++){
   const sprite=new THREE.Sprite(steamMat.clone());
   sprite.scale.set(.06,.06,1);
   steamGroup.add(sprite);
   steamParticles.push({sprite,age:Math.random()*2.4,maxAge:2.0+Math.random()*.8,angle:Math.random()*Math.PI*2});
 }

 // ==================== 📅 纪念日挂历 ====================
 const calendarGroup=new THREE.Group();
 calendarGroup.position.set(-6.55,2.15,-1.35);
 calendarGroup.rotation.y=Math.PI/2;
 interactiveGroup.add(calendarGroup);

 const calBacking=new THREE.Mesh(new RoundedBoxGeometry(.64,.88,.03,2,.015),palette.teak);
 calendarGroup.add(calBacking);
 const calPin=new THREE.Mesh(new THREE.CylinderGeometry(.016,.016,.03,10),palette.brass);
 calPin.rotation.x=Math.PI/2;calPin.position.set(0,.39,.02);calendarGroup.add(calPin);
 const calCanvas=document.createElement('canvas');calCanvas.width=384;calCanvas.height=512;
 const calTexture=new THREE.CanvasTexture(calCanvas);
 const calPaper=new THREE.Mesh(new THREE.PlaneGeometry(.54,.74),new THREE.MeshBasicMaterial({map:calTexture,side:THREE.DoubleSide}));
 calPaper.position.set(0,-.03,.018);calPaper.userData={action:'calendar',title:'纪念日挂历'};
 calendarGroup.add(calPaper);
 calBacking.userData={action:'calendar',title:'纪念日挂历'};

 const calendarHotspot=new THREE.Mesh(new THREE.PlaneGeometry(.7,.95),new THREE.MeshBasicMaterial({transparent:true,opacity:0,depthWrite:false,side:THREE.DoubleSide}));
 calendarHotspot.position.set(-6.5,2.15,-1.35);calendarHotspot.rotation.y=Math.PI/2;
 calendarHotspot.userData={action:'calendar',title:'纪念日挂历'};
 interactiveGroup.add(calendarHotspot);

 function drawCalendar(anniversaryText,occasionTitle){
   const ctx=calCanvas.getContext('2d');
   ctx.fillStyle='#faf6ec';ctx.fillRect(0,0,384,512);
   ctx.fillStyle='#b8453d';ctx.fillRect(0,0,384,105);
   ctx.fillStyle='#ffffff';ctx.font='bold 28px sans-serif';ctx.textAlign='center';
   ctx.fillText('OUR SPECIAL DAY',192,48);
   ctx.font='18px sans-serif';ctx.fillText('纪念日 · 岁月静好',192,82);
   let dateStr='5.20',subText='相遇的特别时刻';
   if(anniversaryText){
     const match=anniversaryText.match(/(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/);
     if(match){
       dateStr=`${parseInt(match[2])}.${parseInt(match[3])}`;
       const days=Math.max(1,Math.floor((Date.now()-new Date(anniversaryText).getTime())/(1000*60*60*24)));
       subText=`相伴相知的第 ${days} 天`;
     }else{
       dateStr=anniversaryText.slice(0,10);
     }
   }
   ctx.fillStyle='#2b4e43';ctx.font='bold 84px Georgia,serif';ctx.fillText(dateStr,192,260);
   ctx.fillStyle='#6c7f6d';ctx.font='bold 22px sans-serif';ctx.fillText(subText,192,345);
   if(occasionTitle){
     ctx.fillStyle='#988062';ctx.font='italic 19px Georgia,serif';
     ctx.fillText(`「${occasionTitle}」`,192,400);
   }
   ctx.strokeStyle='#b8453d';ctx.lineWidth=3;ctx.strokeRect(144,430,96,44);
   ctx.fillStyle='#b8453d';ctx.font='bold 18px sans-serif';ctx.fillText('LOVE',192,460);
   calTexture.needsUpdate=true;
 }
 drawCalendar('2024-05-20','初见于夏日');

 // ==================== 🖼️ 温暖回忆照片墙 ====================
 const slots=[
   [-5.2,2.8,3.92,Math.PI,1.35,1.5],
   [-3.6,2.8,3.92,Math.PI,1.20,1.55],
   [-2.1,2.95,3.92,Math.PI,1.42,1.12],
   [-0.6,2.7,3.92,Math.PI,1.05,1.32],
   [1.0,2.8,3.92,Math.PI,1.25,1.45],
   [-6.55,3.15,0.8,Math.PI/2,1.15,1.35]
 ];
 const frames=[],texLoader=new THREE.TextureLoader();let revision=0;
 function placeholder(index){
   const c=document.createElement('canvas');c.width=256;c.height=320;const ctx=c.getContext('2d');
   ctx.fillStyle=['#e4d8bc','#c3d1bf','#d8bfa4'][index%3];ctx.fillRect(0,0,256,320);
   ctx.strokeStyle='#8a9f80';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(128,245);ctx.bezierCurveTo(92,170,175,118,122,60);ctx.stroke();
   for(let i=0;i<5;i++){ctx.beginPath();ctx.ellipse(128+(i%2?19:-15),92+i*30,23,9,i%2?-.6:.6,0,Math.PI*2);ctx.stroke();}
   ctx.fillStyle='#fff4d5';ctx.beginPath();ctx.arc(195,54,17,0,Math.PI*2);ctx.fill();
   const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;return t;
 }
 const placeholders=slots.map((_,i)=>placeholder(i));
 for(let i=0;i<slots.length;i++){
  const [x,y,z,rotation,w,h]=slots[i],pivot=new THREE.Group();
  pivot.position.set(x,y,z);pivot.rotation.y=rotation;interactiveGroup.add(pivot);
  const frame=new THREE.Mesh(new RoundedBoxGeometry(w,h,.085,2,.025),i%2?palette.teakDark:palette.teak);
  frame.castShadow=true;pivot.add(frame);
  const mount=new THREE.Mesh(new THREE.PlaneGeometry(w-.09,h-.09),new THREE.MeshStandardMaterial({color:'#fff8eb',roughness:1}));
  mount.position.z=.048;pivot.add(mount);
  const photo=new THREE.Mesh(new THREE.PlaneGeometry(w-.25,h-.25),new THREE.MeshBasicMaterial({map:placeholders[i]}));
  photo.position.z=.053;photo.userData={slot:i,width:w-.25,height:h-.25};pivot.add(photo);frames.push(photo);
 }

 const raycaster=new THREE.Raycaster();let measureStart=0,measuredFrames=0,frameRate=30;

 // ==================== 第一人称全景沉浸式相机系统 ====================
 const defaultEye={x:-2.8,y:1.62,z:0.6};
 const eyePos=new THREE.Vector3(defaultEye.x,defaultEye.y,defaultEye.z);
 const targetEyePos=new THREE.Vector3(defaultEye.x,defaultEye.y,defaultEye.z);

 const defaultOrientation={yaw:-0.15,pitch:-0.14,fov:72};
 let eyeYaw=defaultOrientation.yaw,targetEyeYaw=defaultOrientation.yaw;
 let eyePitch=defaultOrientation.pitch,targetEyePitch=defaultOrientation.pitch;
 let currentFov=defaultOrientation.fov,targetFov=defaultOrientation.fov;

 function constrainEye(){
   targetEyePos.x=THREE.MathUtils.clamp(targetEyePos.x,-5.8,4.5);
   targetEyePos.z=THREE.MathUtils.clamp(targetEyePos.z,-3.8,3.2);
   targetEyePos.y=1.62;
 }

 let onFootstepCb=null;let accumulatedDist=0;

 function hotspot(x,y){
   raycaster.setFromCamera(new THREE.Vector2(x,y),camera);
   const targets=[
     ...frames,
     paper,
     envelope,
     letterHotspot,
     calendarHotspot,
     calPaper,
     calBacking,
     windowHotspot,
     leftCasement,
     rightCasement
   ].filter(Boolean);
   const hit=raycaster.intersectObjects(targets)[0];
   return hit?hit.object.userData:null;
 }

 function update(gift){
  revision++;const current=revision;measureStart=performance.now();measuredFrames=0;
  drawCalendar(gift.anniversaryDate,gift.occasion);
  frames.forEach((photo,i)=>{
    if(photo.material.map&&!placeholders.includes(photo.material.map))photo.material.map.dispose();
    photo.material.map=placeholders[i];photo.material.color.set('#ffffff');photo.material.needsUpdate=true;photo.scale.set(1,1,1);
  });
  for(const entry of gift.photos)texLoader.load(entry.src,texture=>{
   if(current!==revision){texture.dispose();return;}texture.colorSpace=THREE.SRGBColorSpace;
   const photo=frames[entry.slot],aspect=texture.image.width/texture.image.height,w=photo.userData.width,h=photo.userData.height,fit=Math.min(w/aspect,h);
   photo.material.map=texture;photo.scale.set(aspect*fit/w,fit/h,1);photo.material.needsUpdate=true;
  });
 }

 const SPOTS={
   'window':{x:-3.8,y:1.62,z:-3.8,yaw:0,pitch:-0.04},
   'gallery':{x:-2.5,y:1.62,z:1.8,yaw:Math.PI*0.95,pitch:0.06},
   'table':{x:-3.9,y:1.45,z:-0.4,yaw:-0.05,pitch:-0.38},
   'door':{x:0,y:1.62,z:2.8,yaw:0,pitch:-0.06}
 };

 return {
  update,windowView,
  pick:hotspot,
  onFootstep(fn){onFootstepCb=fn;},

  orbit(dx,dy){
    targetEyeYaw-=dx*.0042;
    targetEyePitch=THREE.MathUtils.clamp(targetEyePitch+dy*.0035,-1.18,1.18);
  },

  zoom(delta){
    targetFov=THREE.MathUtils.clamp(targetFov+delta*.045,52,86);
  },

  pan(dx,dy){
    const step=.0038;
    const rightX=Math.cos(targetEyeYaw);
    const rightZ=-Math.sin(targetEyeYaw);
    const mx=-rightX*dx*step-Math.sin(targetEyeYaw)*dy*step;
    const mz=-rightZ*dx*step-Math.cos(targetEyeYaw)*dy*step;
    targetEyePos.x+=mx;
    targetEyePos.z+=mz;
    accumulatedDist+=Math.hypot(mx,mz);
    if(accumulatedDist>0.75){
      if(onFootstepCb)onFootstepCb();
      accumulatedDist=0;
    }
    constrainEye();
  },

  moveDir(forward,strafe,dt){
    if(!forward&&!strafe)return;
    const step=2.0*Math.min(dt,.05)/Math.max(1,Math.hypot(forward,strafe));
    const fwdX=-Math.sin(targetEyeYaw);
    const fwdZ=-Math.cos(targetEyeYaw);
    const rightX=Math.cos(targetEyeYaw);
    const rightZ=-Math.sin(targetEyeYaw);
    const mx=(fwdX*forward+rightX*strafe)*step;
    const mz=(fwdZ*forward+rightZ*strafe)*step;
    targetEyePos.x+=mx;
    targetEyePos.z+=mz;
    accumulatedDist+=Math.hypot(mx,mz);
    if(accumulatedDist>0.75){
      if(onFootstepCb)onFootstepCb();
      accumulatedDist=0;
    }
    constrainEye();
  },
  move(keys,dt){
    const forward=(keys.has('KeyW')||keys.has('ArrowUp')?1:0)-(keys.has('KeyS')||keys.has('ArrowDown')?1:0);
    const strafe=(keys.has('KeyD')||keys.has('ArrowRight')?1:0)-(keys.has('KeyA')||keys.has('ArrowLeft')?1:0);
    this.moveDir(forward,strafe,dt);
  },

  teleportTo(spotId){
    const s=SPOTS[spotId];
    if(s){
      targetEyePos.set(s.x,s.y,s.z);
      targetEyeYaw=s.yaw;
      targetEyePitch=s.pitch;
    }
  },

  toggleWindow(){
    isWindowOpen=!isWindowOpen;
    targetWindowAngle=isWindowOpen?(Math.PI*0.495):0;
    return isWindowOpen;
  },
  getWindowOpen(){return isWindowOpen;},

  resetView(){
    targetEyePos.set(defaultEye.x,defaultEye.y,defaultEye.z);
    targetEyeYaw=defaultOrientation.yaw;
    targetEyePitch=defaultOrientation.pitch;
    targetFov=defaultOrientation.fov;
  },

  render(renderer,time){
   windowView.render(renderer,time);
   camera.aspect=innerWidth/innerHeight;

   // 阻尼平滑插值
   eyePos.lerp(targetEyePos,.18);
   eyeYaw+=(targetEyeYaw-eyeYaw)*.22;
   eyePitch+=(targetEyePitch-eyePitch)*.22;
   currentFov+=(targetFov-currentFov)*.20;
   camera.fov=currentFov;
   camera.updateProjectionMatrix();

   camera.position.copy(eyePos);
   const lookTarget=new THREE.Vector3(
     camera.position.x-Math.sin(eyeYaw)*Math.cos(eyePitch),
     camera.position.y+Math.sin(eyePitch),
     camera.position.z-Math.cos(eyeYaw)*Math.cos(eyePitch)
   );
   camera.lookAt(lookTarget);

   // ☕ 咖啡热气升腾粒子
   for(const p of steamParticles){
     p.age+=0.024;
     if(p.age>p.maxAge){
       p.age=0;
       p.angle=Math.random()*Math.PI*2;
     }
     const t=p.age/p.maxAge;
     const curY=t*0.52;
     const sway=Math.sin(time*2.5+p.angle)*0.045*t;
     p.sprite.position.set(sway,curY,Math.cos(time*2.0+p.angle)*0.035*t);
     const s=THREE.MathUtils.lerp(0.06,0.25,t);
     p.sprite.scale.set(s,s,1);
     p.sprite.material.opacity=Math.sin(t*Math.PI)*0.36;
   }

   // 🪟 开窗向外完全推开与白纱飘动
   windowAngle+=(targetWindowAngle-windowAngle)*0.12;
   windowLeftHinge.rotation.y=windowAngle;
   windowRightHinge.rotation.y=-windowAngle;
   const curSwayAmp=isWindowOpen?0.08:0.018;
   const curSwaySpeed=isWindowOpen?1.8:0.65;
   for(let i=0;i<curtains.length;i++)curtains[i].rotation.y=Math.sin(time*curSwaySpeed+i)*curSwayAmp;

   renderer.render(scene,camera);

   const now=performance.now();measuredFrames++;
   if(now-measureStart>=1000){
     frameRate=measuredFrames*1000/(now-measureStart);
     measureStart=now;measuredFrames=0;
   }
  },
  get stats(){
    return {
      windowCpuMs:windowView.cpuMs,windowGpuMs:windowView.gpuMs,
      windowCalls:windowView.drawCalls,windowTriangles:windowView.triangles,
      windowRenders:windowView.renders,roomFps:frameRate,roomCalls:12+frames.length*3
    };
  }
 };
}
