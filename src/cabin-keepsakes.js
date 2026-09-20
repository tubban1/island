import * as THREE from 'three';

export function createKeepsakes(parent,palette){
 const targets=[];
 function mesh(geometry,material,x,y,z,container=parent){
   const o=new THREE.Mesh(geometry,material);
   o.position.set(x,y,z);
   o.castShadow=o.receiveShadow=true;
   container.add(o);
   return o;
 }

 // 🎵 精致复古机械八音盒（稳稳置于茶几右侧台面）
 const base=new THREE.Group();
 base.position.set(-3.45,.585,-1.35);
 base.scale.set(0.42, 0.42, 0.42);
 base.rotation.y=-0.2;
 parent.add(base);

 mesh(new THREE.BoxGeometry(.62,.035,.44),palette.teakDark,0,.018,0,base);
 for(const x of [-.29,.29])mesh(new THREE.BoxGeometry(.04,.30,.44),palette.teakDark,x,.15,0,base);
 for(const z of [-.20,.20])mesh(new THREE.BoxGeometry(.58,.30,.04),palette.teakDark,0,.15,z,base);
 mesh(new THREE.BoxGeometry(.55,.018,.37),palette.brass,0,.15,0,base);

 const cylinder=mesh(new THREE.CylinderGeometry(.062,.062,.27,20),palette.brass,-.08,.22,0,base);
 cylinder.rotation.z=Math.PI/2;
 for(let i=0;i<15;i++)mesh(new THREE.BoxGeometry(.012,.015,.15-i*.003),palette.brass,-.17+i*.018,.178,.12,base);

 const gear=mesh(new THREE.TorusGeometry(.078,.010,6,20),palette.brass,.21,.19,0,base);
 gear.rotation.x=Math.PI/2;
 for(let i=0;i<10;i++){
   const a=i*Math.PI/5;
   mesh(new THREE.BoxGeometry(.018,.018,.025),palette.brass,.21+Math.cos(a)*.077,.19,Math.sin(a)*.077,base);
 }

 const lid=new THREE.Group();
 lid.position.set(0,.31,-.22);
 base.add(lid);
 mesh(new THREE.BoxGeometry(.64,.035,.45),palette.teak,0,.018,.225,lid);
 const inlay=mesh(new THREE.TorusGeometry(.10,.006,6,32),palette.brass,0,.041,.225,lid);
 inlay.rotation.x=Math.PI/2;

 const hotspot=mesh(
   new THREE.BoxGeometry(.72,.42,.54),
   new THREE.MeshBasicMaterial({transparent:true,opacity:0,depthWrite:false,side:THREE.DoubleSide}),
   0,.20,0,base
 );
 hotspot.userData={action:'musicbox',title:'打开机械八音盒'};
 targets.push(hotspot);

 const winding=mesh(new THREE.TorusGeometry(.038,.008,6,16),palette.brass,.35,.09,0,base);
 winding.rotation.y=Math.PI/2;

 let playing=false,angle=0;
 return {
   targets,
   toggle(){playing=!playing;return playing;},
   get playing(){return playing;},
   stop(){playing=false;},
   update(time){
     angle+=((playing?-1.65:0)-angle)*.10;
     lid.rotation.x=angle;
     if(playing){
       cylinder.rotation.x=time*1.6;
       winding.rotation.x=time*2.5;
     }
   }
 };
}
