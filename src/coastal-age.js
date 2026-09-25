// Physical surface relief, composed after the existing colour and water shaders.
// World-space grain remains continuous across batched meshes and needs no UVs.
const processed=new WeakSet();
export function addCoastalAge(material,kind){
 if(processed.has(material))return;processed.add(material);
 const previous=material.onBeforeCompile,key=material.customProgramCacheKey();
 material.onBeforeCompile=shader=>{
  previous(shader);
  shader.vertexShader='varying vec3 vAgeWorld;\n'+shader.vertexShader;
  shader.vertexShader=shader.vertexShader.replace('#include <project_vertex>',`vAgeWorld=(modelMatrix*vec4(transformed,1.)).xyz;\n#include <project_vertex>`);
  shader.fragmentShader=`varying vec3 vAgeWorld;
   float ageHash(vec3 p){return fract(sin(dot(p,vec3(127.1,311.7,74.7)))*43758.5453);}
   float ageNoise(vec3 p){vec3 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);
    return mix(mix(mix(ageHash(i),ageHash(i+vec3(1,0,0)),f.x),mix(ageHash(i+vec3(0,1,0)),ageHash(i+vec3(1,1,0)),f.x),f.y),mix(mix(ageHash(i+vec3(0,0,1)),ageHash(i+vec3(1,0,1)),f.x),mix(ageHash(i+vec3(0,1,1)),ageHash(i+vec3(1,1,1)),f.x),f.y),f.z);}
  `+shader.fragmentShader;
  shader.fragmentShader=shader.fragmentShader.replace('#include <normal_fragment_maps>',`#include <normal_fragment_maps>
   vec3 aged=vAgeWorld;
   ${kind==='floor'?`
    float relief=ageNoise(aged*vec3(2.5,3.,48.))*.0014;
   `:kind==='wood'?`
    float broad=ageNoise(aged*vec3(3.,.7,3.));
    float ageGrain=ageNoise(aged*vec3(44.,2.5,44.)+broad*2.);
    float cracks=smoothstep(.74,.90,ageNoise(aged*vec3(28.,1.4,28.)));
    float relief=ageGrain*.007-cracks*.012;
   `:kind==='fabric'?`
    float threadA=sin((aged.x+aged.z)*240.);
    float threadB=sin(aged.y*260.+aged.z*170.);
    float relief=threadA*threadB*.00075+ageNoise(aged*35.)*.001;
   `:kind==='stone'?`
    float relief=ageNoise(aged*7.)*.020+ageNoise(aged*42.)*.004;
   `:kind==='roof'?`
    float relief=ageNoise(aged*18.)*.009+ageNoise(aged*75.)*.002;
   `:`
    float relief=ageNoise(aged*32.)*.003+ageNoise(aged*110.)*.0008;
   `}
   vec3 dpdx=dFdx(-vViewPosition),dpdy=dFdy(-vViewPosition);
   vec3 r1=cross(dpdy,normal),r2=cross(normal,dpdx);
   float determinant=dot(dpdx,r1);
   normal=normalize(abs(determinant)*normal-sign(determinant)*(dFdx(relief)*r1+dFdy(relief)*r2));
  `);
  if(kind==='wood')shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
   float ageFibres=ageNoise(vAgeWorld*vec3(44.,2.5,44.));
   float ageFaded=ageNoise(vAgeWorld*2.);
   diffuseColor.rgb*=.93+.12*ageFibres;
   diffuseColor.rgb=mix(diffuseColor.rgb,diffuseColor.rgb*vec3(1.12,1.10,1.06),smoothstep(.5,.8,ageFaded)*.28);
  `);
 };
 material.customProgramCacheKey=()=>key+'-coastal-relief-v1-'+kind;
 material.roughness=kind==='wood'?.91:kind==='roof'?.94:1;
 material.needsUpdate=true;
}
export function ageCoastalObjects(world){
 world.traverse(o=>{
  if(!o.isMesh)return;
  for(const m of Array.isArray(o.material)?o.material:[o.material]){
   const name=m.name||'';
   const kind=m.userData.ageKind||(/wood|timber/i.test(name)?'wood':/rock|stone/i.test(name)?'stone':/roof/i.test(name)?'roof':/plaster/i.test(name)?'plaster':null);
   if(kind)addCoastalAge(m,kind);
  }
 });
}
