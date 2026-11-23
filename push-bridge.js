window.monitorSubscribe = async function(key) {
 if (!window.isSecureContext || !('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) throw new Error('Push is not available here. On iPhone, add this app to your Home Screen and open it there.');
 const permission = await Notification.requestPermission();
 if (permission !== 'granted') throw new Error('Notification permission was not granted. Check your browser notification settings.');
 const reg = await navigator.serviceWorker.register(new URL('sw.js', document.baseURI), {scope: new URL('./',document.baseURI).pathname});
 await navigator.serviceWorker.ready;
 let sub = await reg.pushManager.getSubscription();
 if (!sub) {const raw=atob(key.replace(/-/g,'+').replace(/_/g,'/')+'='.repeat((4-key.length%4)%4));sub=await reg.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:Uint8Array.from(raw,c=>c.charCodeAt(0))});}
 return JSON.stringify(sub.toJSON());
};
window.monitorUnsubscribe = async function() {
 const reg=await navigator.serviceWorker.getRegistration(new URL('./',document.baseURI));
 const sub=await reg?.pushManager.getSubscription();
 if (!sub)return 'null';
 const result=JSON.stringify(sub.toJSON());await sub.unsubscribe();return result;
};
if ('serviceWorker' in navigator) window.addEventListener('load',()=>navigator.serviceWorker.register(new URL('sw.js',document.baseURI),{scope:new URL('./',document.baseURI).pathname}).catch(()=>{}));
