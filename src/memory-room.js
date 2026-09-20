import * as THREE from 'three';
import {RoundedBoxGeometry} from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import {mergeGeometries} from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import {createWindowView} from './window-view.js';

export function createMemoryRoom(exterior){
 const scene=new THREE.Scene();scene.background=new THREE.Color('#2d3635');
 // 第一人称全景广角相机（默认 72° 视野，具有强烈空间沉浸感）
 const camera=new THREE.PerspectiveCamera(72,innerWidth/innerHeight,.1,80);
 const windowView=createWindowView(exterior,{profile:new URLSearchParams(location.search).has('perf')});
 
 // 室内全景柔和环境光与阳光
 scene.add(new THREE.HemisphereLight('#fff8e7','#8d8368',1.65));
 const sun=new THREE.DirectionalLight('#ffe6b8',3.2);sun.position.set(2.5,7,-1.7);sun.target.position.set(-1,0,2.4);scene.add(sun,sun.target);
 sun.castShadow=true;sun.shadow.mapSize.set(1024,1024);Object.assign(sun.shadow.camera,{left:-8,right:8,top:8,bottom:-8,near:.1,far:22});sun.shadow.bias=-.0003;sun.shadow.normalBias=.025;sun.shadow.autoUpdate=false;sun.shadow.needsUpdate=true;
 
 const warmLamp=new THREE.PointLight('#ffb873',4.5,8,2);warmLamp.position.set(-3.5,2.1,-.1);scene.add(warmLamp);
 const fill=new THREE.DirectionalLight('#f9efe1',.75);fill.position.set(4,3,9);scene.add(fill);
 const group=new THREE.Group();scene.add(group);

 function weave(){const c=document.createElement('canvas');c.width=c.height=128;const g=c.getContext('2d');g.fillStyle='#e4e1d6';g.fillRect(0,0,128,128);for(let i=0;i<128;i+=3){g.strokeStyle=i%2?'#cbc9bc':'#f5f2e6';g.lineWidth=.65;g.beginPath();g.moveTo(i,0);g.lineTo(i,128);g.moveTo(0,i);g.lineTo(128,i);g.stroke();}const t=new THREE.CanvasTexture(c);t.wrapS=t.wrapT=THREE.RepeatWrapping;t.repeat.set(4,4);return t;}
 const fabric=weave();
 const mat=(color,options={})=>new THREE.MeshStandardMaterial({color,roughness:.82,...options});
 const palette={oak:mat('#ba8c5e'),edge:mat('#986f47'),cream:mat('#f1e7d4'),wall:mat('#e9deca'),panel:mat('#98a98c'),linen:mat('#eee0bd',{bumpMap:fabric,bumpScale:.018}),sage:mat('#899b72',{bumpMap:fabric,bumpScale:.02}),rose:mat('#c69a7d',{bumpMap:fabric,bumpScale:.02}),rust:mat('#b37458'),brass:mat('#b99a5b',{metalness:.45,roughness:.4}),ceramic:mat('#eee2cb',{roughness:.45}),green:mat('#637e48'),greenLight:mat('#8a9d60'),ink:mat('#466753'),paper:mat('#fff5dc'),rug:mat('#d4c49c',{bumpMap:fabric,bumpScale:.025})};
 const staticMeshes=[];
 function add(geometry,material,x=0,y=0,z=0,rotation=0){const m=new THREE.Mesh(geometry,material);m.position.set(x,y,z);m.rotation.y=rotation;m.castShadow=true;m.receiveShadow=true;group.add(m);staticMeshes.push(m);return m;}
 const box=(w,h,d,x,y,z,m=palette.oak,rotation=0)=>add(new THREE.BoxGeometry(w,h,d),m,x,y,z,rotation);
 const round=(w,h,d,r,x,y,z,m=palette.linen,rotation=0)=>add(new RoundedBoxGeometry(w,h,d,3,r),m,x,y,z,rotation);
 const cyl=(r1,r2,h,x,y,z,m=palette.oak,n=24)=>add(new THREE.CylinderGeometry(r1,r2,h,n),m,x,y,z);
 const sphere=(r,x,y,z,m=palette.ceramic,sx=1,sy=1,sz=1)=>{const mesh=add(new THREE.SphereGeometry(r,16,12),m,x,y,z);mesh.scale.set(sx,sy,sz);return mesh;};
 function beam(a,b,r,m=palette.oak){const start=new THREE.Vector3(...a),end=new THREE.Vector3(...b),delta=end.clone().sub(start);const mesh=add(new THREE.CylinderGeometry(r,r,delta.length(),10),m,...start.clone().add(end).multiplyScalar(.5).toArray());mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),delta.normalize());return mesh;}

 // 真实木地板铺陈
 round(10.35,.27,8.25,.10,0,-.13,.1,palette.edge);
 const floorMats=['#cfa674','#d4ae7b','#c79b66','#dab482','#c9a171'].map(c=>mat(c));
 for(let i=0;i<25;i++){const x=-4.8+i*.4;for(let j=0;j<4;j++){const z=-2.87+j*1.96;box(.391,.08,1.94,x,.03,z,floorMats[(i*3+j*2)%5]);for(let k=0;k<2;k++)box(.003,.003,1.65,x-.08+k*.13,.073,z,palette.oak);}}

 // 【后墙 - 面海大窗】
 box(5.2,4.8,.2,-2.4,2.4,-3.9,palette.wall);
 box(4.8,1.30,.2,2.6,.65,-3.9,palette.wall);box(4.8,.58,.2,2.6,4.51,-3.9,palette.wall);
 box(.58,2.94,.2,.49,2.77,-3.9,palette.wall);box(.60,2.94,.2,4.69,2.77,-3.9,palette.wall);

 // 【左墙 - 温暖回忆照片墙】
 box(.2,4.8,8.2,-5.0,2.4,.1,palette.wall);

 // 【右墙 - 完整封闭右侧，配护墙板与踢脚线】
 box(.2,4.8,8.2,5.0,2.4,.1,palette.wall);
 box(.08,.88,8.0,4.85,.52,.1,palette.panel);
 box(.15,.08,8.0,4.78,.99,.1,palette.cream);
 box(.12,.14,8.0,4.79,.16,.1,palette.cream);
 box(.27,.18,8.2,4.86,4.7,.1,palette.oak);

 // 【前墙与实木玄关门 - 完整封闭身后视角】
 box(10.2,4.8,.2,0,2.4,4.1,palette.wall);
 box(10,.88,.08,0,.52,3.95,palette.panel);
 box(10,.08,.15,0,.99,3.9,palette.cream);
 box(10,.14,.12,0,.16,3.9,palette.cream);
 box(10,.18,.27,0,4.7,3.95,palette.oak);
 // 玄关实木门
 box(1.9,3.6,.12,0,1.8,4.01,palette.oak);
 box(1.65,3.35,.05,0,1.8,3.94,palette.edge);
 sphere(.055,.68,1.7,3.87,palette.brass); // 黄铜门把手
 box(2.0,.02,1.2,0,.03,3.15,palette.rug); // 迎宾小地毯

  // 📅 纪念日挂历（实木背板 + 动态手撕日历纸面，可点击放大查看）
  const calendarGroup=new THREE.Group();calendarGroup.position.set(-1.45,2.35,3.95);calendarGroup.rotation.y=Math.PI;group.add(calendarGroup);
  const calBacking=new THREE.Mesh(new RoundedBoxGeometry(.64,.88,.03,2,.015),palette.oak);calendarGroup.add(calBacking);
  const calPin=new THREE.Mesh(new THREE.CylinderGeometry(.016,.016,.03,10),palette.brass);calPin.rotation.x=Math.PI/2;calPin.position.set(0,.39,.02);calendarGroup.add(calPin);
  const calCanvas=document.createElement('canvas');calCanvas.width=384;calCanvas.height=512;
  const calTexture=new THREE.CanvasTexture(calCanvas);
  const calPaper=new THREE.Mesh(new THREE.PlaneGeometry(.54,.74),new THREE.MeshBasicMaterial({map:calTexture,side:THREE.DoubleSide}));
  calPaper.position.set(0,-.03,.018);calPaper.userData={action:'calendar',title:'纪念日挂历'};calendarGroup.add(calPaper);
  calBacking.userData={action:'calendar',title:'纪念日挂历'};
  const calendarHotspot=new THREE.Mesh(new THREE.PlaneGeometry(.65,.9),new THREE.MeshBasicMaterial({transparent:true,opacity:0,depthWrite:false,side:THREE.DoubleSide}));
  calendarHotspot.position.set(-1.45,2.35,3.92);calendarHotspot.rotation.y=Math.PI;calendarHotspot.userData={action:'calendar',title:'纪念日挂历'};group.add(calendarHotspot);

  function drawCalendar(anniversaryText,occasionTitle){
    const ctx=calCanvas.getContext('2d');
    ctx.fillStyle='#faf6ec';ctx.fillRect(0,0,384,512);
    // 顶部红皮
    ctx.fillStyle='#b8453d';ctx.fillRect(0,0,384,105);
    ctx.fillStyle='#ffffff';ctx.font='bold 28px sans-serif';ctx.textAlign='center';
    ctx.fillText('OUR SPECIAL DAY',192,48);
    ctx.font='18px sans-serif';ctx.fillText('纪念日 · 岁月静好',192,82);
    // 中间大字日期
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
    // 底部寄语
    ctx.fillStyle='#6c7f6d';ctx.font='bold 22px sans-serif';ctx.fillText(subText,192,345);
    if(occasionTitle){
      ctx.fillStyle='#988062';ctx.font='italic 19px Georgia,serif';
      ctx.fillText(`「${occasionTitle}」`,192,400);
    }
    // 底部小印章
    ctx.strokeStyle='#b8453d';ctx.lineWidth=3;ctx.strokeRect(144,430,96,44);
    ctx.fillStyle='#b8453d';ctx.font='bold 18px sans-serif';ctx.fillText('LOVE',192,460);
    calTexture.needsUpdate=true;
  }
  drawCalendar('2024-05-20','初见于夏日');

 // 【天花板与厚实木梁 - 完整封闭顶部，抬头可见温馨木梁与吊灯】
 box(10.2,.2,8.4,0,4.8,.1,palette.cream);
 for(let i=0;i<4;i++){
   const z=-2.7+i*1.9;
   box(10.0,.24,.22,0,4.68,z,palette.oak);
 }
 // 客厅中央暖光吊灯
 cyl(.015,.015,.65,0,4.45,.4,palette.brass);
 add(new THREE.CylinderGeometry(.34,.58,.42,24,1,true),mat('#fff0d0',{side:THREE.DoubleSide,emissive:'#ffcb78',emissiveIntensity:.28}),0,4.0,.4);
 const ceilingLight=new THREE.PointLight('#ffe4b5',2.8,10,1.6);
 ceilingLight.position.set(0,3.78,.4);
 scene.add(ceilingLight);

 // 护墙板、踢脚线与画框轨道
 box(10,.88,.08,0,.52,-3.75,palette.panel);box(.08,.88,7.8,-4.85,.52,.1,palette.panel);
 for(let i=0;i<42;i++)box(.015,.81,.018,-4.85+i*.235,.53,-3.695,palette.cream);
 for(let i=0;i<32;i++)box(.018,.81,.015,-4.80,.53,-3.6+i*.24,palette.cream);
 box(10,.08,.15,0,.99,-3.68,palette.cream);box(.15,.08,7.8,-4.78,.99,.1,palette.cream);
 box(10,.14,.12,0,.16,-3.67,palette.cream);box(.12,.14,7.8,-4.79,.16,.1,palette.cream);
 box(10,.18,.27,0,4.7,-3.74,palette.oak);box(.27,.18,8,-4.86,4.7,.1,palette.oak);

  // 🪟 面海大窗与可推开窗扇
  const windowMaterial=new THREE.MeshBasicMaterial({map:windowView.texture});
  const windowMesh=new THREE.Mesh(new THREE.PlaneGeometry(5.8,4.2),windowMaterial);windowMesh.position.set(2.57,2.82,-5.7);group.add(windowMesh);
  for(const x of [.67,4.47]){box(.13,2.9,.20,x,2.82,-3.74,palette.cream);box(.055,2.65,.04,x+(x<2? .1:-.1),2.82,-3.60,palette.oak);}
  for(const y of [1.40,4.23])box(3.94,.14,.20,2.57,y,-3.74,palette.cream);
  box(4.2,.14,.48,2.57,1.34,-3.58,palette.oak);
  beam([.18,4.45,-3.37],[4.95,4.45,-3.37],.035,palette.brass);sphere(.075,.14,4.45,-3.37,palette.brass);sphere(.075,4.99,4.45,-3.37,palette.brass);

  // 左右开合活动窗扇（推开完全向外开，拥抱海风）
  let isWindowOpen=false,windowAngle=0,targetWindowAngle=0;
  const windowLeftHinge=new THREE.Group();windowLeftHinge.position.set(.76,2.82,-3.66);group.add(windowLeftHinge);
  const leftCasement=new THREE.Mesh(new THREE.BoxGeometry(1.81,2.62,.035),mat('#f4ebd9',{roughness:.65}));
  leftCasement.position.set(.905,0,0);leftCasement.userData={action:'window',title:'推开海景大窗'};windowLeftHinge.add(leftCasement);
  const leftHandle=new THREE.Mesh(new THREE.CylinderGeometry(.01,.01,.14,8),palette.brass);leftHandle.position.set(1.75,0,.025);leftHandle.userData={action:'window',title:'推开海景大窗'};windowLeftHinge.add(leftHandle);

  const windowRightHinge=new THREE.Group();windowRightHinge.position.set(4.38,2.82,-3.66);group.add(windowRightHinge);
  const rightCasement=new THREE.Mesh(new THREE.BoxGeometry(1.81,2.62,.035),mat('#f4ebd9',{roughness:.65}));
  rightCasement.position.set(-.905,0,0);rightCasement.userData={action:'window',title:'推开海景大窗'};windowRightHinge.add(rightCasement);
  const rightHandle=new THREE.Mesh(new THREE.CylinderGeometry(.01,.01,.14,8),palette.brass);rightHandle.position.set(-1.75,0,.025);rightHandle.userData={action:'window',title:'推开海景大窗'};windowRightHinge.add(rightHandle);

  // 窗户点击交互热点
  const windowHotspot=new THREE.Mesh(new THREE.PlaneGeometry(3.6,2.6),new THREE.MeshBasicMaterial({transparent:true,opacity:0,depthWrite:false,side:THREE.DoubleSide}));
  windowHotspot.position.set(2.57,2.82,-3.55);windowHotspot.userData={action:'window',title:'推开海景大窗'};group.add(windowHotspot);

 const curtains=[];
 for(const x of [.55,4.56]){
  const geo=new THREE.PlaneGeometry(.86,3.10,16,24),pos=geo.attributes.position;
  for(let i=0;i<pos.count;i++){const y=pos.getY(i),localX=pos.getX(i);pos.setZ(i,Math.cos(localX*43)*.065+.09*Math.cos(y*1.7));pos.setX(i,localX*(.73+.27*Math.abs(y)/1.55));}
  geo.computeVertexNormals();const material=mat('#fff1d5',{side:THREE.DoubleSide,bumpMap:fabric,bumpScale:.008});const curtain=new THREE.Mesh(geo,material);curtain.position.set(x,2.78,-3.27);group.add(curtain);curtains.push(curtain);
  for(let i=0;i<6;i++){const ring=add(new THREE.TorusGeometry(.049,.01,6,10),palette.brass,x-.3+i*.12,4.39,-3.36);ring.rotation.y=0;}
  box(.47,.085,.17,x,2.37,-3.15,palette.rose);
 }

 // 靠窗沙发与抱枕
 round(3.65,.38,1.36,.16,-1.68,.51,-2.36,palette.sage);
 for(const x of [-3.16,-.2])for(const z of [-2.82,-1.94])cyl(.075,.055,.4,x,.24,z,palette.edge);
 round(3.53,1.13,.35,.14,-1.68,1.06,-2.92,palette.linen);
 for(const x of [-3.36,0])round(.35,.77,1.41,.15,x,.96,-2.33,palette.linen);
 for(let i=0;i<3;i++){const x=-2.78+i*1.1;round(1.06,.27,1.04,.11,x,.77,-2.26,palette.linen);box(.99,.012,.015,x,.79,-1.734,palette.cream);}
 for(const [x,z,r,color] of [[-2.85,-2.59,-.17,palette.rose],[-2.08,-2.7,.11,palette.sage],[-.5,-2.59,.18,palette.sage]]){const pillow=round(.65,.66,.22,.13,x,1.20,z,color);pillow.rotation.z=r;pillow.rotation.x=-.18;}
 for(let i=0;i<8;i++){const drape=round(.065,.075,.95,.022,-.80+i*.075,.965,-2.05,i%2?palette.rug:palette.cream);drape.rotation.x=.05;}

 // 飘窗与储物篮
 round(3.32,.12,1.02,.08,2.52,.64,-2.87,palette.oak);round(3.18,.22,.93,.10,2.52,.81,-2.85,palette.linen);
 for(const x of [1.08,3.98])box(.12,.64,.84,x,.33,-2.87,palette.oak);
 box(3.12,.10,.85,2.52,.20,-2.87,palette.oak);
 for(const x of [1.7,3.3]){round(1.1,.32,.68,.05,x,.41,-2.88,palette.rug);for(let i=0;i<6;i++)box(.017,.28,.015,x-.47+i*.18,.41,-2.52,palette.edge);box(.28,.07,.02,x,.46,-2.505,palette.edge);}
 for(const x of [1.22,3.86]){const p=round(.59,.58,.19,.10,x,1.15,-3.03,palette.rose);p.rotation.z=x<2?-.18:.17;}

 // 客厅地毯与茶几
 const rug=cyl(2.53,2.53,.025,-.10,.10,.45,palette.rug,64);rug.scale.z=.75;
 for(let i=0;i<5;i++){const torus=add(new THREE.TorusGeometry(2.47-i*.065,.016,5,96),i%2?palette.cream:palette.edge,-.10,.12,.45);torus.rotation.x=-Math.PI/2;torus.scale.y=.75;}
 for(let i=0;i<23;i++){const x=-1.72+i*.145;beam([x,.12,2.08],[x+.04,.115,2.30],.009,palette.cream);beam([x,.12,-1.2],[x-.03,.115,-1.36],.009,palette.cream);}

 const table=cyl(1.04,1.04,.15,-.3,.72,.4,palette.oak,48);table.scale.z=.69;
 for(const [x,z] of [[-.93,.05],[.37,.05],[-.93,.77],[.37,.77]])beam([x,.66,z],[x+(x<0?-.08:.08),.12,z+.05],.052,palette.edge);

 // 桌上的信件与交互热点
 const paper=box(.70,.014,.44,-.36,.807,.43,palette.paper,.12);paper.userData.action='letter';
 const envelope=box(.46,.013,.3,-.18,.825,.31,palette.cream,-.08);envelope.userData.action='letter';
 const letterHotspot=new THREE.Mesh(new THREE.PlaneGeometry(1.8,1.4),new THREE.MeshBasicMaterial({transparent:true,opacity:0,depthWrite:false,side:THREE.DoubleSide}));
 letterHotspot.rotation.x=-Math.PI/2;letterHotspot.position.set(-.3,.851,.4);letterHotspot.userData.action='letter';group.add(letterHotspot);
 for(let i=0;i<4;i++){const line=box(.38-i*.035,.003,.006,-.41,.819,.38+i*.047,palette.edge);line.rotation.y=.12;}
 cyl(.041,.041,.013,-.17,.84,.33,palette.rust,16);

 // ☕ 只保留一杯冒烟的咖啡
 const cx = -.87, cz = .14;
 cyl(.12,.12,.018,cx,.813,cz,palette.ceramic);
 cyl(.075,.057,.13,cx,.88,cz,palette.ceramic);
 cyl(.06,.06,.006,cx,.948,cz,palette.edge);
 const handle=add(new THREE.TorusGeometry(.05,.013,6,12),palette.ceramic,cx+.075,.89,cz);
 handle.rotation.y=Math.PI/2;

 // ☕ 咖啡杯袅袅热气粒子系统
 const steamGroup=new THREE.Group();
 steamGroup.position.set(-.87,.98,.14); // 位于这杯咖啡杯口
 group.add(steamGroup);
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

  function flowerPot(x,y,z,scale=1){
   cyl(.18*scale,.13*scale,.31*scale,x,y+.15*scale,z,palette.ceramic,20);
   for(let i=0;i<5;i++){const a=i*2.4,tx=x+Math.cos(a)*.15*scale,tz=z+Math.sin(a)*.13*scale,top=y+(.55+(i%3)*.08)*scale;beam([x,y+.26*scale,z],[tx,top,tz],.009*scale,palette.green);for(let j=0;j<5;j++)sphere(.055*scale,tx+Math.cos(j*1.256)*.06*scale,top,tz+Math.sin(j*1.256)*.06*scale,i%2?palette.rose:palette.cream,1,.45,1);sphere(.027*scale,tx,top+.013*scale,tz,palette.brass);}
  }
 flowerPot(.34,.80,.08,.63);flowerPot(3.73,1.42,-3.44,.8);

 // 单人扶手椅与落地灯
 for(const x of [-4.07,-3.25])for(const z of [.62,1.4])cyl(.055,.045,.43,x,.25,z,palette.edge);
 round(1.13,.27,1.03,.12,-3.66,.6,1.02,palette.rose);round(1.16,.96,.28,.12,-3.66,1.02,.58,palette.rose);
 for(const x of [-4.23,-3.09])round(.16,.29,1.13,.07,x,.85,1.05,palette.oak);
 const pillow=round(.62,.52,.20,.09,-3.66,1.1,.8,palette.linen);pillow.rotation.x=-.18;
 cyl(.30,.30,.06,-4.05,.1,-.50,palette.brass);cyl(.027,.027,2.28,-4.05,1.25,-.50,palette.brass);
 const shade=add(new THREE.CylinderGeometry(.3,.52,.6,32,1,true),mat('#f1d49b',{side:THREE.DoubleSide,emissive:'#c48539',emissiveIntensity:.20}),-4.05,2.45,-.50);
 cyl(.31,.31,.035,-4.05,2.76,-.50,palette.cream);cyl(.51,.51,.035,-4.05,2.15,-.50,palette.cream);

 // 右侧矮书柜与摆件
 round(1.38,.09,2.12,.05,4.13,1.01,.05,palette.oak);box(1.28,.08,2.02,4.13,.27,.05,palette.oak);
 for(const z of [-.92,1.02])box(1.25,.72,.07,4.13,.64,z,palette.oak);
 for(let i=0;i<8;i++){const book=box(.17,.4+(i%3)*.05,.62,3.60+i*.145,.52,-.27,[palette.sage,palette.rose,palette.cream][i%3]);book.rotation.z=(i-4)*.025;box(.12,.025,.012,3.6+i*.145,.57,.052,palette.brass);}
 flowerPot(4.10,1.06,-.64,.9);
 const candleMat=mat('#ffdda1',{emissive:'#ffbb58',emissiveIntensity:.35});
 for(const [x,z,h] of [[3.84,.66,.19],[4.22,.52,.28]]){cyl(.10,.10,h,x,1.05+h/2,z,palette.cream);sphere(.025,x,1.07+h,z,candleMat,.7,1.7,.7);}

 cyl(.37,.27,.62,4.38,.39,-1.66,palette.rust);cyl(.32,.32,.025,4.38,.72,-1.66,palette.edge);
 for(let i=0;i<11;i++){const a=i*2.4,h=1.25+(i%4)*.24,x=4.38+Math.sin(a)*.43,z=-1.66+Math.cos(a)*.4;beam([4.38,.69,-1.66],[x,h,z],.013,palette.green);const leaf=sphere(.24,x,h,z,i%2?palette.green:palette.greenLight,.46,1.75,.75);leaf.rotation.z=Math.sin(a)*.55;leaf.rotation.y=a;}

 // 照片墙上方的小串灯
 for(let i=0;i<25;i++){const x=-4.55+i*.188,y=4.20-.34*Math.sin(i/24*Math.PI);if(i<24)beam([x,y,-3.58],[x+.188,4.20-.34*Math.sin((i+1)/24*Math.PI),-3.58],.008,palette.edge);if(i%3===0)sphere(.032,x,y-.065,-3.57,candleMat);}

 const slots=[[-4.83,3.17,-1.65,Math.PI/2,1.35,1.5],[-4.83,2.05,-.02,Math.PI/2,1.04,.89],[-3.66,2.85,-3.65,0,1.20,1.55],[-2.15,2.99,-3.65,0,1.42,1.12],[-.76,2.66,-3.65,0,1.03,1.32],[4.10,1.62,.13,-.4,.79,1.02]];
 const frames=[],loader=new THREE.TextureLoader();let revision=0;
 function placeholder(index){const c=document.createElement('canvas');c.width=256;c.height=320;const ctx=c.getContext('2d');ctx.fillStyle=['#e4d8bc','#c3d1bf','#d8bfa4'][index%3];ctx.fillRect(0,0,256,320);ctx.strokeStyle='#8a9f80';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(128,245);ctx.bezierCurveTo(92,170,175,118,122,60);ctx.stroke();for(let i=0;i<5;i++){ctx.beginPath();ctx.ellipse(128+(i%2?19:-15),92+i*30,23,9,i%2?-.6:.6,0,Math.PI*2);ctx.stroke();}ctx.fillStyle='#fff4d5';ctx.beginPath();ctx.arc(195,54,17,0,Math.PI*2);ctx.fill();const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;return t;}
 const placeholders=slots.map((_,i)=>placeholder(i));
 for(let i=0;i<6;i++){
  const [x,y,z,rotation,w,h]=slots[i],pivot=new THREE.Group();pivot.position.set(x,y,z);pivot.rotation.y=rotation;group.add(pivot);
  const frame=new THREE.Mesh(new RoundedBoxGeometry(w,h,.085,2,.025),i%2?palette.edge:palette.oak);frame.castShadow=true;pivot.add(frame);
  const mount=new THREE.Mesh(new THREE.PlaneGeometry(w-.09,h-.09),new THREE.MeshStandardMaterial({color:'#fff6df',roughness:1}));mount.position.z=.048;pivot.add(mount);
  const photo=new THREE.Mesh(new THREE.PlaneGeometry(w-.25,h-.25),new THREE.MeshBasicMaterial({map:placeholders[i]}));photo.position.z=.053;photo.userData={slot:i,width:w-.25,height:h-.25};pivot.add(photo);frames.push(photo);
  if(i>=2&&i<=4)box(w+.13,.065,.19,x,y-h/2-.045,z+.05,palette.oak);
 }

 group.updateMatrixWorld(true);
 const batches=new Map();
 for(const mesh of staticMeshes){if(mesh===paper||mesh===envelope)continue;let geometry=mesh.geometry.clone();if(geometry.index){const indexed=geometry;geometry=indexed.toNonIndexed();indexed.dispose();}geometry.applyMatrix4(mesh.matrix);if(!batches.has(mesh.material))batches.set(mesh.material,[]);batches.get(mesh.material).push(geometry);group.remove(mesh);mesh.geometry.dispose();}
 for(const [material,geometries] of batches){const geometry=mergeGeometries(geometries,false);for(const item of geometries)item.dispose();const mesh=new THREE.Mesh(geometry,material);mesh.castShadow=true;mesh.receiveShadow=true;group.add(mesh);}

 const raycaster=new THREE.Raycaster();let measureStart=0,measuredFrames=0,frameRate=30;

 // ==================== 第一人称全景沉浸式相机与行走系统 ====================
 // 人眼位置（站在室内茶几前方偏右，高度为真实人眼 1.62m）
 const defaultEye = {x:.15, y:1.62, z:2.65};
 const eyePos = new THREE.Vector3(defaultEye.x, defaultEye.y, defaultEye.z);
 const targetEyePos = new THREE.Vector3(defaultEye.x, defaultEye.y, defaultEye.z);

 // 默认视线朝向面海大窗与茶几上的信件
 const defaultOrientation = {yaw:.05, pitch:-.12, fov:72};
 let eyeYaw = defaultOrientation.yaw, targetEyeYaw = defaultOrientation.yaw;
 let eyePitch = defaultOrientation.pitch, targetEyePitch = defaultOrientation.pitch;
 let currentFov = defaultOrientation.fov, targetFov = defaultOrientation.fov;

 function constrainEye(){
   targetEyePos.x = THREE.MathUtils.clamp(targetEyePos.x, -3.8, 3.8);
   targetEyePos.z = THREE.MathUtils.clamp(targetEyePos.z, -1.9, 3.2);
   targetEyePos.y = 1.62; // 保持人眼高度稳定
   // Furniture footprints include space for the visitor's body.
   const obstacles=[[-3.8,.5,-3.5,-1.35],[.65,4.45,-3.5,-2.1],[-4.55,-2.75,.2,1.85],[3.2,4.9,-1.25,1.4],[-1.6,1,-.65,1.45]];
   for(const [left,right,back,front] of obstacles){
     const {x,z}=targetEyePos;
     if(x>left&&x<right&&z>back&&z<front){
       const distances=[x-left,right-x,z-back,front-z];
       const side=distances.indexOf(Math.min(...distances));
       if(side===0)targetEyePos.x=left;
       else if(side===1)targetEyePos.x=right;
       else if(side===2)targetEyePos.z=back;
       else targetEyePos.z=front;
     }
   }
 }

  let onFootstepCb = null;
  let accumulatedDist = 0;

  function hotspot(x,y){
    raycaster.setFromCamera(new THREE.Vector2(x,y),camera);
    const targets = [
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
   const sea=gift.theme==='sea';palette.wall.color.set(sea?'#dce6dc':'#e9deca');palette.panel.color.set(sea?'#94b2a5':'#98a98c');
   drawCalendar(gift.anniversaryDate, gift.occasion);
   frames.forEach((photo,i)=>{if(photo.material.map&&!placeholders.includes(photo.material.map))photo.material.map.dispose();photo.material.map=placeholders[i];photo.material.color.set('#ffffff');photo.material.needsUpdate=true;photo.scale.set(1,1,1);});
   for(const entry of gift.photos)loader.load(entry.src,texture=>{
    if(current!==revision){texture.dispose();return;}texture.colorSpace=THREE.SRGBColorSpace;
    const photo=frames[entry.slot],aspect=texture.image.width/texture.image.height,w=photo.userData.width,h=photo.userData.height,fit=Math.min(w/aspect,h);
    photo.material.map=texture;photo.scale.set(aspect*fit/w,fit/h,1);photo.material.needsUpdate=true;
   });
  }

  const SPOTS = {
    'window': {x: 2.57, y: 1.62, z: -2.0, yaw: 0, pitch: -0.04},
    'gallery': {x: -3.2, y: 1.62, z: -1.6, yaw: -Math.PI / 2, pitch: 0.08},
    'table': {x: -.3, y: 1.62, z: 1.45, yaw: 0.12, pitch: -0.32},
    'door': {x: 0, y: 1.62, z: 2.8, yaw: 0, pitch: -0.06}
  };

  return {
   update,windowView,
   pick:hotspot,
   onFootstep(fn){ onFootstepCb = fn; },

   // 【第一人称全景环视】拖拽转动视角（360度水平无死角 + 俯仰角仰望/低头）
   orbit(dx,dy){
     targetEyeYaw -= dx * .0042;
     targetEyePitch = THREE.MathUtils.clamp(targetEyePitch + dy * .0035, -1.18, 1.18);
   },

   // 【第一人称视场角微调】滚轮/双指捏合变焦缩放
   zoom(delta){
     targetFov = THREE.MathUtils.clamp(targetFov + delta * .045, 52, 86);
   },

   // 【第一人称水平平移/挪步】
   pan(dx,dy){
     const step = .0038;
     const rightX = Math.cos(targetEyeYaw);
     const rightZ = -Math.sin(targetEyeYaw);
     const mx = -rightX * dx * step - Math.sin(targetEyeYaw) * dy * step;
     const mz = -rightZ * dx * step - Math.cos(targetEyeYaw) * dy * step;
     targetEyePos.x += mx;
     targetEyePos.z += mz;
     accumulatedDist += Math.hypot(mx, mz);
     if (accumulatedDist > 0.75) {
       if (onFootstepCb) onFootstepCb();
       accumulatedDist = 0;
     }
     constrainEye();
   },

   // 【第一人称移动行走】WASD / 方向键 / 摇杆在屋内自如行走
   moveDir(forward, strafe, dt){
     if (!forward && !strafe) return;
     const step = 2.0 * Math.min(dt,.05) / Math.max(1,Math.hypot(forward,strafe));
     const fwdX = -Math.sin(targetEyeYaw);
     const fwdZ = -Math.cos(targetEyeYaw);
     const rightX = Math.cos(targetEyeYaw);
     const rightZ = -Math.sin(targetEyeYaw);
     const mx = (fwdX * forward + rightX * strafe) * step;
     const mz = (fwdZ * forward + rightZ * strafe) * step;
     targetEyePos.x += mx;
     targetEyePos.z += mz;
     accumulatedDist += Math.hypot(mx, mz);
     if (accumulatedDist > 0.75) {
       if (onFootstepCb) onFootstepCb();
       accumulatedDist = 0;
     }
     constrainEye();
   },
   move(keys,dt){
     const forward = (keys.has('KeyW')||keys.has('ArrowUp')?1:0)-(keys.has('KeyS')||keys.has('ArrowDown')?1:0);
     const strafe = (keys.has('KeyD')||keys.has('ArrowRight')?1:0)-(keys.has('KeyA')||keys.has('ArrowLeft')?1:0);
     this.moveDir(forward, strafe, dt);
   },

   // 【快捷视点传送】一键移动到窗边/照片墙/茶几/门口
   teleportTo(spotId){
     const s = SPOTS[spotId];
     if (s) {
       targetEyePos.set(s.x, s.y, s.z);
       targetEyeYaw = s.yaw;
       targetEyePitch = s.pitch;
     }
   },

   // 【开关海景大窗】
   toggleWindow(){
     isWindowOpen = !isWindowOpen;
     targetWindowAngle = isWindowOpen ? (Math.PI * 0.495) : 0;
     return isWindowOpen;
   },
   getWindowOpen(){ return isWindowOpen; },

   // 重置回第一人称舒适视角
   resetView(){
     targetEyePos.set(defaultEye.x, defaultEye.y, defaultEye.z);
     targetEyeYaw = defaultOrientation.yaw;
     targetEyePitch = defaultOrientation.pitch;
     targetFov = defaultOrientation.fov;
   },

   render(renderer,time){
    windowView.render(renderer,time);
    camera.aspect = innerWidth / innerHeight;

    // 丝滑阻尼插值
    eyePos.lerp(targetEyePos, .18);
    eyeYaw += (targetEyeYaw - eyeYaw) * .22;
    eyePitch += (targetEyePitch - eyePitch) * .22;
    currentFov += (targetFov - currentFov) * .20;
    camera.fov = currentFov;
    camera.updateProjectionMatrix();

    camera.position.copy(eyePos);
    const lookTarget = new THREE.Vector3(
      camera.position.x - Math.sin(eyeYaw) * Math.cos(eyePitch),
      camera.position.y + Math.sin(eyePitch),
      camera.position.z - Math.cos(eyeYaw) * Math.cos(eyePitch)
    );
    camera.lookAt(lookTarget);

    // ☕ 咖啡杯袅袅热气动态
    for(const p of steamParticles){
      p.age += 0.024;
      if(p.age > p.maxAge){
        p.age = 0;
        p.angle = Math.random() * Math.PI * 2;
      }
      const t = p.age / p.maxAge;
      const curY = t * 0.52;
      const sway = Math.sin(time * 2.5 + p.angle) * 0.045 * t;
      p.sprite.position.set(sway, curY, Math.cos(time * 2.0 + p.angle) * 0.035 * t);
      const s = THREE.MathUtils.lerp(0.06, 0.25, t);
      p.sprite.scale.set(s, s, 1);
      p.sprite.material.opacity = Math.sin(t * Math.PI) * 0.36;
    }

    // 🪟 开窗角度与窗帘摆动联动（窗户向外完全推开）
    windowAngle += (targetWindowAngle - windowAngle) * 0.12;
    windowLeftHinge.rotation.y = windowAngle;
    windowRightHinge.rotation.y = -windowAngle;
    const curSwayAmp = isWindowOpen ? 0.08 : 0.018;
    const curSwaySpeed = isWindowOpen ? 1.8 : 0.65;
    for(let i=0;i<curtains.length;i++)curtains[i].rotation.y=Math.sin(time*curSwaySpeed+i)*curSwayAmp;

    renderer.render(scene,camera);

    const now=performance.now();measuredFrames++;if(now-measureStart>=1000){frameRate=measuredFrames*1000/(now-measureStart);measureStart=now;measuredFrames=0;}
   },
   get stats(){return {windowCpuMs:windowView.cpuMs,windowGpuMs:windowView.gpuMs,windowCalls:windowView.drawCalls,windowTriangles:windowView.triangles,windowRenders:windowView.renders,roomFps:frameRate,roomCalls:6+batches.size+frames.length*3};}
  };
 }
