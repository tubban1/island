import * as THREE from 'three';

// Shared by foliage and the slower, slightly delayed hammock response.
const breezeTime = { value: 0 };
export function seaBreezeStrength(t) {
  return .58 + .24 * Math.sin(t * .31) + .18 * Math.sin(t * .17 + 1.4);
}
export function updateSeaBreeze(t) { breezeTime.value = t; }

const declarations = `
uniform float uSeaBreezeTime;
attribute vec4 palmRoot;
vec3 bendPalm(vec3 value, float ax, float az) {
  value.yz = mat2(cos(ax), sin(ax), -sin(ax), cos(ax)) * value.yz;
  value.xy = mat2(cos(az), sin(az), -sin(az), cos(az)) * value.xy;
  return value;
}
`;
const angles = `
vec3 palmOffset = position - palmRoot.xyz;
float palmWeight = pow(clamp(length(palmOffset.xz) / palmRoot.w, 0.0, 1.0), 1.35);
float palmTime = uSeaBreezeTime - palmRoot.x * .055 - palmRoot.z * .035;
float palmGust = .58 + .24 * sin(palmTime * .31) + .18 * sin(palmTime * .17 + 1.4);
float palmPhase = atan(palmOffset.z, palmOffset.x);
float palmBend = palmWeight * (.018 + palmGust * (.025 + .022 * sin(palmTime * 1.15 + palmPhase * .55)));
float palmFlutter = palmWeight * palmWeight * .006 * palmGust * sin(palmTime * 2.9 + palmPhase * 2.0 + length(palmOffset.xz) * 2.2);
float palmAX = palmBend * .65 + palmFlutter;
float palmAZ = -palmBend + palmFlutter * .4;
`;

/** Positions and crown centres share mesh-local coordinates, including baked crowns. */
export function applyPalmBreeze(mesh, crowns) {
  const positions = mesh.geometry.attributes.position;
  const roots = new Float32Array(positions.count * 4);
  for (let i = 0; i < positions.count; i++) {
    let nearest = crowns[0], distance = Infinity;
    for (const crown of crowns) {
      const d = (positions.getX(i) - crown[0]) ** 2 +
        (positions.getY(i) - crown[1]) ** 2 + (positions.getZ(i) - crown[2]) ** 2;
      if (d < distance) { distance = d; nearest = crown; }
    }
    roots.set(nearest, i * 4);
  }
  mesh.geometry.setAttribute('palmRoot', new THREE.BufferAttribute(roots, 4));
  function animate(material, normals) {
    const previous = material.onBeforeCompile;
    material.onBeforeCompile = function(shader, renderer) {
      previous.call(this, shader, renderer);
      shader.uniforms.uSeaBreezeTime = breezeTime;
      shader.vertexShader = declarations + shader.vertexShader;
      // Declare once before both normal and position chunks.
      shader.vertexShader = shader.vertexShader.replace('void main() {', 'void main() {\n' + angles);
      shader.vertexShader = shader.vertexShader.replace('#include <begin_vertex>',
        '#include <begin_vertex>\ntransformed = palmRoot.xyz + bendPalm(transformed - palmRoot.xyz, palmAX, palmAZ);');
      if (normals) shader.vertexShader = shader.vertexShader.replace('#include <beginnormal_vertex>',
        '#include <beginnormal_vertex>\nobjectNormal = bendPalm(objectNormal, palmAX, palmAZ);');
    };
    material.customProgramCacheKey = () => 'sea-breeze-palm-v1-' + normals;
    material.needsUpdate = true;
  }
  animate(mesh.material, true);
  mesh.customDepthMaterial = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking, side: THREE.DoubleSide });
  animate(mesh.customDepthMaterial, false);
  mesh.geometry.computeBoundingSphere();
  mesh.geometry.boundingSphere.radius += .35;
  return mesh;
}
