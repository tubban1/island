import * as THREE from 'three';

// Low-contrast, deterministic grain: washed timber, worn fibres and small knots.
export function createWeatheredWood(){
 const canvas=document.createElement('canvas');canvas.width=512;canvas.height=1024;
 const ctx=canvas.getContext('2d');let seed=137;
 const random=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
 ctx.fillStyle='#baa78a';ctx.fillRect(0,0,512,1024);
 for(let i=0;i<1500;i++){
  const x=random()*512,width=.25+random()*1.8;
  ctx.strokeStyle=i%5===0?`rgba(248,240,211,${.05+random()*.14})`:`rgba(71,59,43,${.02+random()*.09})`;
  ctx.lineWidth=width;ctx.beginPath();
  for(let y=0;y<=1024;y+=12){const drift=Math.sin(y*.009+x*.07)*3+Math.sin(y*.027+x)*1.3;const xx=x+drift;y?ctx.lineTo(xx,y):ctx.moveTo(xx,y);}
  ctx.stroke();
 }
 for(const [x,y] of [[110,310],[360,760]])for(let r=3;r<28;r+=3){ctx.strokeStyle=`rgba(84,67,47,${.13-r*.003})`;ctx.lineWidth=.7;ctx.beginPath();ctx.ellipse(x,y,r*.43,r*2,0,0,Math.PI*2);ctx.stroke();}
 for(let i=0;i<180;i++){const x=random()*512,y=random()*1024;ctx.fillStyle=i%3?'#f5eed51a':'#44382928';ctx.fillRect(x,y,.4+random(),3+random()*55);}
 const color=new THREE.CanvasTexture(canvas);color.colorSpace=THREE.SRGBColorSpace;color.wrapS=color.wrapT=THREE.RepeatWrapping;color.anisotropy=4;
 const relief=color.clone();relief.colorSpace=THREE.NoColorSpace;relief.needsUpdate=true;
 return {map:color,bumpMap:relief,bumpScale:.008,roughnessMap:null,roughness:1,metalness:0};
}
