'use strict';
if(window.navigator.standalone||window.matchMedia('(display-mode: standalone)').matches){
  window.location.replace(new URL('./?launch=home',window.location.href).href);
}
let installRequest=null;
const installButton=document.getElementById('native-install');
window.addEventListener('beforeinstallprompt',event=>{
  event.preventDefault();installRequest=event;installButton.hidden=false;
});
installButton.addEventListener('click',async()=>{
  if(!installRequest)return;
  installButton.disabled=true;
  try{
    await installRequest.prompt();
    const result=await installRequest.userChoice;
    document.getElementById('install-status').textContent=result.outcome==='accepted'?'已接受安装，请到手机桌面查看。':'可以稍后再从浏览器菜单添加。';
  }catch{
    document.getElementById('install-status').textContent='请从浏览器菜单选择“安装应用”或“添加到主屏幕”。';
  }finally{installRequest=null;installButton.hidden=true;installButton.disabled=false;}
});
