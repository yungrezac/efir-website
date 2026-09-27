document.addEventListener('click',async event=>{
 const button=event.target.closest('[data-copy-value]');if(!button)return;
 const status=document.querySelector('.lp-status');
 try{await navigator.clipboard.writeText(button.dataset.copyValue);status.textContent='Скопировано';}
 catch{
  status.replaceChildren(document.createTextNode('Скопируйте выделенный текст: '));
  const input=document.createElement('textarea');input.readOnly=true;input.value=button.dataset.copyValue;input.setAttribute('aria-label','Текст для копирования');status.append(input);input.focus();input.select();
 }
});
