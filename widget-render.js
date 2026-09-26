(function(root){
 const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]));
 const themes={gold:['#fff83d','#ffad00','#bd5300'],pink:['#ffd5f6','#f760b7','#96339c'],ice:['#d7fbff','#42baff','#3056b5'],lime:['#f0ff80','#a8e52d','#397b22']};
 const fonts=['Arial Black','Ruslan Display','Rubik Mono One','Rubik Glitch','Rubik Wet Paint','Rubik Beastly','Rubik Burned','Rubik Dirt','Rubik Moonrocks','Rubik Scribble','Rubik Spray Paint','Rubik Vinyl','Rubik Bubbles','Caveat','Lobster','Comfortaa','Oswald'];
 const outlines={sticker:'Классический стикер',single:'Один контур',double:'Двойной контур',triple:'Тройной контур',neon:'Неоновое свечение',extrude:'Объёмная тень',comic:'Комикс',dashed:'Пунктир',offset:'Смещённый контур',none:'Без обводки'};
 const layerIds=['decor','gift','heading','text','caption'];
 // Gallery thumbnails stay small; scenes use the CDN's unresized original.
 function giftImage(url){
  const original=safeImage(url);let full=original;
  try{const parsed=new URL(original);if(/^p\d+-webcast\.tiktokcdn\.com$/.test(parsed.hostname)&&/^\/img\//.test(parsed.pathname)&&!parsed.search){parsed.pathname=parsed.pathname.replace(/~tplv-resize:\d+:\d+\.(?:webp|png)$/i,'~tplv-obj.png');full=parsed.href;}}catch{}
  return `href="${esc(full)}"${full!==original?` data-gift-fallback="${esc(original)}"`:''}`;
 }
 // Keep the gift visible if an older CDN asset has no original endpoint.
 if(root.document)root.document.addEventListener('error',event=>{
  const node=event.target;if(node?.localName!=='image'||!node.hasAttribute('data-gift-fallback'))return;
  const fallback=node.getAttribute('data-gift-fallback');node.removeAttribute('data-gift-fallback');node.setAttribute('href',fallback);
 },true);
 const clamp=(x,min,max,fallback)=>x!==null&&x!==''&&Number.isFinite(Number(x))?Math.max(min,Math.min(max,Number(x))):fallback;
 const color=(x,fallback)=>/^#[0-9a-f]{6}$/i.test(x||'')?x:fallback;
 function layer(v={}){return {x:clamp(v.x,-800,800,0),y:clamp(v.y,-600,600,0),scale:clamp(v.scale,.2,3,1),rotation:clamp(v.rotation,-180,180,0),curve:clamp(v.curve,-180,180,0),font:fonts.includes(v.font)?v.font:fonts[0],outline:outlines[v.outline]?v.outline:'sticker',width:clamp(v.width,0,40,12),outer:color(v.outer,'#fffdf2'),inner:color(v.inner,'#173421')};}
 function order(v){return [...new Set([...(Array.isArray(v)?v:[]),...layerIds])].filter(id=>layerIds.includes(id));}
 function render(doc={}){
 const palette=themes[doc.theme]||themes.gold,size=clamp(doc.fontSize,40,150,96),giftSize=clamp(doc.giftSize,80,360,240),image=doc.template==='gift'&&/^https:\/\//.test(doc.gift?.icon||'');let paths='';
 function text(id,value,y,font){value=String(value||'').slice(0,100);if(!value)return '';const s=layer(doc.layers?.[id]),fitted=Math.min(font,650/Math.max(1,Array.from(value).length*.66));let content=esc(value),position=`x="400" y="${y}"`;
 if(s.curve){paths+=`<path id="curve-${id}" d="M 65 ${y} Q 400 ${y-s.curve*2} 735 ${y}"/>`;content=`<textPath href="#curve-${id}" startOffset="50%">${content}</textPath>`;position='';}
 const glyph=(stroke,width,fill='url(#ink)',extra='')=>`<text ${position} text-anchor="middle" font-family="${esc(s.font)},Arial,sans-serif" font-weight="${s.font==='Arial Black'?900:400}" font-size="${fitted}" paint-order="stroke fill" stroke-linejoin="round" stroke="${stroke}" stroke-width="${width}" fill="${fill}" ${extra}>${content}</text>`;
 const w=s.width;let result='';
 if(s.outline==='sticker'||s.outline==='double')result=glyph(s.outer,w*2)+glyph(s.inner,w);
 if(s.outline==='single')result=glyph(s.outer,w);
 if(s.outline==='triple')result=glyph(s.inner,w*3)+glyph(s.outer,w*2)+glyph(palette[2],w);
 if(s.outline==='neon')result=glyph(s.outer,w,'none','filter="url(#glow)"')+glyph(s.outer,w*.3);
 if(s.outline==='extrude'){for(let n=10;n>0;n-=2)result+=glyph(s.inner,w,s.inner,`transform="translate(${n} ${n})"`);result+=glyph(s.outer,w*.5);}
 if(s.outline==='comic')result=glyph(s.inner,w*2,'url(#ink)','transform="translate(6 8)"')+glyph(s.outer,w*1.5)+glyph(s.inner,w*.5);
 if(s.outline==='dashed')result=glyph(s.outer,w,'none','stroke-dasharray="12 8"')+glyph('none',0);
 if(s.outline==='offset')result=glyph(s.outer,w,'none','transform="translate(8 -8)"')+glyph(s.inner,w*.5);
 if(s.outline==='none')result=glyph('none',0);return result;}
 const y=image?430:260;let decor='';
 if(doc.decor!==false)for(const [x,y,r] of [[95,190,-15],[702,160,18],[112,455,12],[690,450,-10]])decor+=`<g transform="translate(${x} ${y}) rotate(${r})"><path d="M0 -22 L7 -7 23 -5 11 7 15 23 0 15 -15 23 -11 7 -23 -5 -7 -7Z" fill="url(#ink)" stroke="#fff" stroke-width="12" paint-order="stroke fill"/></g>`;
 const parts={decor,gift:image?`<image ${giftImage(doc.gift.icon)} x="${400-giftSize/2}" y="${330-giftSize}" width="${giftSize}" height="${giftSize}"/>`:'',heading:text('heading',doc.heading,image?55:y-98,48),text:text('text',doc.text,y,size),caption:text('caption',doc.caption,y+90,48)};
 const body=order(doc.layerOrder).map(id=>{const s=layer(doc.layers?.[id]);return `<g data-layer="${id}" transform="translate(${s.x} ${s.y}) translate(400 300) rotate(${s.rotation}) scale(${s.scale}) translate(-400 -300)">${parts[id]}</g>`}).join('');
 return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 600" role="img" aria-label="${esc(doc.text)}"><defs><linearGradient id="ink" x2="0" y2="1"><stop stop-color="${palette[0]}"/><stop offset=".65" stop-color="${palette[1]}"/><stop offset="1" stop-color="${palette[2]}"/></linearGradient><filter id="shadow" x="-50%" y="-50%" width="200%" height="200%"><feDropShadow dx="0" dy="8" stdDeviation="3" flood-opacity=".25"/></filter><filter id="glow" x="-100%" y="-100%" width="300%" height="300%"><feGaussianBlur stdDeviation="7"/></filter>${paths}</defs><g filter="url(#shadow)">${doc.animate?'<animateTransform attributeName="transform" type="translate" values="0 0;0 -5;0 0" dur="3s" repeatCount="indefinite"/>':''}${body}</g></svg>`;
 }
 const legacyRender=render;
 const frameCache=new Map(),frameJobs=new Map(),assetCache=new Map();
 async function embeddedAsset(url){
  if(url.startsWith('data:'))return url;
  if(assetCache.has(url))return assetCache.get(url);
  const job=(async()=>{const response=await fetch(url,{signal:AbortSignal.timeout(12000)});if(!response.ok)throw Error('Asset '+response.status);const blob=await response.blob();return new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=reject;reader.readAsDataURL(blob)});})();
  if(assetCache.size>=50)assetCache.clear();assetCache.set(url,job);
  try{return await job}catch(error){assetCache.delete(url);throw error}
 }
 async function prepareFrame(doc){
  if(doc.animate)return false;
  const key=JSON.stringify(doc);if(frameCache.has(key))return true;if(frameJobs.has(key))return frameJobs.get(key);
  const job=(async()=>{
   const used=[...new Set(scene(doc).elements.filter(e=>e.type==='text').map(e=>e.font||'Arial Black'))];
   await Promise.all(used.map(font=>root.document.fonts.load(`80px "${font}"`)));
   let fontCSS='';const stylesheet=root.document.querySelector('link[href$="fonts.css"]');
   if(stylesheet&&used.some(font=>font!=='Arial Black')){
    const response=await fetch(stylesheet.href);if(!response.ok)throw Error('Fonts unavailable');
    for(const rule of (await response.text()).match(/@font-face\{[^}]+\}/g)||[]){
     const family=rule.match(/font-family:'([^']+)'/)?.[1],file=rule.match(/url\('([^']+)'\)/)?.[1];
     if(used.includes(family)&&file)fontCSS+=rule.replace(file,await embeddedAsset(new URL(file,stylesheet.href).href));
    }
   }
   const container=root.document.createElement('div');container.innerHTML=renderDocument(doc,'raster');const svg=container.firstElementChild;
   svg.setAttribute('width','1200');svg.setAttribute('height','900');
   if(fontCSS){const style=root.document.createElementNS('http://www.w3.org/2000/svg','style');style.textContent=fontCSS;svg.prepend(style);}
   for(const image of svg.querySelectorAll('image')){
    try{image.setAttribute('href',await embeddedAsset(image.getAttribute('href')))}catch(error){const fallback=image.getAttribute('data-gift-fallback');if(!fallback)throw error;image.setAttribute('href',await embeddedAsset(fallback));}
    image.removeAttribute('data-gift-fallback');
   }
   const url=URL.createObjectURL(new Blob([new XMLSerializer().serializeToString(svg)],{type:'image/svg+xml'}));
   try{
    const image=new Image();image.src=url;await image.decode();const canvas=root.document.createElement('canvas');canvas.width=1200;canvas.height=900;canvas.getContext('2d').drawImage(image,0,0);
    const blob=await new Promise((resolve,reject)=>canvas.toBlob(value=>value?resolve(value):reject(Error('Frame encoding failed')),'image/png'));
    const src=URL.createObjectURL(blob);if(frameCache.size>=16){const oldest=frameCache.keys().next().value;URL.revokeObjectURL(frameCache.get(oldest));frameCache.delete(oldest);}frameCache.set(key,src);
   }finally{URL.revokeObjectURL(url)}
   return true;
  })().catch(()=>false).finally(()=>frameJobs.delete(key));frameJobs.set(key,job);return job;
 }
 async function prepare(doc={}){
  if(!root.document||!['ticker','slideshow'].includes(doc.kind))return false;
  const items=(doc.items||[]).slice(0,10);let ready=true;
  // Limit concurrent filter rasterization and memory usage during initial loading.
  for(let i=0;i<items.length;i+=2){const results=await Promise.all(items.slice(i,i+2).map(item=>prepareFrame(item.document||{})));ready=results.every(Boolean)&&ready;}
  return ready;
 }
 const mounts=new WeakMap();
 function stop(target){const old=mounts.get(target);if(old){old.dispose?.();mounts.delete(target)}}
 async function mount(target,doc,prefix='playback',options={}){
  stop(target);
  if(options.mode==='compatible'&&doc?.kind==='ticker')return mountCompatible(target,doc);
  const fx=effects(doc?.effects),items=doc?.items||[];
  // SVG remains the fallback for source errors and the alpha-preserving shading filter.
  if(doc?.kind!=='ticker'||fx.shade||!items.length||items.some(item=>!frameCache.has(JSON.stringify(item.document||{})))){target.innerHTML=doc?renderDocument(doc,prefix):'';return false;}
  prefix=String(prefix).replace(/[^a-zA-Z0-9_-]/g,'');
  const layout=tickerLayout(doc),reverse=fx.direction==='right'?' reverse':'',holder=root.document.createElement('div');
  holder.dataset.compositorTicker='true';holder.setAttribute('role','img');holder.setAttribute('aria-label','Бегущая строка');
  holder.style.cssText='position:relative;width:100%;height:100%;overflow:hidden;contain:layout paint';
  let css=`@keyframes ${prefix}-slide{from{transform:translate3d(0,0,0)}to{transform:translate3d(-${layout.distance}px,0,0)}}`;
  const parts=layout.positions.map((x,i)=>{
   const crop=layout.crops[i%items.length],src=frameCache.get(JSON.stringify(items[i%items.length].document||{}));let pose='';
   if(fx.bulge||fx.motion!=='none'){
    const name=`${prefix}-volume-${i}`;
    css+=`@keyframes ${name}{`+Array.from({length:65},(_,step)=>{const p=tickerPose(x-layout.distance*step/64,crop.width,layout.width,fx);return `${step/64*100}%{transform:translate3d(0,${p.y.toFixed(3)}px,0) rotate(${p.rotation.toFixed(3)}deg) scale(${p.scale.toFixed(4)})}`}).join('')+'}';
    pose=`animation:${name} ${layout.seconds}s linear infinite${reverse};will-change:transform;`;
   }
   return `<div data-ticker-item style="position:absolute;left:${x}px;top:0;width:${crop.width}px;height:600px"><div data-ticker-pose style="width:100%;height:100%;transform-origin:50% 50%;${pose}"><div style="position:relative;width:100%;height:100%;overflow:hidden"><img data-cached-frame src="${src}" alt="" draggable="false" style="position:absolute;max-width:none;left:${-crop.x}px;top:0;width:800px;height:600px"></div></div></div>`;
  }).join('');
  const mask=fx.fade?`linear-gradient(to right,rgba(0,0,0,${1-fx.fade/100}),#000 ${fx.edgeWidth}%,#000 ${100-fx.edgeWidth}%,rgba(0,0,0,${1-fx.fade/100}))`:'none';
  const filter=fx.saturation===100&&!fx.glow?'none':`saturate(${fx.saturation/100})${fx.glow?` drop-shadow(0 0 ${fx.glow*.16}px ${fx.glowColor})`:''}`;
  holder.innerHTML=`<style>${css}</style><div data-ticker-viewport style="position:absolute;left:50%;top:50%;width:${layout.width}px;height:600px;transform-origin:50% 50%;overflow:hidden;opacity:${fx.opacity/100};mask-image:${mask};-webkit-mask-image:${mask};mask-repeat:no-repeat;-webkit-mask-repeat:no-repeat"><div style="width:100%;height:100%;filter:${filter}"><div data-ticker-track style="position:relative;width:${layout.distance*2}px;height:600px;animation:${prefix}-slide ${layout.seconds}s linear infinite${reverse};will-change:transform">${parts}</div></div></div>`;
  const state={};mounts.set(target,state);
  // Decode before attaching animated elements, so the first loop has no decode stalls.
  try{await Promise.all(Array.from(holder.querySelectorAll('img'),img=>img.decode()))}catch{if(mounts.get(target)===state){mounts.delete(target);target.innerHTML=renderDocument(doc,prefix)}return false}
  if(mounts.get(target)!==state)return false;
  target.replaceChildren(holder);
  const viewport=holder.querySelector('[data-ticker-viewport]');
  const fit=()=>{const scale=Math.min(holder.clientWidth/layout.width,holder.clientHeight/600);viewport.style.transform=`translate3d(-50%,-50%,0) scale(${scale})`;};
  fit();if(root.ResizeObserver){const observer=new ResizeObserver(fit);observer.observe(holder);state.dispose=()=>observer.disconnect()}else{root.addEventListener('resize',fit);state.dispose=()=>root.removeEventListener('resize',fit)}
  return true;
 }
 // A bounded canvas avoids a very wide composited strip in embedded browsers.
 // Time determines position; missed frames never accumulate timer drift.
 async function mountCompatible(target,doc){
  const items=(doc.items||[]).slice(0,10),state={};mounts.set(target,state);
  if(!items.length||items.some(item=>!frameCache.has(JSON.stringify(item.document||{})))){target.innerHTML=renderDocument(doc);return false;}
  let images;
  try{images=await Promise.all(items.map(async item=>{const image=new Image();image.src=frameCache.get(JSON.stringify(item.document||{}));await image.decode();return image}))}catch{if(mounts.get(target)===state)target.innerHTML=renderDocument(doc);return false;}
  if(mounts.get(target)!==state)return false;
  const layout=tickerLayout(doc),fx=effects(doc.effects),canvas=root.document.createElement('canvas');
  canvas.dataset.compatibleTicker='true';canvas.setAttribute('role','img');canvas.setAttribute('aria-label','Бегущая строка');
  canvas.style.cssText='display:block;width:100%;height:100%;object-fit:contain';
  const context=canvas.getContext('2d',{alpha:true});
  if(!context){target.innerHTML=renderDocument(doc);return false;}
  const started=performance.now();let raf=0,scale=1,last=-Infinity,fade=null,sprites=images;
  function draw(now){
   context.setTransform(1,0,0,1,0,0);context.clearRect(0,0,canvas.width,canvas.height);
   context.save();context.scale(scale,scale);context.globalAlpha=fx.opacity/100;
   const fraction=((now-started)*.65/(layout.seconds*1000))%1;
   const offset=(fx.direction==='right'?1-fraction:fraction)*layout.distance;
   for(let i=0;i<layout.positions.length;i++){
    const crop=layout.crops[i%items.length],x=layout.positions[i]-offset;
    if(x+crop.width<=0||x>=layout.width)continue;
    context.save();context.beginPath();context.rect(x,0,crop.width,600);context.clip();
    context.drawImage(sprites[i%items.length],x-crop.x,0,800,600);context.restore();
   }
   context.restore();
   if(fade){context.globalCompositeOperation='destination-in';context.fillStyle=fade;context.fillRect(0,0,canvas.width,canvas.height);context.globalCompositeOperation='source-over';}
  }
  function fit(){
   const ratio=Math.min(root.devicePixelRatio||1,1.5);
   scale=Math.max(.001,Math.min(target.clientWidth*ratio/layout.width,target.clientHeight*ratio/600,1920/layout.width,1080/600));
   canvas.width=Math.max(1,Math.round(layout.width*scale));canvas.height=Math.max(1,Math.round(600*scale));
   context.imageSmoothingEnabled=true;context.imageSmoothingQuality='high';
   // Resample once per resize instead of scaling full-size source artwork every frame.
   sprites=images.map(image=>{const sprite=root.document.createElement('canvas');sprite.width=Math.max(1,Math.round(800*scale));sprite.height=Math.max(1,Math.round(600*scale));const ctx=sprite.getContext('2d');ctx.imageSmoothingQuality='high';ctx.drawImage(image,0,0,sprite.width,sprite.height);return sprite});
   fade=null;if(fx.fade){fade=context.createLinearGradient(0,0,canvas.width,0);fade.addColorStop(0,`rgba(0,0,0,${1-fx.fade/100})`);fade.addColorStop(fx.edgeWidth/100,'#000');fade.addColorStop(1-fx.edgeWidth/100,'#000');fade.addColorStop(1,`rgba(0,0,0,${1-fx.fade/100})`);}
   draw(performance.now());
  }
  function frame(now){if(now+.5>=last){last=started+(Math.floor((now-started+.5)/(1000/30))+1)*(1000/30);draw(now)}raf=requestAnimationFrame(frame)}
  target.replaceChildren(canvas);fit();raf=requestAnimationFrame(frame);
  let observer;if(root.ResizeObserver){observer=new ResizeObserver(fit);observer.observe(target)}else root.addEventListener('resize',fit);
  state.dispose=()=>{cancelAnimationFrame(raf);observer?.disconnect();root.removeEventListener('resize',fit)};
  return true;
 }
 const safeImage=url=>/^https:\/\//i.test(url||'')||/^data:image\/(png|jpeg|webp);base64,[a-z0-9+/=]+$/i.test(url||'')?String(url):'';
 function element(v={},index=0){return {id:/^[a-zA-Z0-9_-]{1,60}$/.test(v.id||'')?v.id:'layer-'+index,type:['text','image','gift'].includes(v.type)?v.type:'text',name:String(v.name||'Слой').slice(0,80),text:String(v.text??'ТЕКСТ').slice(0,300),src:safeImage(v.src),giftId:String(v.giftId||v.gift?.id||'').slice(0,80),gift:v.gift,x:clamp(v.x,-800,1600,400),y:clamp(v.y,-600,1200,300),w:clamp(v.w,20,1600,500),h:clamp(v.h,20,1200,160),rotation:clamp(v.rotation,-360,360,0),font:fonts.includes(v.font)?v.font:fonts[0],fontSize:clamp(v.fontSize,10,300,80),fill:color(v.fill,'#ffdc38'),fill2:color(v.fill2,'#ff8a00'),gradient:v.gradient===true,shape:['line','arc','circle'].includes(v.shape)?v.shape:'line',bend:clamp(v.bend,-330,330,120),outline:outlines[v.outline]?v.outline:'sticker',width:clamp(v.width,0,40,8),outer:color(v.outer,'#ffffff'),inner:color(v.inner,'#142417'),hidden:v.hidden===true};}
 function scene(doc={}){
  if(Array.isArray(doc.elements))return {...doc,version:3,kind:doc.kind||'widget',elements:doc.elements.slice(0,40).map(element)};
  const image=doc.template==='gift'&&doc.gift?.icon,baseline=image?430:260,els=[];
  for(const id of order(doc.layerOrder)){
   const s=layer(doc.layers?.[id]);let v;
   if(['heading','text','caption'].includes(id)&&doc[id]){const base=id==='text'?clamp(doc.fontSize,40,150,96):48,y=id==='heading'?(image?55:baseline-98):id==='caption'?baseline+90:baseline;v={type:'text',text:doc[id],fontSize:base*s.scale,w:Math.min(730,Math.max(120,doc[id].length*base*.6))*s.scale,h:(base*1.6+Math.abs(s.curve))*s.scale,x:400+s.x,y:300+s.y+(y-base*.35-300)*s.scale,shape:s.curve?'arc':'line',bend:s.curve/180*150};}
   else if(id==='gift'&&image){const size=clamp(doc.giftSize,80,360,240);v={type:'gift',gift:doc.gift,giftId:doc.gift.id,src:doc.gift.icon,w:size*s.scale,h:size*s.scale,x:400+s.x,y:300+s.y+(330-size/2-300)*s.scale,outline:'none'};}
   if(v)els.push(element({...s,...v,id,name:id==='text'?'Главная надпись':id==='heading'?'Верхняя строка':id==='caption'?'Нижняя строка':'Подарок',fill:(themes[doc.theme]||themes.gold)[0],fill2:(themes[doc.theme]||themes.gold)[1],gradient:true}));
  }
  return {version:3,kind:'widget',elements:els};
 }
 const boundsCache=new Map();
 if(root.document?.fonts)root.document.fonts.addEventListener('loadingdone',()=>boundsCache.clear());
 function horizontalBounds(doc={}){
  if(!Array.isArray(doc.elements))return {x:0,width:800};
  const key=JSON.stringify(doc);if(boundsCache.has(key))return boundsCache.get(key);
  const elements=doc.elements.slice(0,40).map(element).filter(e=>!e.hidden&&(e.type==='text'?e.text.trim():safeImage(e.gift?.icon||e.src)));
  let holder,left=800,right=0;
  try{
   if(root.document?.body){
    holder=root.document.createElement('div');holder.style.cssText='position:fixed;left:-10000px;top:0;width:800px;height:600px;visibility:hidden;pointer-events:none';
    holder.innerHTML=renderDocument(doc,'measure');holder.firstElementChild.setAttribute('width','800');holder.firstElementChild.setAttribute('height','600');root.document.body.append(holder);
   }
   for(const e of elements){
    let box={x:-e.w/2,y:-e.h/2,width:e.w,height:e.h};
    const node=holder&&Array.from(holder.querySelectorAll('[data-layer]')).find(n=>n.getAttribute('data-layer')===e.id);
    if(node){const measured=node.getBBox();if(measured.width>0&&measured.height>0)box=measured;}
    // getBBox excludes strokes and filters. Keep their painted edges in the crop.
    let pad=0,offset=0;
    if(e.outline!=='none'&&e.width>0){
     const multiple=e.outline==='triple'?3:['sticker','double','comic'].includes(e.outline)?2:1;
     pad=e.width*multiple*(e.type==='text'?.5:1)+2;
     if(e.outline==='neon')pad+=24;
     if(['offset','extrude','comic'].includes(e.outline))offset=12;
    }
    const angle=e.rotation*Math.PI/180,c=Math.cos(angle),s=Math.sin(angle);
    for(const x of [box.x-pad,box.x+box.width+pad+offset])for(const y of [box.y-pad,box.y+box.height+pad+offset]){
     const px=e.x+x*c-y*s;left=Math.min(left,px);right=Math.max(right,px);
    }
   }
  }finally{holder?.remove()}
  // Respect the original scene's clipping; never change the source widget itself.
  left=Math.max(0,Math.floor(left));right=Math.min(800,Math.ceil(right));
  const bounds=right>left?{x:left,width:right-left}:{x:0,width:800};
  if(boundsCache.size>=100)boundsCache.clear();boundsCache.set(key,bounds);return bounds;
 }
 function tickerLayout(doc={}) {
  const count=Math.round(clamp(doc.visibleCount,1,20,4)),gap=clamp(doc.gap,0,200,30),items=(Array.isArray(doc.items)?doc.items:[]).slice(0,10),sources=items.length;
  const crops=items.map(item=>horizontalBounds(item.document||{})),slots=sources?Math.ceil(count/sources)*sources:0;
  const pitches=crops.map(c=>c.width+gap),period=pitches.reduce((sum,w)=>sum+w,0),distance=sources?period*slots/sources:0;
  let width=count*(800+gap)-gap;
  if(sources)width=Math.max(...pitches.map((_,start)=>Array.from({length:count},(_,i)=>pitches[(start+i)%sources]).reduce((sum,w)=>sum+w,0)-gap));
  let x=0;const positions=Array.from({length:slots*2},(_,i)=>{const at=x;x+=pitches[i%sources];return at});
  return {count,gap,crops,positions,slots,width,height:600,distance,seconds:clamp(doc.duration,2,120,8)*slots};
 }
 function dimensions(doc={}) {return doc.kind==='ticker'?tickerLayout(doc):{width:800,height:600};}
 function effects(v={}){
  v=v&&typeof v==='object'?v:{};
  return {fade:clamp(v.fade,0,100,0),shade:clamp(v.shade,0,100,0),edgeWidth:clamp(v.edgeWidth,5,40,18),bulge:clamp(v.bulge,-100,100,0),motion:['wave','float','tilt'].includes(v.motion)?v.motion:'none',motionAmount:clamp(v.motionAmount,0,100,35),glow:clamp(v.glow,0,100,0),glowColor:color(v.glowColor,'#baff80'),saturation:clamp(v.saturation,0,200,100),opacity:clamp(v.opacity,10,100,100),direction:v.direction==='right'?'right':'left'};
 }
 const effectPresets={clean:{},soft:{fade:100,edgeWidth:18},cinema:{shade:65,fade:80,edgeWidth:22,bulge:35},lens:{bulge:80,fade:100,edgeWidth:20},wave:{motion:'wave',motionAmount:45,fade:100},neon:{glow:55,glowColor:'#bf80ff',saturation:140,fade:100},float:{motion:'float',motionAmount:40,bulge:25,fade:80}};
 function tickerPose(x,width,viewport,v){
  const focus=Math.max(0,1-Math.abs((x+width/2)/viewport*2-1)),edge=1-focus*focus;
  let scale=v.bulge>=0?1-v.bulge/100*.35*edge:1+v.bulge/100*.35*focus*focus;
  const phase=(x+width/2)/viewport*Math.PI*2,amount=v.motionAmount/100;
  const y=v.motion==='wave'?Math.sin(phase)*65*amount:v.motion==='float'?-Math.sin(focus*Math.PI/2)*65*amount:0,rotation=v.motion==='tilt'?Math.sin(phase)*12*amount:0;
  // Reserve room for movement so a full-height source does not hit the top/bottom crop.
  const angle=rotation*Math.PI/180;scale*=Math.min(1,(600-2*Math.abs(y))/(600*Math.abs(Math.cos(angle))+width*Math.abs(Math.sin(angle))));
  return {scale,y,rotation};
 }
 function decorateComposition(body,size,v,id){
  let defs='',filter='',mask='';
  const edge=v.edgeWidth/100;
  if(v.fade){defs+=`<linearGradient id="${id}-fade-gradient"><stop stop-color="white" stop-opacity="${1-v.fade/100}"/><stop offset="${edge}" stop-color="white"/><stop offset="${1-edge}" stop-color="white"/><stop offset="1" stop-color="white" stop-opacity="${1-v.fade/100}"/></linearGradient><mask id="${id}-fade" maskUnits="userSpaceOnUse" x="0" y="0" width="${size.width}" height="600"><rect width="${size.width}" height="600" fill="url(#${id}-fade-gradient)"/></mask>`;mask=`mask="url(#${id}-fade)"`;}
  if(v.shade||v.glow||v.saturation!==100){
   let ops=`<feColorMatrix type="saturate" values="${v.saturation/100}" result="paint"/>`;
   // Use a separate blurred alpha; the source stays crisp and the background transparent.
   if(v.glow)ops+=`<feGaussianBlur in="SourceAlpha" stdDeviation="${v.glow*.16}" result="halo"/><feFlood flood-color="${v.glowColor}" flood-opacity="${v.glow/100}"/><feComposite in2="halo" operator="in" result="haloColor"/><feMerge result="lit"><feMergeNode in="haloColor"/><feMergeNode in="paint"/></feMerge>`;
   else ops+='<feMerge result="lit"><feMergeNode in="paint"/></feMerge>';
   if(v.shade){
    const dark=Math.round(255*(1-v.shade/100)),ink=`rgb(${dark},${dark},${dark})`;
    const gradient=`<svg xmlns="http://www.w3.org/2000/svg" width="${size.width}" height="600"><defs><linearGradient id="g"><stop stop-color="${ink}"/><stop offset="${edge}" stop-color="white"/><stop offset="${1-edge}" stop-color="white"/><stop offset="1" stop-color="${ink}"/></linearGradient></defs><rect width="100%" height="100%" fill="url(#g)"/></svg>`;
    ops+=`<feImage href="data:image/svg+xml,${esc(encodeURIComponent(gradient))}" x="0" y="0" width="${size.width}" height="600" result="edgeInk"/><feBlend in="lit" in2="edgeInk" mode="multiply" result="shaded"/><feComposite in="shaded" in2="lit" operator="in"/>`;
   }
   defs+=`<filter id="${id}-finish" filterUnits="userSpaceOnUse" x="0" y="0" width="${size.width}" height="600" color-interpolation-filters="sRGB">${ops}</filter>`;filter=`filter="url(#${id}-finish)"`;
  }
  return `<defs>${defs}</defs><g opacity="${v.opacity/100}" ${mask}><g ${filter}>${body}</g></g>`;
 }
 function renderDocument(doc={},prefix='scene',depth=0){
  prefix=String(prefix).replace(/[^a-zA-Z0-9_-]/g,'');if(depth>1)return '';
  if(doc.kind==='ticker'||doc.kind==='slideshow'){
   const items=(Array.isArray(doc.items)?doc.items:[]).slice(0,10),duration=clamp(doc.duration,2,120,8),gap=clamp(doc.gap,0,200,30),fx=effects(doc.effects);
   const frames=items.map((item,i)=>{const cached=frameCache.get(JSON.stringify(item.document||{}));return cached?`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 600"><image data-cached-frame="true" href="${cached}" width="800" height="600"/></svg>`:renderDocument(item.document||{},prefix+'-'+i,depth+1)});let body='';
   if(doc.kind==='slideshow')body=frames.map((frame,i)=>{const times=[0],values=[i===0?1:0];if(i>0){times.push(i/items.length);values.push(1)}if(i<items.length-1){times.push((i+1)/items.length);values.push(0)}times.push(1);values.push(i===0?1:0);return `<g opacity="${i===0?1:0}"><animate attributeName="opacity" values="${values.join(';')}" keyTimes="${times.join(';')}" dur="${duration*items.length}s" repeatCount="indefinite" calcMode="discrete"/>${frame}</g>`}).join('');
   else if(items.length){
    const layout=tickerLayout(doc);
    // Define expensive artwork once. Two identical periods cover the viewport at every phase.
    const symbols=frames.map((frame,i)=>{const crop=layout.crops[i];return `<g id="${prefix}-source-${i}">${frame.replace('viewBox="0 0 800 600"',`viewBox="${crop.x} 0 ${crop.width} 600"`).replace('<svg ',`<svg width="${crop.width}" height="600" `)}</g>`}).join('');
    let poses='';const reverse=fx.direction==='right'?' reverse':'';
    const strip=layout.positions.map((x,i)=>{
     if(!fx.bulge&&fx.motion==='none')return `<use href="#${prefix}-source-${i%items.length}" transform="translate(${x} 0)"/>`;
     const width=layout.crops[i%items.length].width,name=`${prefix}-pose-${i}`;
     poses+=`@keyframes ${name}{`+Array.from({length:65},(_,step)=>{const p=tickerPose(x-layout.distance*step/64,width,layout.width,fx);return `${step/64*100}%{transform:translateY(${p.y.toFixed(3)}px) rotate(${p.rotation.toFixed(3)}deg) scale(${p.scale.toFixed(4)})}`}).join('')+'}';
     return `<g transform="translate(${x+width/2} 300)"><g data-ticker-pose="true" style="animation:${name} ${layout.seconds}s linear infinite${reverse};will-change:transform"><use href="#${prefix}-source-${i%items.length}" transform="translate(${-width/2} -300)"/></g></g>`;
    }).join('');
    body=`<defs>${symbols}</defs><style>@keyframes ${prefix}-ticker{from{transform:translateX(0)}to{transform:translateX(-${layout.distance}px)}}${poses}</style><g data-ticker-track="true" style="animation:${prefix}-ticker ${layout.seconds}s linear infinite${reverse};will-change:transform">${strip}</g>`;
   }
   const size=dimensions(doc);
   return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size.width} ${size.height}" overflow="hidden" role="img">${decorateComposition(body,size,fx,prefix)}</svg>`;
  }
  if(!Array.isArray(doc.elements)){const svg=legacyRender(doc);if(prefix==='scene')return svg;return svg.replace(/id="([^"]+)"/g,(_,id)=>`id="${prefix}-${id}"`).replace(/href="#([^"]+)"/g,(_,id)=>`href="#${prefix}-${id}"`).replace(/url\(#([^)]+)\)/g,(_,id)=>`url(#${prefix}-${id})`);}
  let defs='';const body=doc.elements.slice(0,40).map((value,i)=>{
   const e=element(value,i);if(e.hidden)return '';const id=prefix+'-'+i,w=e.width;
   defs+=`<linearGradient id="${id}-ink" x2="0" y2="1"><stop stop-color="${e.fill}"/><stop offset="1" stop-color="${e.fill2}"/></linearGradient><filter id="${id}-glow" x="-100%" y="-100%" width="300%" height="300%"><feGaussianBlur stdDeviation="${Math.max(1,w/2)}"/></filter>`;
   let content='';const fill=e.gradient?`url(#${id}-ink)`:e.fill;
   if(e.type==='text'){
    const measure=value=>{if(root.document){const ctx=root.document.createElement('canvas').getContext('2d');ctx.font=`${e.font==='Arial Black'?900:400} 100px "${e.font}",Arial,sans-serif`;return ctx.measureText(value).width/100}return Array.from(value).length*.85};
    const lines=e.text.split('\n'),max=Math.max(1,...lines.map(measure)),size=Math.min(e.fontSize,(e.w-e.width*2)/max,e.h/(lines.length*1.2));let words=esc(e.text.replace(/\n/g,' ')),pos='',fs=Math.max(1,size);
    if(e.shape==='circle'){const r=Math.max(8,Math.min(e.w,e.h)/2-e.fontSize*.6),circ=2*Math.PI*r;fs=Math.min(e.fontSize,circ*.9/Math.max(1,measure(e.text)));defs+=`<path id="${id}-path" d="M 0 ${-r} A ${r} ${r} 0 1 1 0 ${r} A ${r} ${r} 0 1 1 0 ${-r}"/>`;words=`<textPath href="#${id}-path" startOffset="0" textLength="${circ*.97}" lengthAdjust="spacing">${words}</textPath>`;pos='text-anchor="start"';}
    else if(e.shape==='arc'&&Math.abs(e.bend)>1){const a=Math.abs(e.bend)*Math.PI/180,r=e.w/(2*Math.max(.2,Math.sin(Math.min(a,Math.PI)/2))),half=a/2,dx=r*Math.sin(half),dy=r*(1-Math.cos(half)),sign=e.bend<0?-1:1,shrink=Math.max(.1,Math.min(1,(e.h-e.fontSize)/Math.max(1,dy))),rx=r*shrink,x=dx*shrink,y=dy*shrink*sign/2;defs+=`<path id="${id}-path" d="M ${-x} ${y} A ${rx} ${rx} 0 ${a>Math.PI?1:0} ${sign>0?1:0} ${x} ${y}"/>`;fs=Math.min(e.fontSize,rx*a*.9/Math.max(1,measure(e.text)));words=`<textPath href="#${id}-path" startOffset="50%">${words}</textPath>`;pos='text-anchor="middle"';}
    else{pos='text-anchor="middle"';words=lines.map((line,n)=>`<tspan x="0" y="${(n-(lines.length-1)/2)*size*1.2+size*.35}">${esc(line)}</tspan>`).join('')}
    const glyph=(stroke,sw,paint=fill,extra='')=>`<text ${pos} font-family="${esc(e.font)},Arial,sans-serif" font-size="${fs}" font-weight="${e.font==='Arial Black'?900:400}" fill="${paint}" stroke="${stroke}" stroke-width="${sw}" stroke-linejoin="round" paint-order="stroke fill" ${extra}>${words}</text>`;
    switch(e.outline){case 'single':content=glyph(e.outer,w);break;case 'double':content=glyph(e.outer,w*2)+glyph(e.inner,w);break;case 'triple':content=glyph(e.outer,w*3)+glyph(e.inner,w*2)+glyph(e.fill2,w);break;case 'neon':content=glyph(e.outer,w*2,e.outer,`filter="url(#${id}-glow)"`)+glyph(e.outer,2);break;case 'extrude':for(let n=10;n>0;n-=2)content+=glyph(e.inner,w,e.inner,`transform="translate(${n} ${n})"`);content+=glyph(e.outer,w*.5);break;case 'comic':content=glyph(e.inner,w*2,fill,'transform="translate(6 8)"')+glyph(e.outer,w*1.5)+glyph(e.inner,w*.5);break;case 'dashed':content=glyph(e.outer,w,'none','stroke-dasharray="12 8"')+glyph('none',0);break;case 'offset':content=glyph(e.outer,w,'none','transform="translate(8 -8)"')+glyph(e.inner,w*.5);break;case 'none':content=glyph('none',0);break;default:content=glyph('#000000',w*2+3)+glyph(e.outer,w*2)+glyph(e.inner,w);}
   }else{
    const src=safeImage(e.type==='gift'?(e.gift?.icon||e.src):e.src);if(!src)return '';
    const morph=(radius,paint,result)=>`<feMorphology in="SourceAlpha" operator="dilate" radius="${radius}" result="${result}-mask"/><feFlood flood-color="${paint}"/><feComposite in2="${result}-mask" operator="in" result="${result}"/>`;
    let filter='';if(e.outline!=='none'&&w>0){const double=['sticker','double','triple','comic'].includes(e.outline),triple=e.outline==='triple';let ops=morph(w*(triple?3:double?2:1),e.outer,'outer');if(double)ops+=morph(w,e.inner,'inner');if(triple)ops+=morph(w*2,e.inner,'middle')+morph(w,e.fill2,'inner');if(e.outline==='neon')ops+='<feGaussianBlur in="outer" stdDeviation="6" result="outer"/>';if(['offset','extrude','comic'].includes(e.outline))ops+='<feOffset in="outer" dx="8" dy="8" result="outer"/>';defs+=`<filter id="${id}-edge" x="-200%" y="-200%" width="500%" height="500%" color-interpolation-filters="sRGB">${ops}<feMerge><feMergeNode in="outer"/>${triple?'<feMergeNode in="middle"/>':''}${double?'<feMergeNode in="inner"/>':''}<feMergeNode in="SourceGraphic"/></feMerge></filter>`;filter=`filter="url(#${id}-edge)"`;}
    content=`<image ${e.type==='gift'?giftImage(src):`href="${esc(src)}"`} x="${-e.w/2}" y="${-e.h/2}" width="${e.w}" height="${e.h}" preserveAspectRatio="xMidYMid meet" ${filter}/>`;
   }
   return `<g data-layer="${esc(e.id)}" transform="translate(${e.x} ${e.y}) rotate(${e.rotation})">${content}</g>`;
  }).join('');return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 600" role="img"><defs>${defs}</defs>${body}</svg>`;
 }

 const api={render:renderDocument,prepare,mount,stop,fonts,outlines,layer,order,layerIds,element,scene,tickerLayout,dimensions,effects,effectPresets,tickerPose};root.IMMWIGET=api;if(typeof module!=='undefined')module.exports=api;
})(typeof window==='undefined'?globalThis:window);
