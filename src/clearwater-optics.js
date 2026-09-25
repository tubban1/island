// Fresnel equation adapted from Clearwater, Copyright (c) 2026 Lumaris, MIT.
// https://github.com/Aureliengmz/clearwater — see public/licenses/clearwater-MIT.txt.
// Directional spectrum approximation replaces its FFT to fit the island renderer.
export const clearwaterOptics=/* glsl */`
float cwFresnel(float ci,float ior){
 ci=clamp(ci,0.,1.);float st2=(1.-ci*ci)/(ior*ior);
 float ct=sqrt(max(0.,1.-st2));
 float rs=(ci-ior*ct)/(ci+ior*ct),rp=(ior*ci-ct)/(ior*ci+ct);
 return .5*(rs*rs+rp*rp);
}
vec3 cwNormal(vec2 p,float time){
 vec2 slope=vec2(0.);
 for(int i=0;i<6;i++){
  float k=float(i),angle=.47+k*2.39996;
  vec2 direction=vec2(cos(angle),sin(angle));
  float frequency=.85*pow(1.67,k);
  slope+=direction*cos(dot(p,direction)*frequency-time*sqrt(9.81*frequency)+k*1.71)*(.045/(1.+k*.32));
 }
 return normalize(vec3(-slope.x,1.,-slope.y));
}
`;
