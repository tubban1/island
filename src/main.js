import islandSize from './island-size.json' with {type:'json'};
const ISLAND_SCALE=islandSize.linearScale;
import './style.css';
import './gift.css';
import {createGiftGame} from './gift-game.js';
import { createSeagrass } from './seagrass.js';
import { createSeaTurtle } from './turtle.js';
import { createShoreSurf } from './shore-surf.js';
import harbourLayout from './harbour-layout.json' with {type:'json'};
import { canMove, canSail } from './navigation.js';
import { applyHarbourPalette } from './palette.js';
import { createBeachLife } from './beach-life.js';
import { createFishSchools } from './fish.js';
import { underwaterMaterials } from './underwater.js';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';

const stage = document.querySelector('#stage');
const statusEl = document.querySelector('#status');
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x075378);
// The reference has clear water, without a fog veil over the island.

const renderer = new THREE.WebGLRenderer({antialias:true,powerPreference:'high-performance'});
renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));
renderer.setSize(innerWidth,innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.0;
stage.appendChild(renderer.domElement);

const ORTHO = 12.9;
const camera = new THREE.OrthographicCamera(-ORTHO,ORTHO,ORTHO,-ORTHO,0.1,180);
camera.position.set(-13.0,25.5,19.2);
camera.zoom = 1.0;
camera.updateProjectionMatrix();
const cameraTarget = new THREE.Vector3(0,0,0);

// Gentle reference-like grading rather than bloom: contrast, cyan shadows, warm highlights.
const gradingShader={
  uniforms:{tDiffuse:{value:null}},
  vertexShader:`varying vec2 vUv; void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}`,
  fragmentShader:`
    uniform sampler2D tDiffuse; varying vec2 vUv;
    void main(){
      vec4 c=texture2D(tDiffuse,vUv);
      vec3 x=c.rgb;
      x=(x-0.5)*1.035+0.5;
      float lum=dot(x,vec3(.299,.587,.114));
      x += vec3(-.015,.011,.018)*(1.0-smoothstep(.25,.78,lum));
      x += vec3(.024,.016,-.012)*smoothstep(.58,1.0,lum);
      x=mix(vec3(lum),x,1.07);
      gl_FragColor=vec4(x,c.a);
    }`
};
const composer=new EffectComposer(renderer);
composer.addPass(new RenderPass(scene,camera));
composer.addPass(new ShaderPass(gradingShader));
composer.addPass(new OutputPass());

// Lighting calibrated to the long palm shadows in the reference.
const hemi=new THREE.HemisphereLight(0xfff6dd,0x5e9597,1.12);scene.add(hemi);
const sun=new THREE.DirectionalLight(0xffefcf,2.35);sun.position.set(26,22,-15);sun.target.position.set(10,0,-2);scene.add(sun.target);sun.castShadow=true;
sun.shadow.mapSize.set(2048,2048);sun.shadow.camera.left=-23;sun.shadow.camera.right=23;sun.shadow.camera.top=23;sun.shadow.camera.bottom=-23;sun.shadow.camera.near=1;sun.shadow.camera.far=80;sun.shadow.bias=-0.00015;sun.shadow.normalBias=.04;scene.add(sun);
const fill=new THREE.DirectionalLight(0x73d9cb,.20);fill.position.set(-18,12,15);scene.add(fill);

// Ocean shader. Elliptical island distance + reef halo makes the depth gradient move with the world.
const shallowPts=[[-5,-5,2.4],[-10.5,-1.2,2.2],[-13.2,6.8,1.9],[-4,7.2,1.8],[1,9.4,1.7],[-17,-7,1.4],[-2,-11,1.5],[18,8,1.4]];
const reefUniform=`
float reefs(vec2 p){float r=99.0;\n${shallowPts.map(([x,z,s])=>`r=min(r,length((p-vec2(${x.toFixed(2)},${z.toFixed(2)}))/vec2(${s.toFixed(2)},${(s*.72).toFixed(2)})));`).join('\n')}return r;}
`;
const waterMat=new THREE.ShaderMaterial({
  uniforms:{uTime:{value:0},uCam:{value:new THREE.Vector3()}},
  vertexShader:`varying vec3 vWorld; varying vec2 vUv; void main(){vUv=uv;vec4 w=modelMatrix*vec4(position,1.0);vWorld=w.xyz;gl_Position=projectionMatrix*viewMatrix*w;}`,
  fragmentShader:`
    precision highp float; uniform float uTime; varying vec3 vWorld; varying vec2 vUv;
    ${reefUniform}
    float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453123);}
    float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.0-2.0*f);return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x),f.y);}
    float waterField(vec2 p){
      return noise(p)*.57+noise(p*2.07+vec2(11.7,4.1))*.28+noise(p*4.13+vec2(2.8,19.6))*.15;
    }
    float oldCaustic(vec2 p){
      p*=1.24; float t=uTime*.18;
      float a=abs(sin(p.x*1.9+sin(p.y*1.6+t))*cos(p.y*1.7+sin(p.x*1.5-t)));
      float b=abs(sin((p.x+p.y)*1.25-t)*cos((p.x-p.y)*1.12+t*.7));
      return pow(1.0-min(a,b),7.0);
    }
    float caustic(vec2 p){
      p*=2.7;
      p+=vec2(sin(p.y*.9+uTime*.25),cos(p.x*.8-uTime*.21))*.28;
      vec2 cell=floor(p), f=fract(p); float first=9.0, second=9.0;
      for(int y=-1;y<=1;y++)for(int x=-1;x<=1;x++){
        vec2 g=vec2(float(x),float(y));
        vec2 o=vec2(hash(cell+g),hash(cell+g+37.7));
        o=.5+.32*sin(uTime*.35+6.2831*o);
        float d=length(g+o-f);
        if(d<first){second=first;first=d;}else{second=min(second,d);}
      }
      return 1.0-smoothstep(.015,.070,second-first);
    }
    void main(){
      vec2 p=vWorld.xz;
      vec2 q=(p-vec2(13.5,0.0))/vec2(${10.15*ISLAND_SCALE},${7.65*ISLAND_SCALE});
      float contour=length(q);
      // Broad bent currents and smaller sand channels remain independent of shore distance.
      // Slow coherent drift; the shoreline/depth field remains anchored to the island.
      vec2 drift=vec2(uTime*.036,-uTime*.024);
      vec2 current=vec2(sin(p.y*.15+uTime*.11),cos(p.x*.13-uTime*.09))*.32;
      vec2 moving=p-drift+current;
      vec2 bend=vec2(waterField(moving*.075+8.0),waterField(moving*.075-13.0))-.5;
      vec2 flowing=moving+bend*7.0;
      float basin=waterField(flowing*.13);
      float channels=waterField(flowing*.37+vec2(4.3,-7.2));
      float waterPatch=basin*.72+channels*.28;
      float d=contour+(basin-.5)*.64+(channels-.5)*.16;
      float rd=reefs(p);
      float sho=max(1.0-smoothstep(.83,2.08,d),(1.0-smoothstep(.0,1.72,rd))*.17);
      float beach=1.0-smoothstep(.93,1.15,contour);
      float blueVariation=smoothstep(.24,.76,basin);
      vec3 deep=mix(vec3(.002,.042,.15),vec3(.006,.15,.28),blueVariation);
      deep=mix(deep,vec3(.004,.13,.29),channels*.26);
      vec3 mid=mix(vec3(.008,.31,.39),vec3(.022,.51,.49),smoothstep(.2,.8,channels));
      vec3 shallow=mix(vec3(.14,.59,.57),vec3(.38,.73,.63),smoothstep(.25,.78,waterPatch));
      vec3 c=mix(deep,mid,pow(sho,.90)*.90);
      c=mix(c,shallow,pow(sho,2.2)*.66);
      float lightPools=smoothstep(.46,.78,channels)*sho;
      c+=vec3(.022,.061,.055)*lightPools;
      float cs=caustic((p-drift*1.7+current*.35)*1.12)*(.008+.19*pow(sho,1.4))*(1.0-beach*.4);
      c+=vec3(.55,.90,.85)*cs;
      float ripple=.010*sin(p.x*3.1+uTime*.42)+.008*cos(p.y*3.8-uTime*.36);
      c+=ripple*vec3(.10,.17,.16);
      // Broken soft highlights travel with the current instead of forming solid stripes.
      float crest=pow(.5+.5*sin(p.x*2.3+p.y*1.5-uTime*.72+noise(moving*.42)*3.0),18.0);
      float breakup=smoothstep(.48,.73,waterField(moving*.75));
      c+=vec3(.28,.62,.64)*crest*breakup*(.018+.030*sho);
      float glint=pow(max(0.0,sin(p.x*9.0+sin(p.y*7.0+uTime*.8))*cos(p.y*11.0-uTime*.65)),22.0);
      c+=vec3(.5,.8,.8)*glint*(.008+.025*sho);
      // Clear windows reveal the real sand and reef; far water conceals the seabed edge.
      float clearAlpha=mix(.33,.17,smoothstep(.25,.72,channels));
      float coverage=mix(1.0,clearAlpha,smoothstep(.035,.58,sho));
      // Feather the water tint over wet sand instead of starting with a cyan edge.
      vec2 shoreLocal=p-vec2(13.5,0.0);
      shoreLocal=mat2(cos(.13),-sin(.13),sin(.13),cos(.13))*shoreLocal;
      if(shoreLocal.y<0.0)shoreLocal.y/=1.27;
      float shoreRadius=length(shoreLocal/vec2(${10.15*ISLAND_SCALE},${7.65*ISLAND_SCALE}));
      float wetBlend=smoothstep(.91,1.25,shoreRadius);
      c=mix(vec3(.56,.62,.43),c,.65+.35*wetBlend);
      coverage*=smoothstep(.0,1.0,wetBlend);
      gl_FragColor=vec4(c,coverage);

    }`,
  transparent:true,depthWrite:false
});
const ocean=new THREE.Mesh(new THREE.PlaneGeometry(120,90,1,1),waterMat);ocean.rotation.x=-Math.PI/2;ocean.position.y=-0.18;ocean.receiveShadow=true;scene.add(ocean);

// Soft submerged patches that read like distant sea grass / reefs.
function softDiscTexture(){
  const c=document.createElement('canvas');c.width=c.height=128;const g=c.getContext('2d');
  const grad=g.createRadialGradient(64,64,2,64,64,62);grad.addColorStop(0,'rgba(36,120,115,.30)');grad.addColorStop(.55,'rgba(30,117,111,.13)');grad.addColorStop(1,'rgba(30,117,111,0)');g.fillStyle=grad;g.fillRect(0,0,128,128);return new THREE.CanvasTexture(c);
}
const patchTex=softDiscTexture();
for(const [x,z,s] of [[-18,2,2.1],[-14,-9,1.4],[-9,10,1.7],[2,-13,1.4],[18,8,2],[20,-9,1.2]]){
  const sp=new THREE.Mesh(new THREE.PlaneGeometry(4*s,2.4*s),new THREE.MeshBasicMaterial({map:patchTex,transparent:true,opacity:.18,depthWrite:false}));sp.position.set(x,-.04,z);sp.rotation.x=-Math.PI/2;scene.add(sp);
}

const applyUnderwater=underwaterMaterials(waterMat.uniforms.uTime);
const loader=new GLTFLoader();
let world,boat;
const tmpV=new THREE.Vector3();
const loadGLB=(url)=>new Promise((resolve,reject)=>loader.load(url,g=>resolve(g.scene),undefined,reject));

try {
  [world,boat]=await Promise.all([loadGLB('/assets/atoll_world.glb'),loadGLB('/assets/boat.glb')]);
} catch(error) {
  statusEl.textContent='Unable to load the island. Please reload.';
  statusEl.classList.add('error');
  throw error;
}
world.traverse(o=>{if(o.isMesh){o.castShadow=!['Warm lagoon sand','Island ground','Submerged sand'].includes(o.material.name);o.receiveShadow=true;o.frustumCulled=true;applyHarbourPalette(o.material);applyUnderwater(o.material);if(o.material.name==='Warm lagoon sand')o.renderOrder=-1;o.material.shadowSide=THREE.FrontSide;o.material.flatShading=/wood|roof|rock|plaster/i.test(o.material.name);}});
boat.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true;}});
scene.add(world); scene.add(boat);
createShoreSurf(scene,waterMat.uniforms.uTime);
const beachLife=createBeachLife(scene,world);
const turtle=createSeaTurtle(scene,world,applyUnderwater);
createSeagrass(scene,world,applyUnderwater,waterMat.uniforms.uTime);
const signCanvas=document.createElement('canvas');signCanvas.width=512;signCanvas.height=128;
const signContext=signCanvas.getContext('2d');signContext.fillStyle='#95643e';signContext.fillRect(0,0,512,128);
signContext.fillStyle='#fff1cd';signContext.font='bold 54px Georgia';signContext.textAlign='center';signContext.textBaseline='middle';signContext.fillText('Home Harbour',256,68);
const signTexture=new THREE.CanvasTexture(signCanvas);signTexture.colorSpace=THREE.SRGBColorSpace;
const harbourSign=new THREE.Mesh(new THREE.PlaneGeometry(2.48,.55),new THREE.MeshStandardMaterial({map:signTexture,roughness:.9}));harbourSign.position.set(harbourLayout.sign.x,1.2,harbourLayout.sign.z+.09);scene.add(harbourSign);

const mooredBoat=boat.clone(true);mooredBoat.scale.setScalar(.56);mooredBoat.position.set(harbourLayout.mooring.x,.13,harbourLayout.mooring.z);mooredBoat.rotation.y=harbourLayout.mooring.angle;scene.add(mooredBoat);
const moor=harbourLayout.mooring;
const bow=new THREE.Vector3(moor.x+Math.sin(moor.angle)*.95,.53,moor.z+Math.cos(moor.angle)*.95);
const tie=new THREE.Vector3(moor.postX,.70,moor.postZ);
const ropeMid=bow.clone().lerp(tie,.5);ropeMid.y=.3;
const mooringLine=new THREE.Line(new THREE.BufferGeometry().setFromPoints(new THREE.QuadraticBezierCurve3(bow,ropeMid,tie).getPoints(16)),new THREE.LineBasicMaterial({color:0xcbb57e}));scene.add(mooringLine);
boat.scale.setScalar(.68);boat.position.set(-5,.15,3);boat.rotation.y=-.9;

// Wake sprites: two foamy trails + ring eddies.
function foamTexture(ring=false){
 const c=document.createElement('canvas');c.width=c.height=128;const x=c.getContext('2d');x.clearRect(0,0,128,128);
 if(ring){x.strokeStyle='rgba(255,255,255,.7)';x.lineWidth=5;x.beginPath();x.ellipse(64,64,38,18,0,0,Math.PI*2);x.stroke();}
 else{const q=x.createRadialGradient(64,64,4,64,64,56);q.addColorStop(0,'rgba(255,255,255,.82)');q.addColorStop(.35,'rgba(255,255,255,.46)');q.addColorStop(1,'rgba(255,255,255,0)');x.fillStyle=q;x.fillRect(0,0,128,128);}
 const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;return t;
}
const foamTex=foamTexture(false),ringTex=foamTexture(true);const wake=[];
const wakeGeometry=new THREE.PlaneGeometry(1,1);
function emitWake(ring=false){
 const mat=new THREE.MeshBasicMaterial({map:ring?ringTex:foamTex,transparent:true,opacity:ring?.22:.52,depthWrite:false});const s=new THREE.Mesh(wakeGeometry,mat);s.rotation.x=-Math.PI/2;
 const back=new THREE.Vector3(0,0,-1.24).applyAxisAngle(new THREE.Vector3(0,1,0),boat.rotation.y);
 const right=new THREE.Vector3(1,0,0).applyAxisAngle(new THREE.Vector3(0,1,0),boat.rotation.y);
 const side=ring?0:(Math.random()<.5?-.34:.34);
 s.position.copy(boat.position).add(back).addScaledVector(right,side);s.position.y=.035;
 const base=ring?1.3:.18+Math.random()*.18;s.scale.set(base*1.75,base,1);s.userData={life:1,ring,drift:new THREE.Vector3((Math.random()-.5)*.03,0,(Math.random()-.5)*.03)};scene.add(s);wake.push(s);
}

// Sea birds around the action.
const birds=[];const wingGeo=new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(-.35,0,0),new THREE.Vector3(0,.06,0),new THREE.Vector3(.35,0,0)]);for(let i=0;i<4;i++){const l=new THREE.Line(wingGeo,new THREE.LineBasicMaterial({color:0xf8f6eb,transparent:true,opacity:.9}));l.userData.seed=Math.random()*9;scene.add(l);birds.push(l)}

const schools=createFishSchools(scene,applyUnderwater);
const previousBoat=new THREE.Vector3();
let hasBoatPosition=false;
const boatMotion={x:0,z:0,fx:0,fz:1,speed:0};
const ripples=[];
const rippleGeometry=new THREE.RingGeometry(.92,1,48);
function surfaceRipple(x,z){
 const mesh=new THREE.Mesh(rippleGeometry,new THREE.MeshBasicMaterial({color:0xb5ece4,transparent:true,opacity:.4,depthWrite:false,side:THREE.DoubleSide}));
 mesh.rotation.x=-Math.PI/2;mesh.position.set(x,-.15,z);mesh.userData.life=0;scene.add(mesh);ripples.push(mesh);
 if(ripples.length>24){const old=ripples.shift();scene.remove(old);old.material.dispose();}
}
const raycaster=new THREE.Raycaster(),pointer=new THREE.Vector2(),waterPlane=new THREE.Plane(new THREE.Vector3(0,1,0),.18);
renderer.domElement.addEventListener('pointerdown',event=>{
 if(game.isRoom){game.clickRoom(event);return;}
 const bounds=renderer.domElement.getBoundingClientRect();
 pointer.set((event.clientX-bounds.left)/bounds.width*2-1,-(event.clientY-bounds.top)/bounds.height*2+1);
 raycaster.setFromCamera(pointer,camera);const hit=new THREE.Vector3();
 if(raycaster.ray.intersectPlane(waterPlane,hit) && game.clickWater(hit))return;
 if(raycaster.ray.intersectPlane(waterPlane,hit) && ((hit.x-13.5)/(10.15*ISLAND_SCALE))**2+(hit.z/(7.65*ISLAND_SCALE))**2>1.05){schools.simulation.attract(hit.x,hit.z);surfaceRipple(hit.x,hit.z);}
});
let fishRippleTimer=0;

// Route reconstructed from the 21.3s source video: reef edge -> outer water -> sweeping turn -> harbour.
const params=new URLSearchParams(location.search);
const fixedFrame=params.has('frame')?THREE.MathUtils.clamp(Number(params.get('frame'))||0,0,21.3):null;
const keys=new Set();let speed=0,steer=0;let wakeTimer=0,ringTimer=0;
const game=createGiftGame({scene,boat,keys});
statusEl.textContent='小岛已准备好。';
addEventListener('keydown',e=>{
 if(document.querySelector('dialog[open]')||/INPUT|TEXTAREA|SELECT/.test(e.target.tagName))return;
 if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Space'].includes(e.code))e.preventDefault();
 keys.add(e.code);
});
addEventListener('keyup',e=>keys.delete(e.code));
addEventListener('blur',()=>keys.clear());
document.addEventListener('visibilitychange',()=>{if(document.hidden)keys.clear();});

const followTarget=new THREE.Vector3();
const cameraOffset=new THREE.Vector3(-10,25,21);
let cameraInitialized=false;
function cameraFollow(dt){
  const desired=game.focus;
  if(!cameraInitialized){followTarget.copy(desired);cameraInitialized=true;}
  followTarget.lerp(desired,1-Math.exp(-3.2*dt));
  camera.position.copy(followTarget).add(cameraOffset);
  camera.lookAt(followTarget);
  camera.zoom=THREE.MathUtils.lerp(camera.zoom,game.zoom,1-Math.exp(-4*dt));
  camera.updateProjectionMatrix();
}

const clock=new THREE.Clock();
let lastRender=0;
function tick(){
 if(fixedFrame===null){requestAnimationFrame(tick);const now=performance.now();if(document.hidden || now-lastRender<1000/30)return;lastRender=now-(now-lastRender)%(1000/30);}const dt=Math.min(clock.getDelta(),.06);const t=fixedFrame??clock.elapsedTime;waterMat.uniforms.uTime.value=t;
 game.update(dt,t);speed=game.speed;steer=game.steer;
 boat.position.y=.17+Math.sin(t*3.1)*.026;boat.rotation.z=(steer*.055)+Math.sin(t*4.0)*.007;boat.rotation.x=Math.cos(t*3.3)*.009;
 wakeTimer+=dt;ringTimer+=dt;if(Math.abs(speed)>.055&&wakeTimer>.035){emitWake(false);wakeTimer=0}if(Math.abs(speed)>.18&&ringTimer>.85){emitWake(true);ringTimer=0}
 for(let i=wake.length-1;i>=0;i--){const w=wake[i];w.userData.life-=dt*(w.userData.ring?.25:.20);w.position.addScaledVector(w.userData.drift,dt*4);const k=1-w.userData.life;const base=w.userData.ring?1.3:.24;w.scale.set(base*(1.7+k*3.2),base*(1+k*1.3),1);w.material.opacity=Math.max(0,w.userData.life)*(w.userData.ring?.20:.48);if(w.userData.life<=0){scene.remove(w);w.material.dispose();wake.splice(i,1)}}
 birds.forEach((b,i)=>{const a=t*.65+i*1.4+b.userData.seed;b.position.set(boat.position.x+Math.cos(a)*(2.1+i*.48),1.25+Math.sin(a*3)*.10,boat.position.z+Math.sin(a)*(1.6+i*.33));b.rotation.y=-a*.4;b.scale.y=.8+Math.sin(t*11+i)*.35});
 const travel=hasBoatPosition?Math.hypot(boat.position.x-previousBoat.x,boat.position.z-previousBoat.z):0;
 boatMotion.x=boat.position.x;boatMotion.z=boat.position.z;boatMotion.fx=Math.sin(boat.rotation.y);boatMotion.fz=Math.cos(boat.rotation.y);
 boatMotion.speed=travel<2 && dt>0?travel/dt:0;previousBoat.copy(boat.position);hasBoatPosition=true;
 beachLife.update(t);turtle.update(dt,t);mooredBoat.position.y=.13+Math.sin(t*1.8)*.018;mooredBoat.rotation.z=Math.sin(t*1.5)*.018;
 schools.update(dt,t,boatMotion);fishRippleTimer-=dt;
 const startled=schools.simulation.fish.find(f=>f.mode==='flee');
 if(startled && fishRippleTimer<=0){surfaceRipple(startled.x,startled.z);fishRippleTimer=.7;}
 for(let i=ripples.length-1;i>=0;i--){const r=ripples[i];r.userData.life+=dt;const age=r.userData.life;r.scale.setScalar(.25+age*.65);r.material.opacity=.28*Math.max(0,1-age/2.5);if(age>2.5){scene.remove(r);r.material.dispose();ripples.splice(i,1);}}

 cameraFollow(fixedFrame===null?dt:1);if(game.isRoom)game.renderRoom(renderer,t);else composer.render();
}
function resize(){const a=innerWidth/innerHeight;camera.left=-ORTHO*a;camera.right=ORTHO*a;camera.top=ORTHO;camera.bottom=-ORTHO;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);composer.setSize(innerWidth,innerHeight);renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));}
addEventListener('resize',()=>{resize();if(fixedFrame!==null)tick();});resize();tick();
