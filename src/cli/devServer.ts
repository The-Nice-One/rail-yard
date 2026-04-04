import { createServer as createHttpServer, IncomingMessage, ServerResponse } from 'http'
import { readFileSync, existsSync, statSync, watch as fsWatch } from 'fs'
import { join, extname, relative, resolve } from 'path'
import pc from 'picocolors'

const MIME: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.css':  'text/css',
  '.js':   'text/javascript',
  '.ts':   'text/javascript',
  '.json': 'application/json',
  '.png':  'image/png',
  '.jpg':  'image/jpeg',
  '.svg':  'image/svg+xml',
  '.ico':  'image/x-icon',
  '.woff2':'font/woff2',
  '.woff': 'font/woff',
}

// The live-reload snippet injected at the end of every HTML response
const LIVE_RELOAD_SNIPPET = `
<script>
  (function() {
    const es = new EventSource('/__commark_reload');
    es.onmessage = () => location.reload();
    es.onerror   = () => setTimeout(() => location.reload(), 1000);
  })();
</script>`

export interface DevServerOptions {
  port?: number
  /** Directory to serve. Defaults to auto-detecting from build config. */
  root?: string
}

/**
 * Minimal dev server with:
 *  - Static file serving from the output directory
 *  - SPA-style fallback: /path → /path.html → /path/index.html
 *  - Live-reload via Server-Sent Events (no WebSockets needed)
 *  - Injected <script> snippet into every HTML response
 */
export async function createServer(options: DevServerOptions = {}): Promise<void> {
  const { port = 3000 } = options

  // Clients waiting for reload events
  const sseClients = new Set<ServerResponse>()

  // Notify all SSE clients to reload
  function broadcast(): void {
    for (const client of sseClients) {
      try {
        client.write('data: reload\n\n')
      } catch {
        sseClients.delete(client)
      }
    }
  }

  // We don't know the output dir until build runs, so we resolve it lazily
  let outputRoot: string | null = null

  function getRoot(): string {
    if (outputRoot) return outputRoot
    // Try to auto-detect from common output dirs
    for (const candidate of ['dist', 'out', '_site', 'public', 'example/dist']) {
      const full = resolve(process.cwd(), candidate)
      if (existsSync(full)) {
        outputRoot = full
        return full
      }
    }
    outputRoot = resolve(process.cwd(), 'dist')
    return outputRoot
  }

  const server = createHttpServer((req: IncomingMessage, res: ServerResponse) => {
    const url = req.url ?? '/'

    // ── SSE endpoint for live reload ─────────────────────────────────────
    if (url === '/__commark_reload') {
      res.writeHead(200, {
        'Content-Type':  'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection':    'keep-alive',
        'X-Accel-Buffering': 'no',
      })
      res.write(': connected\n\n')
      sseClients.add(res)

      req.on('close', () => sseClients.delete(res))
      return
    }

    // ── Static file serving ───────────────────────────────────────────────
    const root = getRoot()
    let urlPath = url.split('?')[0] // strip query string

    // Decode percent-encoding
    try { urlPath = decodeURIComponent(urlPath) } catch {}

    // Resolve candidate paths
    const candidates: string[] = [
      join(root, urlPath),
      join(root, urlPath + '.html'),
      join(root, urlPath, 'index.html'),
    ]

    let filePath: string | null = null
    for (const candidate of candidates) {
      if (existsSync(candidate) && statSync(candidate).isFile()) {
        filePath = candidate
        break
      }
    }

    if (!filePath) {
      // Try 404.html
      const notFound = join(root, '404.html')
      if (existsSync(notFound)) {
        filePath = notFound
        res.statusCode = 404
      } else {
        res.writeHead(404, { 'Content-Type': 'text/plain' })
        res.end(`404 Not Found: ${urlPath}`)
        return
      }
    }

    try {
      const ext = extname(filePath)
      const mime = MIME[ext] ?? 'application/octet-stream'
      let body = readFileSync(filePath)

      if (ext === '.html') {
        // Inject live-reload snippet before </body>
        const html = body.toString('utf-8').replace('</body>', LIVE_RELOAD_SNIPPET + '\n</body>')
        res.writeHead(res.statusCode ?? 200, {
          'Content-Type':  mime,
          'Cache-Control': 'no-cache',
        })
        res.end(html)
      } else {
        res.writeHead(200, {
          'Content-Type':  mime,
          'Cache-Control': ext === '.html' ? 'no-cache' : 'max-age=3600',
        })
        res.end(body)
      }

      console.log(`  ${pc.dim('GET')} ${pc.cyan(urlPath)}`)
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'text/plain' })
      res.end(`500 Internal Server Error`)
    }
  })

  // Watch the output directory for changes and broadcast reload
  const root = getRoot()
  if (existsSync(root)) {
    fsWatch(root, { recursive: true }, () => broadcast())
  }

  server.listen(port, () => {
    console.log(`\n  ${pc.bold(pc.cyan('◆ commark dev server'))}`)
    console.log(`  ${pc.dim('Local:')}  ${pc.cyan(`http://localhost:${port}`)}`)
    console.log(`  ${pc.dim('Root:')}   ${pc.dim(relative(process.cwd(), root))}`)
    console.log(`  ${pc.dim('Press Ctrl+C to stop\n')}`)
  })
}
