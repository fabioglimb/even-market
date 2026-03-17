import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { resolve } from 'path'
import { existsSync } from 'fs'
import { request as httpsRequest } from 'node:https'
import type { IncomingMessage, ServerResponse } from 'node:http'
import type { Plugin } from 'vite'

const appRoot = resolve(__dirname)
const nm = (pkg: string) => resolve(appRoot, 'node_modules', pkg)

const EVEN_GLASS_DIR = resolve(appRoot, '../even-glass')
const SDK_DIR = resolve(appRoot, '../even-dev/node_modules/@evenrealities/even_hub_sdk')

function yahooFinanceProxy(): Plugin {
  return {
    name: 'even-market-yahoo-proxy',
    configureServer(server) {
      server.middlewares.use((req: IncomingMessage, res: ServerResponse, next: () => void) => {
        const url = req.url ?? ''
        if (!url.startsWith('/yf-api/')) {
          next()
          return
        }

        const targetPath = url.replace(/^\/yf-api/, '')
        const options = {
          hostname: 'query1.finance.yahoo.com',
          port: 443,
          path: targetPath,
          method: 'GET',
          headers: {
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
            'Accept': 'application/json',
          },
        }

        const proxyReq = httpsRequest(options, (proxyRes) => {
          res.writeHead(proxyRes.statusCode ?? 502, {
            'Content-Type': proxyRes.headers['content-type'] ?? 'application/json',
            'Access-Control-Allow-Origin': '*',
          })
          proxyRes.pipe(res)
        })

        proxyReq.on('error', (err) => {
          void err
          res.writeHead(502, { 'Content-Type': 'application/json' })
          res.end(JSON.stringify({ error: err.message }))
        })

        proxyReq.end()
      })
    },
  }
}

export default [
  react(),
  tailwindcss(),
  yahooFinanceProxy(),
  {
    name: 'even-market-resolve',
    config() {
      return {
        resolve: {
          alias: {
            'react/jsx-dev-runtime': nm('react/jsx-dev-runtime'),
            'react/jsx-runtime': nm('react/jsx-runtime'),
            'react-dom/client': nm('react-dom/client'),
            'react-dom': nm('react-dom'),
            'react': nm('react'),
            'react-router': nm('react-router'),
            'class-variance-authority': nm('class-variance-authority'),
            'clsx': nm('clsx'),
            'tailwind-merge': nm('tailwind-merge'),
            'upng-js': nm('upng-js'),
          },
        },
      }
    },
    resolveId(source: string) {
      if (source === '@evenrealities/even_hub_sdk') {
        return { id: resolve(SDK_DIR, 'dist/index.js'), external: false }
      }
      if (source === '@jappyjan/even-better-sdk') {
        const betterSdkDir = resolve(appRoot, 'node_modules/@jappyjan/even-better-sdk')
        return { id: resolve(betterSdkDir, 'dist/index.js'), external: false }
      }
      if (source.startsWith('even-glass/')) {
        const subpath = source.slice('even-glass/'.length)
        const tsPath = resolve(EVEN_GLASS_DIR, subpath + '.ts')
        if (existsSync(tsPath)) return { id: tsPath, external: false }
        const jsPath = resolve(EVEN_GLASS_DIR, subpath + '.js')
        if (existsSync(jsPath)) return { id: jsPath, external: false }
        return { id: resolve(EVEN_GLASS_DIR, subpath), external: false }
      }
      return null
    },
  },
]
