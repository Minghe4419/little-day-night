'use strict';
async function renderMemoryReport(mode,date){return (await renderMemoryReportPages(mode,date))[0];}
async function renderMemoryReportPages(mode,date){
 const [from,to]=reportRange(date,mode),records=completions().filter(r=>r.date>=from&&r.date<=to),credits=rewardIds(),petType=state.petType,n=total(),photoSet=state.photoSet||'main',weekly=mode==='week',currentCards=JSON.parse(JSON.stringify(today()));
 const color={paper:'#f8f6eb',ink:'#354039',muted:'#65715d',mint:'#e4eddb',line:'#d4cbb7',white:'#fffdf5',yellow:'#fae7a8',night:'#dce2ef'};
 const canvas=document.createElement('canvas');canvas.width=720;const shown=records;canvas.height=1020;const c=canvas.getContext('2d');
 function box(x,y,w,h,fill,r=22){c.fillStyle=fill;c.beginPath();c.roundRect(x,y,w,h,r);c.fill();}
 function text(t,x,y,size=20,weight=400,fill=color.ink){c.fillStyle=fill;c.font=`${weight} ${size}px -apple-system,BlinkMacSystemFont,"PingFang SC",sans-serif`;c.fillText(t,x,y);}
 function wrap(t,x,y,width,size=22,max=2){c.font=`500 ${size}px -apple-system,BlinkMacSystemFont,"PingFang SC",sans-serif`;const lines=[];let line='';for(const ch of Array.from(t)){if(c.measureText(line+ch).width>width&&line){lines.push(line);line=ch;}else line+=ch;}if(line)lines.push(line);lines.slice(0,max).forEach((v,i)=>text(v+(i===max-1&&lines.length>max?'…':''),x,y+i*(size+10),size,500));return Math.min(lines.length,max)*(size+10);}
 async function image(src){const i=new Image();i.src=src;await i.decode();return i;}
 function fit(img,x,y,w,h){const scale=Math.min(w/img.width,h/img.height);c.drawImage(img,x+(w-img.width*scale)/2,y+(h-img.height*scale)/2,img.width*scale,img.height*scale);}
 async function photo(r){try{const b=await photoOp('readonly',photoSet+':'+r.uid);if(!b)return null;const u=URL.createObjectURL(b);try{return await image(u);}finally{URL.revokeObjectURL(u);}}catch{return null;}}
 box(0,0,720,canvas.height,color.paper,0);box(44,49,22,22,'#f3ce70',11);text('早晚小冒险',80,68,18,600);
 text(weekly?'这一周，':'今天，也有',44,164,46,650);text(weekly?'一起长大一点。':'小小的闪光。',44,226,46,650);
 const pet=await image(PET_IMAGES[petType][petStage(n).i]);c.save();c.beginPath();c.roundRect(476,103,200,200,38);c.clip();fit(pet,476,103,200,200);c.restore();
 text(from===to?from.replaceAll('-',' / '):from.replaceAll('-',' / ')+' — '+to.slice(5).replace('-',' / '),44,278,18,400,color.muted);
 text(weekly?'有散步、有放空，':'和'+PET_TYPES[petType].title+'一起，',44,350,22);text(weekly?'也有给自己留白的日子。':`收藏了 ${records.length} 件生活里的小冒险。`,44,389,22);
 const growth=records.filter(r=>credits.has(r.uid)).length;box(44,426,632,76,color.mint);text((weekly?'收获 ':'今天收获 ＋')+growth+' 份成长',68,473,24,600);const missing=['morning','evening'].filter(p=>!records.some(r=>r.period===p)).map(p=>p==='morning'?'早上':'晚上');text(weekly?'一点点，也算数':missing.length?'未完成：'+missing.join('、'):'早晚冒险都完成了',weekly?478:missing.length===2?430:455,473,16);
 if(!weekly){
  text('今日早晚冒险',44,559,25,600);
  for(const [i,period] of ['morning','evening'].entries()){const entries=records.filter(r=>r.period===period),task=entries[0]||(date===nowDay()?currentCards[period]:null),x=44+i*326;box(x,588,306,260,color.white);c.strokeStyle=color.line;c.lineWidth=1;c.stroke();box(x+24,612,22,22,period==='morning'?color.yellow:color.night,11);text(period==='morning'?'早上':'晚上',x+58,630,18,500);text(entries.length?'已完成 '+entries.length+' 次':'未完成',x+24,680,24,600,entries.length?'#4e7553':color.muted);wrap(task?.snapshot?.title||'这一天尚无完成记录',x+24,728,258,21,2);text(entries.length?'成长 ＋'+entries.filter(r=>credits.has(r.uid)).length:'留一点空白，也没关系。',x+24,821,16,400,color.muted);}
 }else{
  text(records.length+' 次小冒险',44,561,30,600);text('早间 '+records.filter(r=>r.period==='morning').length+' 次',280,560,18);text('晚间 '+records.filter(r=>r.period==='evening').length+' 次',442,560,18);
  text('这一周的小脚印',44,622,25,600);
  for(let i=0;i<7;i++){const d=new Date(from+'T12:00:00Z');d.setUTCDate(d.getUTCDate()+i);const day=d.toISOString().slice(0,10),entries=records.filter(r=>r.date===day),count=entries.filter(r=>credits.has(r.uid)).length,x=44+i*92;text(['周一','周二','周三','周四','周五','周六','周日'][i],x+24,666,16,400,color.muted);box(x,684,80,58,entries.length?color.mint:'#efeee3',18);text(entries.length?'✓':day>nowDay()?'未到':'留白',x+(entries.length?28:20),722,entries.length?25:18,500,color.muted);text(count?'＋'+count:'—',x+25,771,16,400,color.muted);}
  const cats={};for(const r of records)cats[r.snapshot.category]=(cats[r.snapshot.category]||0)+1;const favorite=Object.entries(cats).sort((a,b)=>b[1]-a[1])[0];text(favorite?'这周最常做的：'+favorite[0]:'这周的手记，等你慢慢写下',44,839,23,600);
 }
 const footer=canvas.height-44;text('一点点也算数。留白也没关系。',190,canvas.height-105,22,500);c.strokeStyle=color.line;c.beginPath();c.moveTo(44,footer-24);c.lineTo(676,footer-24);c.stroke();text('我的早晚冒险手记',44,footer+8,14,400,color.muted);text('当前伙伴：'+PET_TYPES[petType].short,514,footer+8,14,400,color.muted);
 const png=()=>new Promise((resolve,reject)=>canvas.toBlob(b=>b?resolve(b):reject(Error('图片生成失败')),'image/png'));
 const summary=await png();
 if(records.length>160)throw Error('本期记录超过160条，请按日报生成照片页，避免图片过大');
 const columns=weekly?3:2,rows=Math.ceil(records.length/columns),gap=18,width=(632-gap*(columns-1))/columns;
 canvas.height=Math.max(1020,270+rows*310+100);box(0,0,720,canvas.height,color.paper,0);text('每次冒险，都有自己的小瞬间。',44,85,30,600);text(from===to?from:from+' — '+to,44,128,18,400,color.muted);text('共 '+records.length+' 次已完成冒险 · 照片与活动一一对应',44,173,18,400,color.muted);
 if(!records.length){box(44,265,632,450,color.white);text('本期还没有完成的冒险',210,442,25,600);text('完成后再来留张照片，也可以。',204,492,19,400,color.muted);}
 for(let i=0;i<records.length;i++){const r=records[i],x=44+(i%columns)*(width+gap),y=230+Math.floor(i/columns)*310;box(x,y,width,292,color.white,16);text((r.period==='morning'?'早上':'晚上')+' · '+r.date.slice(5),x+14,y+30,15,400,color.muted);const img=await photo(r);box(x+12,y+44,width-24,156,'#efeee3',10);if(img)fit(img,x+16,y+48,width-32,148);else text('暂未留念',x+(width-80)/2,y+132,17,400,color.muted);wrap(r.snapshot.title,x+14,y+229,width-28,columns===3?17:20,2);}
 c.strokeStyle=color.line;c.beginPath();c.moveTo(44,canvas.height-66);c.lineTo(676,canvas.height-66);c.stroke();text('照片只保存在你的设备 · 我的早晚冒险手记',44,canvas.height-30,14,400,color.muted);
 return [summary,await png()];
}
