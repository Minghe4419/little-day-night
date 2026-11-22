const FILES={"activities.js": "5e20484da572703b0349a475f742e91e4aed09d8985f836f28fe401571de876c", "app.js": "5a6e2d61da79cf310a155789b12cca6d79f2e655ea488168248486975237a230", "base.css": "d40aef16afa3c73a3eb8869845aa23d02b37a4a8aed0ce5420bc442780fe27fb", "domain.js": "3265d4aa414a0ba44cde5e9ca0232592f1f93385edad0d8280d4940d0e374072", "edition.css": "405a3606cf020d6c39ae5bb56c7a0772c1bacda62014927400fd32d348bb057b", "icons/app-icon.svg": "f01e81efe72eebb57064843c44ec703932f368f17e6f4f1d53f474195f0f8492", "icons/apple-touch-icon.png": "c777b5c78f04bd6b5db9afa1da78fb56bb5f39c0999890d60c322f01ecc68aac", "icons/icon-192.png": "6cce470019b430b6576ea00480b1bc95b42d772a4f71974d09c7564c9175a56b", "icons/icon-512.png": "82ac6d232393e1cd2a9fce9790180b0f210a039191ad38f82611019fe52c33d5", "icons/icon-maskable-512.png": "82ac6d232393e1cd2a9fce9790180b0f210a039191ad38f82611019fe52c33d5", "index.html": "4b9dc02a0b988390fc61dd50042c4b6a1bfc07438448415b44634409036104e2", "install.html": "e4379a735766581ee393a422781465657ae88c61fc6a3bc25276942646cc9536", "install.js": "d539f77cdc7fbd34ef3f4ef14b22cf4110add6416db6242d01b1a886e227e07f", "journal.js": "417b1fd8e7a52cc84a87519f00ea0e402b43bfe372d6e8ef5723c6a090a2a9ff", "manifest.webmanifest": "fc83d2da141e839900ee1ffcd1562fd9d12db6f148c8e937a39b98942eb62c1e", "memories.js": "83fab10df047fbed1348378991b9be975a1360026325ed671939b07236046ef4", "pet-images/cat-adult.webp": "8cc9d13038d0b93d8305bd60640d074f3ae772a26eac7f8c9ab0a22bc2b4cb24", "pet-images/cat-baby.webp": "e1f2e7130092f8111ffdb46d1c5b13d495b82891f26e8448c6fdf0d83a1ba2f8", "pet-images/cat-young.webp": "237fb5cdcbf4af73713f0ed9d6de3319479a4cfdb61e103e2fc9d6938c6a2f07", "pet-images/dog-adult.webp": "08f1c45c81560e10b6273d20db2cab531af944f205b3e6834080669b84cb3295", "pet-images/dog-baby.webp": "91eca20553890c1b4e36f81c281982c471096b2304bbf3b7b8394de61028c9f8", "pet-images/dog-young.webp": "ca3cf646756a017e7fbf08bc3b4bd0b00f4ca26575d96726d3c097ae1766766a", "pet-images/rabbit-adult.webp": "1379dff7ac56e40753454cc44c44801ca93eb8fea999a289ce2613151978f375", "pet-images/rabbit-baby.webp": "ed133f19b921c9161bfee0d169d482db6b6c97ef2e1ca709e97384c132a93c13", "pet-images/rabbit-young.webp": "6b51814edd3b2641ae0138e9800e80c920df335a9d4958118dcd36db28de316f", "pets.js": "7e5ed5781966ef917a605c2b091bdee71200d62fb83614d6ea7f236f6a3bab3c", "platform.js": "98c350e7cf40264dcc719b009774f86d3009d174d6ebe72791a0f0aa60de5580", "pwa.js": "9fe4b8b31ae8474534b55572fbd4263036661cc3335d6f6af8e9c3ba8fa4f158", "style.css": "59a706219b44846df15ec8d704134c29693b83a88c3c80230eab560be5fd472d", "tokens.css": "500d9237d7d46c49587bb44c39825f6f15a6f749c147187dd249bb009dee454f", "ui.css": "86194e99d9d95694607902d309d3e55287c4605fef962e7e93881014301f7e78"},VERSION="7d0cd00aeefe4fe0";
const BASE=new URL('./',self.location.href),PREFIX='little-day-night:'+BASE.pathname+':',CACHE=PREFIX+VERSION;
const hex=b=>Array.from(new Uint8Array(b),v=>v.toString(16).padStart(2,'0')).join('');
self.addEventListener('install',event=>event.waitUntil((async()=>{
 try{const cache=await caches.open(CACHE);for(const [path,hash] of Object.entries(FILES)){
 const url=new URL(path,BASE).href,response=await fetch(url,{cache:'no-store'});
 if(!response.ok||hex(await crypto.subtle.digest('SHA-256',await response.clone().arrayBuffer()))!==hash)throw Error('Incomplete release');
 await cache.put(url,response);
 }}catch(e){await caches.delete(CACHE);throw e;}
})()));
self.addEventListener('activate',event=>event.waitUntil((async()=>{
 for(const key of await caches.keys())if(key.startsWith(PREFIX)&&key!==CACHE)await caches.delete(key);
 await self.clients.claim();
})()));
self.addEventListener('message',event=>{if(event.data==='ACTIVATE')event.waitUntil((async()=>{
 const tabs=(await self.clients.matchAll({type:'window',includeUncontrolled:true})).filter(c=>c.url.startsWith(BASE.href));
 if(tabs.length>1){event.source?.postMessage('CLOSE_OTHER_PAGES');return;}await self.skipWaiting();
})());});
self.addEventListener('fetch',event=>{
 const url=new URL(event.request.url);if(event.request.method!=='GET'||!url.href.startsWith(BASE.href))return;
 let path=url.pathname.slice(BASE.pathname.length);if(path===''||path==='index.html')path='index.html';
 if(!Object.hasOwn(FILES,path))return;
 event.respondWith((async()=>{const cache=await caches.open(CACHE),hit=await cache.match(new URL(path,BASE).href);return hit||Response.error();})());
});
