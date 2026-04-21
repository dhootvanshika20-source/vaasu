const http = require('http');
const https = require('https');
 
const API_KEY = process.env.ANTHROPIC_API_KEY;
const PORT = parseInt(process.env.PORT, 10) || 3000;
const HOST = '0.0.0.0'; // Must bind to 0.0.0.0 for Railway
 
const server = http.createServer((req, res) => {
 
  // CORS — allow all origins so your website can call this
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
 
  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }
 
  // Health check
  if (req.method === 'GET' && req.url === '/') {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('Vaasu is alive 🦚');
    return;
  }
 
  // Chat endpoint
  if (req.method === 'POST' && req.url === '/chat') {
 
    if (!API_KEY) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'ANTHROPIC_API_KEY not set on server' }));
      return;
    }
 
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
 
      let parsed;
      try {
        parsed = JSON.parse(body);
      } catch (e) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Invalid JSON' }));
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
        res.end(JSON.stringify({ error: err.message }));
      });
 
      apiReq.write(payload);
      apiReq.end();
    });
    return;
  }
 
  res.writeHead(404, { 'Content-Type': 'text/plain' });
  res.end('Not found');
});
 
// Bind to 0.0.0.0 — critical for Railway
server.listen(PORT, HOST, () => {
  console.log(`Vaasu server running on ${HOST}:${PORT}`);
});
 
