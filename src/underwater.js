export function underwaterMaterials(time,coast){
 return material=>{
  // Blend the submerged beach skirt into the opaque sandy shelf below it.
  // The skirt ends at y=-.378; finish the fade before that geometric edge.
  if(['Warm lagoon sand','Submerged sand'].includes(material.name)){
   material.transparent=true;
   material.depthWrite=false;
  }
  material.onBeforeCompile=shader=>{
   shader.uniforms.uSeaTime=time;
   if(coast)shader.uniforms.uSandCoast=coast;
   shader.vertexShader='varying vec3 vSeaPosition;\nuniform float uSeaTime;\n'+shader.vertexShader;
   shader.vertexShader=shader.vertexShader.replace('#include <project_vertex>',`
    vec4 seaLocal=vec4(transformed,1.0);
    #ifdef USE_INSTANCING
     seaLocal=instanceMatrix*seaLocal;
    #endif
    vSeaPosition=(modelMatrix*seaLocal).xyz;
    float submerged=clamp((-.18-vSeaPosition.y)*.5,0.0,1.0);
    transformed.x+=sin(vSeaPosition.z*2.5+uSeaTime*.8)*.012*submerged;
    #include <project_vertex>
   `);
   shader.fragmentShader=(coast?'uniform sampler2D uSandCoast;\n':'')+'varying vec3 vSeaPosition;\nuniform float uSeaTime;\n'+shader.fragmentShader;
   shader.fragmentShader=shader.fragmentShader.replace('#include <opaque_fragment>',`
    float depth=max(0.0,-.18-vSeaPosition.y);
    if(depth>0.0){
     vec3 transmittance=exp(-depth*${material.name.startsWith('Reef rock')?'vec3(.20,.16,.13)':'vec3(.32,.17,.12)'});
     vec3 waterTint=${material.name.startsWith('Reef rock')?'vec3(.055,.12,.15)':'vec3(.012,.18,.22)'};
     float c=abs(sin(vSeaPosition.x*4.2+sin(vSeaPosition.z*3.1+uSeaTime*.5))*sin(vSeaPosition.z*4.0+cos(vSeaPosition.x*2.7-uSeaTime*.4)));
     float caustic=pow(1.0-c,18.0)*.18*exp(-depth*.5)*smoothstep(.0,.32,depth);
     ${['Submerged sand','Warm lagoon sand'].includes(material.name)?'outgoingLight*=mix(vec3(1.0),vec3(.63,.96,1.06),smoothstep(.30,2.4,depth));':''}
     outgoingLight=outgoingLight*transmittance+waterTint*(1.0-transmittance)+${material.name.startsWith('Reef rock')?'vec3(.62,.78,.76)':'vec3(.25,.8,.7)'}*caustic;
    }
    ${material.name==='Warm lagoon sand'?'diffuseColor.a*=smoothstep(-.365,.10,vSeaPosition.y);':''}
    ${material.name==='Submerged sand'&&coast?`
     float sandDistance=(texture2D(uSandCoast,(vSeaPosition.xz+55.)/140.).r-.5)*40.;
     float sandVariation=sin(vSeaPosition.x*.31+sin(vSeaPosition.z*.21))*.36+sin(vSeaPosition.z*.27)*.24;
     // Fade the actual shelf before its polygon edges can enter either render pass.
     float shelfFade=1.-smoothstep(.9,5.2,sandDistance+sandVariation);
     diffuseColor.a*=shelfFade;
    `:''}
    #include <opaque_fragment>
   `);
  };
  material.customProgramCacheKey=()=> 'underwater-depth-v5-'+material.name;material.needsUpdate=true;
 };
}
