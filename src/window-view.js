import * as THREE from 'three';
import {createWaterRefraction} from './water-refraction.js';

// Share the existing exterior scene and animation clock; no duplicated island.
export function createWindowView(exterior,{profile=false}={}){
 const width=960,height=384;
 const target=new THREE.WebGLRenderTarget(width,height,{type:THREE.HalfFloatType,depthBuffer:true,stencilBuffer:false,generateMipmaps:false});
 const camera=new THREE.PerspectiveCamera(58,width/height,.15,2400);
 // Stand just outside the cabin: beach below, open water ahead, horizon above.
 camera.position.set(18.8,1.4,5.8);camera.lookAt(40,-12,95);
 camera.layers.enable(1);
 const distanceScenery=new THREE.Group();exterior.add(distanceScenery);
 const sky=new THREE.Mesh(new THREE.SphereGeometry(1800,24,16),new THREE.ShaderMaterial({
  side:THREE.BackSide,depthWrite:false,
  vertexShader:'varying vec3 direction;void main(){direction=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
  fragmentShader:'varying vec3 direction;void main(){float h=normalize(direction).y;vec3 c=mix(vec3(.78,.88,.93),vec3(.18,.48,.70),smoothstep(0.,.36,h));gl_FragColor=vec4(c,1.);}'
 }));sky.layers.set(1);distanceScenery.add(sky);
 // Extend the sea beyond the island's detailed water plane. The near edge lies
 // below that plane; haze gently joins distant water to the sky.
 const farSea=new THREE.Mesh(new THREE.PlaneGeometry(3600,3600),new THREE.ShaderMaterial({
  vertexShader:'varying vec3 world;void main(){vec4 p=modelMatrix*vec4(position,1.);world=p.xyz;gl_Position=projectionMatrix*viewMatrix*p;}',
  fragmentShader:'varying vec3 world;void main(){float d=length(world.xz-cameraPosition.xz);vec3 c=mix(vec3(.025,.30,.46),vec3(.72,.86,.89),smoothstep(100.,1400.,d));gl_FragColor=vec4(c,1.);}'
 }));farSea.rotation.x=-Math.PI/2;farSea.position.y=-.195;farSea.layers.set(1);distanceScenery.add(farSea);
 let refraction=null;
 let last=-Infinity,enabled=true,hasFrame=false,cpuMs=0,renders=0,gpuMs=null,drawCalls=0,triangles=0,extension,queries=[];
 return {
  texture:target.texture,width,height,
  get enabled(){return enabled;},get renders(){return renders;},get cpuMs(){return cpuMs;},get gpuMs(){return gpuMs;},get drawCalls(){return drawCalls;},get triangles(){return triangles;},
  setEnabled(value){enabled=value;},
  render(renderer,time){
   if(hasFrame&&(!enabled||time-last<1/8))return false;
   const gl=renderer.getContext();if(extension===undefined)extension=profile?gl.getExtension('EXT_disjoint_timer_query_webgl2'):null;
   if(extension){const disjoint=gl.getParameter(extension.GPU_DISJOINT_EXT);queries=queries.filter(query=>{if(disjoint||gl.getQueryParameter(query,gl.QUERY_RESULT_AVAILABLE)){if(!disjoint){const ms=gl.getQueryParameter(query,gl.QUERY_RESULT)/1e6;gpuMs=gpuMs===null?ms:gpuMs*.8+ms*.2;}gl.deleteQuery(query);return false;}return true;});}
   const query=extension&&queries.length<3?gl.createQuery():null;
   const start=performance.now(),previous=renderer.getRenderTarget(),shadows=renderer.shadowMap.autoUpdate;
   if(query)gl.beginQuery(extension.TIME_ELAPSED_EXT,query);
   // Reuse the last exterior shadow map instead of redrawing it for the window.
   try{
    const optics=exterior.userData.waterOptics;
    if(optics&&!refraction)refraction=createWaterRefraction(renderer,exterior,camera,optics.ocean,optics.uniforms,{width:640,height:256,everyFrame:true});
    refraction?.render();
    renderer.shadowMap.autoUpdate=!hasFrame;renderer.setRenderTarget(target);renderer.render(exterior,camera);drawCalls=renderer.info.render.calls;triangles=renderer.info.render.triangles;}finally{refraction?.finish();if(query){gl.endQuery(extension.TIME_ELAPSED_EXT);queries.push(query);}renderer.setRenderTarget(previous);renderer.shadowMap.autoUpdate=shadows;}
   const elapsed=performance.now()-start;cpuMs=renders===0?elapsed:cpuMs*.9+elapsed*.1;renders++;hasFrame=true;last=time;return true;
  },
  dispose(){refraction?.dispose();target.dispose();exterior.remove(distanceScenery);for(const mesh of [sky,farSea]){mesh.geometry.dispose();mesh.material.dispose();}}
 };
}
