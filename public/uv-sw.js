importScripts('/baremux/index.js','/uv/uv.bundle.js','/uvconfig.js','/uv/uv.sw.js');
const uv=new UVServiceWorker();
addEventListener('fetch',e=>e.respondWith(uv.route(e)?uv.fetch(e):fetch(e.request)));
