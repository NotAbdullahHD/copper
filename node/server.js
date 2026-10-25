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
