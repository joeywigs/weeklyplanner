// Simple proxy to forward requests to Next.js dev server
// This bypasses the host header check for external access
const http = require('http');

const NEXT_PORT = 3001;
const SERVE_PORT = parseInt(process.env.PORT || '3000', 10);

const server = http.createServer((req, res) => {
  const options = {
    hostname: '127.0.0.1',
    port: NEXT_PORT,
    path: req.url,
    method: req.method,
    headers: {
      ...req.headers,
      host: `localhost:${NEXT_PORT}`,
    },
  };

  const proxy = http.request(options, (proxyRes) => {
    res.writeHead(proxyRes.statusCode || 200, proxyRes.headers);
    proxyRes.pipe(res);
  });

  proxy.on('error', () => {
    res.writeHead(502);
    res.end('Next.js server not ready');
  });

  req.pipe(proxy);
});

server.listen(SERVE_PORT, '0.0.0.0', () => {
  console.log(`Proxy listening on http://0.0.0.0:${SERVE_PORT} -> localhost:${NEXT_PORT}`);
});
