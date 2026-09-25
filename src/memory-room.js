import * as THREE from 'three';
import {RoundedBoxGeometry} from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import {createWindowView} from './window-view.js';
import {furnishCabin} from './cabin-furnishings.js';
import {createKeepsakes} from './cabin-keepsakes.js';
import {createWeatheredWood} from './weathered-wood.js';
import {EffectComposer} from 'three/examples/jsm/postprocessing/EffectComposer.js';
import {SSAOPass} from 'three/examples/jsm/postprocessing/SSAOPass.js';
import {OutputPass} from 'three/examples/jsm/postprocessing/OutputPass.js';
import {RenderPass} from 'three/examples/jsm/postprocessing/RenderPass.js';

export function createMemoryRoom(exterior){
 const scene=new THREE.Scene();scene.background=new THREE.Color('#222828');
 // 第一人称全景广角相机（默认 72° 视野，具有强烈空间沉浸感）
 const camera=new THREE.PerspectiveCamera(72,innerWidth/innerHeight,.1,80);
 const windowView=createWindowView(exterior,{profile:new URLSearchParams(location.search).has('perf')});
 
 // 室内全景柔和环境光与温暖海岛阳光
 scene.add(new THREE.HemisphereLight('#fffaf0','#998668',1.35));
 const sun=new THREE.DirectionalLight('#fff2d5',5.2);
 sun.position.set(-10,6,-3.8);
 sun.target.position.set(0,.1,1.4);
 scene.add(sun,sun.target);
 sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);
 Object.assign(sun.shadow.camera,{left:-10,right:10,top:10,bottom:-10,near:.1,far:32});
 sun.shadow.bias=-.0003;sun.shadow.normalBias=.025;sun.shadow.autoUpdate=false;sun.shadow.needsUpdate=true;
 
 // 客厅与茶几区域的柔和暖光补光
 const warmLamp=new THREE.PointLight('#ffe3b7',1.5,10,1.8);
 warmLamp.position.set(-3.9,2.8,-1.35);
 scene.add(warmLamp);
 const fill=new THREE.DirectionalLight('#f9efe1',.85);
 fill.position.set(2,3.5,6);
 scene.add(fill);

 const group=new THREE.Group();scene.add(group);
 const interactiveGroup=new THREE.Group();group.add(interactiveGroup);
 let roomComposer=null,roomRenderWidth=0,roomRenderHeight=0;

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
 const agedWood=createWeatheredWood();
 Object.assign(palette.teak,agedWood);Object.assign(palette.teakDark,agedWood);
 palette.teak.color.set('#e8bb83');palette.teakDark.color.set('#ae7848');
 palette.plaster.color.set('#eeeee0');palette.rug.color.set('#b8b49c');
 palette.rug.map=fabric;palette.rug.bumpScale=.012;
 const keepsakes=createKeepsakes(interactiveGroup,palette);

 // The reference interior is built once; original imported assets stay on disk.
 let roomAssetsStarted=false;
 function loadRoomAssets(){
  if(roomAssetsStarted)return;roomAssetsStarted=true;
  furnishCabin(group,palette,()=>sun.shadow.needsUpdate=true);
 }

 // ==================== 🪟 面海大窗与实时动态海景 ====================
 // 动态海景背景板（尺寸扩大，紧贴室外落地大窗）
 const windowMaterial=new THREE.MeshBasicMaterial({map:windowView.texture});
 const windowMesh=new THREE.Mesh(new THREE.PlaneGeometry(16.5,5.7),windowMaterial);
 windowMesh.position.set(0,2.35,-6.9);
 interactiveGroup.add(windowMesh);

 // 左右开合活动木窗扇（完全向外推开，无中柱，拥抱海风）
 let isWindowOpen=false,windowAngle=0,targetWindowAngle=0;
 const windowLeftHinge=new THREE.Group();
 windowLeftHinge.position.set(-6.32,2.25,-5.12);
 interactiveGroup.add(windowLeftHinge);
 const glass=mat('#b9dbd7',{transparent:true,opacity:.07,roughness:.12,depthWrite:false,side:THREE.DoubleSide});
 const leftCasement=new THREE.Mesh(new THREE.PlaneGeometry(2.74,3.80),glass);
 leftCasement.position.set(1.37,0,0);leftCasement.userData={action:'window',title:'推开海景大窗'};
 windowLeftHinge.add(leftCasement);
 const leftHandle=new THREE.Mesh(new THREE.CylinderGeometry(.01,.01,.14,8),palette.brass);
 leftHandle.position.set(2.56,-.10,.10);leftHandle.userData={action:'window',title:'推开海景大窗'};
 windowLeftHinge.add(leftHandle);

 const windowRightHinge=new THREE.Group();
 windowRightHinge.position.set(-.84,2.25,-5.12);
 interactiveGroup.add(windowRightHinge);
 const rightCasement=new THREE.Mesh(new THREE.PlaneGeometry(2.74,3.80),glass);
 rightCasement.position.set(-1.37,0,0);rightCasement.userData={action:'window',title:'推开海景大窗'};
 windowRightHinge.add(rightCasement);
 const rightHandle=new THREE.Mesh(new THREE.CylinderGeometry(.01,.01,.14,8),palette.brass);
 rightHandle.position.set(-2.56,-.10,.10);rightHandle.userData={action:'window',title:'推开海景大窗'};
 windowRightHinge.add(rightHandle);
 function sash(hinge,sign){
  for(const x of [0,2.74]){const m=new THREE.Mesh(new THREE.BoxGeometry(.09,3.9,.13),palette.teak);m.position.set(sign*x,0,0);hinge.add(m);}
  for(const y of [-1.9,1.9,-.52]){const m=new THREE.Mesh(new THREE.BoxGeometry(2.74,.09,.13),palette.teak);m.position.set(sign*1.37,y,0);hinge.add(m);}
 }
 sash(windowLeftHinge,1);sash(windowRightHinge,-1);
 for(const x of [1.75,4.2]){const frame=new THREE.Mesh(new THREE.BoxGeometry(.10,4.05,.16),palette.teak);frame.position.set(x,2.28,-5.2);interactiveGroup.add(frame);}

 // 窗户点击交互热点
 const windowHotspot=new THREE.Mesh(new THREE.PlaneGeometry(5.5,3.8),new THREE.MeshBasicMaterial({transparent:true,opacity:0,depthWrite:false,side:THREE.DoubleSide}));
 windowHotspot.position.set(-3.58,2.25,-4.95);
 windowHotspot.userData={action:'window',title:'推开海景大窗'};
 interactiveGroup.add(windowHotspot);

 // 柔和飘拂的半透明亚麻白纱窗帘
 const curtains=[];
 for(const x of [-6.23,6.20]){
  const geo=new THREE.PlaneGeometry(.65,3.85,16,24),pos=geo.attributes.position;
  for(let i=0;i<pos.count;i++){
    const y=pos.getY(i),localX=pos.getX(i);
    pos.setZ(i,Math.cos(localX*43)*.065+.09*Math.cos(y*1.7));
    pos.setX(i,localX*(.73+.27*Math.abs(y)/1.55));
  }
  geo.computeVertexNormals();
  const material=mat('#fff6e5',{side:THREE.DoubleSide,bumpMap:fabric,bumpScale:.008});
  const curtain=new THREE.Mesh(geo,material);curtain.position.set(x,2.22,-4.82);
  curtain.userData.rest=Float32Array.from(pos.array);
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
 const wax=new THREE.Mesh(new THREE.CylinderGeometry(.032,.030,.009,16),mat('#a14d3d'));wax.position.set(tableCenter.x+.18,tableCenter.y+.026,tableCenter.z-.12);interactiveGroup.add(wax);
 for(let i=0;i<4;i++){const line=new THREE.Mesh(new THREE.BoxGeometry(.24-i*.018,.002,.003),palette.teakDark);line.position.set(tableCenter.x-.1,tableCenter.y+.016,tableCenter.z+.015+i*.045);interactiveGroup.add(line);}

 const letterHotspot=new THREE.Mesh(new THREE.PlaneGeometry(1.6,1.4),new THREE.MeshBasicMaterial({transparent:true,opacity:0,depthWrite:false,side:THREE.DoubleSide}));
 letterHotspot.rotation.x=-Math.PI/2;
 letterHotspot.position.set(tableCenter.x,tableCenter.y+.03,tableCenter.z);
 letterHotspot.userData.action='letter';
 interactiveGroup.add(letterHotspot);

 // 咖啡杯与托盘
 const cx=tableCenter.x-.38,cz=tableCenter.z+.16;
 const saucer=new THREE.Mesh(new THREE.CylinderGeometry(.13,.13,.018,20),palette.ceramic);
 saucer.position.set(cx,tableCenter.y+.009,cz);interactiveGroup.add(saucer);
 const cup=new THREE.Mesh(new THREE.CylinderGeometry(.075,.058,.12,20,1,true),palette.ceramic);
 cup.position.set(cx,tableCenter.y+.07,cz);interactiveGroup.add(cup);
 const coffeeLiquid=new THREE.Mesh(new THREE.CylinderGeometry(.068,.068,.006,20),palette.teakDark);
 coffeeLiquid.position.set(cx,tableCenter.y+.125,cz);interactiveGroup.add(coffeeLiquid);
 const cupHandle=new THREE.Mesh(new THREE.TorusGeometry(.045,.012,6,12),palette.ceramic);
 cupHandle.position.set(cx+.075,tableCenter.y+.07,cz);cupHandle.rotation.y=Math.PI/2;
 interactiveGroup.add(cupHandle);
 const rim=new THREE.Mesh(new THREE.TorusGeometry(.073,.005,6,24),palette.ceramic);rim.rotation.x=Math.PI/2;rim.position.set(cx,tableCenter.y+.13,cz);interactiveGroup.add(rim);

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
 calendarGroup.position.set(-6.48,2.15,1.5);
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
 calendarHotspot.position.set(-6.43,2.15,1.5);calendarHotspot.rotation.y=Math.PI/2;
 calendarHotspot.userData={action:'calendar',title:'纪念日挂历'};
 interactiveGroup.add(calendarHotspot);

 function drawCalendar(anniversaryText,occasionTitle){
   const ctx=calCanvas.getContext('2d');
   ctx.fillStyle='#faf6ec';ctx.fillRect(0,0,384,512);
   ctx.fillStyle='#b8453d';ctx.fillRect(0,0,384,105);
   ctx.fillStyle='#ffffff';ctx.font='bold 28px sans-serif';ctx.textAlign='center';
   ctx.fillText('OUR SPECIAL DAY',192,48);
   ctx.font='18px sans-serif';ctx.fillText('纪念日 · 岁月静好',192,82);
   let dateStr='—',subText='属于我们的日子';
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
   [-6.48,3.15,2.7,Math.PI/2,1.15,1.35]
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
 const defaultEye={x:-.3,y:1.62,z:2.4};
 const eyePos=new THREE.Vector3(defaultEye.x,defaultEye.y,defaultEye.z);
 const targetEyePos=new THREE.Vector3(defaultEye.x,defaultEye.y,defaultEye.z);

 const defaultOrientation={yaw:.03,pitch:-0.08,fov:84};
 let eyeYaw=defaultOrientation.yaw,targetEyeYaw=defaultOrientation.yaw;
 let eyePitch=defaultOrientation.pitch,targetEyePitch=defaultOrientation.pitch;
 let currentFov=defaultOrientation.fov,targetFov=defaultOrientation.fov;

 function constrainEye(){
   targetEyePos.x=THREE.MathUtils.clamp(targetEyePos.x,-5.8,4.5);
   targetEyePos.z=THREE.MathUtils.clamp(targetEyePos.z,-4.65,3.2);
   targetEyePos.y=1.62;
   // Keep the walking aisle clear of the daybed, desk, dining table and bar.
   const obstacles=[[-6.5,-2.40,-3.95,-2.48],[-6.5,-4.95,-2.5,-.35],[-5.0,-2.85,-2.10,-.57],[-6.38,-4.55,2.13,3.08],[2.30,5.70,-2.30,2.45],[3.25,5.40,-4.65,-2.75],[-2.95,-1.50,-.25,1.15],[-1.4,2.7,3.03,4.2]];
   for(const [l,r,b,f] of obstacles){const {x,z}=targetEyePos;if(x>l&&x<r&&z>b&&z<f){const ds=[x-l,r-x,z-b,f-z],side=ds.indexOf(Math.min(...ds));if(side===0)targetEyePos.x=l;else if(side===1)targetEyePos.x=r;else if(side===2)targetEyePos.z=b;else targetEyePos.z=f;}}
 }

 let onFootstepCb=null;let accumulatedDist=0;
 let lastRenderTime=null;

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
     ,...keepsakes.targets
   ].filter(Boolean);
   const hit=raycaster.intersectObjects(targets)[0];
   return hit&&hit.distance<7?hit.object.userData:null;
 }

 function update(gift){
  loadRoomAssets();
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
   'window':{x:-2.2,y:1.62,z:-4.0,yaw:0,pitch:-0.04},
   'gallery':{x:-2.5,y:1.62,z:1.8,yaw:Math.PI*0.95,pitch:0.06},
   'table':{x:-3.9,y:1.62,z:-0.2,yaw:-0.05,pitch:-0.65},
   'keepsakes':{x:-3.45,y:1.52,z:-0.4,yaw:-0.05,pitch:-0.52},
   'door':{x:0,y:1.62,z:2.8,yaw:0,pitch:-0.06}
 };

 return {
  update,windowView,
  toggleMusicBox:()=>keepsakes.toggle(),
  getMusicBoxPlaying:()=>keepsakes.playing,
  focusLetter(){targetEyePos.set(-3.92,1.62,-.15);targetEyeYaw=0;targetEyePitch=-.70;targetFov=58;},
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
    keepsakes.stop();
    targetEyePos.set(defaultEye.x,defaultEye.y,defaultEye.z);
    targetEyeYaw=defaultOrientation.yaw;
    targetEyePitch=defaultOrientation.pitch;
    targetFov=defaultOrientation.fov;
  },

  render(renderer,time){
   const delta=lastRenderTime===null?0:Math.min(.05,Math.max(0,time-lastRenderTime));lastRenderTime=time;
   keepsakes.update(time);
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
     p.age+=delta;
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
     p.sprite.material.opacity=Math.sin(t*Math.PI)*0.23;
   }

   // 🪟 开窗向外完全推开与白纱飘动
   windowAngle+=(targetWindowAngle-windowAngle)*0.12;
   windowLeftHinge.rotation.y=windowAngle;
   windowRightHinge.rotation.y=-windowAngle;
   const curSwayAmp=isWindowOpen?0.08:0.018;
   const curSwaySpeed=isWindowOpen?1.8:0.65;
   for(let i=0;i<curtains.length;i++){
     const curtain=curtains[i],p=curtain.geometry.attributes.position,rest=curtain.userData.rest;
     curtain.rotation.y=Math.sin(time*curSwaySpeed+i)*curSwayAmp;
     for(let v=0;v<p.count;v++){const free=(1.925-rest[v*3+1])/3.85;p.setZ(v,rest[v*3+2]+Math.sin(time*curSwaySpeed+free*3+i)*free*(isWindowOpen?.22:.018));}
     p.needsUpdate=true;
   }

   // Contact shading anchors cushions, wicker and furniture feet to surfaces.
   // Small screens keep the direct renderer to avoid extra full-screen passes.
   if(innerWidth>=900){
    if(!roomComposer){
     roomComposer=new EffectComposer(renderer);roomComposer.setPixelRatio(1);
     const ao=new SSAOPass(scene,camera,innerWidth,innerHeight,12);
     ao.kernelRadius=.22;ao.minDistance=.002;ao.maxDistance=.10;
     roomComposer.addPass(new RenderPass(scene,camera));roomComposer.addPass(ao);roomComposer.addPass(new OutputPass());
    }
    if(roomRenderWidth!==innerWidth||roomRenderHeight!==innerHeight){
     roomRenderWidth=innerWidth;roomRenderHeight=innerHeight;
     const scale=Math.min(1,1440/innerWidth);roomComposer.setSize(Math.round(innerWidth*scale),Math.round(innerHeight*scale));
    }
    roomComposer.render();
   }else renderer.render(scene,camera);

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
