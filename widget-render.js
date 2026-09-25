(function(root){
 const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]));
 const themes={gold:['#fff83d','#ffad00','#bd5300'],pink:['#ffd5f6','#f760b7','#96339c'],ice:['#d7fbff','#42baff','#3056b5'],lime:['#f0ff80','#a8e52d','#397b22']};
 const fonts=['Arial Black','Ruslan Display','Rubik Mono One','Rubik Glitch','Rubik Wet Paint','Rubik Beastly','Rubik Burned','Rubik Dirt','Rubik Moonrocks','Rubik Scribble','Rubik Spray Paint','Rubik Vinyl','Rubik Bubbles','Caveat','Lobster','Comfortaa','Oswald'];
 const outlines={sticker:'Классический стикер',single:'Один контур',double:'Двойной контур',triple:'Тройной контур',neon:'Неоновое свечение',extrude:'Объёмная тень',comic:'Комикс',dashed:'Пунктир',offset:'Смещённый контур',none:'Без обводки'};
 const layerIds=['decor','gift','heading','text','caption'];
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
 const parts={decor,gift:image?`<image href="${esc(doc.gift.icon)}" x="${400-giftSize/2}" y="${330-giftSize}" width="${giftSize}" height="${giftSize}"/>`:'',heading:text('heading',doc.heading,image?55:y-98,48),text:text('text',doc.text,y,size),caption:text('caption',doc.caption,y+90,48)};
 const body=order(doc.layerOrder).map(id=>{const s=layer(doc.layers?.[id]);return `<g data-layer="${id}" transform="translate(${s.x} ${s.y}) translate(400 300) rotate(${s.rotation}) scale(${s.scale}) translate(-400 -300)">${parts[id]}</g>`}).join('');
 return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 600" role="img" aria-label="${esc(doc.text)}"><defs><linearGradient id="ink" x2="0" y2="1"><stop stop-color="${palette[0]}"/><stop offset=".65" stop-color="${palette[1]}"/><stop offset="1" stop-color="${palette[2]}"/></linearGradient><filter id="shadow" x="-50%" y="-50%" width="200%" height="200%"><feDropShadow dx="0" dy="8" stdDeviation="3" flood-opacity=".25"/></filter><filter id="glow" x="-100%" y="-100%" width="300%" height="300%"><feGaussianBlur stdDeviation="7"/></filter>${paths}</defs><g filter="url(#shadow)">${doc.animate?'<animateTransform attributeName="transform" type="translate" values="0 0;0 -5;0 0" dur="3s" repeatCount="indefinite"/>':''}${body}</g></svg>`;
 }
 const legacyRender=render;
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
 function tickerLayout(doc={}) {
  const count=Math.round(clamp(doc.visibleCount,1,20,4)),gap=clamp(doc.gap,0,200,30),sources=Math.min(10,Array.isArray(doc.items)?doc.items.length:0);
  const stride=800+gap,slots=sources?Math.ceil(count/sources)*sources:0;
  return {count,gap,stride,slots,width:count*stride-gap,height:600,distance:slots*stride,seconds:clamp(doc.duration,2,120,8)*slots};
 }
 function dimensions(doc={}) {return doc.kind==='ticker'?tickerLayout(doc):{width:800,height:600};}
 function renderDocument(doc={},prefix='scene',depth=0){
  prefix=String(prefix).replace(/[^a-zA-Z0-9_-]/g,'');if(depth>1)return '';
  if(doc.kind==='ticker'||doc.kind==='slideshow'){
   const items=(Array.isArray(doc.items)?doc.items:[]).slice(0,10),duration=clamp(doc.duration,2,120,8),gap=clamp(doc.gap,0,200,30);
   const frames=items.map((item,i)=>renderDocument(item.document||{},prefix+'-'+i,depth+1));let body='';
   if(doc.kind==='slideshow')body=frames.map((frame,i)=>{const times=[0],values=[i===0?1:0];if(i>0){times.push(i/items.length);values.push(1)}if(i<items.length-1){times.push((i+1)/items.length);values.push(0)}times.push(1);values.push(i===0?1:0);return `<g opacity="${i===0?1:0}"><animate attributeName="opacity" values="${values.join(';')}" keyTimes="${times.join(';')}" dur="${duration*items.length}s" repeatCount="indefinite" calcMode="discrete"/>${frame}</g>`}).join('');
   else if(items.length){
    const layout=tickerLayout(doc);
    // Define expensive artwork once. Two identical periods cover the viewport at every phase.
    const symbols=frames.map((frame,i)=>`<g id="${prefix}-source-${i}">${frame.replace('<svg ','<svg width="800" height="600" ')}</g>`).join('');
    const strip=Array.from({length:layout.slots*2},(_,i)=>`<use href="#${prefix}-source-${i%items.length}" transform="translate(${i*layout.stride} 0)"/>`).join('');
    body=`<defs>${symbols}</defs><style>@keyframes ${prefix}-ticker{from{transform:translateX(0)}to{transform:translateX(-${layout.distance}px)}}</style><g data-ticker-track="true" style="animation:${prefix}-ticker ${layout.seconds}s linear infinite;will-change:transform">${strip}</g>`;
   }
   const size=dimensions(doc);
   return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size.width} ${size.height}" overflow="hidden" role="img">${body}</svg>`;
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
    content=`<image href="${esc(src)}" x="${-e.w/2}" y="${-e.h/2}" width="${e.w}" height="${e.h}" preserveAspectRatio="xMidYMid meet" ${filter}/>`;
   }
   return `<g data-layer="${esc(e.id)}" transform="translate(${e.x} ${e.y}) rotate(${e.rotation})">${content}</g>`;
  }).join('');return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 600" role="img"><defs>${defs}</defs>${body}</svg>`;
 }

 const api={render:renderDocument,fonts,outlines,layer,order,layerIds,element,scene,tickerLayout,dimensions};root.IMMWIGET=api;if(typeof module!=='undefined')module.exports=api;
})(typeof window==='undefined'?globalThis:window);
