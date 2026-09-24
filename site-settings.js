(() => {
  'use strict';
  const toggle=document.getElementById('homepage-enabled'),status=document.getElementById('homepage-status');
  let generation=0,confirmed=false;
  const show=value=>{confirmed=value;toggle.checked=value;status.textContent=value?'Главная страница работает':'Главная страница выключена';};
  window.addEventListener('efir-admin-closed',()=>{generation++;toggle.disabled=true;});
  window.addEventListener('efir-admin-ready',async()=>{
    const id=++generation;toggle.disabled=true;status.textContent='Загрузка…';
    try{
      const {data,error}=await window.efirAdminClient.rpc('website_status');
      if(id!==generation)return;
      if(error||typeof data?.homepage_enabled!=='boolean')throw Error();
      show(data.homepage_enabled);toggle.disabled=false;
    }catch{if(id===generation)status.textContent='Не удалось загрузить настройку. Обновите страницу.';}
  });
  toggle.addEventListener('change',async()=>{
    const id=generation,requested=toggle.checked;toggle.disabled=true;status.textContent='Сохраняем…';
    try{
      const {data,error}=await window.efirAdminClient.rpc('admin_set_homepage',{p_enabled:requested});
      if(id!==generation)return;
      if(error||typeof data?.homepage_enabled!=='boolean')throw Error();
      show(data.homepage_enabled);
    }catch{if(id===generation){toggle.checked=confirmed;status.textContent='Не удалось сохранить. Попробуйте ещё раз.';}}
    finally{if(id===generation)toggle.disabled=false;}
  });
})();
