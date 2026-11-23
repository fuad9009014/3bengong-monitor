// Private ECDSA keys are generated in this browser and stored as non-extractable CryptoKeys.
(() => {
 const enc=new TextEncoder(),hex=b=>Array.from(new Uint8Array(b)).map(x=>x.toString(16).padStart(2,'0')).join('');
 const hash=async s=>hex(await crypto.subtle.digest('SHA-256',enc.encode(s)));
 const random=()=>hex(crypto.getRandomValues(new Uint8Array(32)));
 const b64=b=>btoa(String.fromCharCode(...new Uint8Array(b))).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
 let loading;
 const read=(db)=>new Promise((resolve,reject)=>{const r=db.transaction('keys').objectStore('keys').get('primary');r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});
 async function loadDevice(){
  if(!window.isSecureContext||!crypto.subtle||!window.indexedDB)throw new Error('Use a supported HTTPS browser with device storage enabled. Private/incognito mode is not supported.');
  const db=await new Promise((resolve,reject)=>{const r=indexedDB.open('3bm-device-v1',1);r.onupgradeneeded=()=>r.result.createObjectStore('keys');r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);r.onblocked=()=>reject(new Error('Close other monitor tabs and retry.'));});
  try{let pair=await read(db);if(!pair){const generated=await crypto.subtle.generateKey({name:'ECDSA',namedCurve:'P-256'},false,['sign','verify']);
   // add, rather than put, prevents competing first-use tabs replacing each other's key.
   await new Promise((resolve,reject)=>{const tx=db.transaction('keys','readwrite');tx.objectStore('keys').add(generated,'primary');tx.oncomplete=resolve;tx.onabort=()=>tx.error?.name==='ConstraintError'?resolve():reject(tx.error);tx.onerror=()=>{};});pair=await read(db);}
   if(!pair?.privateKey||pair.privateKey.extractable)throw new Error('Secure device identity unavailable.');
   const j=await crypto.subtle.exportKey('jwk',pair.publicKey);return {privateKey:pair.privateKey,publicKey:{kty:'EC',crv:'P-256',x:j.x,y:j.y}};
  }finally{db.close();}
 }
 const device=()=>loading||(loading=loadDevice().catch(e=>{loading=null;throw e;}));
 const sign=async (key,message)=>b64(await crypto.subtle.sign({name:'ECDSA',hash:'SHA-256'},key,enc.encode(message)));
 async function send(base,path,body,headers={}){
  const u=new URL(base+path);if(u.protocol!=='https:'||u.origin!=='https://threebengong-monitor.threebengong-monitor-backend.workers.dev')throw new Error('Invalid monitoring service');
  const response=await fetch(u.href,{method:body===null?'GET':'POST',headers:{'Content-Type':'application/json',...headers},...(body===null?{}:{body}),redirect:'error',credentials:'omit',cache:'no-store',signal:AbortSignal.timeout(20000)});
  return {status:response.status,data:await response.json()};
 }
 window.monitorDeviceLogin=async (base,accessKey)=>{
  const d=await device();const b={access_key:accessKey,public_key:d.publicKey};const c=await send(base,'/v1/device/challenge',JSON.stringify(b));if(c.status!==200)return JSON.stringify(c);
  const signature=await sign(d.privateKey,`3bm-login\n${location.origin}\n${c.data.id}\n${c.data.nonce}`);
  return JSON.stringify(await send(base,'/v1/login',JSON.stringify({...b,challenge_id:c.data.id,signature})));
 };
 window.monitorDeviceRequest=async (base,path,rawBody,token)=>{
  const d=await device(),body=rawBody===''?null:rawBody,method=body===null?'GET':'POST';const time=String(Math.floor(Date.now()/1000)),nonce=random();
  const message=`3bm-request\n${location.origin}\n${method}\n${path}\n${await hash(body||'')}\n${await hash(token)}\n${time}\n${nonce}`;
  return JSON.stringify(await send(base,path,body,{'Authorization':'Bearer '+token,'X-Device-Time':time,'X-Device-Nonce':nonce,'X-Device-Signature':await sign(d.privateKey,message)}));
 };
})();
