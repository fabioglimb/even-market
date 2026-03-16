import type { VercelRequest, VercelResponse } from '@vercel/node';
import https from 'node:https';

export default function handler(req: VercelRequest, res: VercelResponse) {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', '*');
    return res.status(200).end();
  }

  const { path } = req.query;
  const targetPath = '/' + (Array.isArray(path) ? path.join('/') : path || '');

  // Get query params from the original URL (excluding the path param)
  const url = new URL(req.url ?? '/', `https://${req.headers.host}`);
  const params = new URLSearchParams();
  for (const [key, val] of url.searchParams.entries()) {
    if (key !== 'path') params.set(key, val);
  }
  const qs = params.toString();
  const fullPath = qs ? `${targetPath}?${qs}` : targetPath;

  // Try multiple Yahoo Finance hostnames (some may be blocked on cloud IPs)
  const hosts = [
    'query1.finance.yahoo.com',
    'query2.finance.yahoo.com',
  ];
  const hostname = hosts[Math.floor(Math.random() * hosts.length)]!;

  const options = {
    hostname,
    port: 443,
    path: fullPath,
    method: 'GET',
    headers: {
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15',
      'Accept': 'application/json',
      'Accept-Language': 'en-US,en;q=0.9',
      'Referer': 'https://finance.yahoo.com/',
      'Origin': 'https://finance.yahoo.com',
    },
  };

  const proxyReq = https.request(options, (proxyRes) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Content-Type', proxyRes.headers['content-type'] ?? 'application/json');
    res.setHeader('Cache-Control', 's-maxage=10, stale-while-revalidate=30');
    res.status(proxyRes.statusCode ?? 502);
    proxyRes.pipe(res);
  });

  proxyReq.on('error', (err) => {
    res.status(502).json({ error: err.message });
  });

  proxyReq.setTimeout(8000, () => {
    proxyReq.destroy();
    res.status(504).json({ error: 'Timeout' });
  });

  proxyReq.end();
}
