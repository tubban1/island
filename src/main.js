import islandSize from './island-size.json' with {type:'json'};
const ISLAND_SCALE=islandSize.linearScale;
import './style.css';
import {clearwaterOptics} from './clearwater-optics.js';
import {createWaterRefraction} from './water-refraction.js';
import {createCoastalField} from './coastal-field.js';
import {createIslandRetreat} from './island-retreat.js';
import {createHarbourStories} from './harbour-stories.js';
import {reshapeIslandTerrain} from './coast-shape.js';
import {createDistantSails} from './distant-sails.js';
import {addHarbourBlooms} from './harbour-blooms.js';
import {ageCoastalObjects} from './coastal-age.js';
import './gift.css';
import {createGiftGame} from './gift-game.js';
import { createSeagrass } from './seagrass.js';
import { createSeaTurtle } from './turtle.js';
import { createShoreSurf } from './shore-surf.js';
import harbourLayout from './harbour-layout.json' with {type:'json'};
import { canMove, canSail } from './navigation.js';
import { applyHarbourPalette } from './palette.js';
import { refineHarbourSurface } from './harbour-surfaces.js';
import { refineHarbourGarden } from './harbour-garden.js';
import { refineHarbourHouse } from './harbour-house.js';
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
const camera = new THREE.OrthographicCamera(-ORTHO,ORTHO,ORTHO,-ORTHO,0.1,500);
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
const hemi=new THREE.HemisphereLight(0xfff5e6,0x7eabb3,1.12);scene.add(hemi);
const sun=new THREE.DirectionalLight(0xffe5bb,3.0);sun.position.set(28,23,-16);sun.target.position.set(10,0,-2);scene.add(sun.target);sun.castShadow=true;
sun.shadow.mapSize.set(2048,2048);sun.shadow.camera.left=-23;sun.shadow.camera.right=23;sun.shadow.camera.top=23;sun.shadow.camera.bottom=-23;sun.shadow.camera.near=1;sun.shadow.camera.far=80;sun.shadow.bias=-0.00015;sun.shadow.normalBias=.04;scene.add(sun);
const fill=new THREE.DirectionalLight(0x99d8e2,.30);fill.position.set(-18,12,15);scene.add(fill);

// Ocean shader. Elliptical island distance + reef halo makes the depth gradient move with the world.
const shallowPts=[[-5,-5,2.4],[-10.5,-1.2,2.2],[-13.2,6.8,1.9],[-4,7.2,1.8],[1,9.4,1.7],[-17,-7,1.4],[-2,-11,1.5],[18,8,1.4]];
const reefUniform=`
float reefs(vec2 p){float r=99.0;\n${shallowPts.map(([x,z,s])=>`r=min(r,length((p-vec2(${x.toFixed(2)},${z.toFixed(2)}))/vec2(${s.toFixed(2)},${(s*.72).toFixed(2)})));`).join('\n')}return r;}
`;
const waterMat=new THREE.ShaderMaterial({
  uniforms:{uTime:{value:0},uCam:{value:new THREE.Vector3()},uCoast:{value:createCoastalField()}},
  vertexShader:`varying vec3 vWorld; varying vec2 vUv; void main(){vUv=uv;vec4 w=modelMatrix*vec4(position,1.0);vWorld=w.xyz;gl_Position=projectionMatrix*viewMatrix*w;}`,
  fragmentShader:`
    precision highp float; uniform float uTime; uniform vec3 uCam; uniform sampler2D uCoast; uniform sampler2D uReefScene; uniform mat4 uReefMatrix; uniform float uReefReady; varying vec3 vWorld; varying vec2 vUv;
    ${reefUniform}
    ${clearwaterOptics}
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
      float coastDistance=(texture2D(uCoast,(p+55.0)/140.0).r-.5)*40.0;
      float contour=1.0+coastDistance/10.0;
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
      float sho=max(1.0-smoothstep(.94,2.10,d),(1.0-smoothstep(.0,1.72,rd))*.17);
      float beach=1.0-smoothstep(.93,1.15,contour);
      float blueVariation=smoothstep(.24,.76,basin);
      vec3 deep=mix(vec3(.004,.065,.19),vec3(.008,.23,.36),blueVariation);
      deep=mix(deep,vec3(.004,.13,.29),channels*.26);
      vec3 mid=mix(vec3(.009,.36,.46),vec3(.025,.59,.58),smoothstep(.2,.8,channels));
      vec3 shallow=mix(vec3(.17,.65,.59),vec3(.46,.80,.68),smoothstep(.25,.78,waterPatch));
      vec3 c=mix(deep,mid,pow(sho,.90)*.90);
      c=mix(c,shallow,pow(sho,2.2)*.66);
      float lightPools=smoothstep(.46,.78,channels)*sho;
      c+=vec3(.022,.061,.055)*lightPools;
      float cs=caustic((p-drift*1.7+current*.35)*1.12)*(.003+.15*pow(sho,1.7))*(1.0-beach*.55);
      c+=vec3(.55,.90,.85)*cs;
      float ripple=.010*sin(p.x*3.1+uTime*.42)+.008*cos(p.y*3.8-uTime*.36);
      c+=ripple*vec3(.10,.17,.16);
      // Broken soft highlights travel with the current instead of forming solid stripes.
      float crest=pow(.5+.5*sin(p.x*2.3+p.y*1.5-uTime*.72+noise(moving*.42)*3.0),18.0);
      float breakup=smoothstep(.48,.73,waterField(moving*.75));
      c+=vec3(.28,.62,.64)*crest*breakup*(.018+.030*sho);
      float glint=pow(max(0.0,sin(p.x*9.0+sin(p.y*7.0+uTime*.8))*cos(p.y*11.0-uTime*.65)),22.0);
      c+=vec3(.5,.8,.8)*glint*(.008+.025*sho);
      // Small, broken wavelets wrap around the mooring post and seaward pier legs.
      float postDistance=min(length(p-vec2(${harbourLayout.mooring.postX},${harbourLayout.mooring.postZ})),
        min(length(p-vec2(${harbourLayout.dock.x-harbourLayout.dock.width/2},${harbourLayout.dock.z+harbourLayout.dock.length/2})),
            length(p-vec2(${harbourLayout.dock.x+harbourLayout.dock.width/2},${harbourLayout.dock.z+harbourLayout.dock.length/2}))));
      float postRipples=pow(.5+.5*sin(postDistance*19.-uTime*1.8),12.)
        *smoothstep(.12,.24,postDistance)*(1.-smoothstep(.3,1.15,postDistance));
      c+=vec3(.11,.17,.16)*postRipples*(.4+.6*noise(p*6.+uTime*.2));
      // Clear windows reveal the real sand and reef; far water conceals the seabed edge.
      float clearAlpha=mix(.33,.17,smoothstep(.25,.72,channels));
      float coverage=mix(1.0,clearAlpha,smoothstep(.035,.58,sho));
      // Absorption conceals the finite seabed shelf before its mesh boundary.
      float opticalDistance=max(0.,coastDistance+(basin-.5)*1.25+(channels-.5)*.40);
      float depthBlend=smoothstep(.9,8.5,opticalDistance);
      coverage=max(coverage,depthBlend);
      // Feather the water tint over wet sand instead of starting with a cyan edge.
      vec2 shoreLocal=p-vec2(13.5,0.0);
      shoreLocal=mat2(cos(.13),-sin(.13),sin(.13),cos(.13))*shoreLocal;
      if(shoreLocal.y<0.0)shoreLocal.y/=1.27;
      float shoreRadius=length(shoreLocal/vec2(${10.15*ISLAND_SCALE},${7.65*ISLAND_SCALE}));
      float wetBlend=smoothstep(-1.3,2.8,coastDistance);
      c=mix(vec3(.56,.62,.43),c,.65+.35*wetBlend);
      coverage*=smoothstep(.0,1.0,wetBlend);
      // Fine directional normals catch the low sun without whitening the lagoon.
      vec3 n=cwNormal(p,uTime);
      vec3 viewDir=normalize(uCam-vWorld);
      vec3 halfway=normalize(viewDir+normalize(vec3(20.,18.,-16.)));
      float sparkle=pow(max(dot(n,halfway),0.),220.);
      float smallWaves=pow(.5+.5*sin(p.x*4.2+p.y*3.8-uTime*1.1+noise(p*1.8)*12.),16.);
      c+=vec3(.90,.71,.40)*sparkle*.19*smoothstep(.40,.73,noise(p*5.));
      c+=vec3(.007,.018,.023)*smallWaves*(1.-sho*.7);
      coverage=max(coverage,sparkle*.27*wetBlend);
      float fresnel=cwFresnel(max(dot(n,viewDir),.02),1.333);
      vec3 reflected=reflect(-viewDir,n);
      vec3 skyReflection=mix(vec3(.29,.48,.58),vec3(.055,.23,.42),clamp(reflected.y,0.,1.));
      if(uReefReady>.5){
       float waterDepth=max(.08,opticalDistance*.23+.28);
       vec3 ray=refract(-viewDir,n,1./1.333);
       vec3 flatRay=refract(-viewDir,vec3(0,1,0),1./1.333);
       vec2 bend=(ray.xz/max(.2,-ray.y)-flatRay.xz/max(.2,-flatRay.y))*min(waterDepth,2.5);
       vec4 reefClip=uReefMatrix*vec4(vWorld+vec3(bend.x,0.,bend.y),1.);
       vec2 reefUv=reefClip.xy/reefClip.w*.5+.5;
       vec3 reef=texture2D(uReefScene,clamp(reefUv,.001,.999)).rgb;
       vec3 transmission=exp(-vec3(.23,.095,.055)*waterDepth);
       vec3 under=reef*transmission+c*(1.-transmission);
       float lagoon=(1.-depthBlend)*wetBlend;
       c=mix(c,under,lagoon*.62);
       c+=vec3(.22,.40,.34)*cs*lagoon;
       coverage=mix(coverage,1.,lagoon);
      }
      c=mix(c,skyReflection,fresnel*.65*wetBlend);
      // Surface crests are added after refraction, so clear water cannot wash them out.
      float surfaceMotion=crest*breakup;
      c+=vec3(.12,.22,.23)*surfaceMotion*(.32+.38*sho)*wetBlend;
      c+=vec3(.018,.031,.034)*smallWaves*wetBlend;
      gl_FragColor=vec4(c,coverage);

    }`,
  transparent:true,depthWrite:false
});
// A large single plane keeps the sea continuous at every allowed orbit pitch/zoom.
const ocean=new THREE.Mesh(new THREE.PlaneGeometry(600,600),waterMat);ocean.rotation.x=-Math.PI/2;ocean.position.y=-0.18;ocean.receiveShadow=true;scene.add(ocean);

scene.userData.waterOptics={ocean,uniforms:waterMat.uniforms};
const waterRefraction=createWaterRefraction(renderer,scene,camera,ocean,waterMat.uniforms);

// Soft submerged patches that read like distant sea grass / reefs.
function softDiscTexture(){
  const c=document.createElement('canvas');c.width=c.height=128;const g=c.getContext('2d');
  const grad=g.createRadialGradient(64,64,2,64,64,62);grad.addColorStop(0,'rgba(36,120,115,.30)');grad.addColorStop(.55,'rgba(30,117,111,.13)');grad.addColorStop(1,'rgba(30,117,111,0)');g.fillStyle=grad;g.fillRect(0,0,128,128);return new THREE.CanvasTexture(c);
}
const patchTex=softDiscTexture();
for(const [x,z,s] of [[-18,2,2.1],[-14,-9,1.4],[-9,10,1.7],[2,-13,1.4],[18,8,2],[20,-9,1.2]]){
  const sp=new THREE.Mesh(new THREE.PlaneGeometry(4*s,2.4*s),new THREE.MeshBasicMaterial({map:patchTex,transparent:true,opacity:.18,depthWrite:false}));sp.position.set(x,-.04,z);sp.rotation.x=-Math.PI/2;scene.add(sp);
}

const applyUnderwater=underwaterMaterials(waterMat.uniforms.uTime,waterMat.uniforms.uCoast);
const loadingScreen = document.querySelector('#loading-screen');
const loadingBarFill = document.querySelector('#loading-bar-fill');
const loadingPct = document.querySelector('#loading-pct');
const loadingHint = document.querySelector('#loading-hint');

function setLoadProgress(pct, hint) {
  const clamped = Math.min(100, Math.max(0, Math.round(pct)));
  if (loadingBarFill) loadingBarFill.style.width = `${clamped}%`;
  if (loadingPct) loadingPct.textContent = `${clamped}%`;
  if (hint && loadingHint) loadingHint.textContent = hint;
}

let currentProgress = 15;
setLoadProgress(currentProgress, '正在唤醒碧蓝海浪与阳光…');

const progressInterval = setInterval(() => {
  if (currentProgress < 75) {
    currentProgress += Math.floor(Math.random() * 4) + 2;
    let hint = '正在唤醒碧蓝海浪与阳光…';
    if (currentProgress > 35) hint = '正在雕琢热带棕榈与珊瑚…';
    if (currentProgress > 58) hint = '正在准备海滨木屋与码头…';
    setLoadProgress(currentProgress, hint);
  }
}, 220);

let loadedBytes = { world: 0, boat: 0 };
const totalEstimatedBytes = 9608508 + 21500;

const loader=new GLTFLoader();
let world,boat;
const tmpV=new THREE.Vector3();
const loadGLB=(url, key)=>new Promise((resolve,reject)=>loader.load(
  url,
  g=>{
    loadedBytes[key] = (key === 'world' ? 9608508 : 21500);
    resolve(g.scene);
  },
  xhr=>{
    if (xhr && xhr.loaded) {
      loadedBytes[key] = xhr.loaded;
      const realPct = Math.min(95, Math.round(((loadedBytes.world + loadedBytes.boat) / totalEstimatedBytes) * 100));
      if (realPct > currentProgress) {
        currentProgress = realPct;
        let hint = '正在唤醒碧蓝海浪与阳光…';
        if (currentProgress > 40) hint = '正在雕琢热带棕榈与珊瑚…';
        if (currentProgress > 72) hint = '正在准备海滨木屋与码头…';
        setLoadProgress(currentProgress, hint);
      }
    }
  },
  reject
));

try {
  [world,boat]=await Promise.all([loadGLB('/assets/atoll_world.glb', 'world'),loadGLB('/assets/boat.glb', 'boat')]);
} catch(error) {
  clearInterval(progressInterval);
  if (loadingHint) loadingHint.textContent = '小岛加载遇到问题，请刷新重试。';
  statusEl.textContent='Unable to load the island. Please reload.';
  statusEl.classList.add('error');
  throw error;
}
reshapeIslandTerrain(world);
world.traverse(o=>{
  if(o.isMesh){
    o.castShadow=!['Warm lagoon sand','Island ground','Submerged sand'].includes(o.material.name);
    o.receiveShadow=true;
    o.frustumCulled=true;
    applyHarbourPalette(o.material);
    applyUnderwater(o.material);
    refineHarbourSurface(o.material);
    if(o.material.name==='Warm lagoon sand')o.renderOrder=-1;
    if(o.material.name==='Submerged sand')o.renderOrder=-2;
    o.material.shadowSide=THREE.FrontSide;
    o.material.flatShading=/wood|roof|rock|plaster/i.test(o.material.name);

    // 隐藏 GLB 中旧的低精小木牌与旧信箱，避免与新招牌冲突
    if (o.material.name === 'Dark wood' || o.material.name === 'Flag red') {
      const pos = o.geometry.attributes.position;
      let modified = false;
      for (let i = 0; i < pos.count; i++) {
        const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
        if (x > 11.5 && x < 14.3 && z > 4.4 && z < 4.85 && y > 0.05) {
          pos.setY(i, -100);
          modified = true;
        }
      }
      if (modified) pos.needsUpdate = true;
    }
  }
});
boat.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true;}});
refineHarbourGarden(world);
refineHarbourHouse(world);
addHarbourBlooms(world);
scene.add(world); scene.add(boat);
const retreat=createIslandRetreat(world);
const distantSails=createDistantSails(scene);
createHarbourStories(world);
ageCoastalObjects(world);
createShoreSurf(scene,waterMat.uniforms.uTime);
const beachLife=createBeachLife(scene,world);
const turtle=createSeaTurtle(scene,world,applyUnderwater);
createSeagrass(scene,world,applyUnderwater,waterMat.uniforms.uTime);

// ==================== 精致海岛高清晰度木雕招牌 Canvas 材质 ====================
const signCanvas=document.createElement('canvas');signCanvas.width=1024;signCanvas.height=380;
const signContext=signCanvas.getContext('2d');
const signTexture=new THREE.CanvasTexture(signCanvas);
signTexture.colorSpace=THREE.SRGBColorSpace;
signTexture.anisotropy=renderer.capabilities.getMaxAnisotropy();

function splitTitleLines(text) {
  if (text.includes('\n')) {
    const parts = text.split('\n').map(p => p.trim()).filter(Boolean);
    return parts.slice(0, 2);
  }
  // 8字及以内单行呈现
  if (text.length <= 8) return [text];

  // 优先在空格或标点符号处断行
  const seps = [' ', '·', '，', ',', '/', '-'];
  const mid = Math.floor(text.length / 2);
  let best = -1, minDiff = Infinity;
  for (let i = 0; i < text.length; i++) {
    if (seps.includes(text[i])) {
      const diff = Math.abs(i - mid);
      if (diff < minDiff) {
        minDiff = diff;
        best = i;
      }
    }
  }
  if (best > 1 && best < text.length - 1 && minDiff <= 4) {
    const l1 = text.slice(0, best).trim();
    const l2 = text.slice(best + 1).trim();
    if (l1 && l2) return [l1, l2];
  }

  // 无明显分隔符则中间自然分两行
  const splitIdx = Math.ceil(text.length / 2);
  return [text.slice(0, splitIdx).trim(), text.slice(splitIdx).trim()];
}

function renderHarbourSign(titleText) {
  const rawTitle = (titleText || '留给你的一座岛').trim() || '留给你的一座岛';
  const title = rawTitle.slice(0, 20); // 严格限制 20 字以内
  const lines = splitTitleLines(title);
  const isTwoLines = lines.length === 2;

  signContext.clearRect(0, 0, 1024, 380);

  // 1. 温暖海岛明亮金柚木底色（保证远景与任意光照下均鲜明通透，彻底告别暗沉发黑）
  const grad = signContext.createLinearGradient(0, 0, 0, 380);
  grad.addColorStop(0, '#9c6436');
  grad.addColorStop(0.3, '#865128');
  grad.addColorStop(0.7, '#78461f');
  grad.addColorStop(1, '#653816');
  signContext.fillStyle = grad;
  signContext.fillRect(0, 0, 1024, 380);

  // 2. 细腻暖金色木质纹理
  for (let y = 0; y < 380; y += 3) {
    const alpha = 0.10 + Math.sin(y * 0.14) * 0.05 + ((y * 7) % 11) * 0.008;
    signContext.fillStyle = `rgba(180, 126, 76, ${alpha})`;
    signContext.fillRect(0, y, 1024, 2);
  }

  // 3. 实木拼板横缝与立体微光
  signContext.fillStyle = 'rgba(20, 10, 4, 0.78)';
  signContext.fillRect(0, 124, 1024, 4);
  signContext.fillRect(0, 254, 1024, 4);
  signContext.fillStyle = 'rgba(255, 238, 195, 0.25)';
  signContext.fillRect(0, 128, 1024, 2);
  signContext.fillRect(0, 258, 1024, 2);

  // 4. 外圈明亮黄铜金线边框与圆角
  signContext.strokeStyle = '#fcd982';
  signContext.lineWidth = 8;
  if (signContext.roundRect) {
    signContext.beginPath();
    signContext.roundRect(16, 14, 992, 352, 18);
    signContext.stroke();

    // 内圈细金线
    signContext.strokeStyle = 'rgba(252, 217, 130, 0.6)';
    signContext.lineWidth = 3;
    signContext.beginPath();
    signContext.roundRect(28, 26, 968, 328, 12);
    signContext.stroke();
  } else {
    signContext.strokeRect(16, 14, 992, 352);
  }

  // 5. 四角黄铜固定铆钉与立体高光
  const rivets = [[40, 38], [984, 38], [40, 342], [984, 342]];
  for (const [rx, ry] of rivets) {
    signContext.beginPath();
    signContext.arc(rx, ry, 9.5, 0, Math.PI * 2);
    signContext.fillStyle = '#ffdf80';
    signContext.fill();
    signContext.strokeStyle = '#4e3314';
    signContext.lineWidth = 2.5;
    signContext.stroke();

    signContext.beginPath();
    signContext.arc(rx - 2.5, ry - 2.5, 3, 0, Math.PI * 2);
    signContext.fillStyle = '#ffffff';
    signContext.fill();
  }

  signContext.textAlign = 'center';
  signContext.textBaseline = 'middle';

  // 6. 顶部精致小标
  signContext.font = 'bold 28px Georgia, "PingFang SC", serif';
  signContext.fillStyle = 'rgba(20, 10, 4, 0.9)';
  signContext.fillText('✦ HOME HARBOUR ✦', 512 + 1.5, 54 + 1.5);
  signContext.fillStyle = '#fed780';
  signContext.fillText('✦ HOME HARBOUR ✦', 512, 54);

  // 7. 岛屿名字：支持最多 2 行大字排版，单行大号，两行依然清晰醒目！
  let fontSize = isTwoLines ? 92 : 116;
  const maxTextWidth = 920;
  signContext.font = `bold ${fontSize}px "PingFang SC", "Songti SC", "Noto Serif SC", "Georgia", sans-serif`;
  for (const line of lines) {
    while (signContext.measureText(line).width > maxTextWidth && fontSize > 40) {
      fontSize -= 3;
      signContext.font = `bold ${fontSize}px "PingFang SC", "Songti SC", "Noto Serif SC", "Georgia", sans-serif`;
    }
  }

  // 绘制 1 或 2 行文字
  lines.forEach((line, idx) => {
    const y = isTwoLines ? (154 + idx * 116) : 216;

    // 多重重度立体阴刻深影，确保在远景下轮廓极度清晰
    signContext.fillStyle = 'rgba(10, 4, 2, 0.98)';
    signContext.fillText(line, 512 + 3.5, y + 4.5);
    signContext.fillText(line, 512 - 1.5, y + 4.5);
    signContext.fillText(line, 512 + 3.5, y - 1.5);
    signContext.fillText(line, 512 - 1.5, y - 1.5);

    // 主文字高亮象牙暖白金
    signContext.fillStyle = '#fffdf2';
    signContext.fillText(line, 512, y);
  });

  signTexture.needsUpdate = true;
}

renderHarbourSign('留给你的一座岛');

// ==================== 移至沙滩红框位置的超清晰动态 3D 招牌组 ====================
const signGroup = new THREE.Group();
signGroup.position.set(harbourLayout.sign.x, 0.04, harbourLayout.sign.z);
signGroup.rotation.y = -0.12;
signGroup.scale.setScalar(.72);
scene.add(signGroup);

const woodPostMat = new THREE.MeshStandardMaterial({color: 0x4d3018, roughness: 0.88});
const brassMat = new THREE.MeshStandardMaterial({color: 0xd4af37, metalness: 0.6, roughness: 0.35});

// 左右两根粗实木立柱与柱头黄铜盖帽
for (const px of [-1.80, 1.80]) {
  const post = new THREE.Mesh(new THREE.BoxGeometry(0.14, 2.35, 0.14), woodPostMat);
  post.position.set(px, 1.17, 0);
  post.castShadow = true;
  post.receiveShadow = true;
  signGroup.add(post);

  const cap = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.06, 0.18), brassMat);
  cap.position.set(px, 2.36, 0);
  signGroup.add(cap);
}

// 顶部实木横梁（连接两立柱）
const topBeam = new THREE.Mesh(new THREE.BoxGeometry(3.90, 0.10, 0.10), woodPostMat);
topBeam.position.set(0, 2.25, 0);
topBeam.castShadow = true;
signGroup.add(topBeam);

// 黄铜悬挂吊环
for (const rx of [-1.25, 1.25]) {
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.05, 0.015, 8, 16), brassMat);
  ring.position.set(rx, 2.18, 0);
  signGroup.add(ring);
}

// 动态微风摆动组（以顶部吊点为轴心，微仰角正对俯视相机）
const signBoardGroup = new THREE.Group();
signBoardGroup.position.set(0, 2.14, 0);
signGroup.add(signBoardGroup);

// 招牌实木背板（厚实饱满）
const signBoardGeo = new THREE.BoxGeometry(4.68, 1.62, 0.14);
const signBoardMat = new THREE.MeshStandardMaterial({color: 0x5a381c, roughness: 0.85});
const signBoard = new THREE.Mesh(signBoardGeo, signBoardMat);
signBoard.position.set(0, -0.72, 0);
signBoard.castShadow = true;
signBoard.receiveShadow = true;
signBoardGroup.add(signBoard);

// 招牌正面面板：使用 MeshBasicMaterial，不受场景后向阳光阴影限制，色彩永远明亮、文字清晰可见！
const signPlateGeo = new THREE.PlaneGeometry(4.52, 1.50);
const signPlateMat = new THREE.MeshBasicMaterial({map: signTexture, side: THREE.FrontSide});
const harbourSign = new THREE.Mesh(signPlateGeo, signPlateMat);
harbourSign.position.set(0, -0.72, 0.075);
signBoardGroup.add(harbourSign);

// 左侧立柱挂载的红色小信箱（带金色小旗）
const mailboxGroup = new THREE.Group();
mailboxGroup.position.set(-1.98, 0.82, 0.10);
const mbBody = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.32, 0.36), new THREE.MeshStandardMaterial({color: 0xa83434, roughness: 0.65}));
mbBody.castShadow = true;
mailboxGroup.add(mbBody);
const mbFlag = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.16, 0.08), new THREE.MeshStandardMaterial({color: 0xdca832, roughness: 0.4}));
mbFlag.position.set(-0.14, 0.08, 0.10);
mailboxGroup.add(mbFlag);
signGroup.add(mailboxGroup);

// 右侧立柱挂载的复古暖光壁灯
const lanternGroup = new THREE.Group();
lanternGroup.position.set(1.96, 1.65, 0.12);
const lanternBracket = new THREE.Mesh(new THREE.BoxGeometry(0.20, 0.05, 0.05), brassMat);
lanternGroup.add(lanternBracket);
const lanternGlass = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.06, 0.18, 8), new THREE.MeshStandardMaterial({
  color: 0xffe6b0,
  emissive: 0xffa834,
  emissiveIntensity: 0.45,
  roughness: 0.3
}));
lanternGlass.position.set(0.12, -0.10, 0);
lanternGroup.add(lanternGlass);
signGroup.add(lanternGroup);

// The house's quiet rear wall carries the project credit; the plaque is clickable in island view.
const creditCanvas=document.createElement('canvas');creditCanvas.width=1024;creditCanvas.height=448;
const creditContext=creditCanvas.getContext('2d');
creditContext.fillStyle='#7e5839';creditContext.fillRect(0,0,1024,448);
creditContext.fillStyle='#98704b';for(let y=8;y<448;y+=68)creditContext.fillRect(0,y,1024,4);
creditContext.strokeStyle='#d6af70';creditContext.lineWidth=12;creditContext.strokeRect(15,15,994,418);
creditContext.textAlign='center';creditContext.fillStyle='#fff2cf';
creditContext.font='bold 92px Georgia';creditContext.fillText('GitHub  ↗',512,140);
creditContext.font='52px Arial';creditContext.fillText('github.com/tubban1/island',512,230);
creditContext.fillStyle='#efcf9a';creditContext.font='italic 46px Georgia';creditContext.fillText('inspired by x@nowsomemv',512,338);
const creditTexture=new THREE.CanvasTexture(creditCanvas);creditTexture.colorSpace=THREE.SRGBColorSpace;creditTexture.anisotropy=renderer.capabilities.getMaxAnisotropy();
const creditBoard=new THREE.Mesh(new THREE.BoxGeometry(4.12,1.82,.12),new THREE.MeshStandardMaterial({color:0x775336,roughness:.85}));creditBoard.position.set(14.8,2.4,-3.60);creditBoard.castShadow=true;scene.add(creditBoard);
const githubPlaque=new THREE.Mesh(new THREE.PlaneGeometry(3.96,1.68),new THREE.MeshStandardMaterial({map:creditTexture,roughness:.9,side:THREE.DoubleSide}));githubPlaque.rotation.y=Math.PI;githubPlaque.position.set(14.8,2.4,-3.67);scene.add(githubPlaque);
for(const x of [12.32,17.28]){
  const bracket=new THREE.Mesh(new THREE.BoxGeometry(.24,.50,.18),new THREE.MeshStandardMaterial({color:0x765337,roughness:.82}));bracket.position.set(x,2.35,-3.58);bracket.castShadow=true;scene.add(bracket);
  const glass=new THREE.Mesh(new THREE.BoxGeometry(.17,.29,.19),new THREE.MeshStandardMaterial({color:0xffda91,emissive:0xa36a27,emissiveIntensity:.36,roughness:.45}));glass.position.set(x,2.35,-3.69);scene.add(glass);
}

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
const roomPointers=new Map();let roomGestureMoved=false;
renderer.domElement.addEventListener('pointerdown',event=>{
  if(!game?.isRoom||document.querySelector('dialog[open]'))return;
  roomPointers.set(event.pointerId,{x:event.clientX,y:event.clientY,travel:0,pan:event.button===2||event.shiftKey});
  if(roomPointers.size>1)roomGestureMoved=true;
  else roomGestureMoved=false;
  renderer.domElement.setPointerCapture?.(event.pointerId);renderer.domElement.classList.add('is-orbiting');event.preventDefault();
});
renderer.domElement.addEventListener('pointermove',event=>{
  if(!game?.isRoom)return;
  const current=roomPointers.get(event.pointerId);
  if(!current){renderer.domElement.style.cursor=game.hoverRoom(event)?'pointer':'grab';return;}
  const dx=event.clientX-current.x,dy=event.clientY-current.y;
  current.travel+=Math.abs(dx)+Math.abs(dy);if(current.travel>5)roomGestureMoved=true;
  if(roomPointers.size===2){
    const other=[...roomPointers.entries()].find(([id])=>id!==event.pointerId)?.[1];
    if(other){const before=Math.hypot(current.x-other.x,current.y-other.y),after=Math.hypot(event.clientX-other.x,event.clientY-other.y);game.zoomRoom((before-after)*2.4);}
  }else game.dragRoom(dx,dy,current.pan||event.shiftKey);
  current.x=event.clientX;current.y=event.clientY;event.preventDefault();
});
const endRoomGesture=event=>{
  if(!roomPointers.has(event.pointerId))return;
  roomPointers.delete(event.pointerId);renderer.domElement.releasePointerCapture?.(event.pointerId);
  if(!roomPointers.size){renderer.domElement.classList.remove('is-orbiting');if(!roomGestureMoved&&event.type==='pointerup')game.clickRoom(event);game.hoverRoom(event);}
};
renderer.domElement.addEventListener('pointerup',endRoomGesture);renderer.domElement.addEventListener('pointercancel',endRoomGesture);
renderer.domElement.addEventListener('contextmenu',event=>{if(game?.isRoom)event.preventDefault();});
let orbiting=false,orbitMoved=false,lastOrbitX=0,lastOrbitY=0,orbitTravel=0;
let orbitYaw=Math.atan2(camera.position.x,camera.position.z),orbitPitch=Math.atan2(camera.position.y,Math.hypot(camera.position.x,camera.position.z));
let viewZoom=1;
function minimumOrbitPitch(){return Math.max(.36,Math.atan(ORTHO/(cameraOffset.length()*game.zoom*viewZoom))+.06);}
renderer.domElement.addEventListener('pointerdown',event=>{
  if(!game || game.isRoom || game.state.phase!=='creator')return;
  orbiting=true;orbitMoved=false;orbitTravel=0;lastOrbitX=event.clientX;lastOrbitY=event.clientY;
  renderer.domElement.classList.add('is-orbiting');renderer.domElement.setPointerCapture?.(event.pointerId);event.preventDefault();
});
renderer.domElement.addEventListener('pointermove',event=>{
  if(!orbiting)return;
  const dx=event.clientX-lastOrbitX,dy=event.clientY-lastOrbitY;lastOrbitX=event.clientX;lastOrbitY=event.clientY;
  orbitTravel+=Math.abs(dx)+Math.abs(dy);if(orbitTravel>5)orbitMoved=true;
  orbitYaw-=dx*.008;orbitPitch=THREE.MathUtils.clamp(orbitPitch+dy*.006,minimumOrbitPitch(),1.28);event.preventDefault();
});
const endOrbit=event=>{
  if(!orbiting)return;
  orbiting=false;renderer.domElement.classList.remove('is-orbiting');renderer.domElement.releasePointerCapture?.(event.pointerId);
  if(orbitMoved)return;
  const bounds=renderer.domElement.getBoundingClientRect();
  pointer.set((event.clientX-bounds.left)/bounds.width*2-1,-(event.clientY-bounds.top)/bounds.height*2+1);
  raycaster.setFromCamera(pointer,camera);
  if(raycaster.intersectObject(githubPlaque).length){window.open('https://github.com/tubban1/island','_blank','noopener,noreferrer');return;}
  if(raycaster.intersectObjects([harbourSign, signBoard]).length && game?.state.phase==='creator'){
    const editor = document.getElementById('gift-editor');
    if (editor && !editor.open) editor.showModal();
    return;
  }
  const hit=new THREE.Vector3();
  if(raycaster.ray.intersectPlane(waterPlane,hit) && ((hit.x-13.5)/(10.15*ISLAND_SCALE))**2+(hit.z/(7.65*ISLAND_SCALE))**2>1.05){schools.simulation.attract(hit.x,hit.z);surfaceRipple(hit.x,hit.z);}
};
renderer.domElement.addEventListener('pointerup',endOrbit);renderer.domElement.addEventListener('pointercancel',endOrbit);
renderer.domElement.addEventListener('pointermove',event=>{
  if(orbiting || game?.state.phase!=='creator')return;
  const bounds=renderer.domElement.getBoundingClientRect();
  pointer.set((event.clientX-bounds.left)/bounds.width*2-1,-(event.clientY-bounds.top)/bounds.height*2+1);
  raycaster.setFromCamera(pointer,camera);
  renderer.domElement.style.cursor=raycaster.intersectObjects([githubPlaque, harbourSign, signBoard]).length?'pointer':'';
});
renderer.domElement.addEventListener('wheel',event=>{if(!game)return;if(game.isRoom){game.zoomRoom(event.deltaY);event.preventDefault();return;}if(game.state.phase!=='creator')return;viewZoom=THREE.MathUtils.clamp(viewZoom-event.deltaY*.0012,.68,1.5);orbitPitch=Math.max(orbitPitch,minimumOrbitPitch());event.preventDefault();},{passive:false});
renderer.domElement.addEventListener('pointerdown',event=>{
 if(orbiting||game.isRoom)return;
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
const game=createGiftGame({scene,boat,keys,onIslandTitleChange:renderHarbourSign});
statusEl.textContent='小岛已准备好。';

clearInterval(progressInterval);
setLoadProgress(100, '小岛已准备好，欢迎登岛！');
if (loadingScreen) {
  setTimeout(() => {
    loadingScreen.classList.add('fade-out');
    setTimeout(() => {
      try { loadingScreen.remove(); } catch(e){}
    }, 700);
  }, 350);
}
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
function resetIslandView(){orbitYaw=Math.atan2(cameraOffset.x,cameraOffset.z);orbitPitch=Math.atan2(cameraOffset.y,Math.hypot(cameraOffset.x,cameraOffset.z));viewZoom=1;}
function cameraFollow(dt){
  const desired=game.focus;
  if(!cameraInitialized){followTarget.copy(desired);cameraInitialized=true;}
  followTarget.lerp(desired,1-Math.exp(-3.2*dt));
  const distance=cameraOffset.length();
  if(game.state.phase==='creator'){
    const horizontal=Math.cos(orbitPitch)*distance;
    camera.position.set(followTarget.x+Math.sin(orbitYaw)*horizontal,followTarget.y+Math.sin(orbitPitch)*distance,followTarget.z+Math.cos(orbitYaw)*horizontal);
  }else camera.position.copy(followTarget).add(cameraOffset);
  camera.lookAt(followTarget);
  camera.zoom=THREE.MathUtils.lerp(camera.zoom,game.zoom*(game.state.phase==='creator'?viewZoom:1),1-Math.exp(-4*dt));
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
 retreat.update(t);distantSails.update(t);waterMat.uniforms.uCam.value.copy(camera.position);beachLife.update(t);turtle.update(dt,t);mooredBoat.position.y=.13+Math.sin(t*1.8)*.018;mooredBoat.rotation.z=Math.sin(t*1.5)*.018;
  // 招牌微仰角正对俯视镜头、随海风轻微摆动动态、小信箱金旗微颤与复古壁灯呼吸微光
  const signWindX = -0.16 + Math.sin(t * 1.5) * 0.026 + Math.sin(t * 2.8) * 0.008;
  const signWindZ = Math.sin(t * 1.1) * 0.014;
  signBoardGroup.rotation.x = signWindX;
  signBoardGroup.rotation.z = signWindZ;
 mbFlag.rotation.z = Math.sin(t * 3.2) * 0.08 + Math.sin(t * 6.5) * 0.03;
 lanternGlass.material.emissiveIntensity = 0.42 + Math.sin(t * 2.8) * 0.12 + Math.sin(t * 7.7) * 0.04;

 schools.update(dt,t,boatMotion);fishRippleTimer-=dt;
 const startled=schools.simulation.fish.find(f=>f.mode==='flee');
 if(startled && fishRippleTimer<=0){surfaceRipple(startled.x,startled.z);fishRippleTimer=.7;}
 for(let i=ripples.length-1;i>=0;i--){const r=ripples[i];r.userData.life+=dt;const age=r.userData.life;r.scale.setScalar(.25+age*.65);r.material.opacity=.28*Math.max(0,1-age/2.5);if(age>2.5){scene.remove(r);r.material.dispose();ripples.splice(i,1);}}

 cameraFollow(fixedFrame===null?dt:1);if(game.isRoom){game.moveRoom(dt);game.renderRoom(renderer,t);}else {waterMat.uniforms.uCam.value.copy(camera.position);waterRefraction.render();composer.render();waterRefraction.finish();}
}
document.getElementById('island-view')?.addEventListener('click',resetIslandView);
function resize(){const a=innerWidth/innerHeight;camera.left=-ORTHO*a;camera.right=ORTHO*a;camera.top=ORTHO;camera.bottom=-ORTHO;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);composer.setSize(innerWidth,innerHeight);renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));}
addEventListener('resize',()=>{resize();if(fixedFrame!==null)tick();});resize();tick();
