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
      const card=document.createElement('div');card.className='protect-result '+data.license;
      const badge=document.createElement('span');badge.className='live-badge '+data.live;
      badge.textContent=data.live==='live'?'● Стрим онлайн':data.live==='offline'?'● Стрим офлайн':'◌ Статус эфира неизвестен';
      const title=document.createElement('h2'),description=document.createElement('p'),detail=document.createElement('p'),time=document.createElement('small');
      const labels={current:'Лицензированный · Оригинал',legacy:'Старая купленная версия',expired:'Доступ к TIMER истёк',legacy_expired:'Старая версия · лицензия неактивна',none:'Лицензия не найдена',unknown:'Не удалось проверить лицензию'};
      title.textContent=labels[data.license]||labels.unknown;
      if(data.license==='current')description.textContent='@'+username+' ранее добавлялся в EFIR launcher и связан с действующей лицензией оригинального TIMER.';
      else if(data.license==='legacy')description.textContent='@'+username+' найден в списке подключений старой купленной версии TIMER. Лицензия в старой базе активна.';
      else if(data.license==='expired'||data.license==='legacy_expired')description.textContent='@'+username+' есть в истории лицензий, но действующий доступ сейчас не подтверждён.';
      else if(data.license==='none')description.textContent='Для @'+username+' не найдено подтверждения лицензии в новой и старой базе. Это само по себе не доказывает использование подделки.';
      else description.textContent='Одна из баз лицензий временно недоступна. Повторите проверку позже.';
      if(data.live==='offline')detail.textContent='Эфир сейчас не идёт. Наличие лицензии показано отдельно от статуса стрима.';
      else if(data.live==='unknown')detail.textContent='TikTok не позволил определить, идёт ли эфир. Информация о лицензии остаётся доступной.';
      else if(data.timer_running)detail.textContent='TIMER сейчас запущен через EFIR launcher и подключён к этому эфиру.';
      else detail.textContent='Эфир идёт. Наличие лицензии не подтверждает, что TIMER запущен именно сейчас.';
      time.textContent='Проверено: '+new Date(data.checked_at).toLocaleString('ru-RU')+'. Для повторной проверки нажмите кнопку.';
      card.append(badge,title,description,detail,time);result.replaceChildren(card);
    }catch{result.textContent='Сервис проверки временно недоступен. Попробуйте позже.';}
    finally{if(id===generation)form.querySelector('button').disabled=false;}
  });
})();
