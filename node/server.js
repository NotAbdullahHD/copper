import express from 'express';
import { createServer } from 'node:http';
import { createRequire } from 'node:module';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { server as wisp } from '@mercuryworkshop/wisp-js/server';

const require = createRequire(import.meta.url);
const { scramjetPath } = require('@mercuryworkshop/scramjet/path');
const { uvPath } = require('@titaniumnetwork-dev/ultraviolet');
const { baremuxPath } = require('@mercuryworkshop/bare-mux/node');
const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const nm = p => join(root, 'node_modules', p);

// Don't let the proxy reach this machine's own network.
wisp.options.allow_loopback_ips = false;
wisp.options.allow_private_ips = false;

const app = express();
// Scramjet runs on the wasm rewriter, which reaches for SharedArrayBuffer — and a browser only
// hands that out to a page that is cross-origin isolated. Both headers go on documents and on
// the workers themselves; scraping a script that is importScripts()'d back into a worker fails
// if that script carries them too. credentialless rather than require-corp: the start page
// still loads its fonts and favicons from other origins, which require-corp would refuse.
const isDocument = req => (req.headers.accept || '').includes('text/html');
const isWorkerScript = req => /^\/(sj-sw|uv-sw)\.js$/.test(req.path);
app.use((req, res, next) => {
  // Only documents and the workers themselves: a subresource served with these headers
  // cannot be importScripts()'d back into the worker (Chrome refuses it outright).
  if (isDocument(req) || isWorkerScript(req)) {
    res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
    res.setHeader('Cross-Origin-Embedder-Policy', isWorkerScript(req) ? 'require-corp' : 'credentialless');
  }
  next();
});
app.use(express.static(join(root, 'public')));
app.use('/scramjet', express.static(scramjetPath));
app.use('/controller', express.static(nm('@mercuryworkshop/scramjet-controller/dist')));
app.use('/uv', express.static(uvPath));
app.use('/baremux', express.static(baremuxPath));
app.use('/libcurl', express.static(nm('@mercuryworkshop/libcurl-transport/dist')));

const server = createServer(app);
server.on('upgrade', (req, socket, head) => {
  if (req.url.startsWith('/wisp/')) wisp.routeRequest(req, socket, head);
  else socket.end();
});
const port = process.env.PORT || 8080;
server.listen(port, () => console.log(`Copper on http://localhost:${port}`));
