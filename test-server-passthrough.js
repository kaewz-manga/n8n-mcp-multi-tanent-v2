/**
 * Passthrough Test Server
 * Forwards requests to real n8n API (no mocking)
 */

import http from 'http';

// Import actual implementation
import workerModule from './src/index.ts';

const server = http.createServer(async (req, res) => {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-N8N-URL, X-N8N-API-KEY');

  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  if (req.method !== 'POST') {
    res.writeHead(405, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Method not allowed' }));
    return;
  }

  let body = '';
  req.on('data', (chunk) => {
    body += chunk.toString();
  });

  req.on('end', async () => {
    try {
      // Create Request object for Workers API
      const requestUrl = `http://localhost:3000${req.url}`;
      const headers = new Headers();
      for (const [key, value] of Object.entries(req.headers)) {
        if (value) headers.set(key, Array.isArray(value) ? value[0] : value);
      }

      const workerRequest = new Request(requestUrl, {
        method: 'POST',
        headers,
        body,
      });

      // Call actual worker implementation
      const workerResponse = await workerModule.default.fetch(workerRequest, {}, {});

      // Send response
      res.writeHead(workerResponse.status, {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      });

      const responseBody = await workerResponse.text();
      res.end(responseBody);
    } catch (error) {
      console.error('[Error]', error.message);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: error.message }));
    }
  });
});

const PORT = 3000;
server.listen(PORT, () => {
  console.log(`
🚀 n8n MCP Passthrough Server Running!

URL: http://localhost:${PORT}

This server forwards requests to REAL n8n API
No mocking - tests against actual n8n instance
`);
});
