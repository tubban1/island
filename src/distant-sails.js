import * as THREE from 'three';

// Beyond the playable water bounds, small moving silhouettes provide scale.
export function createDistantSails(scene){
 const hullMaterial=new THREE.MeshStandardMaterial({color:'#799b9b',roughness:.85});
 const sailMaterial=new THREE.MeshStandardMaterial({color:'#d9e0cf',roughness:1,side:THREE.DoubleSide});
 const boats=[];
 for(const [x,z,scale]of [[-24,-39,.85],[42,-44,.6]]){
  const boat=new THREE.Group();boat.position.set(x,-.03,z);boat.scale.setScalar(scale);boat.rotation.y=.8;
  const hull=new THREE.Mesh(new THREE.SphereGeometry(1,12,6),hullMaterial);hull.scale.set(.30,.18,.94);boat.add(hull);
  const mast=new THREE.Mesh(new THREE.CylinderGeometry(.018,.022,2,5),hullMaterial);mast.position.y=1.05;boat.add(mast);
  for(const side of [-1,1]){
   const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute([0,.28,0,0,1.98,0,0,.32,side*.76],3));g.computeVertexNormals();
   const sail=new THREE.Mesh(g,sailMaterial);sail.rotation.y=side*.13;boat.add(sail);
  }
  scene.add(boat);boats.push({boat,x,z});
 }
 return {update(t){boats.forEach(({boat,x,z},i)=>{boat.position.x=x+Math.sin(t*.008+i)*3;boat.position.z=z+Math.sin(t*.006+i)*1.3;boat.rotation.z=Math.sin(t*.8+i)*.035;});}};
}
