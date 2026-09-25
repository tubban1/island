import * as THREE from 'three';
// Only submerged geometry enters this texture: no duplicated buildings in waves.
export function createWaterRefraction(renderer,scene,camera,ocean,uniforms,{width:fixedWidth,height:fixedHeight,everyFrame=false}={}){
 const target=new THREE.WebGLRenderTarget(1,1,{type:THREE.HalfFloatType,depthBuffer:true});
 target.texture.name='Submerged reef refraction';
 uniforms.uReefScene??={value:target.texture};uniforms.uReefMatrix??={value:new THREE.Matrix4()};uniforms.uReefReady??={value:0};
 const matrix=new THREE.Matrix4();let saved=null;
 const clip=new THREE.Plane(new THREE.Vector3(0,-1,0),-.18);
 let width=0,height=0,frame=0;
 const lastCamera=new THREE.Matrix4();
 return {render(){
  camera.updateMatrixWorld();
  saved={texture:uniforms.uReefScene.value,matrix:uniforms.uReefMatrix.value,ready:uniforms.uReefReady.value,eye:uniforms.uCam.value.clone()};
  uniforms.uReefScene.value=target.texture;uniforms.uReefMatrix.value=matrix;uniforms.uCam.value.copy(camera.position);
  const canvas=renderer.domElement,scale=Math.min(.65,960/canvas.width);
  const w=Math.max(1,fixedWidth??Math.round(canvas.width*scale)),h=Math.max(1,fixedHeight??Math.round(canvas.height*scale));
  if(w!==width||h!==height){target.setSize(w,h);width=w;height=h;}
  const moved=!lastCamera.equals(camera.matrixWorld);
  if(!everyFrame&&!moved&&frame++%2===1){uniforms.uReefReady.value=1;return;}
  lastCamera.copy(camera.matrixWorld);
  const previousTarget=renderer.getRenderTarget(),previousClip=renderer.clippingPlanes,background=scene.background,shadows=renderer.shadowMap.autoUpdate,tone=renderer.toneMapping;
  try{
   ocean.visible=false;renderer.clippingPlanes=[clip];scene.background=new THREE.Color('#075378');renderer.shadowMap.autoUpdate=false;renderer.toneMapping=THREE.NoToneMapping;
   renderer.setRenderTarget(target);renderer.clear();renderer.render(scene,camera);
   matrix.multiplyMatrices(camera.projectionMatrix,camera.matrixWorldInverse);
   uniforms.uReefReady.value=1;
  }finally{renderer.setRenderTarget(previousTarget);renderer.clippingPlanes=previousClip;renderer.shadowMap.autoUpdate=shadows;renderer.toneMapping=tone;scene.background=background;ocean.visible=true;}
 },finish(){if(saved){uniforms.uReefScene.value=saved.texture;uniforms.uReefMatrix.value=saved.matrix;uniforms.uReefReady.value=saved.ready;uniforms.uCam.value.copy(saved.eye);saved=null;}},dispose(){target.dispose();}};
}
