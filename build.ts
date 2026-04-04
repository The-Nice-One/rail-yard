import { Site, watch } from './src/index.js'
import { resolve } from 'path'

const isWatch = process.argv.includes('--watch')
const isWiki  = process.argv.includes('--wiki')

if (isWiki) {
  // ── Markdown passthrough mode (GitHub wiki preprocessor) ──────────────────
  const site = new Site({
    output: resolve('example/dist-wiki'),
    format: 'markdown',
  })

  site.addFolder('./example/pages', { pattern: '**/*.md' })

  await site.build()

} else {
  // ── Full HTML SSG mode ────────────────────────────────────────────────────
  const site = new Site({
    output:         resolve('example/dist'),
    baseUrl:        'https://example.com',
    format:         'html',
    defaultLayout:  'default',
    siteVars:       { title: 'My Site', author: 'Nice' },
  })

  // Custom commands
  site.defineCommand('badge', (label: string, color: string) =>
    `<span style="background:${color};color:#fff;padding:2px 8px;border-radius:4px;font-size:0.8em">${label}</span>`
  )

  site.defineCommand('since', (version: string) =>
    `<sup><em>since v${version}</em></sup>`
  )

  // Assets
  site.addCSS('./example/styles/main.css')

  // Layouts
  site.addLayout('default', './example/layouts/base.eta')

  // Pages
  site.addFolder('./example/pages', { layout: 'default' })

  if (isWatch) {
    await watch(site, {
      paths: ['./example/pages', './example/layouts', './example/styles'],
    })
  } else {
    await site.build()
  }
}
