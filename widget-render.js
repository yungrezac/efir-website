(function(root){
 const esc=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[char]));
 const themes={gold:['#fff83d','#ffad00','#bd5300'],pink:['#ffd5f6','#f760b7','#96339c'],ice:['#d7fbff','#42baff','#3056b5'],lime:['#f0ff80','#a8e52d','#397b22']};
 const clamp=(x,min,max,fallback)=>Number.isFinite(Number(x))?Math.max(min,Math.min(max,Number(x))):fallback;
 function render(doc={}){
  const palette=themes[doc.theme]||themes.gold;
  const size=clamp(doc.fontSize,40,150,96),giftSize=clamp(doc.giftSize,80,360,240);
  const image=doc.template==='gift'&&/^https:\/\//.test(doc.gift?.icon||'');
  const text=(value,y,font)=>{value=String(value||'').slice(0,100);const fitted=Math.min(font,650/Math.max(1,Array.from(value).length*.66));return `<text x="400" y="${y}" text-anchor="middle" font-family="Arial Black,Arial,sans-serif" font-weight="900" font-size="${fitted}" paint-order="stroke fill" stroke-linejoin="round" stroke="#fffdf2" stroke-width="24">${esc(value)}</text><text x="400" y="${y}" text-anchor="middle" font-family="Arial Black,Arial,sans-serif" font-weight="900" font-size="${fitted}" paint-order="stroke fill" stroke-linejoin="round" stroke="#173421" stroke-width="12" fill="url(#ink)">${esc(value)}</text>`};
  const y=image?430:260;
  let decor='';
  if(doc.decor!==false) for(const [x,y,r] of [[95,190,-15],[702,160,18],[112,455,12],[690,450,-10]])decor+=`<g transform="translate(${x} ${y}) rotate(${r})"><path d="M0 -22 L7 -7 23 -5 11 7 15 23 0 15 -15 23 -11 7 -23 -5 -7 -7Z" fill="url(#ink)" stroke="#fff" stroke-width="12" paint-order="stroke fill"/><path d="M-28 -24 Q-42 -14 -40 -2 M27 30 Q40 19 39 10" fill="none" stroke="white" stroke-width="4" stroke-linecap="round"/></g>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 600" role="img" aria-label="${esc(doc.text)}"><defs><linearGradient id="ink" x2="0" y2="1"><stop stop-color="${palette[0]}"/><stop offset=".65" stop-color="${palette[1]}"/><stop offset="1" stop-color="${palette[2]}"/></linearGradient><filter id="shadow" x="-20%" y="-20%" width="140%" height="150%"><feDropShadow dx="0" dy="8" stdDeviation="3" flood-opacity=".25"/></filter></defs><g filter="url(#shadow)">${doc.animate?'<animateTransform attributeName="transform" type="translate" values="0 0;0 -5;0 0" dur="3s" repeatCount="indefinite"/>':''}${decor}${image?`<image href="${esc(doc.gift.icon)}" x="${400-giftSize/2}" y="${330-giftSize}" width="${giftSize}" height="${giftSize}"/>`:''}${text(doc.heading,image?55:y-98,48)}${text(doc.text,y,size)}${text(doc.caption,y+90,48)}</g></svg>`;
 }
 root.IMMWIGET={render};if(typeof module!=='undefined')module.exports={render};
})(typeof window==='undefined'?globalThis:window);
