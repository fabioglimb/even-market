const https = require('https');

module.exports = (req, res) => {
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    return res.status(200).end();
  }

  try {
    // /api/yf?p=/v8/finance/chart/AAPL&range=3mo&interval=1d
    // Reconstruct: /v8/finance/chart/AAPL?range=3mo&interval=1d
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
      res.status(proxyRes.statusCode || 502);
      proxyRes.pipe(res);
    });

    proxyReq.on('error', () => {
      res.status(502).json({ error: 'proxy error' });
    });

    proxyReq.setTimeout(8000, () => {
      proxyReq.destroy();
      res.status(504).json({ error: 'timeout' });
    });

    proxyReq.end();
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
};
