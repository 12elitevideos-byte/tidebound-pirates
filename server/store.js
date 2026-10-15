import { createClient } from '@supabase/supabase-js';
import { defaultAccount } from '../shared/config.js';
import { applyAction,applyReward,cleanName } from '../shared/economy.js';
const canonical=v=>JSON.stringify(stable(v));
function stable(v){if(Array.isArray(v))return v.map(stable);if(v&&typeof v==='object')return Object.fromEntries(Object.keys(v).sort().map(k=>[k,stable(v[k])]));return v;}
export class MemoryStore {
  constructor(){this.accounts=new Map();this.ops=new Map();this.queues=new Map();this.voyages=new Map();this.consumed=new Set();this.pvp=new Set();}
  async auth(token){if(!/^test:[a-zA-Z0-9_-]{1,32}$/.test(token||''))throw new Error('Authentication required.');return {id:token.slice(5)};}
  async account(id,name='New captain'){if(!this.accounts.has(id))this.accounts.set(id,defaultAccount(cleanName(name)));return structuredClone(this.accounts.get(id));}
  async mutate(id,op,meta,fn,items=[],pvp=null){const prev=this.queues.get(id)||Promise.resolve();const next=prev.catch(()=>{}).then(async()=>{const key=id+':'+op,hash=JSON.stringify(meta);if(this.ops.has(key)){if(this.ops.get(key)!==hash)throw new Error('Operation ID already used.');return this.account(id);}if(items.some(i=>this.consumed.has(i)))throw new Error('Cargo was already banked.');const pair=pvp?`${id}:${pvp}:${new Date().toISOString().slice(0,10)}`:null;if(pair&&this.pvp.has(pair))throw new Error('Bounty already rewarded for this captain today.');const d=fn(await this.account(id));d.revision++;this.accounts.set(id,d);this.ops.set(key,hash);for(const i of items)this.consumed.add(i);if(pair)this.pvp.add(pair);return structuredClone(d);});this.queues.set(id,next);return next;}
  action(id,op,a){return this.mutate(id,op,a,d=>applyAction(d,a));}
  reward(id,op,r,items=[],pvp=null){return this.mutate(id,op,r,d=>applyReward(d,r),items,pvp);}
  async startVoyage(id,v){if(this.voyages.has(id))throw new Error('This account already has a voyage. Reconnect or wait 30 seconds.');this.voyages.set(id,v);}
  async endVoyage(id,vid){if(this.voyages.get(id)?.id===vid){await this.action(id,'end:'+vid,{type:'abandonContract'});this.voyages.delete(id);}return this.account(id);}
  async resetBoot(){}
}
export class SupabaseStore {
  constructor(url,key,boot){this.db=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});this.boot=boot;this.queues=new Map();}
  async auth(token){if(typeof token!=='string'||token.length>5000)throw new Error('Authentication required.');const {data,error}=await this.db.auth.getUser(token);if(error||!data.user)throw new Error('Your session expired. Sign in again.');return {id:data.user.id,name:data.user.user_metadata?.pirate_name||'New captain'};}
  async account(id,name='New captain'){const {data,error}=await this.db.rpc('tb_ensure_account',{p_user:id,p_default:defaultAccount(cleanName(name))});if(error)throw new Error(error.message);return data;}
  async mutate(id,op,meta,fn,items=[],pvp=null){const prev=this.queues.get(id)||Promise.resolve();const next=prev.catch(()=>{}).then(async()=>{for(let attempt=0;attempt<4;attempt++){try{const {data:receipt,error:readError}=await this.db.from('tb_ledger').select('details').eq('user_id',id).eq('operation',op).maybeSingle();if(readError)throw new Error(readError.message);if(receipt){if(canonical(receipt.details)!==canonical(meta))throw new Error('Operation ID already used.');return this.account(id);}const source=await this.account(id);const nextData=fn(source);const {data,error}=await this.db.rpc('tb_commit_account',{p_user:id,p_revision:source.revision,p_data:nextData,p_operation:op,p_meta:meta,p_items:items,p_pvp_target:pvp});if(!error)return data;throw new Error(error.message);}catch(e){const transient=/REVISION_CONFLICT|fetch failed|timeout|timed out|connection|temporarily|network/i.test(e.message);if(!transient||attempt===3)throw e;await new Promise(resolve=>setTimeout(resolve,100*(attempt+1)));}}throw new Error('Save conflict. Please retry.');});this.queues.set(id,next);return next;}
  action(id,op,a){return this.mutate(id,op,a,d=>applyAction(d,a));}
  reward(id,op,r,items=[],pvp=null){return this.mutate(id,op,r,d=>applyReward(d,r),items,pvp);}
  async startVoyage(id,v){const {error}=await this.db.rpc('tb_start_voyage',{p_user:id,p_voyage:v.id,p_room:v.room,p_mode:v.mode,p_boot:this.boot});if(error)throw new Error(error.message);}
  async endVoyage(id,vid){const {data,error}=await this.db.rpc('tb_end_voyage',{p_user:id,p_voyage:vid});if(error)throw new Error(error.message);return data;}
  async resetBoot(){const {error}=await this.db.rpc('tb_reset_boot',{p_boot:this.boot});if(error)throw new Error(error.message);}
}
