import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {execFileSync} from 'node:child_process';

// Preserve the supplied originals; ship only the furnishings used by the cabin.
const jobs=[
 ['tiny_isometric_room','tiny-furnishings',name=>!/^room_|^ray_|^shutter_|^window_|^laptop_|^sock_|^shoe_|^photos_/.test(name)],
 ['loft_interior_6_for_free','loft-cabin',name=>/^Plane_Material\.002|^Cube\.00[56]_|^node_0\.00[45]_/.test(name)]
];
for(const [source,target,keep] of jobs){
 const original=fs.readFileSync(`public/assets/${source}.glb`);
 const length=original.readUInt32LE(12),g=JSON.parse(original.subarray(20,20+length));
 const bin=original.subarray(28+length);
 const meshIds=new Set();for(const n of g.nodes)if(n.mesh!==undefined){if(keep(n.name))meshIds.add(n.mesh);else delete n.mesh;}
 const meshMap=new Map([...meshIds].map((id,i)=>[id,i]));
 g.meshes=[...meshIds].map(id=>g.meshes[id]);for(const n of g.nodes)if(n.mesh!==undefined)n.mesh=meshMap.get(n.mesh);
 const accessorIds=new Set();for(const m of g.meshes)for(const p of m.primitives){Object.values(p.attributes).forEach(id=>accessorIds.add(id));if(p.indices!==undefined)accessorIds.add(p.indices);}
 const accessorMap=new Map([...accessorIds].map((id,i)=>[id,i]));g.accessors=[...accessorIds].map(id=>g.accessors[id]);
 for(const m of g.meshes)for(const p of m.primitives){for(const key of Object.keys(p.attributes))p.attributes[key]=accessorMap.get(p.attributes[key]);if(p.indices!==undefined)p.indices=accessorMap.get(p.indices);}
 const materialIds=[...new Set(g.meshes.flatMap(m=>m.primitives.map(p=>p.material)))];
 const materialMap=new Map(materialIds.map((id,i)=>[id,i]));g.materials=materialIds.map(id=>g.materials[id]);
 for(const m of g.meshes)for(const p of m.primitives)p.material=materialMap.get(p.material);
 const textureIds=new Set();
 for(const m of g.materials){
  if(source.startsWith('tiny')&&m.emissiveTexture){
   m.emissiveFactor=[.40,.40,.40];
  }else {delete m.emissiveTexture;m.emissiveFactor=[0,0,0];}
  delete m.extensions;
  m.pbrMetallicRoughness.metallicFactor=0;m.pbrMetallicRoughness.roughnessFactor=.88;
  for(const o of [m,m.pbrMetallicRoughness])for(const [key,v] of Object.entries(o))if(key.endsWith('Texture'))textureIds.add(v.index);
 }
 const textureMap=new Map([...textureIds].map((id,i)=>[id,i]));
 g.textures=[...textureIds].map(id=>g.textures[id]);
 for(const m of g.materials)for(const o of [m,m.pbrMetallicRoughness])for(const [key,v] of Object.entries(o))if(key.endsWith('Texture'))v.index=textureMap.get(v.index);
 const imageIds=[...new Set(g.textures.map(t=>t.source))],imageMap=new Map(imageIds.map((id,i)=>[id,i]));
 const oldImages=g.images;g.images=imageIds.map(id=>oldImages[id]);for(const t of g.textures)t.source=imageMap.get(t.source);
 const alphaImages=new Set(g.materials.filter(m=>m.alphaMode==='BLEND').map(m=>g.textures[m.pbrMetallicRoughness.baseColorTexture?.index]?.source));
 const allImageViews=new Set(oldImages.map(i=>i.bufferView));const neededViews=new Set(g.images.map(i=>i.bufferView));
 const geometryViews=new Set(g.accessors.map(a=>a.bufferView));
 const temporary=fs.mkdtempSync(path.join(os.tmpdir(),'island-textures-'));
 const chunks=[],views=[],viewMap=new Map();let offset=0;
 for(let i=0;i<g.bufferViews.length;i++){
  if(allImageViews.has(i)&&!neededViews.has(i))continue;
  if(!neededViews.has(i)&&!geometryViews.has(i))continue;
  const view=g.bufferViews[i];let data=bin.subarray(view.byteOffset||0,(view.byteOffset||0)+view.byteLength);
  if(neededViews.has(i)){
   const img=g.images.find(v=>v.bufferView===i),file=path.join(temporary,`${i}.${img.mimeType==='image/png'?'png':'jpg'}`);
   fs.writeFileSync(file,data);
   const alpha=alphaImages.has(g.images.indexOf(img));
   const output=path.join(temporary,`${i}-small.${alpha?'png':'jpg'}`);
   execFileSync('sips',['-Z',alpha?'1536':'1024','-s','format',alpha?'png':'jpeg',...(!alpha?['-s','formatOptions','78']:[]),file,'--out',output],{stdio:'ignore'});
   img.mimeType=alpha?'image/png':'image/jpeg';data=fs.readFileSync(output);
  }
  viewMap.set(i,views.length);views.push({...view,buffer:0,byteOffset:offset,byteLength:data.length});chunks.push(data);
  const pad=(4-data.length%4)%4;if(pad)chunks.push(Buffer.alloc(pad));offset+=data.length+pad;
 }
 for(const a of g.accessors){if(a.bufferView!==undefined)a.bufferView=viewMap.get(a.bufferView);if(a.sparse){a.sparse.indices.bufferView=viewMap.get(a.sparse.indices.bufferView);a.sparse.values.bufferView=viewMap.get(a.sparse.values.bufferView);}}
 for(const i of g.images)i.bufferView=viewMap.get(i.bufferView);
 g.bufferViews=views;g.buffers=[{byteLength:offset}];delete g.extensionsRequired;delete g.extensionsUsed;
 const json=Buffer.from(JSON.stringify(g)),padding=Buffer.alloc((4-json.length%4)%4,32),j=Buffer.concat([json,padding]),binary=Buffer.concat(chunks);
 const header=Buffer.alloc(20);header.writeUInt32LE(0x46546c67,0);header.writeUInt32LE(2,4);header.writeUInt32LE(28+j.length+binary.length,8);header.writeUInt32LE(j.length,12);header.writeUInt32LE(0x4e4f534a,16);
 const bh=Buffer.alloc(8);bh.writeUInt32LE(binary.length,0);bh.writeUInt32LE(0x004e4942,4);
 fs.writeFileSync(`public/assets/${target}.glb`,Buffer.concat([header,j,bh,binary]));
 console.log(`${target}: ${(original.length/1048576).toFixed(1)} MB → ${((28+j.length+binary.length)/1048576).toFixed(1)} MB`);
}
