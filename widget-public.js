(() => {
 const token=location.pathname.split('/').filter(Boolean)[1];
 const target=document.getElementById('widget');
 if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(token||''))return;
 const mode=new URLSearchParams(location.search||'').get('playback')==='compatible'?'compatible':'standard';
 let previous='',retryAt=0,retryDelay=5000,pending=false;
 async function refresh(){try{
  const response=await fetch('https://qpoyojxupblhjeqbvqfr.supabase.co/rest/v1/rpc/immwiget_public',{method:'POST',headers:{apikey:'sb_publishable_QxJKRVOdn07hduJkqcbciw_oUADNl-C','Content-Type':'application/json'},body:JSON.stringify({p_token:token}),signal:AbortSignal.timeout(8000)});
  if(!response.ok)throw Error('Unavailable');
  const data=await response.json();
  const next=JSON.stringify(data?.document||null);
  const changed=next!==previous;
  if(changed||(pending&&Date.now()>=retryAt)){
   if(changed){retryDelay=5000;pending=false;}
   const composition=['ticker','slideshow'].includes(data?.document?.kind)||!!IMMWIGET.raster?.(data?.document);
   const ready=data?.document?await IMMWIGET.prepare(data.document):true;
   // A temporary CDN failure must not strand this page in the expensive fallback.
   // Failed retries keep the existing DOM and its animation phase untouched.
   let mounted=false;
   if(changed||ready)mounted=await IMMWIGET.mount(target,data?.document||null,'playback',{mode});
   pending=composition&&(!ready||(mode==='compatible'&&data.document.kind==='ticker'&&!mounted));
   if(pending){retryAt=Date.now()+retryDelay;retryDelay=Math.min(60000,retryDelay*2);}
   previous=next;
   if(data?.document&&!IMMWIGET.raster?.(data.document)&&!['ticker','slideshow'].includes(data.document.kind))document.fonts.ready.then(()=>{if(previous===next)target.innerHTML=IMMWIGET.render(data.document)});
  }
 }catch{ /* Keep the last good frame moving during transient network failures. */ }finally{setTimeout(refresh,5000)}}
 refresh();
})();
