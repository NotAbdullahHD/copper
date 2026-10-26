// Scramjet's bundle grabs URL.createObjectURL and binds it the moment it is imported — and a
// service worker has no createObjectURL at all, so the import throws and the worker never gets
// as far as registering a fetch handler. That is why the whole engine looked dead: every
// Scramjet tab failed with "ServiceWorker script evaluation failed" and fell back to Lite.
// The proxy path itself never calls these; the stub only keeps the module from crashing on load.
if (!self.URL.createObjectURL) {
  self.URL.createObjectURL = () => { throw new Error('createObjectURL is unavailable in a service worker'); };
  self.URL.revokeObjectURL = () => {};
}

importScripts('/scramjet/scramjet.js','/controller/controller.sw.js');
addEventListener('install',()=>skipWaiting());
addEventListener('activate',e=>e.waitUntil(clients.claim()));
addEventListener('fetch',e=>{if($scramjetController.shouldRoute(e))e.respondWith($scramjetController.route(e))});
