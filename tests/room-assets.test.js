import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

for(const filename of ['loft-cabin','tiny-furnishings'])test(`${filename} keeps valid geometry and texture references after extraction`,()=>{
 const b=readFileSync(new URL(`../public/assets/${filename}.glb`,import.meta.url));
 assert.equal(b.readUInt32LE(0),0x46546c67);assert.equal(b.readUInt32LE(8),b.length);
 const j=JSON.parse(b.subarray(20,20+b.readUInt32LE(12)));
 for(const n of j.nodes)if(n.mesh!==undefined)assert.ok(j.meshes[n.mesh]);
 for(const m of j.meshes)for(const p of m.primitives){assert.ok(j.materials[p.material]);for(const id of Object.values(p.attributes))assert.ok(j.accessors[id]);if(p.indices!==undefined)assert.ok(j.accessors[p.indices]);}
 for(const m of j.materials)for(const obj of [m,m.pbrMetallicRoughness])for(const [key,value] of Object.entries(obj))if(key.endsWith('Texture'))assert.ok(j.textures[value.index],`${key} must refer to an existing texture`);
 for(const t of j.textures)assert.ok(j.images[t.source]);
 for(const a of j.accessors)assert.ok(j.bufferViews[a.bufferView]);
 for(const i of j.images)assert.ok(j.bufferViews[i.bufferView]);
 for(const v of j.bufferViews)assert.ok((v.byteOffset||0)+v.byteLength<=j.buffers[0].byteLength);
 assert.ok(b.length<10*1024*1024);
});
