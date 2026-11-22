'use strict';
// All species share the completion ledger; artwork only changes at age milestones.
const PET_TYPES={dog:{title:'金毛小狗',short:'小狗'},cat:{title:'德文小猫',short:'小猫'},rabbit:{title:'软软小兔',short:'小兔子'}};
const PET_IMAGES={
 dog:['pet-images/dog-baby.webp','pet-images/dog-young.webp','pet-images/dog-adult.webp'],
 cat:['pet-images/cat-baby.webp','pet-images/cat-young.webp','pet-images/cat-adult.webp'],
 rabbit:['pet-images/rabbit-baby.webp','pet-images/rabbit-young.webp','pet-images/rabbit-adult.webp']
};
const PET_STAGES=[
 {at:0,title:'幼年',gift:'进入青年期 · 薄荷小围巾'},
 {at:6,title:'青年',gift:'进入成年期 · 星星伙伴徽章'},
 {at:20,title:'成年',gift:'陪伴星'}
];
function petStage(n){
 const i=PET_STAGES.findLastIndex(s=>n>=s.at),current=PET_STAGES[i],next=PET_STAGES[i+1];
 const stars=Math.max(0,Math.floor((n-20)/10)),from=next?current.at:20+stars*10,to=next?next.at:from+10;
 return {i,current,next,from,to,stars,gift:next?current.gift:`第 ${stars+1} 颗陪伴星`};
}
function petReward(n){
 if(n===6)return '长大啦！薄荷小围巾已戴好';
 if(n===20)return '成年啦！星星伙伴徽章已点亮';
 if(n>20&&(n-20)%10===0)return `获得第 ${(n-20)/10} 颗陪伴星`;
 const {to,gift}=petStage(n);return `再 ${to-n} 次，${gift}`;
}
function petArt(type,n){
 const key=Object.hasOwn(PET_TYPES,type)?type:'dog',{i,current}=petStage(n);
 return `<img class="pet-portrait" data-pet-type="${key}" data-pet-stage="${i}" src="${PET_IMAGES[key][i]}" width="640" height="640" alt="${PET_TYPES[key].title}，${current.title}${i===1?'，戴薄荷围巾':i===2?'，戴薄荷围巾和星星徽章':''}" decoding="async">`;
}
