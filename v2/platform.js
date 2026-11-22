/* Browser implementation. Native containers replace this adapter explicitly. */
window.AdventurePlatform=Object.freeze({
 storage:Object.freeze({getItem:k=>localStorage.getItem(k==='little-day-night/v1'?'little-day-night/edition-2':k==='little-day-night/pre-v2'?'little-day-night/edition-2-pre-migration':k),setItem:(k,v)=>localStorage.setItem(k==='little-day-night/v1'?'little-day-night/edition-2':k==='little-day-night/pre-v2'?'little-day-night/edition-2-pre-migration':k,v)}),
 health:Object.freeze({available:false,async read(){throw new Error('网页版本不支持健康数据读取');}})
});
