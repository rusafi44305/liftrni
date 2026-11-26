// Minimal service worker — exists only to satisfy Chrome's requirement
// for a registered service worker with a fetch handler before it will
// offer "Install app" for this site.
//
// Deliberately does NOT cache anything. This site is updated frequently
// (a new index.html gets uploaded regularly), and a caching service
// worker risks showing people an old, stale version even after a fresh
// upload. Every request is simply passed straight through to the
// network, exactly as if this file didn't exist at all — just enough
// for installability, nothing more.

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (event) => {
  event.respondWith(fetch(event.request));
});

// Push notifications (2026-11-26): SAME service worker, no extra scope, no caching.
const VIEWS = new Set(['home','dashboard','mytasks','search','gantt','chat','notebook']);
self.addEventListener('push', event => {
  let data={};
  try { data=event.data ? event.data.json() : {}; } catch { data={}; }
  const title=String(data.title || 'Walton Lift R&I').slice(0,100);
  const body=String(data.body || '').slice(0,500);
  const view=VIEWS.has(data.view)?data.view:'home';
  const urgency=data.priority==='urgent'?'URGENT · ':'';
  const opts={body:urgency+body,tag:String(data.id || Date.now()),renotify:false,
    icon:new URL('./wlf-notification-icon.png',self.registration.scope).href,
    data:{view},requireInteraction:data.priority==='urgent'};
  event.waitUntil((async()=>{
    await self.registration.showNotification(title,opts);
    // Refresh an open website's bell immediately; otherwise it would wait
    // for the next 30-second poll and seem like the push never arrived.
    try{
      const windows=await self.clients.matchAll({type:'window',includeUncontrolled:true});
      const scope=new URL(self.registration.scope);
      for(const page of windows){
        const u=new URL(page.url);
        if(u.origin===scope.origin&&u.pathname.startsWith(scope.pathname))
          page.postMessage({type:'wlf-push-delivered'});
      }
    }catch(_){/* Notification already displayed; never fail push for this. */}
  })());
});
self.addEventListener('notificationclick', event => {
  event.notification.close();
  const view=VIEWS.has(event.notification.data?.view)?event.notification.data.view:'home';
  event.waitUntil((async()=>{
    const windows=await self.clients.matchAll({type:'window',includeUncontrolled:true});
    const scope=new URL(self.registration.scope);
    for(const w of windows){
      const u=new URL(w.url);
      if(u.origin===scope.origin&&u.pathname.startsWith(scope.pathname)){
        await w.focus();w.postMessage({type:'wlf-push-open-view',view});return;
      }
    }
    return self.clients.openWindow(new URL(`./?wlf_push_view=${encodeURIComponent(view)}`,self.registration.scope).href);
  })());
});
self.addEventListener('pushsubscriptionchange', event => {
  // Never send credentials from a worker. An active, authenticated webpage
  // can reconcile the browser subscription when it next becomes visible.
  event.waitUntil((async()=>{
    const windows=await self.clients.matchAll({type:'window',includeUncontrolled:true});
    for(const page of windows)page.postMessage({type:'wlf-push-subscription-changed'});
  })());
});
