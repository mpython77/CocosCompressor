const http = require('http');
const fs   = require('fs');
const path = require('path');
const zlib = require('zlib');

const PORT      = process.env.PORT || 8080;
const HTML_FILE = path.join(__dirname, 'playable_ad_analyser.html');

// ── Pre-load & pre-compress at startup ───────────────────────────────────
let raw, gzipped;

function loadFile() {
  raw     = fs.readFileSync(HTML_FILE);
  gzipped = zlib.gzipSync(raw, { level: 6 });
  console.log(`Loaded: ${(raw.length / 1024).toFixed(1)} KB  |  Gzipped: ${(gzipped.length / 1024).toFixed(1)} KB`);
}

try {
  loadFile();
} catch (e) {
  console.error('HTML file not found:', HTML_FILE);
  process.exit(1);
}

// Hot-reload on file change (optional, useful for dev)
fs.watch(HTML_FILE, () => {
  try { loadFile(); console.log('🔄 Reloaded'); } catch {}
});

// ── HTTP Server ───────────────────────────────────────────────────────────
const server = http.createServer((req, res) => {
  // Health check for Railway
  if (req.url === '/health' || req.url === '/ping') {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('OK');
    return;
  }

  // All routes → serve the app
  const acceptsGzip = (req.headers['accept-encoding'] || '').includes('gzip');
  const body        = acceptsGzip ? gzipped : raw;

  res.writeHead(200, {
    'Content-Type':           'text/html; charset=utf-8',
    'Content-Length':         body.length,
    'Content-Encoding':       acceptsGzip ? 'gzip' : 'identity',
    'Cache-Control':          'public, max-age=3600',
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options':        'SAMEORIGIN',
    'Referrer-Policy':        'no-referrer',
  });

  res.end(body);
});

// ── Start ─────────────────────────────────────────────────────────────────
server.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀  Playable Ad Analyzer  →  http://localhost:${PORT}`);
});

server.on('error', err => {
  console.error('Server error:', err.message);
  process.exit(1);
});
