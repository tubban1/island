import * as THREE from 'three';
import {shoreline} from './coast-shape.js';

// Signed distance to the same coast used by boat navigation. Bake once, sample
// once per water pixel; no polygon loop is needed in the ocean fragment shader.
export function createCoastalField(){
 const size=256,data=new Uint8Array(size*size*4);
 for(let y=0;y<size;y++)for(let x=0;x<size;x++){
  const px=-55+(x+.5)/size*140,pz=-55+(y+.5)/size*140;
  let inside=false,distance=100;
  for(let i=0,j=shoreline.length-1;i<shoreline.length;j=i++){
   const [ax,az]=shoreline[j],[bx,bz]=shoreline[i],dx=bx-ax,dz=bz-az;
   const t=THREE.MathUtils.clamp(((px-ax)*dx+(pz-az)*dz)/(dx*dx+dz*dz),0,1);
   distance=Math.min(distance,Math.hypot(px-ax-t*dx,pz-az-t*dz));
   if((az>pz)!==(bz>pz)&&px<(bx-ax)*(pz-az)/(bz-az)+ax)inside=!inside;
  }
  const v=Math.round(THREE.MathUtils.clamp(.5+(inside?-distance:distance)/40,0,1)*255),k=(y*size+x)*4;
  data[k]=data[k+1]=data[k+2]=v;data[k+3]=255;
 }
 const texture=new THREE.DataTexture(data,size,size);texture.minFilter=texture.magFilter=THREE.LinearFilter;texture.needsUpdate=true;return texture;
}
