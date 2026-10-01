(() => {
  'use strict';
  const client = window.efirAdminClient;
  if (!client) return;
  const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const money = (value, currency) => new Intl.NumberFormat('ru-RU', {style:'currency', currency:currency || 'USD'}).format(Number(value || 0));
  const percent = value => (Number(value || 0) / 100).toLocaleString('ru-RU') + '%';
  const date = value => value ? new Date(value).toLocaleString('ru-RU') : '—';
  const state = {offset:0, search:'', total:0, items:[], selected:null, detail:null, sequence:0, detailSequence:0, dirty:false, busy:false};
  const root = document.createElement('section');
  root.id = 'referrals'; root.hidden = true; root.setAttribute('aria-label', 'Реферальная программа');
  root.innerHTML = `<div class="card referral-intro"><div><h2>Каждая оплаченная подписка приносит доход</h2><p>Процент от фактически оплаченной стоимости, до комиссии Tribute. Продления учитываются отдельно. Пробные дни и доступы администратора доход не начисляют. Выплаты записываются вручную после перевода денег.</p></div><form id="referral-rate-form"><label>Общий процент<input id="referral-default-rate" type="number" min="0" max="100" step="0.01" required disabled></label><button class="ghost" disabled>Сохранить</button></form></div>
    <div class="referral-message" id="referral-settings-message" role="status"></div>
    <form id="referral-search-form" class="card control-toolbar"><label>Найти партнёра<input id="referral-search" type="search" placeholder="Почта, имя или код лендинга"></label><button class="primary">Найти</button><button type="button" class="ghost" id="referral-refresh">Обновить</button></form>
    <div class="referral-message" id="referral-status" role="status" aria-live="polite"></div>
    <div class="referral-workspace"><div><div class="card referral-partners" id="referral-partners"></div><div class="control-pagination"><button class="ghost" id="referral-prev" aria-label="Предыдущие партнёры">←</button><span id="referral-page"></span><button class="ghost" id="referral-next" aria-label="Следующие партнёры">→</button></div></div><div class="card referral-detail" id="referral-detail"><div class="empty"><strong>Выберите партнёра</strong><p>Настройки процента, начисления и выплаты появятся здесь.</p></div></div></div>`;
  document.getElementById('analytics').before(root);
  const nav = document.createElement('a'); nav.href = '#referrals'; nav.dataset.page = 'referrals';
  nav.innerHTML = '<span aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"><circle cx="12" cy="5" r="3"/><circle cx="5" cy="19" r="3"/><circle cx="19" cy="19" r="3"/><path d="M12 8v4M5 16v-4h14v4"/></svg></span>Рефералы';
  document.querySelector('.sidebar nav').append(nav);
  const $ = id => document.getElementById(id);
  function message(id, text = '', error = false) { const el = $(id); if(!el)return; el.textContent = text; el.classList.toggle('error', error); }
  function errorText(error) {
    const text = error?.message || String(error);
    if (/REVISION|CONFLICT|DATA_CHANGED/i.test(text)) return 'Данные уже изменены. Обновите страницу партнёра и повторите изменение.';
    if (/INSUFFICIENT|BALANCE/i.test(text)) return 'Сумма превышает доступный остаток. Обновите данные партнёра.';
    if (/ADMIN_REQUIRED|permission/i.test(text)) return 'Нет прав администратора. Войдите заново.';
    return 'Не удалось выполнить действие: ' + text;
  }
  async function rpc(name, params) { const {data,error} = await client.rpc(name, params); if (error) throw error; return data; }
  function canDiscard() { return !state.dirty || confirm('Настройки партнёра не сохранены. Отменить изменения?'); }
  function table(headers, rows, empty) { return rows.length ? `<div class="referral-table-wrap"><table class="referral-table"><thead><tr>${headers.map(h=>`<th scope="col">${h}</th>`).join('')}</tr></thead><tbody>${rows.join('')}</tbody></table></div>` : `<p class="referral-muted">${empty}</p>`; }
  function pageButtons(loading = false) {
    $('referral-prev').disabled = loading || state.offset === 0;
    $('referral-next').disabled = loading || state.offset + 50 >= state.total;
    $('referral-page').textContent = state.total ? `${state.offset + 1}–${Math.min(state.offset + 50,state.total)} / ${state.total}` : '0 партнёров';
  }
  function renderPartners() {
    $('referral-partners').innerHTML = state.items.map(p => `<button class="referral-partner" data-partner="${esc(p.user_id)}" aria-pressed="${p.user_id === state.selected}"><strong>${esc(p.name || p.email || 'Партнёр')}</strong><small>${esc(p.email)} · ${esc(p.slug ? '/' + p.slug : 'Лендинг не опубликован')}</small><small>${Number(p.referred_count || 0)} приглашено · ${Number(p.paying_count || 0)} оплатили · ${percent(p.effective_rate_bps)}</small><span class="control-badge ${p.active ? 'on' : ''}">${p.active ? 'Начисления включены' : 'Начисления приостановлены'}</span>${(p.balances||[]).map(b=>`<small>К выплате: ${esc(money(b.balance,b.currency))}</small>`).join('')}</button>`).join('') || '<div class="empty"><strong>Партнёров не найдено</strong><p>Выдайте пользователю доступ к лендингу в разделе «Пользователи».</p></div>';
    root.querySelectorAll('[data-partner]').forEach(button => button.addEventListener('click', () => {
      if (state.busy || !canDiscard()) return;
      state.dirty = false; state.selected = button.dataset.partner; renderPartners(); loadDetail();
    }));
    pageButtons();
  }
  async function loadList(refreshDetail = true) {
    if (!window.efirAdminReady || root.hidden) return;
    const sequence = ++state.sequence;
    message('referral-status','Загружаем партнёров…'); pageButtons(true);
    try {
      const data = await rpc('admin_referral_list',{p_search:state.search,p_offset:state.offset});
      if (sequence !== state.sequence || !window.efirAdminReady) return;
      state.total = Number(data.total || 0);
      if (state.offset && state.offset >= state.total) { state.offset = Math.max(0, Math.floor((state.total-1)/50)*50); return loadList(refreshDetail); }
      state.items = data.items || []; state.settingsRevision = data.settings_revision;
      $('referral-default-rate').value = Number(data.default_rate_bps)/100;
      $('referral-rate-form').querySelectorAll('input,button').forEach(el => el.disabled = false);
      renderPartners(); message('referral-status',`Найдено партнёров: ${state.total}. Реферальная программа включается вместе с доступом к лендингу.`);
      if (state.selected && refreshDetail) await loadDetail();
    } catch (error) {
      if (sequence !== state.sequence) return;
      message('referral-status', errorText(error) + ' Нажмите «Обновить», чтобы повторить.', true); pageButtons();
    }
  }
  async function loadDetail() {
    if (!state.selected) return;
    const sequence = ++state.detailSequence, userId = state.selected;
    $('referral-detail').setAttribute('aria-busy','true');
    try {
      const data = await rpc('admin_referral_detail',{p_user_id:userId});
      if (sequence !== state.detailSequence || !window.efirAdminReady) return;
      state.detail = data; state.dirty = false; renderDetail(data);
    } catch (error) {
      if (sequence === state.detailSequence) {
        $('referral-detail').innerHTML = `<p class="referral-message error">${esc(errorText(error))}</p><button class="ghost" id="referral-detail-retry">Повторить</button>`;
        $('referral-detail-retry').onclick = loadDetail;
      }
    } finally { if (sequence === state.detailSequence) $('referral-detail').removeAttribute('aria-busy'); }
  }
  function renderDetail(p) {
    const commissions = p.commissions || [], payouts = p.payouts || [], referrals = p.referrals || [];
    $('referral-detail').innerHTML = `<h2>${esc(p.name || p.email || 'Партнёр')}</h2><p class="referral-muted">${esc(p.email)}${p.slug ? ` · <a href="/${encodeURIComponent(p.slug)}" target="_blank" rel="noopener noreferrer">/${esc(p.slug)} ↗</a>` : ''}</p>
      <span class="control-badge ${p.active?'on':''}">${p.active?'Начисления включены':'Начисления приостановлены'}</span>
      <p class="referral-muted">Код — адрес опубликованного лендинга после /. Для новых приглашений и начислений нужны активная программа и опубликованный, не отключённый лендинг.</p>
      <div class="referral-metrics"><div><b>${Number(p.visitor_count||0)}</b><span>переходов на главную</span></div><div><b>${Number(p.referred_count||0)}</b><span>приглашённых</span></div><div><b>${Number(p.paying_count||0)}</b><span>оплативших</span></div></div>
      <h3>Баланс по валютам</h3>${table(['Валюта','Начислено','Записано выплат','Остаток'],(p.balances||[]).map(b=>`<tr><td>${esc(b.currency)}</td><td class="money">${esc(money(b.earned,b.currency))}</td><td class="money">${esc(money(b.paid,b.currency))}</td><td class="money"><strong>${esc(money(b.balance,b.currency))}</strong></td></tr>`),'Оплаченных подписок пока нет.')}
      <div class="referral-actions"><button class="primary" id="referral-payout" ${(p.balances||[]).some(b=>Number(b.balance)>0)?'':'disabled'}>Записать выплату</button><button class="ghost" id="referral-detail-refresh">Обновить</button></div>
      <details open><summary>Условия и заметки</summary><form id="referral-partner-form"><fieldset class="control-fields"><label class="control-check"><input name="enabled" type="checkbox" ${p.enabled?'checked':''}> Реферальная программа включена</label><label>Личный процент, %<input name="rate" type="number" min="0" max="100" step="0.01" value="${p.rate_bps == null ? '' : Number(p.rate_bps)/100}" placeholder="Общий: ${Number(p.effective_rate_bps)/100}%"></label><p class="control-note">Пустое поле — общий процент. Сейчас: ${percent(p.effective_rate_bps)}. Изменения действуют только на будущие оплаты; прошлые начисления сохраняются.</p><label>Заметка о партнёре<textarea name="note" maxlength="2000" rows="4" placeholder="Договорённости, реквизиты, порядок выплат">${esc(p.note)}</textarea></label></fieldset><div class="referral-actions"><button class="ghost">Сохранить условия</button><span class="control-note" id="referral-dirty"></span></div><div class="referral-message" id="referral-partner-message" role="status"></div></form></details>
      <details open><summary>История выплат</summary><p class="referral-muted">Последние 100 записей. Это журнал уже выполненных переводов.</p>${table(['Когда','Сумма','Заметка'],payouts.map(row=>`<tr><td>${esc(date(row.created_at))}</td><td class="money">${esc(money(row.amount,row.currency))}</td><td class="note">${esc(row.note)}</td></tr>`),'Выплат ещё нет.')}</details>
      <details><summary>Оплаты и начисления</summary><p class="referral-muted">Последние 100 начислений. Возврат отмечается после фактического возврата платежа в Tribute и убирает начисление из баланса.</p>${table(['Когда / пользователь','Оплата','Процент / доход',''],commissions.map(row=>`<tr><td>${esc(date(row.paid_at || row.created_at))}<small>${esc(row.email || row.buyer_id || '')}</small></td><td class="money">${esc(money(row.gross_amount,row.currency))}</td><td class="money">${percent(row.rate_bps)}<small>${esc(money(row.commission,row.currency))}${row.is_reversed?' · возвращено':''}</small></td><td>${row.is_reversed ? '' : `<button class="ghost" data-reverse="${esc(row.payment_key)}">Отметить возврат</button>`}</td></tr>`),'Подтверждённых начислений пока нет.')}</details>
      <details><summary>Приглашённые пользователи</summary><p class="referral-muted">Последние 100 привязок. Привязка сохраняется при смене адреса лендинга; повторный код её не заменяет.</p>${table(['Пользователь','Код','Дата'],referrals.map(row=>`<tr><td>${esc(row.email || row.user_id)}<small>${esc(row.name || '')}</small></td><td>${esc(row.code)}</td><td>${esc(date(row.created_at))}</td></tr>`),'Никто ещё не активировал код.')}</details>`;
    $('referral-detail-refresh').onclick = () => { if (!state.busy && canDiscard()) {state.dirty=false; loadList();} };
    $('referral-payout').onclick = () => payoutDialog(p);
    const form = $('referral-partner-form');
    form.addEventListener('input',()=>{state.dirty=true;$('referral-dirty').textContent='Есть несохранённые изменения';});
    form.addEventListener('submit', async event => {
      event.preventDefault(); if (state.busy) return;
      const rate = form.elements.rate.value;
      state.busy=true; form.querySelector('fieldset').disabled=true; form.querySelector('button').disabled=true;
      message('referral-partner-message','Сохраняем…');
      try {
        await rpc('admin_referral_save',{p_user_id:p.user_id,p_enabled:form.elements.enabled.checked,p_rate_bps:rate===''?null:Math.round(Number(rate)*100),p_note:form.elements.note.value,p_revision:p.revision});
        state.dirty=false; await loadList(); message('referral-partner-message','Условия сохранены.');
      } catch(error) {message('referral-partner-message',errorText(error),true);}
      finally {state.busy=false;if(form.isConnected){form.querySelector('fieldset').disabled=false;form.querySelector('button').disabled=false;}}
    });
    root.querySelectorAll('[data-reverse]').forEach(button=>button.onclick=()=>reverseDialog(commissions.find(row=>row.payment_key===button.dataset.reverse)));
  }
  const pendingWrites = new Map();
  function transactionDialog(title, fields, submitLabel, submit, scope) {
    const dialog=document.createElement('dialog');dialog.className='control-dialog referral-dialog';
    dialog.innerHTML=`<form><h2 id="referral-dialog-title">${esc(title)}</h2>${fields}<div class="referral-message" role="status"></div><footer><button type="button" class="ghost" data-cancel>Отмена</button><button class="primary">${esc(submitLabel)}</button></footer></form>`;
    dialog.setAttribute('aria-labelledby','referral-dialog-title');document.body.append(dialog);
    const form=dialog.querySelector('form'), feedback=dialog.querySelector('[role=status]');
    const storageKey='efir-admin-pending:'+($('admin-email').textContent||'admin')+':'+scope;
    let pending=pendingWrites.get(storageKey);
    try { pending ||= JSON.parse(sessionStorage.getItem(storageKey)||'null'); } catch { /* In-memory retry is still available. */ }
    const idempotency=pending?.key||crypto.randomUUID();
    let submitting=false, attempted=Boolean(pending), serialized=pending?.values||null;
    if(pending){
      for(const [name,value] of Object.entries(serialized))if(form.elements.namedItem(name))form.elements.namedItem(name).value=value;
      form.querySelectorAll('input,select,textarea').forEach(el=>{if(el.type==='checkbox')el.checked=true;el.disabled=true;});
      feedback.textContent='Результат предыдущей записи неизвестен. Повторное подтверждение проверит ту же запись и не создаст дубликат.';
    }
    const previousFocus=document.activeElement;
    dialog.addEventListener('cancel',event=>{if(submitting)event.preventDefault();});
    dialog.querySelector('[data-cancel]').onclick=()=>{if(!submitting)dialog.close();};
    dialog.addEventListener('close',()=>{dialog.remove();previousFocus?.focus();},{once:true});
    form.addEventListener('submit',async event=>{
      event.preventDefault(); if(submitting)return;
      // After an uncertain network response retry exactly the same operation/key.
      if(!attempted)serialized=Object.fromEntries(new FormData(form));
      pendingWrites.set(storageKey,{key:idempotency,values:serialized});
      try{sessionStorage.setItem(storageKey,JSON.stringify({key:idempotency,values:serialized}));}catch{/* Keep same key until this page closes. */}
      attempted=true;submitting=true;form.querySelectorAll('input,select,textarea,button').forEach(el=>el.disabled=true);
      feedback.textContent='Сохраняем запись…';feedback.classList.remove('error');
      try{await submit(serialized,idempotency);pendingWrites.delete(storageKey);try{sessionStorage.removeItem(storageKey);}catch{}dialog.close();await loadList();}
      catch(error){
        const rejected=/INSUFFICIENT_BALANCE|INVALID_PAYOUT|INVALID_REVERSAL|ALREADY_REVERSED|ADMIN_REQUIRED|NOT_FOUND/.test(error?.message||'');
        if(rejected){pendingWrites.delete(storageKey);try{sessionStorage.removeItem(storageKey);}catch{}attempted=false;form.querySelectorAll('input,select,textarea').forEach(el=>el.disabled=false);}
        feedback.textContent=errorText(error)+(rejected?'':' При повторе будет проверена та же запись.');feedback.classList.add('error');form.querySelectorAll('button').forEach(el=>el.disabled=false);
      }
      finally{submitting=false;}
    });
    dialog.showModal();return dialog;
  }
  function payoutDialog(p) {
    const balances=(p.balances||[]).filter(b=>Number(b.balance)>0);
    if(!balances.length)return;
    const dialog=transactionDialog('Запись выполненной выплаты',`<p class="referral-muted">${esc(p.name||p.email)}. Сначала переведите деньги партнёру, затем запишите сумму и пояснение здесь. Эта кнопка не переводит деньги.</p><fieldset class="control-fields"><label>Валюта<select name="currency">${balances.map(b=>`<option value="${esc(b.currency)}">${esc(b.currency)}</option>`).join('')}</select></label><label>Сумма<input name="amount" type="number" min="0.01" step="0.01" max="${Number(balances[0].balance)}" required></label><p class="wide control-note">Доступно: <output>${esc(money(balances[0].balance,balances[0].currency))}</output></p><label class="wide">Заметка о выплате<textarea name="note" required maxlength="2000" rows="3" placeholder="Дата, способ перевода, номер операции или договорённость"></textarea></label><label class="wide control-check"><input type="checkbox" required> Перевод уже выполнен, сумма и валюта верны</label></fieldset>`,'Записать выплату',(values,key)=>rpc('admin_referral_payout',{p_user_id:p.user_id,p_currency:values.currency,p_amount:Number(values.amount),p_note:values.note,p_idempotency:key}),'payout:'+p.user_id);
    dialog.querySelector('select').onchange=event=>{const b=balances.find(b=>b.currency===event.target.value);dialog.querySelector('output').textContent=money(b.balance,b.currency);dialog.querySelector('[name=amount]').max=b.balance;};
  }
  function reverseDialog(row) {
    if(!row)return;
    transactionDialog('Возврат оплаченной подписки',`<p class="referral-muted">Оплата ${esc(money(row.gross_amount,row.currency))}. Из баланса партнёра будет вычтено ${esc(money(row.commission,row.currency))}. Платёж клиенту здесь не возвращается.</p><fieldset class="control-fields"><label class="wide">Причина и подтверждение возврата<textarea name="note" required maxlength="2000" rows="3"></textarea></label><label class="wide control-check"><input type="checkbox" required> Полный возврат уже выполнен в платёжном сервисе</label></fieldset>`,'Записать возврат',(values,key)=>rpc('admin_referral_reverse',{p_payment_key:row.payment_key,p_note:values.note,p_idempotency:key}),'refund:'+row.payment_key);
  }
  $('referral-rate-form').onsubmit=async event=>{
    event.preventDefault();if(state.busy)return;
    if(!confirm('Изменить общий процент для будущих оплат? Личные ставки и уже начисленные суммы сохранятся.'))return;
    state.busy=true;const form=event.currentTarget;form.querySelectorAll('input,button').forEach(el=>el.disabled=true);
    try{await rpc('admin_referral_settings',{p_rate_bps:Math.round(Number($('referral-default-rate').value)*100),p_revision:state.settingsRevision});await loadList(false);message('referral-settings-message','Общий процент сохранён.');}
    catch(error){message('referral-settings-message',errorText(error),true);}
    finally{state.busy=false;form.querySelectorAll('input,button').forEach(el=>el.disabled=false);}
  };
  $('referral-search-form').onsubmit=event=>{event.preventDefault();if(state.busy||!canDiscard())return;state.dirty=false;state.offset=0;state.search=$('referral-search').value.trim();loadList();};
  $('referral-refresh').onclick=()=>{if(state.busy||!canDiscard())return;state.dirty=false;loadList();};
  $('referral-prev').onclick=()=>{state.offset=Math.max(0,state.offset-50);loadList(false);};
  $('referral-next').onclick=()=>{state.offset+=50;loadList(false);};
  function navigate(){root.hidden=location.hash!=='#referrals';nav.toggleAttribute('aria-current',!root.hidden);if(!root.hidden){nav.setAttribute('aria-current','page');loadList(false);}}
  window.addEventListener('hashchange',navigate);window.addEventListener('efir-admin-ready',navigate);
  window.addEventListener('efir-admin-closed',()=>{state.sequence++;state.detailSequence++;state.items=[];state.detail=null;state.selected=null;state.dirty=false;$('referral-partners').replaceChildren();$('referral-detail').replaceChildren();document.querySelectorAll('.referral-dialog').forEach(d=>d.close());});
  window.addEventListener('beforeunload',event=>{if(state.dirty){event.preventDefault();event.returnValue='';}});
  navigate();
})();
