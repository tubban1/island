import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createServer} from 'node:http';
import {validateGift,DIFFICULTIES,START,ARRIVAL,nextCheckpoint,canLand} from '../src/gift-schema.js';
import {canMove,canSail} from '../src/navigation.js';
import {giftApi} from '../server/gifts.js';
const gift={title:'一座岛',recipient:'小满',sender:'阿屿',occasion:'纪念日',greeting:'等你来',letter:'我们的回忆 <script>不会执行</script>',difficulty:'easy',theme:'warm',photos:[]};
test('gift validation preserves Unicode, rejects malformed photos and duplicate slots',()=>{
 assert.equal(validateGift(gift).recipient,'小满');
 assert.throws(()=>validateGift({...gift,difficulty:'unknown'}));
 assert.throws(()=>validateGift({...gift,recipient:''}));
 assert.throws(()=>validateGift({...gift,photos:[{slot:0,caption:'hi',src:'javascript:alert(1)'}]}));
 const photo={slot:0,caption:'我们的海',src:'data:image/jpeg;base64,/9j/2Q=='};
 assert.equal(validateGift({...gift,photos:[photo]}).photos[0].caption,'我们的海');
 assert.throws(()=>validateGift({...gift,photos:[photo,photo]}));
 const ext=validateGift({...gift,anniversaryDate:'2024-05-20',ambient:['waves','invalid','breeze'],paperStyle:'watercolor',reply:{content:'回信内容',sender:'TA'}});
 assert.equal(ext.anniversaryDate,'2024-05-20');
 assert.deepEqual(ext.ambient,['waves','breeze']);
 assert.equal(ext.paperStyle,'watercolor');
 assert.equal(ext.reply.content,'回信内容');
});
test('each difficulty has a navigable route from mainland to berth',()=>{
 assert.ok(canSail(START.x,START.z));assert.ok(canSail(ARRIVAL.x,ARRIVAL.z));
 for(const [difficulty,config] of Object.entries(DIFFICULTIES)){
  let from=START;const state={phase:'sailing',difficulty,checkpoint:0};
  assert.equal(canLand(state,ARRIVAL),false);
  for(const [x,z] of config.checkpoints){const to={x,z};assert.ok(canMove(from,to),`${difficulty}: clear leg to ${x},${z}`);state.checkpoint=nextCheckpoint(state,to);from=to;}
  assert.ok(canMove(from,ARRIVAL));assert.ok(canLand(state,ARRIVAL));assert.equal(canLand({...state,phase:'creator'},ARRIVAL),false);
 }
});
test('API saves immutable independent gifts and reads them after handler restart',async()=>{
 const directory=await mkdtemp(join(tmpdir(),'island-gift-test-'));
 let handler=giftApi({directory});
 const server=createServer((req,res)=>handler(req,res,()=>{res.writeHead(404);res.end();}));
 try{
  await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve);});
  const base=`http://127.0.0.1:${server.address().port}/api/gifts`;
  const post=async data=>fetch(base,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)});
  const a=await post(gift);assert.equal(a.status,201);const {id}=await a.json();assert.match(id,/^[A-Za-z0-9_-]{32}$/);
  const b=await post({...gift,recipient:'朋友 B'});assert.notEqual((await b.json()).id,id);
  handler=giftApi({directory});const read=await fetch(base+'/'+id);assert.equal(read.headers.get('cache-control'),'no-store');assert.equal((await read.json()).recipient,'小满');

  // 测试受礼者漂流瓶回信接口
  const replyRes=await fetch(`${base}?action=reply&id=${id}`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({reply:{content:'回信：收到海风的信了！',sender:'小满'}})});
  assert.equal(replyRes.status,200);
  const updatedGift=await (await fetch(base+'/'+id)).json();
  assert.equal(updatedGift.reply?.content,'回信：收到海风的信了！');

  assert.equal((await post({...gift,photos:[{src:'bad'}]})).status,400);
  assert.equal((await fetch(base+'/aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa')).status,404);
  assert.equal((await fetch(base+'/'+id,{method:'DELETE'})).status,404);
 }finally{server.closeAllConnections();await new Promise(resolve=>server.close(resolve));await rm(directory,{recursive:true,force:true});}
});
