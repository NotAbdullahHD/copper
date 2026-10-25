importScripts('/scramjet/scramjet.js','/controller/controller.sw.js');
addEventListener('install',()=>skipWaiting());
addEventListener('activate',e=>e.waitUntil(clients.claim()));
addEventListener('fetch',e=>{if($scramjetController.shouldRoute(e))e.respondWith($scramjetController.route(e))});
