const CACHE="surfdb-v3";
const SHELL=["./","index.html","app.js","manifest.webmanifest","icons/icon-192.png","icons/icon-512.png","icons/apple-touch-icon.png"];
self.addEventListener("install",e=>{e.waitUntil(caches.open(CACHE).then(c=>c.addAll(SHELL)).then(()=>self.skipWaiting()))});
self.addEventListener("activate",e=>{e.waitUntil(caches.keys().then(k=>Promise.all(k.filter(x=>x!==CACHE).map(x=>caches.delete(x)))).then(()=>self.clients.claim()))});
self.addEventListener("fetch",e=>{
  const u=new URL(e.request.url);
  if(e.request.method!=="GET")return;
  // Prévisions : toujours le réseau (l'app garde elle-même les dernières données)
  if(u.hostname.endsWith("open-meteo.com"))return;
  // Polices Google : cache puis réseau
  if(u.hostname.includes("fonts.g")){e.respondWith(caches.open(CACHE).then(c=>c.match(e.request).then(r=>r||fetch(e.request).then(n=>{c.put(e.request,n.clone());return n}))));return}
  // Coquille de l'app : réseau d'abord, cache si hors-ligne
  if(u.origin===location.origin){e.respondWith(fetch(e.request).then(n=>{const cp=n.clone();caches.open(CACHE).then(c=>c.put(e.request,cp));return n}).catch(()=>caches.match(e.request).then(r=>r||caches.match("index.html"))))}
});
