import http from 'node:http';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {registerBattle} from './battle-room.js';
import {action as battleAction} from '../battle/core.js';
import { pathToFileURL } from 'node:url';
import express from 'express';
import cors from 'cors';
import { Server } from '@colyseus/core';
import { WebSocketTransport } from '@colyseus/ws-transport';
import { SupabaseStore,MemoryStore } from './store.js';
import { SoloRoom,SharedOceanRoom,setStore,harborAction } from './ocean-room.js';
export function normalizeServiceKey(value){const key=String(value||'').replace(/\s/g,'');if(key&&!/^(sb_secret_[A-Za-z0-9_-]+|[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+)$/.test(key))throw new Error('Invalid server key format. Check SUPABASE_SERVICE_ROLE_KEY.');return key;}
export async function createGameServer({test=false,port=Number(process.env.PORT||2567)}={}){
  if(test&&process.env.NODE_ENV==='production')throw new Error('Test mode cannot run in production.');
  const serviceKey=normalizeServiceKey(process.env.SUPABASE_SERVICE_ROLE_KEY);const configured=Boolean(process.env.SUPABASE_URL&&serviceKey);const db=test?new MemoryStore():configured?new SupabaseStore(process.env.SUPABASE_URL.trim(),serviceKey,crypto.randomUUID()):null;
  if(db)await db.resetBoot();setStore(db);const app=express();const origins=((process.env.ALLOWED_ORIGINS||process.env.RENDER_EXTERNAL_URL)||'http://localhost:5173,http://localhost:4173').split(',').map(x=>x.trim());
  app.use(cors({origin:(origin,cb)=>cb(null,!origin||origins.includes(origin)),methods:['GET','POST'],allowedHeaders:['Authorization','Content-Type']}));app.use(express.json({limit:'8kb'}));app.disable('x-powered-by');const rates=new Map();
  app.use('/api',(req,res,next)=>{const now=Date.now(),key=req.ip,r=rates.get(key)||{at:now,count:0};if(now-r.at>60000){r.at=now;r.count=0;}rates.set(key,r);if(++r.count>180)return res.status(429).json({error:'Too many requests. Please wait.'});if(rates.size>5000)for(const [k,v] of rates)if(now-v.at>60000)rates.delete(k);next();});
  app.get('/runtime-config.js',(req,res)=>{res.type('application/javascript').set('Cache-Control','no-store').send('window.TIDEBOUND_CONFIG='+JSON.stringify({serverURL:process.env.RENDER_EXTERNAL_URL||'',supabaseURL:process.env.SUPABASE_URL||'',publishableKey:process.env.SUPABASE_PUBLISHABLE_KEY||''}).replace(/</g,'\\u003c')+';');});
  app.use(express.static(path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../dist')));
  app.get('/health',(_req,res)=>res.json({ok:true,cloudConfigured:Boolean(db),game:'Tidebound Pirates'}));
  app.use('/api',async(req,res,next)=>{if(!db)return res.status(503).json({error:'Cloud-saving solo and online voyages are unavailable until the backend is configured.'});try{req.user=await db.auth((req.headers.authorization||'').replace(/^Bearer /,''));next();}catch(e){res.status(401).json({error:e.message});}});
  app.get('/api/account',async(req,res)=>{try{res.json(await db.account(req.user.id,req.user.name));}catch(e){res.status(503).json({error:e.message});}});
  app.post('/api/action',async(req,res)=>{try{const {operation,action}=req.body;if(typeof operation!=='string'||! /^[a-f0-9-]{36}$/i.test(operation))throw new Error('Invalid operation ID.');res.json(await harborAction(req.user.id,operation,action));}catch(e){res.status(400).json({error:e.message});}});
  app.post('/api/battle-action',async(req,res)=>{try{const {operation,action}=req.body;if(typeof operation!=='string'||! /^[a-f0-9-]{36}$/i.test(operation))throw Error('Invalid operation ID');res.json(await db.mutate(req.user.id,operation,action,a=>battleAction(a,action)));}catch(e){res.status(400).json({error:e.message});}});
  const server=http.createServer(app);const game=new Server({transport:new WebSocketTransport({server,maxPayload:8192})});registerBattle(game,db);game.define('solo',SoloRoom);game.define('ocean',SharedOceanRoom);await game.listen(port,'0.0.0.0');return {game,db,server,port:server.address().port};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){createGameServer().then(({port})=>console.log(`Tidebound server listening on ${port}.`)).catch(e=>{console.error('Server startup failed. Check Supabase URL, server key and database setup.');process.exit(1);});}
