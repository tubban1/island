import {addCoastalAge} from './coastal-age.js';
const treated=new WeakSet();

// Subtle surface wear in room coordinates, independent of imported model scale.
export function applyInteriorPatina(material,kind){
 if(treated.has(material))return;treated.add(material);
 const previous=material.onBeforeCompile,key=material.customProgramCacheKey();
 material.onBeforeCompile=shader=>{
  previous(shader);
  shader.vertexShader='varying vec3 vPatina;\n'+shader.vertexShader;
  if(kind==='paint'||kind==='furniture'){
   shader.vertexShader='attribute float wearEdge; varying float vWearEdge;\n'+shader.vertexShader;
   shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\n vWearEdge=wearEdge;');
   shader.fragmentShader='varying float vWearEdge;\n'+shader.fragmentShader;
  }
  shader.vertexShader=shader.vertexShader.replace('#include <project_vertex>',`vPatina=(modelMatrix*vec4(transformed,1.)).xyz;
   #include <project_vertex>`);
  shader.fragmentShader=`varying vec3 vPatina;
   float patinaHash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
   float patinaNoise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(patinaHash(i),patinaHash(i+vec2(1,0)),f.x),mix(patinaHash(i+vec2(0,1)),patinaHash(i+vec2(1,1)),f.x),f.y);}
  `+shader.fragmentShader;
  shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
   vec3 agedP=vPatina;
   ${kind==='wall'?`
    vec2 wallP=vec2(agedP.x+agedP.z,agedP.y);
    float clouds=patinaNoise(wallP*2.8)*.65+patinaNoise(wallP*12.)*.35;
    float base=1.-smoothstep(.25,1.8,agedP.y);
    float patches=smoothstep(.53,.77,clouds)*(.10+.23*base);
    diffuseColor.rgb=mix(diffuseColor.rgb,vec3(.55,.48,.37),patches);
    diffuseColor.rgb*=.97+.035*patinaNoise(wallP*65.);
   `:kind==='floor'?`
    float traffic=exp(-pow((agedP.x-.5)/1.65,2.));
    float rub=patinaNoise(agedP.xz*vec2(8.,1.8));
    diffuseColor.rgb=mix(diffuseColor.rgb,diffuseColor.rgb*1.19,traffic*(.2+.5*rub));
    float scratches=smoothstep(.70,.86,patinaNoise(agedP.xz*vec2(65.,4.)));
    diffuseColor.rgb*=1.-scratches*(.045+.10*traffic);
    float perimeter=smoothstep(4.6,6.6,abs(agedP.x));
    diffuseColor.rgb*=1.-perimeter*.09;
   `:kind==='paint'?`
    float chips=patinaNoise(agedP.xy*46.+agedP.z*9.);
    float exposed=smoothstep(.40,.79,chips)*vWearEdge*.84;
    diffuseColor.rgb=mix(diffuseColor.rgb,vec3(.48,.31,.15),exposed);
    float faded=patinaNoise(agedP.xy*3.7+agedP.z);
    diffuseColor.rgb=mix(diffuseColor.rgb,diffuseColor.rgb*1.18,faded*.30);
   `:kind==='furniture'?`
    float nicks=patinaNoise(agedP.xz*67.+agedP.y*31.);
    float edgeRub=vWearEdge*(.16+.32*smoothstep(.30,.78,nicks));
    diffuseColor.rgb=mix(diffuseColor.rgb,diffuseColor.rgb*vec3(1.35,1.27,1.16),edgeRub);
    float grainScuff=patinaNoise(vec2(agedP.x*53.+agedP.z*41.,agedP.y*5.));
    diffuseColor.rgb*=1.-vWearEdge*smoothstep(.79,.92,grainScuff)*.25;
   `:kind==='fabric'?`
    float sunFade=patinaNoise(agedP.xz*2.1+agedP.y*.5);
    diffuseColor.rgb=mix(diffuseColor.rgb,vec3(.83,.79,.68),smoothstep(.35,.85,sunFade)*.10);
    float weave=patinaNoise(vec2(agedP.x+agedP.z,agedP.y)*240.);
    diffuseColor.rgb*=.965+.055*weave;
   `:kind==='wicker'?`
    float strands=patinaNoise(agedP.xz*17.+agedP.y*8.);
    diffuseColor.rgb*=.87+.22*strands;
    diffuseColor.rgb=mix(diffuseColor.rgb,diffuseColor.rgb*1.15,smoothstep(.48,.83,patinaNoise(agedP.xz*3.))*.4);
   `:kind==='metal'?`
    float tarnish=smoothstep(.42,.75,patinaNoise(agedP.xy*22.+agedP.z*7.));
    diffuseColor.rgb=mix(diffuseColor.rgb,vec3(.16,.12,.065),tarnish*.28);
   `:`
    float rubbed=patinaNoise(agedP.xz*3.2+agedP.y*.7);
    float fibres=patinaNoise(vec2(agedP.x*39.+agedP.z*23.,agedP.y*3.));
    diffuseColor.rgb=mix(diffuseColor.rgb,diffuseColor.rgb*vec3(1.18,1.15,1.09),smoothstep(.46,.78,rubbed)*.48);
    diffuseColor.rgb*=1.-smoothstep(.76,.9,fibres)*.09;
   `}
  `);
 };
 material.customProgramCacheKey=()=>key+'-interior-patina-v2-'+kind;
 addCoastalAge(material,['fabric','wicker'].includes(kind)?'fabric':kind==='wall'?'plaster':kind==='floor'?'floor':kind==='metal'?'stone':'wood');
 material.needsUpdate=true;
}
