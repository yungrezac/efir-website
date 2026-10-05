(() => {
 const token=location.pathname.split('/').filter(Boolean)[1];
 const target=document.getElementById('widget');
 if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(token||''))return;
 const mode=new URLSearchParams(location.search||'').get('playback')==='compatible'?'compatible':'standard';
 const endpoint='https://qpoyojxupblhjeqbvqfr.supabase.co/rest/v1/rpc/';
 const headers={apikey:'sb_publishable_QxJKRVOdn07hduJkqcbciw_oUADNl-C','Content-Type':'application/json'};
 const assetVersion='0.8.0';
 let loaded=false,snapshot=null,retryDelay=2000,liveRetryDelay=1000,liveAssets=null,liveStyle=null,lastMarkup=null,liveObserved=false;
 async function rpc(name){
  const response=await fetch(endpoint+name,{method:'POST',headers,body:JSON.stringify({p_token:token}),signal:AbortSignal.timeout(8000),cache:'no-store'});
  if(!response.ok)throw Error('Unavailable');
  return response.json();
 }
 function asset(tag,pathname){
  return new Promise((resolve,reject)=>{
   const node=document.createElement(tag);
   const timer=setTimeout(()=>failed(),8000);
   function failed(){clearTimeout(timer);node.remove();reject(Error('Overlay assets unavailable'));}
   node.onload=()=>{clearTimeout(timer);resolve();};node.onerror=failed;
   if(tag==='link'){node.rel='stylesheet';node.href=pathname+'?v='+assetVersion;}
   else{node.src=pathname+'?v='+assetVersion;node.async=false;}
   document.head.appendChild(node);
  });
 }
 function prepareLive(){
  if(!liveStyle)liveStyle=asset('link','/overlay-render.css').catch(error=>{liveStyle=null;throw error;});
  if(!liveAssets)liveAssets=Promise.all([
   liveStyle,
   (async()=>{
    if(!globalThis.ImmOverlayModel)await asset('script','/overlay-model.js');
    if(!globalThis.ImmOverlayRenderer)await asset('script','/overlay-render.js');
    if(!globalThis.ImmOverlayModel||!globalThis.ImmOverlayRenderer)throw Error('Overlay renderer unavailable');
   })()
  ]).catch(error=>{liveAssets=null;throw error;});
  return liveAssets;
 }
 async function pollLive(){
  // Schedule only after this request, loading and render finish: never overlap polls.
  try{
   const row=await rpc('immwiget_overlay_public');
   const document=row?.document||null;
   if(!document){
    target.innerHTML='';lastMarkup=null;
    target.dataset.playback='unavailable';target.dataset.connection='offline';
    delete target.dataset.updatedAt;
    // Preserve legacy disabled/unknown links: a single failed live lookup ends loading.
    if(!liveObserved)return;
   }else{
    if(document.kind!=='live-overlay'||!document.config||typeof document.config!=='object')throw Error('Invalid overlay');
    liveObserved=true;target.dataset.kind='live-overlay';
    const config=document.config,stats=document.stats&&typeof document.stats==='object'?document.stats:{};
    if(config.enabled===false){target.innerHTML='';lastMarkup=null;target.dataset.playback='disabled';}
    else{
     await prepareLive();
     const markup=globalThis.ImmOverlayRenderer.html(config,stats);
     if(markup!==lastMarkup){target.innerHTML=markup;lastMarkup=markup;}
     target.dataset.playback='ready';
    }
    target.dataset.connection=String(document.connection?.status||'offline');
    target.dataset.updatedAt=String(row.updated_at||'');
   }
   liveRetryDelay=1000;
  }catch{
   // A temporary outage must not erase the last received score or record.
   target.dataset.playback='offline';target.dataset.connection='offline';
   liveRetryDelay=Math.min(10000,liveRetryDelay*2);
  }
  setTimeout(pollLive,liveRetryDelay);
 }
 async function start(){
  try{
   if(!loaded){
    snapshot=(await rpc('immwiget_public'))?.document||null;
    loaded=true;
   }
   // Legacy widgets still freeze one snapshot and never poll once mounted.
   // Only a successful miss in the legacy catalog switches to live overlays.
   if(!snapshot){await pollLive();return;}
   target.dataset.playback='loading';
   // Decode every asset before playback. Retry only unfinished loading, never poll.
   if(!await IMMWIGET.prepareLocal(snapshot))throw Error('Assets unavailable');
   if(!await IMMWIGET.mount(target,snapshot,'playback',{mode,localOnly:true}))throw Error('Playback unavailable');
   target.dataset.playback='ready';
  }catch{
   target.dataset.playback='retrying';
   setTimeout(start,retryDelay);
   retryDelay=Math.min(60000,retryDelay*2);
  }
 }
 start();
})();
