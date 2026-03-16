import https from 'https';

export default function handler(req, res) {
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.statusCode = 200;
    res.end();
    return;
  }

  try {
    const url = new URL(req.url, 'https://localhost');
    const p = url.searchParams.get('p') || '/';
    url.searchParams.delete('p');
    const remaining = url.searchParams.toString();
    const fullPath = remaining ? p + '?' + remaining : p;

    const hostname = Math.random() > 0.5
      ? 'query1.finance.yahoo.com'
      : 'query2.finance.yahoo.com';

    const proxyReq = https.request({
      hostname,
      port: 443,
      path: fullPath,
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15',
        'Accept': 'application/json',
        'Referer': 'https://finance.yahoo.com/',
        'Origin': 'https://finance.yahoo.com',
      },
    }, (proxyRes) => {
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Content-Type', proxyRes.headers['content-type'] || 'application/json');
      res.setHeader('Cache-Control', 's-maxage=10, stale-while-revalidate=30');
      res.statusCode = proxyRes.statusCode || 502;
      proxyRes.pipe(res);
    });

    proxyReq.on('error', () => {
      res.setHeader('Content-Type', 'application/json');
      res.statusCode = 502;
      res.end(JSON.stringify({ error: 'proxy error' }));
    });

    proxyReq.setTimeout(8000, () => {
      proxyReq.destroy();
      res.setHeader('Content-Type', 'application/json');
      res.statusCode = 504;
      res.end(JSON.stringify({ error: 'timeout' }));
    });

    proxyReq.end();
  } catch (err) {
    res.setHeader('Content-Type', 'application/json');
    res.statusCode = 500;
    res.end(JSON.stringify({ error: String(err) }));
  }
}
