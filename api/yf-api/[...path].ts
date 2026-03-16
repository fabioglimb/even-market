import type { VercelRequest, VercelResponse } from '@vercel/node';
import https from 'node:https';

export default function handler(req: VercelRequest, res: VercelResponse) {
  const { path } = req.query;
  const targetPath = '/' + (Array.isArray(path) ? path.join('/') : path || '');
  const qs = req.url?.split('?')[1];
  const fullPath = qs ? `${targetPath}?${qs}` : targetPath;

  const options = {
    hostname: 'query1.finance.yahoo.com',
    port: 443,
    path: fullPath,
    method: 'GET',
    headers: {
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
      'Accept': 'application/json',
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

  proxyReq.end();
}
