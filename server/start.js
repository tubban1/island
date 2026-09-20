import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {resolve,extname,sep} from 'node:path';
import {giftApi} from './gifts.js';
const root=resolve('dist'),api=giftApi();
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript','.css':'text/css','.glb':'model/gltf-binary','.png':'image/png','.jpg':'image/jpeg','.json':'application/json'};
createServer((req,res)=>api(req,res,async()=>{
 try{
  let path=decodeURIComponent(new URL(req.url,'http://localhost').pathname);if(path==='/')path='/index.html';
  const file=resolve(root,'.'+path);if(!file.startsWith(root+sep)){res.writeHead(403);res.end();return;}
  const data=await readFile(file);res.writeHead(200,{'Content-Type':types[extname(file)]||'application/octet-stream','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer'});res.end(data);
 }catch{res.writeHead(404);res.end('Not found');}
})).listen(Number(process.env.PORT)||5174,process.env.HOST||'127.0.0.1',()=>console.log('Gift island server ready'));
