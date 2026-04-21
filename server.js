const http = require('http');
const https = require('https');
 
const API_KEY = process.env.ANTHROPIC_API_KEY;
const PORT = parseInt(process.env.PORT, 10) || 3000;
const HOST = '0.0.0.0';
 
const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Accept',
  'Access-Control-Max-Age': '86400',
};
 
const server = http.createServer((req, res) => {
 
  // Set CORS on every response
  Object.entries(CORS_HEADERS).forEach(([k, v]) => res.setHeader(k, v));
 
  // Handle preflight
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
      res.end(JSON.stringify({ error: { message: 'ANTHROPIC_API_KEY not set on server' } }));
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
  console.log(`Vaasu server running on ${HOST}:${PORT}`);
});
 
