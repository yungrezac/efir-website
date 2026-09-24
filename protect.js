(() => {
  'use strict';
  const form=document.getElementById('protect-form'),result=document.getElementById('result');let generation=0;
  form.addEventListener('submit',async event=>{
    event.preventDefault();const username=document.getElementById('username').value.trim().replace(/^@/,'').toLowerCase();
    if(!/^[a-z0-9_.]{1,32}$/.test(username)){result.textContent='Введите юзернейм без ссылки и пробелов.';return;}
    const id=++generation;form.querySelector('button').disabled=true;result.textContent='Проверяем эфир и лицензию…';
    try{
      const response=await fetch('/api/protect?username='+encodeURIComponent(username),{signal:AbortSignal.timeout(25000),cache:'no-store'});
      if(!response.ok)throw Error('Unavailable');const data=await response.json();if(id!==generation)return;
      const card=document.createElement('div'),title=document.createElement('h2');
      let tone='neutral';
      if(data.live==='offline')title.textContent='Стрим офлайн, для проверки нужен активный эфир';
      else if(data.live!=='live')title.textContent='Не удалось проверить эфир. Попробуйте ещё раз.';
      else if(data.license==='current'&&data.timer_running===true){title.textContent='ТАЙМЕР куплен, новейшая версия';tone='current';}
      else if(data.license==='legacy'||data.legacy_licensed===true){title.textContent='ТАЙМЕР куплен, старая версия';tone='legacy';}
      else {title.textContent=(data.license==='unknown'||data.license_check_complete===false)?'Не удалось проверить лицензию. Попробуйте ещё раз.':'ЕСЛИ ВЫ ВИДИТЕ ЧТО ДАННЫЙ СТРИМЕР ВЕДЕТ ФОРМАТ ТАЙМЕР И ОН ОЧЕНЬ ПОХОЖ НА ТОТ ЧТО ВЫ ПРИВЫКЛИ, ЗНАЙТЕ ЧТО ЭТО ПОДДЕЛКА';tone='unconfirmed';}
      card.className='protect-result '+tone;card.append(title);result.replaceChildren(card);
    }catch{result.textContent='Сервис проверки временно недоступен. Попробуйте позже.';}
    finally{if(id===generation)form.querySelector('button').disabled=false;}
  });
})();
