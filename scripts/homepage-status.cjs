'use strict';
function createHomepageStatus({fetchImpl=fetch,now=Date.now}={}) {
  let value=false,checkedAt=-Infinity,pending=null;
  return async function homepageEnabled() {
    if(now()-checkedAt<3000)return value;
    if(!pending)pending=(async()=>{
      try {
        const response=await fetchImpl('https://qpoyojxupblhjeqbvqfr.supabase.co/rest/v1/rpc/website_status',{
          method:'POST',headers:{apikey:'sb_publishable_QxJKRVOdn07hduJkqcbciw_oUADNl-C','Content-Type':'application/json'},body:'{}',signal:AbortSignal.timeout(4000)
        });
        if(!response.ok)throw Error('STATUS_UNAVAILABLE');
        const data=await response.json();
        if(typeof data?.homepage_enabled!=='boolean')throw Error('INVALID_STATUS');
        value=data.homepage_enabled;
      } catch { /* Preserve last confirmed value; an unknown homepage stays closed. */ }
      checkedAt=now();return value;
    })().finally(()=>{pending=null;});
    return pending;
  };
}
module.exports={createHomepageStatus};
