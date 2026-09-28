(() => {
 const token=location.pathname.split('/').filter(Boolean)[1];
 const target=document.getElementById('widget');
 if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(token||''))return;
 const mode=new URLSearchParams(location.search||'').get('playback')==='compatible'?'compatible':'standard';
 let loaded=false,snapshot=null,retryDelay=2000;
 async function start(){
  try{
   if(!loaded){
    const response=await fetch('https://qpoyojxupblhjeqbvqfr.supabase.co/rest/v1/rpc/immwiget_public',{method:'POST',headers:{apikey:'sb_publishable_QxJKRVOdn07hduJkqcbciw_oUADNl-C','Content-Type':'application/json'},body:JSON.stringify({p_token:token}),signal:AbortSignal.timeout(8000)});
    if(!response.ok)throw Error('Unavailable');
    snapshot=(await response.json())?.document||null;
    loaded=true;
   }
   // Disabled or removed links stay transparent until a manual source reload.
   if(!snapshot){target.dataset.playback='unavailable';return;}
   target.dataset.playback='loading';
   // Decode every asset before playback. Retry only unfinished loading, never poll.
   if(!await IMMWIGET.prepareLocal(snapshot))throw Error('Assets unavailable');
   await IMMWIGET.mount(target,snapshot,'playback',{mode,localOnly:true});
   target.dataset.playback='ready';
  }catch{
   target.dataset.playback='retrying';
   setTimeout(start,retryDelay);
   retryDelay=Math.min(60000,retryDelay*2);
  }
 }
 start();
})();
