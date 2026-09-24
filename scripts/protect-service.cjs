'use strict';
const CURRENT_URL = 'https://qpoyojxupblhjeqbvqfr.supabase.co';
const CURRENT_KEY = 'sb_publishable_QxJKRVOdn07hduJkqcbciw_oUADNl-C';
const LEGACY_URL = 'https://lqjagftaeejdufwwvjwd.supabase.co';
const LEGACY_KEY = 'sb_publishable_6-9IBhMX9CMVbIackZAJ9g_UUk5FDqx';
const normalize = value => String(value || '').trim().replace(/^@/, '').toLowerCase();
async function tikTokLive(username) {
  const { TikTokLiveConnection } = await import('tiktok-live-connector');
  // The public website never connects to chat or sends messages.
  const connection = new TikTokLiveConnection(username, {webClientOptions:{timeout:{request:4000},retry:{limit:0}}});
  // All fallbacks are bounded; an unavailable upstream is not an offline result.
  let timer;
  try { return await Promise.race([connection.fetchIsLive(), new Promise((_, reject) => { timer=setTimeout(() => reject(Error('LIVE_TIMEOUT')),12000); })]); }
  finally { clearTimeout(timer); }
}
function createProtectService({fetchImpl=fetch,checkLive=tikTokLive,now=Date.now}={}) {
  let legacy=null,legacyAt=0,legacyPending=null;
  const cache=new Map(),pending=new Map();
  async function json(url, options={}) {
    const response=await fetchImpl(url,{...options,signal:AbortSignal.timeout(8000)});
    if(!response.ok) throw Error('UPSTREAM_UNAVAILABLE');
    return response.json();
  }
  async function legacyIndex() {
    if(legacy && now()-legacyAt<60000)return legacy;
    if(legacyPending)return legacyPending;
    legacyPending=(async()=>{
      const index=new Map();
      for(let offset=0;offset<20000;offset+=1000){
        const rows=await json(LEGACY_URL+'/rest/v1/app_licenses?select=connected_usernames,is_active,expires_at,app_id&order=machine_id&limit=1000&offset='+offset,{headers:{apikey:LEGACY_KEY}});
        if(!Array.isArray(rows))throw Error('INVALID_LEGACY_RESPONSE');
        for(const row of rows){
          if(row.app_id && row.app_id!=='tiktimer')continue;
          const names=Array.isArray(row.connected_usernames)?row.connected_usernames:[];
          const active=row.is_active===true&&(!row.expires_at||Date.parse(row.expires_at)>now());
          for(const raw of names){const name=normalize(raw);if(typeof raw!=='string'||!/^[a-z0-9_.]{1,32}$/.test(name))continue;index.set(name,index.get(name)===true||active);}
        }
        if(rows.length<1000){legacy=index;legacyAt=now();return index;}
      }
      throw Error('LEGACY_RESULT_TOO_LARGE');
    })().finally(()=>{legacyPending=null;});
    return legacyPending;
  }
  async function lookup(value) {
    const username=normalize(value);
    if(!/^[a-z0-9_.]{1,32}$/.test(username))throw Object.assign(Error('INVALID_USERNAME'),{status:400});
    const previous=cache.get(username);if(previous && now()-previous.at<15000)return previous.value;
    if(pending.has(username))return pending.get(username);
    if(pending.size>=6)throw Object.assign(Error('BUSY'),{status:429});
    const job=(async()=>{
      const [currentResult,oldResult,liveResult]=await Promise.allSettled([
        json(CURRENT_URL+'/rest/v1/rpc/protect_streamer',{method:'POST',headers:{apikey:CURRENT_KEY,'Content-Type':'application/json'},body:JSON.stringify({p_username:username})}),
        legacyIndex(), checkLive(username)
      ]);
      const current=currentResult.status==='fulfilled'?currentResult.value:null;
      const old=oldResult.status==='fulfilled'?oldResult.value:null;
      const live=liveResult.status==='fulfilled'&&typeof liveResult.value==='boolean' ? (liveResult.value?'live':'offline') : current?.launcher_live?'live':'unknown';
      const license=current?.license==='current' || current?.status==='original'?'current':old?.get(username)===true?'legacy':current?.license==='expired'?'expired':old?.has(username)?'legacy_expired':current&&old?'none':'unknown';
      const result={username,live,license,license_check_complete:!!(current&&old),legacy_licensed:old?.get(username)===true,timer_running:live==='live'&&current?.timer_running===true,checked_at:new Date(now()).toISOString()};
      cache.set(username,{at:now(),value:result});if(cache.size>1000)cache.delete(cache.keys().next().value);
      return result;
    })().finally(()=>pending.delete(username));
    pending.set(username,job);return job;
  }
  return {lookup};
}
module.exports={createProtectService,tikTokLive};
