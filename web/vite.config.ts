/// <reference types="vitest/config" />
import type { IncomingMessage, ServerResponse } from 'node:http'
import { fileURLToPath, URL } from 'node:url'
import { defineConfig, loadEnv, type Plugin, type ViteDevServer } from 'vite'
import react from '@vitejs/plugin-react'

type Handler = (request: Request) => Promise<Response>

/** 本機開發：直接在 Vite 執行 api/*.ts（與 Vercel Functions 相同寫法），資料存在記憶體 */
function localApi(): Plugin {
  const toRequest = async (req: IncomingMessage & { originalUrl?: string }): Promise<Request> => {
    const chunks: Buffer[] = []
    for await (const c of req) chunks.push(c as Buffer)
    const body = chunks.length ? Buffer.concat(chunks) : undefined
    return new Request(new URL(req.originalUrl ?? req.url ?? '/', 'http://localhost'), {
      method: req.method, headers: req.headers as Record<string, string>, body,
    })
  }

  const serve = async (server: ViteDevServer, req: IncomingMessage, res: ServerResponse, next: () => void) => {
    const name = new URL(req.url ?? '/', 'http://localhost').pathname.replace(/^\/+|\/+$/g, '')
    if (!/^[a-z-]+$/.test(name)) return next()
    let mod: Record<string, Handler | undefined>
    try {
      mod = await server.ssrLoadModule(`/api/${name}.ts`)
    } catch {
      return next()
    }
    const handler = mod[req.method ?? 'GET']
    const response = handler ? await handler(await toRequest(req)) : new Response(null, { status: 405 })
    res.statusCode = response.status
    response.headers.forEach((v, k) => res.setHeader(k, v))
    res.end(Buffer.from(await response.arrayBuffer()))
  }

  return {
    name: 'local-api',
    configureServer(server) {
      // web/.env 的 CRAWL_TOKEN 等非 VITE_ 變數也給本機 API 使用
      for (const [k, v] of Object.entries(loadEnv(server.config.mode, server.config.root, ''))) process.env[k] ??= v
      server.middlewares.use('/api', (req, res, next) => void serve(server, req, res, next).catch(next))
    },
  }
}

export default defineConfig({
  plugins: [react(), localApi()],
  // 建置時間：每次推送後 Vercel 重新建置即更新，顯示為「網站更新日期」
  define: { __BUILD_TIME__: JSON.stringify(new Date().toISOString()) },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      '@shared': fileURLToPath(new URL('./shared', import.meta.url)),
    },
  },
  test: { environment: 'node' },
})
