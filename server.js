const http = require('http');
const https = require('https');

const PORT = parseInt(process.env.PORT, 10) || 3000;
const HOST = '0.0.0.0';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Accept',
  'Access-Control-Max-Age': '86400'
};

const server = http.createServer((req, res) => {

  Object.entries(CORS).forEach(([k, v]) => res.setHeader(k, v));

  if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return; }

  if (req.method === 'GET' && req.url === '/') {
    // Show key status in health check
    const keySet = !!process.env.ANTHROPIC_API_KEY;
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('Vaasu is alive 🦚\nAPI key set: ' + keySet);
    return;
  }

  if (req.method === 'POST' && req.url === '/chat') {

    // Read key fresh on every request
    const API_KEY = process.env.ANTHROPIC_API_KEY;

    if (!API_KEY) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: { message: 'ANTHROPIC_API_KEY not set on server. Go to Railway → Variables and add it.' } }));
      return;
    }

    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {

      let parsed;
      try { parsed = JSON.parse(body); }
      catch (e) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: { message: 'Invalid JSON' } }));
        return;
      }

      const payload = JSON.stringify({
        model: 'claude-sonnet-4-5',
        max_tokens: 1024,
        system: parsed.system,
        messages: parsed.messages
      });

      const options = {
        hostname: 'api.anthropic.com',
        path: '/v1/messages',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': API_KEY,
          'anthropic-version': '2023-06-01',
          'Content-Length': Buffer.byteLength(payload)
        }
      };

      const apiReq = https.request(options, apiRes => {
        let data = '';
        apiRes.on('data', chunk => data += chunk);
        apiRes.on('end', () => {
          res.writeHead(apiRes.statusCode, { 'Content-Type': 'application/json' });
          res.end(data);
        });
      });

      apiReq.on('error', err => {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: { message: err.message } }));
      });

      apiReq.write(payload);
      apiReq.end();
    });
    return;
  }

  res.writeHead(404, { 'Content-Type': 'text/plain' });
  res.end('Not found');
});

server.listen(PORT, HOST, () => {
  const keySet = !!process.env.ANTHROPIC_API_KEY;
  console.log(`Vaasu server running on ${HOST}:${PORT}`);
  console.log(`ANTHROPIC_API_KEY set: ${keySet}`);
  if (!keySet) console.log('WARNING: ANTHROPIC_API_KEY is missing! Add it in Railway Variables.');
});
