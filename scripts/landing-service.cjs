'use strict';
const {render,esc}=require('../landing-render.js');
const endpoint='https://qpoyojxupblhjeqbvqfr.supabase.co/rest/v1/rpc/landing_public';
const key='sb_publishable_QxJKRVOdn07hduJkqcbciw_oUADNl-C';
exports.createLandingService=({fetchImpl=fetch}={})=>async(request,response)=>{
 const pathname=new URL(request.url,'http://localhost').pathname;
 const old=pathname.match(/^\/u\/([a-z0-9][a-z0-9_-]{2,39})\/?$/)||pathname.match(/^\/(astral|sinabon|darisha|violla)\.html$/);
 if(old){response.writeHead(308,{Location:'/'+old[1],'Cache-Control':'no-store'});response.end();return true;}
 const match=pathname.match(/^\/([a-z0-9][a-z0-9_-]{2,39})\/?$/);
 if(!match||['admin','vladosikpypsik','protect','api','assets','downloads','widget','index','robots','sitemap','release','scripts','health','healthz','login','logout','auth'].includes(match[1]))return false;
 let status=404,doc=null,disabled=false;
 if(match)try{
  const result=await fetchImpl(endpoint,{method:'POST',headers:{apikey:key,'Content-Type':'application/json'},body:JSON.stringify({p_slug:match[1]}),signal:AbortSignal.timeout(8000)});
  if(!result.ok)throw new Error('Landing unavailable');doc=await result.json();
  if(doc?._legacy===true&&['astral','sinabon','darisha','violla'].includes(match[1]))return false;
  disabled=doc?._disabled===true;if(disabled)doc=null;status=disabled?403:doc?200:404;
 }catch{status=503;}
 const body='<!doctype html><html lang="ru"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="theme-color" content="#0b120e"><title>'+esc(doc?.nickname||'Лендинг')+' · EFIR</title><link rel="icon" href="/assets/favicon.svg"><link rel="stylesheet" href="/landing-page.css?v=7"><link rel="stylesheet" href="/landing-icons.css?v=1">'+(doc?'<link rel="canonical" href="https://efirlive.pro/'+esc(match[1])+'">':'<meta name="robots" content="noindex">')+'</head><body>'+(doc?render(doc):'<main class="lp-page"><section class="lp-panel" style="margin-top:60px"><h1>'+(disabled?'Страница пользователя отключена':status===503?'Попробуйте чуть позже':'Страница недоступна')+'</h1><a href="https://efirlive.pro/">EFIR launcher ↗</a></section></main>')+'<script src="/landing-icons.js?v=1"></script><script src="/landing-layout.js?v=6"></script><script src="/landing-public.js?v=6"></script></body></html>';
 response.writeHead(status,{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Referrer-Policy':'strict-origin-when-cross-origin','Content-Security-Policy':"default-src 'none'; img-src 'self' https://efirlive.pro https://qpoyojxupblhjeqbvqfr.supabase.co; style-src 'self' 'unsafe-inline'; font-src 'self'; script-src 'self'; connect-src https://qpoyojxupblhjeqbvqfr.supabase.co; base-uri 'none'; frame-ancestors 'none'"});
 response.end(request.method==='HEAD'?undefined:body);return true;
};
