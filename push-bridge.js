const monitorDeadline = (p,ms,message) => new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(new Error(message)),ms);Promise.resolve(p).then(v=>{clearTimeout(timer);resolve(v);},e=>{clearTimeout(timer);reject(e);});});
window.monitorSubscribe = async function(key) {
 if (!window.isSecureContext || !('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) throw new Error('Push is not available here. On iPhone, add this app to your Home Screen and open it there.');
 const permission = await monitorDeadline(Notification.requestPermission(),30000,'Notification permission is still pending. Use Chrome or install this PWA on your phone, then try Enable again.');
 if (permission !== 'granted') throw new Error('Notification permission was not granted. Check your browser notification settings.');
 const reg = await navigator.serviceWorker.register(new URL('sw.js', document.baseURI), {scope: new URL('./',document.baseURI).pathname});
 await monitorDeadline(navigator.serviceWorker.ready,15000,'Service worker is not ready. Refresh and try again.');
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

window.monitorPushState = async function() {
 const supported = window.isSecureContext && 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
 if (!supported) return JSON.stringify({supported:false,permission:'unsupported',endpoint:null});
 const reg=await navigator.serviceWorker.getRegistration(new URL('./',document.baseURI));
 const sub=await reg?.pushManager.getSubscription();
 return JSON.stringify({supported:true,permission:Notification.permission,endpoint:sub?.endpoint||null});
};
