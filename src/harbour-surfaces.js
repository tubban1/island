// World-space detail stays consistent across the merged island meshes.
// Compose with the underwater shader so water absorption remains the final layer.
export function refineHarbourSurface(material) {
 const name=material.name;
 const wood=/wood/i.test(name), stone=/rock/i.test(name);
 const sand=/sand/i.test(name), plaster=/plaster/i.test(name), roof=/roof/i.test(name);
 const leaf=/Palm (leaf|lime|dark)/.test(name);
 if(!wood&&!stone&&!sand&&!plaster&&!roof&&!leaf)return;
 if(plaster){
  material.color.set('#fffef9');
  // A little warm diffuse bounce lifts shaded limewash without hiding its relief.
  material.emissive.set('#fff0d6');material.emissiveIntensity=.10;
 }
 material.roughness=wood?.88:stone?.96:roof?.91:leaf?.78:1;
 const previous=material.onBeforeCompile, cacheKey=material.customProgramCacheKey();
 material.onBeforeCompile=shader=>{
  previous(shader);
  shader.fragmentShader=`
   float surfaceHash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
   float surfaceNoise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(surfaceHash(i),surfaceHash(i+vec2(1,0)),f.x),mix(surfaceHash(i+vec2(0,1)),surfaceHash(i+vec2(1,1)),f.x),f.y);}
  `+shader.fragmentShader;
  shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
   vec3 sp=vSeaPosition;
   float mottling=surfaceNoise(sp.xz*3.7+sp.y*.83);
   ${wood?`
    float grain=surfaceNoise(vec2(sp.x*2.+sp.y*.7,sp.z*38.+sin(sp.x*2.4)*1.8));
    float wear=surfaceNoise(sp.xz*.8+sp.y);
    diffuseColor.rgb*=.86+.20*grain+.08*wear;
    float faded=smoothstep(.48,.82,wear)*.20;
    diffuseColor.rgb=mix(diffuseColor.rgb,diffuseColor.rgb*vec3(1.15,1.12,1.06),faded);
    float wetWood=1.-smoothstep(-.24,.18+ .035*sin(sp.x*7.+sp.z*5.),sp.y);
    diffuseColor.rgb*=mix(vec3(1.),vec3(.66,.72,.70),wetWood);
    // Foot traffic wears the porch between the doorway and front steps.
    float porch=smoothstep(.76,.86,sp.y)*(1.-smoothstep(.96,1.08,sp.y))
      *smoothstep(.95,1.25,sp.z)*(1.-smoothstep(3.10,3.38,sp.z));
    float track=1.-smoothstep(.30,1.05,abs(sp.x-15.05)+.12*sin(sp.z*5.));
    float rubbed=surfaceNoise(sp.xz*vec2(13.,3.));
    float scuff=smoothstep(.66,.84,surfaceNoise(sp.xz*vec2(48.,5.)))
      *(1.-smoothstep(.0,.07,abs(sin(sp.z*33.+sp.x*1.8))));
    float wearMask=porch*track;
    diffuseColor.rgb=mix(diffuseColor.rgb,vec3(.58,.44,.29),wearMask*(.17+.21*rubbed));
    diffuseColor.rgb+=vec3(.12,.105,.075)*scuff*wearMask;
   `:''}
   ${stone?`
    float mineral=surfaceNoise(sp.xz*14.+sp.y*6.);
    diffuseColor.rgb*=.82+.23*mottling+.08*mineral;
    diffuseColor.rgb=mix(diffuseColor.rgb,diffuseColor.rgb*vec3(.80,.84,.85),1.-smoothstep(-.30,.12,sp.y));
   `:''}
   ${sand?`
    float wet=1.-smoothstep(-.26,.30+(mottling-.5)*.10,sp.y);
    diffuseColor.rgb*=mix(vec3(1.),vec3(.87,.89,.88),wet);
    diffuseColor.rgb*=.97+.045*mottling;
    float sandRidges=sin(sp.x*15.+sp.z*5.+surfaceNoise(sp.xz*.9)*5.);
    diffuseColor.rgb*=1.+sandRidges*.028*(1.-smoothstep(-.1,.22,sp.y));
   `:''}
   ${plaster?`
    // Open side-wall apertures align with the exterior casement geometry.
    float sideWall=min(abs(sp.x-11.9),abs(sp.x-17.7));
    if(sideWall<.025 && abs(sp.z+1.45)<.60 && abs(sp.y-2.45)<.62)discard;
    // Clean sun-bleached limewash: age appears as a few pale chips, not dirt.
    diffuseColor.rgb*=.985+.025*mottling;
    vec2 wallUV=vec2(sp.x+sp.z*.83,sp.y);
    float weather=surfaceNoise(wallUV*15.3);
    float baseEdge=1.-smoothstep(.96,1.16,sp.y);
    float cornerX=min(abs(sp.x-11.9),abs(sp.x-17.7));
    float cornerZ=min(abs(sp.z+3.77),abs(sp.z-1.0));
    float corner=1.-smoothstep(.04,.20,max(cornerX,cornerZ));
    float windowEdge=(1.-smoothstep(.03,.13,abs(max(abs(sp.z+1.45)/.67,abs(sp.y-2.45)/.70)-1.)))
      *(1.-smoothstep(.025,.08,sideWall));
    float chips=smoothstep(.70,.85,weather)*max(max(baseEdge*.28,corner*.35),windowEdge*.32);
    float chalk=surfaceNoise(wallUV*2.1);
    diffuseColor.rgb=mix(diffuseColor.rgb,vec3(.95,.90,.80),smoothstep(.48,.8,chalk)*.07);
    diffuseColor.rgb=mix(diffuseColor.rgb,vec3(.78,.71,.60),chips);
    float pores=smoothstep(.82,.94,surfaceNoise(wallUV*85.));
    diffuseColor.rgb*=1.-pores*.022;`:''}
   ${roof?'diffuseColor.rgb*=.89+.15*mottling;':''}
   ${leaf?'diffuseColor.rgb*=mix(vec3(.86,.92,.84),vec3(1.06,1.03,.91),mottling);':''}
  `);
  if(sand)shader.fragmentShader=shader.fragmentShader.replace('#include <roughnessmap_fragment>',`#include <roughnessmap_fragment>
   float damp=1.-smoothstep(-.15,.26+(surfaceNoise(vSeaPosition.xz*3.)-.5)*.08,vSeaPosition.y);
   roughnessFactor=mix(roughnessFactor,.32,damp*.82);
  `);
 };
 material.customProgramCacheKey=()=>cacheKey+'-harbour-surface-v6';
 material.needsUpdate=true;
}
