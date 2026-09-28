'use strict';
const {PNG}=require('pngjs');
const {isIP}=require('node:net');
const fallback=Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#d5fc6b" stroke-width="1.6" stroke-linecap="round"><circle cx="12" cy="12" r="9"/><ellipse cx="12" cy="12" rx="4" ry="9"/><path d="M3 12h18"/></svg>');
function validHost(value){
 if(typeof value!=='string'||value.length>253||isIP(value)||!value.includes('.'))return false;
 return value.split('.').every(s=>/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(s))&&/\.[a-z][a-z0-9-]*$/.test(value)&&!/(?:^|\.)(?:localhost|local|internal|test|invalid|example)$/.test(value);
}
function tintIcon(bytes){
 // Check dimensions before decoding untrusted PNG data.
 if(bytes.length<33||!bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]))||bytes.toString('ascii',12,16)!=='IHDR')throw Error('Invalid PNG');
 const w=bytes.readUInt32BE(16),h=bytes.readUInt32BE(20);
 if(!w||!h||w>128||h>128)throw Error('Icon too large');
 const png=PNG.sync.read(bytes,{checkCRC:true}),d=png.data;
 // Remove a uniform opaque background connected to the image edges.
 // Transparent icons retain their alpha; enclosed details are preserved.
 const corners=[0,w-1,w*(h-1),w*h-1],first=corners[0]*4;
 const distance=i=>Math.max(...[0,1,2].map(c=>Math.abs(d[i+c]-d[first+c])));
 if(corners.every(p=>d[p*4+3]>245&&distance(p*4)<20)){
  const seen=new Uint8Array(w*h),queue=[];
  const add=p=>{if(seen[p])return;seen[p]=1;if(distance(p*4)<45)queue.push(p);};
  for(let x=0;x<w;x++){add(x);add((h-1)*w+x);}for(let y=0;y<h;y++){add(y*w);add(y*w+w-1);}
  for(let q=0;q<queue.length;q++){const p=queue[q];d[p*4+3]=0;if(p%w)add(p-1);if(p%w<w-1)add(p+1);if(p>=w)add(p-w);if(p<w*(h-1))add(p+w);}
 }
 let lo=255,hi=0,count=0;
 const lum=i=>d[i]*.2126+d[i+1]*.7152+d[i+2]*.0722;
 for(let i=0;i<d.length;i+=4)if(d[i+3]>32){const l=lum(i);lo=Math.min(lo,l);hi=Math.max(hi,l);count++;}
 if(!count)throw Error('Empty icon');
 for(let i=0;i<d.length;i+=4){const shade=hi-lo>30?.38+.62*(lum(i)-lo)/(hi-lo):1;d[i]=Math.round(213*shade);d[i+1]=Math.round(252*shade);d[i+2]=Math.round(107*shade);}
 return PNG.sync.write(png);
}
exports.validHost=validHost;exports.tintIcon=tintIcon;
exports.createLinkIconService=({fetchImpl=fetch,now=Date.now}={})=>{
 const cache=new Map(),pending=new Map();
 async function retrieve(host){
  const signal=AbortSignal.timeout(5000);
  let url=new URL('https://www.google.com/s2/favicons');url.searchParams.set('domain',host);url.searchParams.set('sz','64');
  for(let n=0;n<3;n++){
   // Never fetch a user-supplied origin, including redirect destinations.
   if(url.protocol!=='https:'||url.username||url.password||url.port||!['www.google.com','t0.gstatic.com','t1.gstatic.com','t2.gstatic.com','t3.gstatic.com'].includes(url.hostname))throw Error('Invalid provider');
   const response=await fetchImpl(url.href,{redirect:'manual',signal,headers:{Accept:'image/png'}});
   if([301,302,303,307,308].includes(response.status)){const target=response.headers.get('location');await response.body?.cancel();if(!target)throw Error('No location');url=new URL(target,url);continue;}
   if(!response.ok||!/^image\/png(?:;|$)/i.test(response.headers.get('content-type')||'')){await response.body?.cancel();throw Error('No icon');}
   const chunks=[];let size=0;
   for await(const chunk of response.body){size+=chunk.length;if(size>131072)throw Error('Icon too large');chunks.push(Buffer.from(chunk));}
   return {body:tintIcon(Buffer.concat(chunks)),type:'image/png',ttl:86400};
  }
  throw Error('Redirect limit');
 }
 return async(req,res)=>{
  const url=new URL(req.url,'http://localhost');if(url.pathname!=='/api/link-icon')return false;
  const host=(url.searchParams.get('host')||'').toLowerCase();
  let result=cache.get(host);
  if(!result||result.expires<=now()){
   result={body:fallback,type:'image/svg+xml',ttl:600};
   if(validHost(host)){
    let job=pending.get(host);
    if(!job&&pending.size<8){job=retrieve(host).catch(()=>({body:fallback,type:'image/svg+xml',ttl:600})).then(value=>{if(cache.size>=1000)cache.delete(cache.keys().next().value);cache.set(host,{...value,expires:now()+value.ttl*1000});return value;}).finally(()=>pending.delete(host));pending.set(host,job);}
    if(job)result=await job;
    else result.ttl=5;
   }
  }
  res.writeHead(200,{'Content-Type':result.type,'Content-Length':result.body.length,'Cache-Control':'public, max-age='+result.ttl,'Access-Control-Allow-Origin':'*','X-Content-Type-Options':'nosniff','X-Robots-Tag':'noindex','Content-Security-Policy':"default-src 'none'; sandbox"});
  res.end(req.method==='HEAD'?undefined:result.body);return true;
 };
};
