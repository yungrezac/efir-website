(() => {
 const token=location.pathname.split('/').filter(Boolean)[1];
 const target=document.getElementById('widget');
 if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(token||''))return;
 let previous='';
 async function refresh(){try{
  const response=await fetch('https://qpoyojxupblhjeqbvqfr.supabase.co/rest/v1/rpc/immwiget_public',{method:'POST',headers:{apikey:'sb_publishable_QxJKRVOdn07hduJkqcbciw_oUADNl-C','Content-Type':'application/json'},body:JSON.stringify({p_token:token}),signal:AbortSignal.timeout(8000)});
  if(!response.ok)throw Error('Unavailable');
  const data=await response.json();
  const next=JSON.stringify(data?.document||null);
  if(next!==previous){
   if(data?.document)await IMMWIGET.prepare(data.document);
   await IMMWIGET.mount(target,data?.document||null);previous=next;
   if(data?.document&&!['ticker','slideshow'].includes(data.document.kind))document.fonts.ready.then(()=>{if(previous===next)target.innerHTML=IMMWIGET.render(data.document)});
  }
 }catch{ /* Keep the last good frame moving during transient network failures. */ }finally{setTimeout(refresh,5000)}}
 refresh();
})();
