import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createWaterRefraction} from '../src/water-refraction.js';
const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(),ocean={visible:true};
camera.position.set(3,2,7);
const previousTexture={},previousMatrix=new THREE.Matrix4();
const uniforms={uCam:{value:new THREE.Vector3(8,9,10)},uReefScene:{value:previousTexture},uReefMatrix:{value:previousMatrix},uReefReady:{value:0}};
const initialClip=[],initialTarget={};let target=initialTarget,renders=0,fail=false;
const renderer={domElement:{width:1200,height:700},clippingPlanes:initialClip,shadowMap:{autoUpdate:true},toneMapping:THREE.ACESFilmicToneMapping,getRenderTarget:()=>target,setRenderTarget:t=>{target=t;},clear(){},render(){assert.equal(ocean.visible,false);renders++;if(fail)throw Error('render failure');}};
const pass=createWaterRefraction(renderer,scene,camera,ocean,uniforms,{width:640,height:256,everyFrame:true});
pass.render();assert.notEqual(uniforms.uReefScene.value,previousTexture);assert.equal(uniforms.uReefScene.value.image.width,640);assert.deepEqual(uniforms.uCam.value.toArray(),[3,2,7]);assert.equal(target,initialTarget);assert.equal(renderer.clippingPlanes,initialClip);assert.equal(ocean.visible,true);
pass.finish();assert.equal(uniforms.uReefScene.value,previousTexture);assert.equal(uniforms.uReefMatrix.value,previousMatrix);assert.deepEqual(uniforms.uCam.value.toArray(),[8,9,10]);assert.equal(uniforms.uReefReady.value,0);
fail=true;try{assert.throws(()=>pass.render(),/render failure/);}finally{pass.finish();}
assert.equal(ocean.visible,true);assert.equal(target,initialTarget);assert.equal(renderer.clippingPlanes,initialClip);assert.equal(renderer.shadowMap.autoUpdate,true);assert.equal(renderer.toneMapping,THREE.ACESFilmicToneMapping);assert.equal(uniforms.uReefScene.value,previousTexture);pass.dispose();
console.log('Passed: independent window refraction, resolution, camera uniforms and render state restoration, including failure path.');
