EfirLandingLayout.mount();
(() => {
 const slug=location.pathname.split('/').filter(Boolean)[0];
 if(!document.querySelector('.lp-hero')||!/^[a-z0-9][a-z0-9_-]{2,39}$/.test(slug||''))return;
 let session;
 try{session=sessionStorage.getItem('efir-landing-session');if(!/^[a-f0-9-]{36}$/.test(session||'')){session=crypto.randomUUID();sessionStorage.setItem('efir-landing-session',session);}}catch{session=crypto.randomUUID();}
 const track=button=>fetch('https://qpoyojxupblhjeqbvqfr.supabase.co/rest/v1/rpc/landing_track',{
  method:'POST',keepalive:true,headers:{apikey:'sb_publishable_QxJKRVOdn07hduJkqcbciw_oUADNl-C','Content-Type':'application/json'},
  body:JSON.stringify({p_slug:slug,p_session:session,p_button:button})
 }).catch(()=>{});
 if(document.visibilityState==='visible')track('');else document.addEventListener('visibilitychange',function visible(){if(document.visibilityState==='visible'){track('');document.removeEventListener('visibilitychange',visible);}});
 document.addEventListener('click',event=>{const button=event.target.closest('[data-button-id]');if(button?.dataset.buttonId)track(button.dataset.buttonId);});
 document.addEventListener('auxclick',event=>{if(event.button!==1)return;const button=event.target.closest('a[data-button-id]');if(button?.dataset.buttonId)track(button.dataset.buttonId);});
})();
document.addEventListener('click',async event=>{
 const button=event.target.closest('[data-copy-value]');if(!button)return;
 const status=document.querySelector('.lp-status');
 try{await navigator.clipboard.writeText(button.dataset.copyValue);status.textContent='Скопировано';}
 catch{
  status.replaceChildren(document.createTextNode('Скопируйте выделенный текст: '));
  const input=document.createElement('textarea');input.readOnly=true;input.value=button.dataset.copyValue;input.setAttribute('aria-label','Текст для копирования');status.append(input);input.focus();input.select();
 }
});
