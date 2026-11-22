'use strict';
if(window.navigator.standalone)document.documentElement.classList.add('home-app');
const STORAGE='little-day-night/v1',MODES={pet:'小狗成长',puzzle:'收集拼图',garden:'种小花园'};
const $=id=>document.getElementById(id);
const escapeHTML=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const nowDay=()=>new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Shanghai',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
const catalogLookup=id=>ACTS.find(a=>a.id===id);
const lookup=id=>catalogLookup(id)||Object.values(state.days).flatMap(day=>Object.values(day)).find(slot=>slot.id===id)?.snapshot;
const snapshotOf=a=>Object.fromEntries(['id','period','category','title','steps','feedback','materials','prompt','minutes'].map(k=>[k,a[k]]));
const validDate=value=>typeof value==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(value)&&Number.isFinite(Date.parse(value+'T00:00:00Z'))&&new Date(value+'T00:00:00Z').toISOString().slice(0,10)===value;
function historyActivity(value,id,period){
  if(!value||typeof id!=='string'||!/^[a-z][a-z0-9-]{0,79}$/.test(id)||value.id!==id||value.period!==period||!Number.isFinite(value.minutes)||value.minutes<=0||value.minutes>120)return null;
  const limits={id:80,category:100,title:200,steps:3000,feedback:1000,materials:400,prompt:5000};
  for(const [key,max] of Object.entries(limits))if(typeof value[key]!=='string'||value[key].length>max||(!['prompt','materials'].includes(key)&&!value[key].trim()))return null;
  return snapshotOf(value);
}
const suggestedPeriod=()=>{const h=Number(new Intl.DateTimeFormat('en-GB',{timeZone:'Asia/Shanghai',hour:'2-digit',hour12:false}).format(new Date()));return h>=16||h<4?'evening':'morning';};
const initial=()=>({schema:STORAGE,mode:'pet',petName:'豆豆',petType:'dog',motion:true,activePeriod:suggestedPeriod(),flow:null,filters:{evening:'random',morning:'random'},days:{}});
let state=initial(),storageAvailable=true,page=['draw','library','rewards','week'].includes(location.hash.slice(1))?location.hash.slice(1):'draw',libraryPeriod='all',libraryCategory='all',libraryCategoriesOpen=false,celebrate=false;
let pendingWrite=false,damagedRaw=null,originalExported=false;
function validateLegacy(raw){
  if(!raw||raw.schema!==STORAGE||!raw.days||typeof raw.days!=='object'||Array.isArray(raw.days))throw Error('这不是有效的网站进度备份，或版本暂不支持');
  const clean=initial();
  if(Object.hasOwn(MODES,raw.mode))clean.mode=raw.mode;
  clean.petType=Object.hasOwn(PET_TYPES,raw.petType)?raw.petType:({pet:'dog',puzzle:'cat',garden:'rabbit'}[raw.mode]||'dog');
  if(typeof raw.motion==='boolean')clean.motion=raw.motion;
  if(['morning','evening','both'].includes(raw.activePeriod))clean.activePeriod=raw.activePeriod;
  if(typeof raw.petName==='string'&&raw.petName.trim())clean.petName=raw.petName.trim().slice(0,16);
  for(const p of ['evening','morning'])if(raw.filters?.[p]==='random'||CATEGORIES[p].includes(raw.filters?.[p]))clean.filters[p]=raw.filters[p];
  for(const [date,day] of Object.entries(raw.days)){
    if(!validDate(date)||!day||typeof day!=='object'||Array.isArray(day))throw Error('记录中包含无效日期，已停止恢复以保护原记录');
    const d={};
    for(const period of ['evening','morning']){
      const slot=day[period];if(slot==null)continue;
      const snapshot=slot.snapshot==null?null:historyActivity(slot.snapshot,slot.id,period);
      if(slot.snapshot!=null&&!snapshot)throw Error('活动快照格式无效，已停止恢复以保护原记录');
      const activity=snapshot||catalogLookup(slot.id);
      if(!activity||activity.period!==period)throw Error('记录含暂时无法识别的活动，请保留原文件并使用兼容版本恢复');
      const stamp=key=>{const value=slot[key];if(value==null)return null;if(!Number.isFinite(value)||value<=0||value>8640000000000000)throw Error('记录中包含无效完成时间');return value;};
      d[period]={id:activity.id,startedAt:stamp('startedAt'),completedAt:stamp('completedAt'),snapshot:snapshotOf(activity)};
    }
    clean.days[date]=d;
  }
  clean.flow=validateFlow(raw.flow);return clean;
}
const SCHEMA2='little-day-night/v2';
function taskId(){return crypto.randomUUID?crypto.randomUUID():'t-'+Date.now()+'-'+Math.random().toString(36).slice(2);}
function dayOf(t){return new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Shanghai',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(t));}
function validate(raw){
 if(!raw||![STORAGE,SCHEMA2].includes(raw.schema))throw Error('备份版本不受支持');
 const clean=validateLegacy({...raw,schema:STORAGE});clean.schema=SCHEMA2;clean.tasks=[];clean.current={};
 const validTask=(t)=>{
  if(!t||typeof t.uid!=='string'||!/^[a-zA-Z0-9-]{1,100}$/.test(t.uid)||!['morning','evening'].includes(t.period)||!['active','skipped'].includes(t.status))throw Error('任务记录无效');
  const snap=historyActivity(t.snapshot,t.id,t.period);if(!snap)throw Error('任务快照无效');
  if(t.completedAt!=null&&(!Number.isFinite(t.completedAt)||t.completedAt<=0||t.completedAt>8640000000000000))throw Error('完成时间无效');
  if(t.legacyDay!=null&&!validDate(t.legacyDay))throw Error('奖励日期无效');
  return {uid:t.uid,id:t.id,period:t.period,status:t.status,completedAt:t.completedAt??null,snapshot:snap,...(t.legacyDay?{legacyDay:t.legacyDay}:{})};
 };
 if(raw.schema===SCHEMA2){
  if(!Array.isArray(raw.tasks)||raw.tasks.length>50000)throw Error('任务数量无效');
  if(raw.photoSet!=null&&(typeof raw.photoSet!=='string'||!/^[a-zA-Z0-9-]{1,100}$/.test(raw.photoSet)))throw Error('照片分组无效');if(raw.photoSet)clean.photoSet=raw.photoSet;clean.tasks=raw.tasks.map(validTask);if(new Set(clean.tasks.map(t=>t.uid)).size!==clean.tasks.length)throw Error('任务编号重复');
  for(const period of ['morning','evening']){const uid=raw.current?.[period];if(uid!=null){if(!clean.tasks.some(t=>t.uid===uid&&t.period===period&&t.status==='active'))throw Error('当前卡片无效');clean.current[period]=uid;}}
 }else{
  for(const date of Object.keys(clean.days).sort())for(const period of ['morning','evening']){const t=clean.days[date][period];if(t){const item={...t,uid:'legacy-'+date+'-'+period,period,status:'active',legacyDay:date};clean.tasks.push(item);clean.current[period]=item.uid;}}
 }
 return clean;
}
function ensureLedger(){if(!state.tasks){state=validate(state);}}
function rewardIds(){ensureLedger();const seen=new Set(),ids=new Set();for(const t of [...state.tasks].filter(t=>t.completedAt).sort((a,b)=>a.completedAt-b.completedAt)){const key=(t.legacyDay||dayOf(t.completedAt))+'/'+t.period;if(!seen.has(key)){seen.add(key);ids.add(t.uid);}}return ids;}
function credited(uid){return rewardIds().has(uid);}
function read(){
  if(pendingWrite||damagedRaw!==null)return false;
  let raw=null;
  try{raw=AdventurePlatform.storage.getItem(STORAGE);if(raw!==null)state=validate(JSON.parse(raw));storageAvailable=true;return true;}
  catch{storageAvailable=false;if(raw!==null){damagedRaw=raw;originalExported=false;}return false;}
}
function save({replaceDamaged=false}={}){
  if(damagedRaw!==null&&!replaceDamaged){storageAvailable=false;pendingWrite=true;storageStatus();return false;}
  try{ensureLedger();if(AdventurePlatform.storage.getItem(STORAGE)&&!AdventurePlatform.storage.getItem('little-day-night/pre-v2')){AdventurePlatform.storage.setItem('little-day-night/pre-v2',AdventurePlatform.storage.getItem(STORAGE));}AdventurePlatform.storage.setItem(STORAGE,JSON.stringify(state));storageAvailable=true;pendingWrite=false;damagedRaw=null;originalExported=false;}
  catch{storageAvailable=false;pendingWrite=true;}
  storageStatus();return storageAvailable;
}
function storageStatus(){
  $('saved').textContent=storageAvailable?'进度已保存在本机':'尚未保存，请下载备份';
  const panel=$('storage-recovery');if(panel)panel.hidden=damagedRaw===null;
  const warning=$('storage-warning');if(warning)warning.hidden=storageAvailable||damagedRaw!==null;
}
function today(){ensureLedger();return Object.fromEntries(['morning','evening'].map(p=>[p,state.tasks.find(t=>t.uid===state.current[p])]));}
function completions(){ensureLedger();return state.tasks.filter(t=>t.completedAt).map(t=>({...t,date:dayOf(t.completedAt)})).sort((a,b)=>b.completedAt-a.completedAt);}
function total(){return rewardIds().size;}
function choose(period,oldId){const pool=ACTS.filter(a=>a.period===period&&a.id!==oldId);return pool[Math.floor(Math.random()*pool.length)];}
function replaceTask(period,a){ensureLedger();const old=today()[period];if(old&&!old.completedAt)old.status='skipped';const t={uid:taskId(),id:a.id,period,status:'active',completedAt:null,snapshot:snapshotOf(a)};state.tasks.push(t);state.current[period]=t.uid;}
function draw(period){const old=today()[period];if(old?.completedAt)return false;replaceTask(period,choose(period,old?.id));return true;}
function drawPair(){if(flowBusy||restoreBusy)return;read();ensureDaily();const pending=['morning','evening'].filter(p=>!today()[p].completedAt).map(p=>p==='morning'?'早上':'晚上');if(pending.length&&!confirm(pending.join('和')+'冒险未完成，仍要抽取新的早晚两张卡片吗？'))return;for(const p of ['morning','evening'])replaceTask(p,choose(p,today()[p]?.id));save();render({draw:['morning','evening']});say('新的一组已抽好，卡片会一直保留到你主动更换。');}
function say(text,error=false){$('message').textContent=text;$('message').classList.toggle('error',error);}
