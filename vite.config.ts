import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { request as httpsRequest } from 'node:https';
import type { IncomingMessage, ServerResponse } from 'node:http';
import type { Plugin } from 'vite';

const appRoot = dirname(fileURLToPath(import.meta.url));

function yahooFinanceProxy(): Plugin {
  const middleware = (req: IncomingMessage, res: ServerResponse, next: () => void) => {
        const url = req.url ?? '';
        if (!url.startsWith('/yf-api/')) {
          next();
          return;
        }

        const targetPath = url.replace(/^\/yf-api/, '');
        const options = {
          hostname: 'query1.finance.yahoo.com',
          port: 443,
          path: targetPath,
          method: 'GET',
          headers: {
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
            'Accept': 'application/json',
          },
        };

        const proxyReq = httpsRequest(options, (proxyRes) => {
          res.writeHead(proxyRes.statusCode ?? 502, {
            'Content-Type': proxyRes.headers['content-type'] ?? 'application/json',
            'Access-Control-Allow-Origin': '*',
          });
          proxyRes.pipe(res);
        });

        proxyReq.on('error', (err) => {
          void err;
          res.writeHead(502, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: err.message }));
        });

        proxyReq.end();
  };

  return {
    name: 'even-market-yahoo-proxy',
    configureServer(server) {
      server.middlewares.use(middleware);
    },
    configurePreviewServer(server) {
      server.middlewares.use(middleware);
    },
  };
}

export default defineConfig({
  root: appRoot,
  plugins: [
    react(),
    tailwindcss(),
    yahooFinanceProxy(),
  ],
  resolve: {
    alias: {},
    dedupe: ['react', 'react-dom', '@evenrealities/even_hub_sdk', 'upng-js'],
  },
  server: {
    host: '0.0.0.0',
    port: 5173,
  },
  build: {
    outDir: resolve(appRoot, 'dist'),
    emptyOutDir: true,
  },
});