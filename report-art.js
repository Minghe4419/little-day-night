'use strict';
async function renderMemoryReport(mode,date){
 const [from,to]=reportRange(date,mode),records=completions().filter(r=>r.date>=from&&r.date<=to),credits=rewardIds(),petType=state.petType,n=total(),photoSet=state.photoSet||'main',weekly=mode==='week';
 const color={paper:'#f8f6eb',ink:'#354039',muted:'#65715d',mint:'#e4eddb',line:'#d4cbb7',white:'#fffdf5',yellow:'#fae7a8',night:'#dce2ef'};
 const canvas=document.createElement('canvas');canvas.width=720;const shown=records.slice(0,6);canvas.height=weekly?1560:720+shown.length*218;const c=canvas.getContext('2d');
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
 const growth=records.filter(r=>credits.has(r.uid)).length;box(44,426,632,76,color.mint);text((weekly?'收获 ':'今天收获 ＋')+growth+' 份成长',68,473,24,600);text(weekly?'一点点，也算数':'早晚冒险都完成了',weekly?478:455,473,17);
 if(!weekly){
  text('把这一天，轻轻留下来',44,559,25,600);
  for(let i=0;i<shown.length;i++){const r=shown[i],y=588+i*218;box(44,y,632,196,color.white);c.strokeStyle=color.line;c.lineWidth=1;c.stroke();box(68,y+24,22,22,r.period==='morning'?color.yellow:color.night,11);text((r.period==='morning'?'早上':'晚上')+' · '+formatMinute(r.completedAt).slice(-5),101,y+42,16,400,color.muted);wrap(r.snapshot.title,68,y+81,380,23,2);text(r.snapshot.category,68,y+169,16,400,color.muted);box(526,y+22,126,152,'#fff',12);const img=await photo(r);if(img)fit(img,532,y+28,114,132);else{text('还没留照片',539,y+93,15,400,color.muted);}}
  if(records.length>6)text('展示最近6条；全部 '+records.length+' 条记录保留在奖励小屋。',44,canvas.height-106,16,400,color.muted);
 }else{
  text(records.length+' 次小冒险',44,566,30,600);text('早间 '+records.filter(r=>r.period==='morning').length+' 次',280,565,18);text('晚间 '+records.filter(r=>r.period==='evening').length+' 次',442,565,18);
  text('这一周的小脚印',44,625,25,600);
  for(let i=0;i<7;i++){const d=new Date(from+'T12:00:00Z');d.setUTCDate(d.getUTCDate()+i);const day=d.toISOString().slice(0,10),entries=records.filter(r=>r.date===day),count=entries.filter(r=>credits.has(r.uid)).length,x=44+i*92;text(['周一','周二','周三','周四','周五','周六','周日'][i],x+24,672,16,400,color.muted);box(x,690,80,58,entries.length?color.mint:'#efeee3',18);text(entries.length?'✓':day>nowDay()?'未到':'留白',x+(entries.length?28:20),728,entries.length?25:18,500,color.muted);text(count?'＋'+count:'—',x+25,777,16,400,color.muted);}
  text('休息也没关系，已经获得的成长一直都在。',44,830,17,400,color.muted);text('想再看一眼的小瞬间',44,894,25,600);
  let photos=0;for(const r of records){if(photos===3)break;const img=await photo(r);if(!img)continue;const x=44+photos*216;box(x,923,200,195,'#fff',14);fit(img,x+8,931,184,165);photos++;}
  if(!photos){box(44,923,632,195,'#efeee3');text('还没有留念照片',264,1005,22,500);text('在小冒险记录中，随时补一张喜欢的瞬间。',142,1050,17,400,color.muted);}
  const cats={};for(const r of records)cats[r.snapshot.category]=(cats[r.snapshot.category]||0)+1;const favorite=Object.entries(cats).sort((a,b)=>b[1]-a[1])[0];box(44,1152,632,122,color.white);text(favorite?'这周最常做的：'+favorite[0]:'这周的手记，等你慢慢写下',68,1198,23,600);text('完成 '+records.length+' 次，留下 '+photos+' 张精选照片。',68,1242,17,400,color.muted);
  text('不用每天满分。',278,1360,23,500);text('这些小快乐，已经很值得。',209,1400,23,500);
 }
 const footer=canvas.height-44;if(!weekly&&records.length<=6)text('一点点也算数。今天的你，做到了。',167,canvas.height-105,22,500);c.strokeStyle=color.line;c.beginPath();c.moveTo(44,footer-24);c.lineTo(676,footer-24);c.stroke();text('我的早晚冒险手记',44,footer+8,14,400,color.muted);text('当前伙伴：'+PET_TYPES[petType].short,514,footer+8,14,400,color.muted);
 return new Promise((resolve,reject)=>canvas.toBlob(b=>b?resolve(b):reject(Error('图片生成失败')),'image/png'));
}
