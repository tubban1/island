import * as THREE from 'three';

// Share the existing exterior scene and animation clock; no duplicated island.
export function createWindowView(exterior,{profile=false}={}){
 const width=480,height=320;
 const target=new THREE.WebGLRenderTarget(width,height,{type:THREE.HalfFloatType,depthBuffer:true,stencilBuffer:false,generateMipmaps:false});
 const camera=new THREE.PerspectiveCamera(58,width/height,.2,95);
 camera.position.set(10.6,5.0,8.6);camera.lookAt(4.5,-.3,19.5);
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
   try{renderer.shadowMap.autoUpdate=!hasFrame;renderer.setRenderTarget(target);renderer.render(exterior,camera);drawCalls=renderer.info.render.calls;triangles=renderer.info.render.triangles;}finally{if(query){gl.endQuery(extension.TIME_ELAPSED_EXT);queries.push(query);}renderer.setRenderTarget(previous);renderer.shadowMap.autoUpdate=shadows;}
   const elapsed=performance.now()-start;cpuMs=renders===0?elapsed:cpuMs*.9+elapsed*.1;renders++;hasFrame=true;last=time;return true;
  },
  dispose(){target.dispose();}
 };
}
