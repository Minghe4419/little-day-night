'use strict';
(()=>{
 const status=document.getElementById('pwa-status'),button=document.getElementById('pwa-update');
 if(!status)return;
 if(!('serviceWorker' in navigator)||!['https:','http:'].includes(location.protocol)){status.textContent='此环境不支持网页离线缓存；请保留进度备份。';return;}
 let reg,reloading=false;
 const show=()=>{status.textContent=reg?.waiting?'新版本已准备好，方便时再更新。':reg?.active?(navigator.onLine?'离线资源已备好；进度仍只保存在本机。':'当前离线，可继续抽卡、完成活动和备份。'):'正在准备离线资源，请先保持联网。';button.hidden=!reg?.waiting;};
 addEventListener('online',show);addEventListener('offline',show);
 navigator.serviceWorker.addEventListener('controllerchange',()=>{if(reloading)location.reload();else show();});
 navigator.serviceWorker.addEventListener('message',e=>{if(e.data==='CLOSE_OTHER_PAGES'){reloading=false;status.textContent='请先关闭其他早晚小冒险页面，再更新。';button.disabled=false;}});
 button.addEventListener('click',()=>{
  if((typeof pendingWrite!=='undefined'&&pendingWrite)||(typeof flowBusy!=='undefined'&&flowBusy)){status.textContent='请先保存或下载本页进度备份，等当前操作结束后再更新。';return;}
  if(!reg?.waiting)return;
  if(!confirm('现在更新并重新打开？已保存的进度会保留。'))return;
  reloading=true;button.disabled=true;reg.waiting.postMessage('ACTIVATE');
 });
 show();
 navigator.serviceWorker.register('./sw.js',{scope:'./',updateViaCache:'none'}).then(r=>{
  reg=r;show();r.addEventListener('updatefound',()=>{const w=r.installing;w?.addEventListener('statechange',()=>{if(w.state==='installed')show();if(w.state==='redundant'){status.textContent='离线资源准备失败或更新未完成，请联网后重试；旧版和进度保留。';}});});
  addEventListener('focus',()=>r.update().catch(()=>{}));
 }).catch(()=>{status.textContent='离线资源暂未准备好，请联网后重新打开。进度不受影响。';});
})();
