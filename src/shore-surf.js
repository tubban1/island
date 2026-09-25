import * as THREE from 'three';
import {surfRings as rings} from './coast-shape.js';

// Follow the generated sloping beach, including the expanded rear shoreline.
export function createShoreSurf(scene,time){
 const positions=[],uvs=[],indices=[],segments=rings[0].length,rows=16;
 let coastLength=0;const distances=[0];
 for(let i=1;i<=segments;i++){const a=rings[1][i-1],b=rings[1][i%segments];coastLength+=Math.hypot(b[0]-a[0],b[2]-a[2]);distances.push(coastLength);}
 for(let row=0;row<=rows;row++){
  const t=row/rows,band=t<.5?0:1,blend=t<.5?t*2:(t-.5)*2;
  for(let i=0;i<=segments;i++){
   const a=rings[band][i%segments],b=rings[band+1][i%segments];
   positions.push(THREE.MathUtils.lerp(a[0],b[0],blend),Math.max(-.155,THREE.MathUtils.lerp(a[1],b[1],blend)+.022),THREE.MathUtils.lerp(a[2],b[2],blend));
   uvs.push(distances[i],t);
   if(row<rows && i<segments){const k=row*(segments+1)+i;indices.push(k,k+1,k+segments+1,k+1,k+segments+2,k+segments+1);}
  }
 }
 const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geometry.setAttribute('uv',new THREE.Float32BufferAttribute(uvs,2));geometry.setIndex(indices);
 const material=new THREE.ShaderMaterial({uniforms:{uTime:time,uCoastLength:{value:coastLength}},transparent:true,depthWrite:false,side:THREE.DoubleSide,
 vertexShader:`varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
 fragmentShader:`varying vec2 vUv;uniform float uTime;uniform float uCoastLength;
 float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
 float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x),f.y);}
 void main(){
  float s=vUv.x,t=vUv.y;
  // A periodic coastal coordinate avoids a discontinuity where the mesh closes.
  float angle=s/uCoastLength*6.2831853;
  vec2 coast=vec2(cos(angle),sin(angle));
  float localPace=mix(.095,.145,noise(coast*2.3+4.1));
  float phaseOffset=noise(coast*3.6-8.4)*3.4;
  float foam=0.,wash=0.;
  for(int j=0;j<3;j++){
   float layer=float(j);
   float clock=uTime*localPace+phaseOffset+layer*.37;
   float eventId=floor(clock),age=fract(clock);
   // Every incoming set has its own reach, thickness and strength along the beach.
   float strength=noise(coast*4.7+vec2(eventId*2.17+layer*11.,eventId*.73));
   float surge=noise(coast*1.8+vec2(eventId*.37,layer*7.1));
   float reach=mix(.67,.29,strength)*mix(1.,.85,smoothstep(.67,.9,surge));
   float front=age<.43?mix(1.04,reach,smoothstep(.0,.43,age)):mix(reach,1.03,smoothstep(.43,1.,age));
   float irregular=(noise(coast*19.+vec2(uTime*.15,layer*5.))-.5)*.07;
   front+=irregular;
   float life=smoothstep(.0,.09,age)*(1.-smoothstep(.53,1.,age));
   float width=mix(.025,.052,strength);
   float edge=exp(-pow((t-front)/width,2.));
   float cells=abs(sin(s*5.4+sin(t*48.-uTime*.8))*sin(t*60.+sin(s*3.3+uTime*.4)));
   float lace=pow(1.-cells,8.);
   float behind=smoothstep(front-.005,front+.065,t)*(1.-smoothstep(front+.10,front+.26,t));
   float broken=mix(.32,1.,smoothstep(.27,.75,noise(coast*12.+vec2(eventId,layer*8.))));
   float amplitude=life*mix(.50,1.20,strength)*broken/(1.+layer*.28);
   float fragments=.35+.65*smoothstep(.22,.66,noise(vec2(s*3.7,t*53.)+vec2(uTime*.13,layer*9.)));
   foam+=(edge*(.52+.48*lace)*fragments+behind*lace*.48)*amplitude;
   wash+=behind*life*.055;
  }
  float fade=smoothstep(.08,.22,t)*(1.-smoothstep(.76,1.,t));
  // Only foam contributes tint: transparent gaps show the same ocean underneath.
  float alpha=(1.-exp(-foam*2.5))*fade;
  gl_FragColor=vec4(vec3(.97,.99,.95),alpha);
 }`});
 const surf=new THREE.Mesh(geometry,material);surf.renderOrder=3;scene.add(surf);return surf;
}
