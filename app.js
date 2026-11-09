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
let state=initial(),storageAvailable=true,page=['draw','library','rewards'].includes(location.hash.slice(1))?location.hash.slice(1):'draw',libraryPeriod='all',libraryCategory='all',libraryCategoriesOpen=false,celebrate=false;
let pendingWrite=false,damagedRaw=null,originalExported=false;
function validate(raw){
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
function read(){
  if(pendingWrite||damagedRaw!==null)return false;
  let raw=null;
  try{raw=localStorage.getItem(STORAGE);if(raw!==null)state=validate(JSON.parse(raw));storageAvailable=true;return true;}
  catch{storageAvailable=false;if(raw!==null){damagedRaw=raw;originalExported=false;}return false;}
}
read();
function save({replaceDamaged=false}={}){
  if(damagedRaw!==null&&!replaceDamaged){storageAvailable=false;pendingWrite=true;storageStatus();return false;}
  try{localStorage.setItem(STORAGE,JSON.stringify(state));storageAvailable=true;pendingWrite=false;damagedRaw=null;originalExported=false;}
  catch{storageAvailable=false;pendingWrite=true;}
  storageStatus();return storageAvailable;
}
function storageStatus(){
  $('saved').textContent=storageAvailable?'进度已保存在本机':'尚未保存，请下载备份';
  const panel=$('storage-recovery');if(panel)panel.hidden=damagedRaw===null;
  const warning=$('storage-warning');if(warning)warning.hidden=storageAvailable||damagedRaw!==null;
}
function today(){const date=nowDay();if(!state.days[date])state.days[date]={};return state.days[date];}
function completions(){return Object.entries(state.days).flatMap(([date,day])=>['evening','morning'].filter(p=>day[p]?.completedAt).map(period=>({date,period,...day[period]}))).sort((a,b)=>b.completedAt-a.completedAt);}
function total(){return completions().length;}
function choose(period,oldId){const pool=ACTS.filter(a=>a.period===period&&a.id!==oldId);return pool[Math.floor(Math.random()*pool.length)];}
function draw(period){const d=today();if(d[period]?.completedAt)return false;const a=choose(period,d[period]?.id);d[period]={id:a.id,startedAt:null,completedAt:null,snapshot:snapshotOf(a)};return true;}
function say(text,error=false){$('message').textContent=text;$('message').classList.toggle('error',error);}
function promptBlock(a){
  return a.prompt?`<details class="ai-prompt"><summary>展开 AI 提示词</summary><label class="visually-hidden" for="prompt-${a.id}">可复制的活动提示词</label><textarea id="prompt-${a.id}" readonly>${escapeHTML(a.prompt)}</textarea><button type="button" class="small" data-copy="${a.id}">复制提示词</button><p class="ai-note">需自行打开 AI 工具执行。本网站不调用 AI；最多修改一次，拿到小成品就收尾。</p></details>`:'';
}
function icon(name){
  const paths={
    sun:'<circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M5 19l1.5-1.5m11-11L19 5"/>',
    moon:'<path d="M20 14.5A8.5 8.5 0 0 1 9.5 4a8.5 8.5 0 1 0 10.5 10.5Z"/>',
    shuffle:'<path d="M4 7h3c5 0 5 10 10 10h3m-3-3 3 3-3 3M4 17h3q2 0 4-4m3-3q1-3 6-3m-3-3 3 3-3 3"/>',
    check:'<path d="m7 12 3 3 7-7"/><path d="M8 3q4-3 8 0l4 4q3 5 0 10l-4 4q-4 3-8 0l-4-4q-3-5 0-10Z"/>',
    paw:'<ellipse cx="12" cy="15" rx="6" ry="4.5"/><ellipse cx="5" cy="8" rx="2" ry="3" transform="rotate(-25 5 8)"/><ellipse cx="10" cy="5" rx="2" ry="3"/><ellipse cx="16" cy="6" rx="2" ry="3" transform="rotate(15 16 6)"/><ellipse cx="20" cy="11" rx="1.7" ry="2.5" transform="rotate(30 20 11)"/>',
    cards:'<rect x="5" y="5" width="14" height="16" rx="3"/><path d="M8 2h11q3 0 3 3v12M9 10h6m-6 4h3"/>',
    book:'<path d="M12 6Q7 2 2 5v15q5-3 10 1 5-4 10-1V5q-5-3-10 1Zm0 0v15M5 9h3m8 0h3"/>',
    home:'<path d="m3 11 9-8 9 8v9H3Zm6 9v-6h6v6"/><path d="m7 5-2-2m12 2 2-2"/>',
    undo:'<path d="m8 4-5 5 5 5M3 9h10a6 6 0 1 1 0 12h-2"/>',
    spark:'<path d="m12 3 2.5 6.5L21 12l-6.5 2.5L12 21l-2.5-6.5L3 12l6.5-2.5ZM20 2v4m-2-2h4"/>',
    pencil:'<path d="m5 15 11-11q2-2 4 0t0 4L9 19l-6 2Zm9-9 4 4M5 15l4 4"/>',
    cup:'<path d="M4 9h12v8q0 4-6 4t-6-4Zm12 1h2a3 3 0 0 1 0 6h-2M7 3v2m5-3v3"/>',
    leaf:'<path d="M19 3Q2 2 4 15q2 9 11 3 5-4 4-15ZM5 20l10-12m-5 6v-4"/>',
    thread:'<path d="M8 3h8v4q5 5 0 10v4H8v-4q-5-5 0-10Zm-1 7h10M7 14h10m9 2v5"/>',
    heart:'<path d="M12 21 3 12C-2 3 9 0 12 7c3-7 14-4 9 5Z"/>',
    compass:'<circle cx="12" cy="12" r="9"/><path d="m16 8-2 6-6 2 2-6Z"/>',
    brush:'<path d="m11 13 8-10q3-2 3 1l-8 11M10 13q-7-2-6 5 0 3-2 3 9 3 10-5"/>',
    drop:'<path d="M12 2S4 11 4 16a8 8 0 0 0 16 0c0-5-8-14-8-14ZM8 16q0 4 4 4"/>',
    wand:'<path d="m4 20 12-12m-3-3 6 6M5 3v4M3 5h4m12 10v5m-2-2h4"/>',
    robot:'<rect x="4" y="7" width="16" height="14" rx="5"/><path d="M12 7V3m-2 0h4M1 12v5m22-5v5M8 12h.1m8 0h.1m-8 5q4 3 8 0"/>',
    both:'<circle cx="8" cy="12" r="5"/><path d="M8 3V1m0 22v-2M1 12H0m18-8a8 8 0 1 0 5 14 8 8 0 0 1-5-14Z"/>',
    chevron:'<path d="m7 10 5 5 5-5"/>',play:'<path d="m8 5 11 7-11 7Z"/>'
  };
  return `<svg class="cute-icon" viewBox="0 0 24 24" aria-hidden="true">${paths[name]||paths.spark}</svg>`;
}
const CATEGORY_ICONS={'纸笔放空':'pencil','感官放松':'cup','小狗陪伴':'paw','安静发现':'leaf','轻手作':'thread','温柔收尾':'heart','附近探索':'compass','纸笔创作':'brush','感官唤醒':'drop','小狗互动':'paw','小小焕新':'wand','AI 小创作':'robot'};
function categoryBadge(category){return `<span class="category-badge" data-category="${escapeHTML(category)}"><span class="category-symbol">${icon(CATEGORY_ICONS[category])}</span>${escapeHTML(category)}</span>`;}
function formatMinute(stamp){return new Intl.DateTimeFormat('zh-CN',{timeZone:'Asia/Shanghai',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hour12:false}).format(new Date(stamp));}
function ensureDaily(){
  if(!['morning','evening'].includes(state.activePeriod))state.activePeriod=suggestedPeriod();
  let changed=false;
  for(const p of ['morning','evening'])if(!today()[p]){
    const draft=state.flow?.date===nowDay()?catalogLookup(state.flow.drafts?.[p]):null;
    if(draft?.period===p)today()[p]={id:draft.id,startedAt:null,completedAt:null,snapshot:snapshotOf(draft)};
    else draw(p);
    changed=true;
  }
  if(changed)save();
}
function ticket(p){
  const slot=today()[p],a=slot.snapshot||lookup(slot.id),done=!!slot.completedAt;
  return `<article class="ticket ${p} ${done?'is-done':''} ${celebrate&&done&&p===state.activePeriod?'just-completed':''}" data-period="${p}" data-card-period="${p}" id="card-${p}" tabindex="0" aria-label="${escapeHTML(a.title)}${done?'，已完成':'，左右滑动切换早晚'}"><div class="ticket-body"><div class="card-meta">${categoryBadge(a.category)}<span class="minute-pill">${a.minutes} 分钟</span></div><div class="drawn"><h3 id="activity-${p}" tabindex="-1">${escapeHTML(a.title)}</h3><p class="steps">${escapeHTML(a.steps)}</p><p class="feedback">${icon('spark')}<span>${escapeHTML(a.feedback)}</span></p><p class="materials">准备：${escapeHTML(a.materials)}</p>${!done?promptBlock(a):''}</div>${done?`<div class="completion-seal" id="receipt-${p}" tabindex="-1">${icon('check')}<strong>这件小事，做到了。</strong><span>＋1 份成长</span></div><div class="ticket-actions done-actions"><button type="button" class="quiet" data-undo="${p}">${icon('undo')}还未完成</button></div>`:`<div class="ticket-actions"><button type="button" class="complete" data-complete="${p}">${icon('check')}做完了</button><button type="button" class="swap-card" data-draw="${p}">${icon('shuffle')}换一张</button></div>`}</div></article>`;
}
function drawPage(){
  ensureDaily();
  return `<section class="daily-picker"><h1>今天，留一点小快乐。</h1><p class="pager-hint">左右滑动，切换早晚</p><div class="day-pager" id="day-pager" tabindex="0" role="group" aria-label="早上与晚上两个页面，可左右滚动">${['morning','evening'].map(p=>`<section class="day-panel ${p}" data-day-panel="${p}" aria-label="${p==='morning'?'早上':'晚上'}"><div class="day-heading"><span class="period-art">${icon(p==='morning'?'sun':'moon')}</span><div><h2>${p==='morning'?'早上':'晚上'}</h2><p>${p==='morning'?'醒来，发现一点新鲜。':'睡前，轻轻收个尾。'}</p></div></div>${ticket(p)}</section>`).join('')}</div><div class="pager-dots" aria-hidden="true"><i data-dot="morning"></i><i data-dot="evening"></i></div></section>`;
}
function libraryPage(){
  const cats=libraryPeriod==='all'?[...new Set(Object.values(CATEGORIES).flat())]:CATEGORIES[libraryPeriod];
  if(!cats.includes(libraryCategory))libraryCategory='all';
  const list=ACTS.filter(a=>(libraryPeriod==='all'||a.period===libraryPeriod)&&(libraryCategory==='all'||a.category===libraryCategory));
  return `<section class="activity-library"><div class="intro"><h1>总有一点你想试的。</h1></div><div class="library-periods" role="group" aria-label="活动时段">${[['morning','早间','sun'],['evening','晚间','moon'],['all','早晚都看看','both']].map(([p,label,key])=>`<button type="button" data-library-period="${p}" aria-pressed="${libraryPeriod===p}">${icon(key)}<span>${label}</span></button>`).join('')}</div><details class="category-drawer" ${libraryCategoriesOpen?'open':''}><summary><span>${icon('spark')}类别 · ${escapeHTML(libraryCategory==='all'?'全部类别':libraryCategory)}</span>${icon('chevron')}</summary><div class="category-filters" role="group" aria-label="活动类别"><button type="button" data-library-category="all" aria-pressed="${libraryCategory==='all'}">${icon('spark')}全部类别</button>${cats.map(c=>`<button type="button" data-library-category="${escapeHTML(c)}" aria-pressed="${libraryCategory===c}">${icon(CATEGORY_ICONS[c])}${escapeHTML(c)}</button>`).join('')}</div></details><p class="library-status">${list.length} 个小活动</p><div class="library-list">${list.map(a=>`<article class="activity-row"><div class="meta"><span class="row-period">${icon(a.period==='morning'?'sun':'moon')}${a.period==='morning'?'早间':'晚间'} · ${a.minutes} 分钟</span>${categoryBadge(a.category)}</div><div><h2>${escapeHTML(a.title)}</h2><p>${escapeHTML(a.feedback)}</p><details><summary>看看怎么做</summary><p>${escapeHTML(a.steps)}</p><p>准备：${escapeHTML(a.materials)}</p></details>${promptBlock(a)}</div><button type="button" class="small" data-use="${a.id}" ${today()[a.period]?.completedAt?'disabled':''}>${today()[a.period]?.completedAt?'该时段已完成':'就选这个'}</button></article>`).join('')}</div></section>`;
}
function petPanel(){
  const n=total(),type=state.petType,{i,current,next,from,to,stars,gift}=petStage(n);
  const value=n-from,max=to-from;
  return `<section class="pet-home" aria-labelledby="pet-home-title"><div class="pet-home-heading"><h1 id="pet-home-title">一起，长大一点点。</h1><p>每完成一件小事，伙伴就多一份成长。</p></div><div class="pet-choices" role="group" aria-label="选择宠物类型">${Object.entries(PET_TYPES).map(([key,pet])=>`<button type="button" data-pet="${key}" aria-pressed="${type===key}"><span class="pet-choice-art" aria-hidden="true">${petArt(key,n)}</span>${pet.short}</button>`).join('')}</div><div class="pet-scene" data-current-pet="${type}">${petArt(type,n)}</div><div class="pet-caption"><h2>${PET_TYPES[type].title} · ${current.title}</h2><p>累计 ${n} 份成长${stars?` · ${stars} 颗陪伴星`:''}</p></div><progress class="pet-meter" value="${value}" max="${max}" aria-label="${gift}成长进度"></progress><p class="pet-next">${gift}<br>这一程 ${value} / ${max}，再完成 ${to-n} 次活动。</p><p class="pet-rules">6 次长成青年，20 次长成成年。<br>成年后每 10 次获得一颗陪伴星，三位伙伴共享成长。</p></section>`;
}
function mountLibrary(){const drawer=document.querySelector('.category-drawer');if(drawer)drawer.addEventListener('toggle',()=>{libraryCategoriesOpen=drawer.open;});}

function rewardsPage(){
  const records=completions();
  return `${petPanel()}<section class="history"><h2 class="history-title">最近的小冒险</h2>${records.length?records.slice(0,50).map(r=>{const a=r.snapshot||lookup(r.id);return `<article class="history-row"><div class="history-symbol">${icon(r.period==='morning'?'sun':'moon')}</div><div class="history-copy"><h2>${escapeHTML(a.title)}</h2>${categoryBadge(a.category)}<time datetime="${new Date(r.completedAt).toISOString()}">${formatMinute(r.completedAt)}</time></div><span class="history-credit">${icon('spark')}＋1</span></article>`;}).join(''):`<div class="empty-history">${icon('book')}<p>做过的小事，会在这里留下。</p></div>`}</section>`;
}
function focusKey(element){
  if(!element||element===document.body)return null;
  if(element.id)return '#'+CSS.escape(element.id);
  for(const key of ['libraryPeriod','libraryCategory','draw','start','complete','undo','mode','periodSwitch','use','action'])if(element.dataset?.[key])return `[data-${key.replace(/[A-Z]/g,m=>'-'+m.toLowerCase())}="${CSS.escape(element.dataset[key])}"]`;
  return null;
}
function motionEnabled(){return state.motion&&!matchMedia('(prefers-reduced-motion: reduce)').matches;}
function drawMotion(periods){
  if(!motionEnabled())return;
  for(const p of periods){const el=document.querySelector(`[data-card-period="${p}"]`);if(el)el.animate([{transform:'translateY(28px) rotate(-7deg) scale(.9)',opacity:.15},{transform:'translateY(-7px) rotate(2deg) scale(1.025)',opacity:1},{transform:'translateY(0) rotate(0) scale(1)',opacity:1}],{duration:620,easing:'cubic-bezier(.16,1,.3,1)'});}
}
function render(options={}){
  const focus=options.focus||focusKey(document.activeElement);
  today();document.documentElement.dataset.motion=motionEnabled()?'on':'off';
  document.querySelectorAll('[data-page]').forEach(a=>a.setAttribute('aria-current',a.dataset.page===page?'page':'false'));
  $('view').innerHTML=page==='library'?libraryPage():page==='rewards'?rewardsPage():drawPage();
  $('motion-toggle').checked=state.motion;storageStatus();mountPager();mountLibrary();syncMenu();
  if(focus){const target=document.querySelector(focus);target?.focus({preventScroll:true});if(target?.matches('h1,h2,h3')){target.tabIndex=-1;target.focus({preventScroll:true});}if(options.reveal)target?.scrollIntoView({block:'nearest',behavior:'instant'});}
  if(options.draw)drawMotion(options.draw);
  if(!storageAvailable)say(damagedRaw!==null?'原记录暂时无法读取，已保留。请先下载原始记录，再恢复有效备份。':'浏览器暂时无法保存。本页进度仍在，离开前请下载进度备份。',true);
  celebrate=false;
}
function go(p){
  if(!['draw','library','rewards'].includes(p))return;
  document.querySelector('.app-menu').open=false;page=p;history.pushState(null,'','#'+p);render();
  const heading=$('view').querySelector('h1');heading.tabIndex=-1;heading.focus({preventScroll:true});window.scrollTo({top:0,behavior:'instant'});
}
function complete(p){
  if(flowBusy)return;read();const slot=today()[p];if(!slot){say('先抽一张活动签，再开始吧。');return;}
  if(slot.completedAt){say('这份成长已经领取过啦。');return;}
  state.activePeriod=p;slot.snapshot=slot.snapshot||snapshotOf(lookup(slot.id));slot.completedAt=Date.now();save();celebrate=true;
  render({focus:'#receipt-'+p,reveal:true});celebrateCompletion(p);say('＋1 份成长。'+petReward(total())+'。');
}
function undoComplete(p){
  read();const slot=today()[p];if(!slot?.completedAt)return;
  state.activePeriod=p;slot.completedAt=null;save();render({focus:`[data-complete="${p}"]`,reveal:true});
  say('已恢复为未完成，累计成长也已同步。');
}
function download(text,name,type){const url=URL.createObjectURL(new Blob([text],{type})),a=document.createElement('a');a.href=url;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),30000);}
function exportLog(){const rows=completions().map(r=>{const a=r.snapshot||lookup(r.id);return `## ${r.date} ${r.period==='evening'?'晚间':'早晨'}\n\n活动：${a.title}\n类别：${a.category}\n做法：${a.steps}\n确认完成时间：${formatMinute(r.completedAt)}\n奖励：1 份成长\n`;});download(`# 早晚小冒险记录\n\n累计完成：${total()} 次\n说明：完成情况由用户自行确认，不代表睡眠效果。\n\n${rows.join('\n')||'暂无完成记录。'}`,`早晚小冒险记录_${nowDay()}.md`,'text/markdown;charset=utf-8');}
document.addEventListener('click',async event=>{
  const link=event.target.closest('a[data-page],a.brand');if(link&&!event.ctrlKey&&!event.metaKey&&!event.shiftKey&&!event.altKey){event.preventDefault();go(link.dataset.page||'draw');return;}
  const b=event.target.closest('button');if(!b||b.disabled)return;const d=b.dataset;
  if(d.draw){redraw(d.draw);return;}
  if(d.pet&&Object.hasOwn(PET_TYPES,d.pet)){state.petType=d.pet;save();render({focus:`[data-pet="${d.pet}"]`});say('伙伴换好啦，成长和已获得的配饰都还在。');return;}
  if(d.complete)complete(d.complete);
  if(d.undo)undoComplete(d.undo);
  if(d.go)go(d.go);
  if(d.use){const a=lookup(d.use);if(!a||today()[a.period]?.completedAt)return;if(today()[a.period]?.startedAt&&!confirm('是否用这个活动替换正在进行的活动？'))return;today()[a.period]={id:a.id,startedAt:null,completedAt:null,snapshot:snapshotOf(a)};ensureFlow().step='result';state.activePeriod=a.period;state.filters[a.period]=a.category;save();go('draw');drawMotion([a.period]);say('活动已放进今日的签。');}
  if(d.copy){const a=lookup(d.copy);try{await navigator.clipboard.writeText(a.prompt);say('提示词已复制，拿到一个成品就收尾。');b.textContent='已复制';}catch{document.querySelector(`#prompt-${a.id}`)?.select();say('提示词已选中，请手动复制。');}}
  if(d.action==='backup-original'&&damagedRaw!==null){download(damagedRaw,'早晚小冒险-原始记录.json','application/json;charset=utf-8');originalExported=true;say('原始记录已发起下载。请确认文件已保存，再决定是否重新开始。');}
  if(d.action==='reset-damaged'&&damagedRaw!==null){if(!originalExported){say('请先下载并保存原始记录，再重新开始。',true);return;}if(!confirm('请确认原始记录已保存。重新开始会替换当前浏览器里的原记录，是否继续？'))return;state=initial();save({replaceDamaged:true});render();if(storageAvailable)say('已重新开始，原始记录可从下载的文件保留。');}
  if(d.action==='export')download(JSON.stringify(state,null,2),`早晚小冒险备份_${nowDay()}.json`,'application/json;charset=utf-8');
  if(d.action==='export-log')exportLog();
});
document.addEventListener('change',event=>{
  const target=event.target,p=target.dataset.filter;
  if(target.id==='motion-toggle'){state.motion=target.checked;save();document.documentElement.dataset.motion=motionEnabled()?'on':'off';if(!motionEnabled())document.getAnimations().forEach(a=>a.cancel());say(state.motion?'动效已开启；系统减少动态效果设置仍然优先。':'动效已关闭，功能和成长照常保留。');}
});
$('import').addEventListener('change',async event=>{const f=event.target.files[0];if(!f)return;try{if(f.size>2000000)throw Error('文件超过 2MB');const restored=validate(JSON.parse(await f.text()));if(!confirm('恢复将替换当前浏览器的全部进度，建议先下载当前备份。继续恢复吗？'))return;state=restored;const saved=save({replaceDamaged:true});render();say(saved?'备份已恢复。':'备份已载入本页，但浏览器未能保存。请下载进度备份后再离开。',!saved);}catch(error){say('恢复失败：'+error.message+'。当前进度没有改变。',true);}finally{event.target.value='';}});
function readRoute(){const p=location.hash.slice(1);if(['draw','library','rewards'].includes(p)&&p!==page){page=p;render();}}
window.addEventListener('hashchange',readRoute);window.addEventListener('popstate',readRoute);
window.addEventListener('storage',event=>{if(event.key===STORAGE){read();render();}});
matchMedia('(prefers-reduced-motion: reduce)').addEventListener('change',()=>{document.documentElement.dataset.motion=motionEnabled()?'on':'off';if(!motionEnabled())document.getAnimations().forEach(a=>a.cancel());});
let shownDate=nowDay();window.addEventListener('focus',()=>{const date=nowDay();if(date!==shownDate){shownDate=date;state.activePeriod=suggestedPeriod();ensureFlow();render();say('新的一天到了，今天的两张签已准备好。');}});

function validateFlow(raw){
  if(!raw||typeof raw!=='object'||!validDate(raw.date)||!['intro','evening','morning','result'].includes(raw.step))return null;
  const f={date:raw.date,step:raw.step,drafts:{},candidates:{},seen:{evening:[],morning:[]}};
  for(const p of ['evening','morning']){
    if(catalogLookup(raw.drafts?.[p])?.period===p)f.drafts[p]=raw.drafts[p];
    if(catalogLookup(raw.candidates?.[p])?.period===p)f.candidates[p]=raw.candidates[p];
    if(Array.isArray(raw.seen?.[p]))f.seen[p]=[...new Set(raw.seen[p].filter(id=>catalogLookup(id)?.period===p))].slice(-36);
  }
  return f;
}

// Retain old draft data for backup compatibility; the UI now opens two daily pages.
function ensureFlow(){if(!state.flow||state.flow.date!==nowDay())state.flow={date:nowDay(),step:'result',drafts:{},candidates:{},seen:{morning:[],evening:[]}};return state.flow;}
let flowBusy=false,dragSession=null;
function syncMenu(){
  document.querySelectorAll('[data-icon]').forEach(el=>{el.innerHTML=icon(el.dataset.icon);});
  document.querySelector('.menu-title').textContent={draw:'抽签台',library:'活动图鉴',rewards:'奖励小屋'}[page];
}
function mountPager(){
  const pager=$('day-pager');if(!pager)return;
  const index=state.activePeriod==='evening'?1:0;
  pager.scrollLeft=index*pager.clientWidth;
  const sync=()=>{
    if(!pager.isConnected)return;
    const p=pager.scrollLeft/pager.clientWidth>.5?'evening':'morning';
    document.querySelectorAll('[data-dot]').forEach(el=>el.classList.toggle('active',el.dataset.dot===p));
    if(state.activePeriod!==p){state.activePeriod=p;save();}
  };
  sync();let raf=0;
  pager.addEventListener('scroll',()=>{cancelAnimationFrame(raf);raf=requestAnimationFrame(sync);},{passive:true});
}
async function redraw(p,direction=-1){
  if(flowBusy)return;read();if(today()[p]?.completedAt)return;
  state.activePeriod=p;const expected=today()[p]?.id,el=$('card-'+p);flowBusy=true;
  try{
    if(el&&motionEnabled())await el.animate([{transform:el.style.transform||'none',opacity:1},{transform:`translateX(${direction*240}px) rotate(${direction*16}deg) scale(.9)`,opacity:0}],{duration:280,easing:'ease-in',fill:'forwards'}).finished.catch(()=>{});
    if(page!=='draw'||today()[p]?.completedAt||today()[p]?.id!==expected)return;
    draw(p);save();render({draw:[p],focus:'#card-'+p});say('新的一张，看看合不合心意。');
  }finally{flowBusy=false;dragSession=null;}
}
function celebrateCompletion(p){
  if(!motionEnabled())return;
  document.querySelector('.reward-burst')?.remove();
  const burst=document.createElement('div');burst.className='reward-burst';burst.setAttribute('aria-hidden','true');
  burst.innerHTML=`<div class="reward-pop"><div class="celebration-pet">${petArt(state.petType,total())}</div><strong>＋1 份成长</strong><span>${petReward(total())}</span></div>`+Array.from({length:14},(_,i)=>`<i style="--angle:${i*360/14}deg;--delay:${i%3*30}ms;--flight:${95+i%4*23}px">${icon(i%2?'heart':'spark')}</i>`).join('');
  document.body.append(burst);setTimeout(()=>burst.remove(),1500);
}
function resetSwipe(){
  
  dragSession=null;
}
document.addEventListener('click',event=>{
  const b=event.target.closest('[data-library-period],[data-library-category]');
  if(b){
    libraryCategoriesOpen=!!document.querySelector('.category-drawer')?.open;
    if(b.dataset.libraryPeriod){libraryPeriod=b.dataset.libraryPeriod;libraryCategory='all';}
    if(b.dataset.libraryCategory)libraryCategory=b.dataset.libraryCategory;
    render();document.querySelector(b.dataset.libraryPeriod?`[data-library-period="${libraryPeriod}"]`:`[data-library-category="${CSS.escape(libraryCategory)}"]`)?.focus({preventScroll:true});
  }
  if(!event.target.closest('.app-menu'))document.querySelector('.app-menu').open=false;
});
const menu=document.querySelector('.app-menu');
menu.addEventListener('toggle',()=>menu.querySelector('summary').setAttribute('aria-expanded',String(menu.open)));
document.addEventListener('keydown',event=>{
  if(event.key==='Escape'&&menu.open){menu.open=false;menu.querySelector('summary').focus();return;}
  if(event.key!=='ArrowLeft'&&event.key!=='ArrowRight')return;
  const pager=$('day-pager');
  if(pager&&(event.target.id==='day-pager'||event.target.matches('[data-card-period]'))){event.preventDefault();pager.scrollTo({left:event.key==='ArrowLeft'?0:pager.clientWidth,behavior:motionEnabled()?'smooth':'instant'});}
});
document.addEventListener('pointerdown',event=>{
  if(event.pointerType==='touch'||flowBusy||event.button!==0||event.target.closest('button,a,input,select,textarea,details'))return;
  const pager=$('day-pager');if(!pager?.contains(event.target))return;
  dragSession={id:event.pointerId,x:event.clientX,y:event.clientY,dx:0,horizontal:false,offset:pager.scrollLeft};pager.setPointerCapture(event.pointerId);
});
document.addEventListener('pointermove',event=>{
  const d=dragSession;if(!d||d.id!==event.pointerId||flowBusy)return;
  const dx=event.clientX-d.x,dy=event.clientY-d.y;d.dx=dx;
  if(!d.horizontal&&Math.abs(dy)>12&&Math.abs(dy)>Math.abs(dx)){resetSwipe();return;}
  if(Math.abs(dx)>10&&Math.abs(dx)>Math.abs(dy))d.horizontal=true;
  if(d.horizontal&&$('day-pager'))$('day-pager').scrollLeft=d.offset-dx;
});
document.addEventListener('pointerup',event=>{
  const d=dragSession;if(!d||d.id!==event.pointerId||flowBusy)return;
  const pager=$('day-pager');if(pager)pager.scrollTo({left:Math.abs(d.dx)>45?(d.dx<0?pager.clientWidth:0):Math.round(d.offset/pager.clientWidth)*pager.clientWidth,behavior:motionEnabled()?'smooth':'instant'});
  resetSwipe();
});
document.addEventListener('pointercancel',()=>{if(!flowBusy)resetSwipe();});
document.addEventListener('lostpointercapture',()=>{if(!flowBusy)resetSwipe();});
window.addEventListener('blur',()=>{if(!flowBusy)resetSwipe();});
ensureFlow();render();
