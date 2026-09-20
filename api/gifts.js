import postgres from 'postgres';
import { randomBytes } from 'node:crypto';
import { validateGift } from '../src/gift-schema.js';

let sql;
let initialized;
function database() {
  if (!sql) {
    const url = process.env.SUPABASE_DB_URL || process.env.DATA_URL;
    if (!url) throw new Error('SUPABASE_DB_URL or DATA_URL is not configured');
    sql = postgres(url, { ssl: process.env.SUPABASE_DB_SSL === 'true' ? 'require' : undefined, max: 1, idle_timeout: 20, connect_timeout: 10 });
  }
  if (!initialized) initialized = sql`create table if not exists island_gifts (id text primary key, payload jsonb not null, created_at timestamptz not null default now())`;
  return {db: sql, ready: initialized};
}
function reply(res,status,body){res.status(status).json(body);}
function parseBody(req){if(req.body&&typeof req.body==='object')return req.body;if(typeof req.body==='string')return JSON.parse(req.body);return {};}
export default async function handler(req,res){
  res.setHeader('Cache-Control','no-store');res.setHeader('X-Content-Type-Options','nosniff');
  const token=req.query?.id||new URL(req.url,'https://island.fde.fan').pathname.split('/').pop();
  const action=req.query?.action;
  try{const {db,ready}=database();await ready;
    if(req.method==='POST'&&action==='reply'&&/^[A-Za-z0-9_-]{32}$/.test(token||'')){
      const body=parseBody(req);const content=(body.reply?.content||'').trim().slice(0,500);
      if(!content)return reply(res,400,{error:'回信内容不能为空。'});
      const replyData={content,sender:(body.reply?.sender||'TA').trim().slice(0,40),createdAt:new Date().toISOString()};
      await db`update island_gifts set payload = jsonb_set(payload, '{reply}', ${db.json(replyData)}) where id=${token}`;
      return reply(res,200,{ok:true,reply:replyData});
    }
    if(req.method==='POST'&&!req.query?.id){const gift=validateGift(parseBody(req));const id=randomBytes(24).toString('base64url');await db`insert into island_gifts (id,payload) values (${id},${db.json(gift)})`;return reply(res,201,{id});}
    if(req.method==='GET'&&/^[A-Za-z0-9_-]{32}$/.test(token||'')){const rows=await db`select payload from island_gifts where id=${token} limit 1`;if(!rows.length)return reply(res,404,{error:'这封邀请没有找到，请确认链接是否完整。'});return reply(res,200,rows[0].payload);}
    return reply(res,404,{error:'邀请地址不正确。'});
  }catch(error){console.error('gift api error:',error?.message||error);return reply(res,500,{error:'邀请服务暂时不可用，请稍后重试。'});}
}
