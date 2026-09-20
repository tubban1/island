import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {randomBytes} from 'node:crypto';
import {resolve} from 'node:path';
import {validateGift} from '../src/gift-schema.js';
const LIMIT=6*1024*1024;
export function giftApi({directory=process.env.GIFT_DATA_DIR||resolve('.gift-data')}={}){
 return async(req,res,next)=>{
   const url=new URL(req.url,'http://localhost');
   const path=url.pathname;
   const action=url.searchParams.get('action');
   const queryId=url.searchParams.get('id');
   if(!path.startsWith('/api/gifts'))return next();
   const reply=(status,body)=>{res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(JSON.stringify(body));};
   try{
    const match=path.match(/^\/api\/gifts\/([A-Za-z0-9_-]{32})$/);
    const token=queryId||match?.[1];
    if(req.method==='POST'&&action==='reply'&&/^[A-Za-z0-9_-]{32}$/.test(token||'')){
     let size=0;const chunks=[];
     for await(const chunk of req){size+=chunk.length;if(size>1024*64){reply(413,{error:'回信内容过长。'});return;}chunks.push(chunk);}
     let body={};try{body=JSON.parse(Buffer.concat(chunks).toString('utf8'));}catch{return reply(400,{error:'请求内容格式错误。'});}
     const content=(body.reply?.content||'').trim().slice(0,500);
     if(!content)return reply(400,{error:'回信内容不能为空。'});
     const replyData={content,sender:(body.reply?.sender||'TA').trim().slice(0,40),createdAt:new Date().toISOString()};
     const filePath=resolve(directory,token+'.json');
     try{
      const current=JSON.parse(await readFile(filePath,'utf8'));
      current.reply=replyData;
      await writeFile(filePath,JSON.stringify(current),{mode:0o600});
      return reply(200,{ok:true,reply:replyData});
     }catch(error){if(error.code==='ENOENT')return reply(404,{error:'这封邀请没有找到。'});throw error;}
    }
    if(req.method==='POST'&&path==='/api/gifts'){
     if(!req.headers['content-type']?.startsWith('application/json'))return reply(415,{error:'请使用 JSON 请求。'});
     let size=0;const chunks=[];
     for await(const chunk of req){size+=chunk.length;if(size>LIMIT){reply(413,{error:'照片总大小超过限制，请减少照片后重试。'});return;}chunks.push(chunk);}
     let gift;try{gift=validateGift(JSON.parse(Buffer.concat(chunks).toString('utf8')));}catch(error){return reply(400,{error:error instanceof SyntaxError?'邀请内容格式错误。':error.message});}
     const id=randomBytes(24).toString('base64url');
     await mkdir(directory,{recursive:true,mode:0o700});
     await writeFile(resolve(directory,id+'.json'),JSON.stringify({...gift,createdAt:new Date().toISOString()}),{flag:'wx',mode:0o600});
     return reply(201,{id});
    }
    if(req.method==='GET'&&/^[A-Za-z0-9_-]{32}$/.test(token||'')&&(match||path==='/api/gifts')){
     try{return reply(200,JSON.parse(await readFile(resolve(directory,token+'.json'),'utf8')));}catch(error){if(error.code==='ENOENT')return reply(404,{error:'这封邀请没有找到，请向送礼的人确认链接。'});throw error;}
    }
    return reply(404,{error:'邀请地址不正确。'});
   }catch(error){console.error('Gift storage error:',error.code||error.name);if(!res.headersSent)reply(500,{error:'邀请暂时无法保存或读取，请稍后重试。'});}
  };
}
