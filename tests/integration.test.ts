/**
 * commark integration tests — full pipeline
 *
 * Run with: npx tsx tests/integration.test.ts
 */
import { mkdirSync, writeFileSync, readFileSync, rmSync, existsSync } from 'fs'
import { join, resolve } from 'path'
import { tmpdir } from 'os'

// ─── Minimal harness (same as parser.test.ts) ─────────────────────────────────

let passed = 0
let failed = 0

function suite(name: string): void {
  console.log(`\n${name}`)
}

async function test(name: string, fn: () => void | Promise<void>): Promise<void> {
  try {
    await fn()
    console.log(`  ✓ ${name}`)
    passed++
  } catch (err) {
    console.log(`  ✗ ${name}`)
    console.log(`    ${err instanceof Error ? err.message : err}`)
    failed++
  }
}

function expectContains(actual: string, substring: string): void {
  if (!actual.includes(substring)) {
    throw new Error(`Expected to contain: ${JSON.stringify(substring)}\n    Got: ${JSON.stringify(actual)}`)
  }
}

function expectNotContains(actual: string, substring: string): void {
  if (actual.includes(substring)) {
    throw new Error(`Expected NOT to contain: ${JSON.stringify(substring)}\n    Got: ${JSON.stringify(actual)}`)
  }
}

// ─── Test fixture helpers ─────────────────────────────────────────────────────

function makeTempDir(): string {
  const dir = join(tmpdir(), `commark-test-${Date.now()}-${Math.random().toString(36).slice(2)}`)
  mkdirSync(dir, { recursive: true })
  return dir
}

function writeFixture(dir: string, rel: string, content: string): void {
  const full = join(dir, rel)
  mkdirSync(join(dir, rel, '..'), { recursive: true })
  writeFileSync(full, content, 'utf-8')
}

function readOutput(dir: string, rel: string): string {
  const full = join(dir, rel)
  if (!existsSync(full)) throw new Error(`Output file not found: ${rel}`)
  return readFileSync(full, 'utf-8')
}

function cleanup(dir: string): void {
  rmSync(dir, { recursive: true, force: true })
}

// ═══════════════════════════════════════════════════════════════════════════════
// INTEGRATION TESTS
// ═══════════════════════════════════════════════════════════════════════════════

suite('Pipeline — HTML output mode')

await test('basic markdown renders to HTML', async () => {
  const tmp = makeTempDir()
  try {
    writeFixture(tmp, 'pages/hello.md', '---\ntitle: Hello\n---\n\n# Hello World\n\nParagraph.')

    const { Site } = await import('../src/core/Site.js')
    const site = new Site({ output: join(tmp, 'dist'), format: 'html' })
    site.addPage(join(tmp, 'pages/hello.md'))
    await site.build()

    const html = readOutput(tmp, 'dist/hello.html')
    expectContains(html, '<h1>Hello World</h1>')
    expectContains(html, '<p>Paragraph.</p>')
  } finally { cleanup(tmp) }
})

await test('built-in \\note command renders in HTML', async () => {
  const tmp = makeTempDir()
  try {
    writeFixture(tmp, 'pages/note.md', String.raw`# Page

\note{Important message}`)

    const { Site } = await import('../src/core/Site.js')
    const site = new Site({ output: join(tmp, 'dist'), format: 'html' })
    site.addPage(join(tmp, 'pages/note.md'))
    await site.build()

    const html = readOutput(tmp, 'dist/note.html')
    expectContains(html, '<blockquote>')
    expectContains(html, 'Important message')
  } finally { cleanup(tmp) }
})

await test('\\textinput includes file content', async () => {
  const tmp = makeTempDir()
  try {
    writeFixture(tmp, 'pages/main.md', String.raw`# Main

\textinput{snippet.md}`)
    writeFixture(tmp, 'pages/snippet.md', 'Included content here.')

    const { Site } = await import('../src/core/Site.js')
    const site = new Site({ output: join(tmp, 'dist'), format: 'html' })
    site.addPage(join(tmp, 'pages/main.md'))
    await site.build()

    const html = readOutput(tmp, 'dist/main.html')
    expectContains(html, 'Included content here.')
  } finally { cleanup(tmp) }
})

await test('custom command defined in Site renders correctly', async () => {
  const tmp = makeTempDir()
  try {
    writeFixture(tmp, 'pages/index.md', String.raw`\badge{stable}{green}`)

    const { Site } = await import('../src/core/Site.js')
    const site = new Site({ output: join(tmp, 'dist'), format: 'html' })
    site.defineCommand('badge', (label, color) =>
      `<span class="badge" style="background:${color}">${label}</span>`
    )
    site.addPage(join(tmp, 'pages/index.md'))
    await site.build()

    const html = readOutput(tmp, 'dist/index.html')
    expectContains(html, 'class="badge"')
    expectContains(html, 'stable')
    expectContains(html, 'green')
  } finally { cleanup(tmp) }
})

await test('layout wraps content when registered', async () => {
  const tmp = makeTempDir()
  try {
    writeFixture(tmp, 'pages/index.md', '---\ntitle: My Page\nlayout: default\n---\n\nBody.')
    writeFixture(tmp, 'layouts/base.eta',
      '<!DOCTYPE html><html><head><title><%= it.title %></title></head><body><%~ it.content %></body></html>')

    const { Site } = await import('../src/core/Site.js')
    const site = new Site({
      output: join(tmp, 'dist'),
      format: 'html',
      defaultLayout: 'default',
    })
    site.addLayout('default', join(tmp, 'layouts/base.eta'))
    site.addPage(join(tmp, 'pages/index.md'))
    await site.build()

    const html = readOutput(tmp, 'dist/index.html')
    expectContains(html, '<!DOCTYPE html>')
    expectContains(html, '<title>My Page</title>')
    expectContains(html, '<p>Body.</p>')
  } finally { cleanup(tmp) }
})

await test('code fence content is NOT command-expanded', async () => {
  const tmp = makeTempDir()
  try {
    writeFixture(tmp, 'pages/code.md', '```\n\\note{skip me}\n```')

    const { Site } = await import('../src/core/Site.js')
    const site = new Site({ output: join(tmp, 'dist') })
    site.addPage(join(tmp, 'pages/code.md'))
    await site.build()

    const html = readOutput(tmp, 'dist/code.html')
    expectContains(html, '\\note{skip me}')
    expectNotContains(html, '<blockquote>')
  } finally { cleanup(tmp) }
})

await test('\\details renders as HTML details element', async () => {
  const tmp = makeTempDir()
  try {
    writeFixture(tmp, 'pages/d.md', String.raw`\details{Click me}{Hidden content}`)

    const { Site } = await import('../src/core/Site.js')
    const site = new Site({ output: join(tmp, 'dist') })
    site.addPage(join(tmp, 'pages/d.md'))
    await site.build()

    const html = readOutput(tmp, 'dist/d.html')
    expectContains(html, '<details>')
    expectContains(html, '<summary>Click me</summary>')
    expectContains(html, 'Hidden content')
  } finally { cleanup(tmp) }
})

suite('Pipeline — markdown passthrough mode')

await test('markdown mode outputs .md not .html', async () => {
  const tmp = makeTempDir()
  try {
    writeFixture(tmp, 'pages/hello.md', '# Hello\n\nBody.')

    const { Site } = await import('../src/core/Site.js')
    const site = new Site({ output: join(tmp, 'dist'), format: 'markdown' })
    site.addPage(join(tmp, 'pages/hello.md'))
    await site.build()

    const out = readOutput(tmp, 'dist/hello.md')
    expectContains(out, '# Hello')
  } finally { cleanup(tmp) }
})

await test('markdown mode expands commands into markdown syntax', async () => {
  const tmp = makeTempDir()
  try {
    writeFixture(tmp, 'pages/wiki.md', String.raw`# Wiki

\note{My note}`)

    const { Site } = await import('../src/core/Site.js')
    const site = new Site({ output: join(tmp, 'dist'), format: 'markdown' })
    site.addPage(join(tmp, 'pages/wiki.md'))
    await site.build()

    const out = readOutput(tmp, 'dist/wiki.md')
    // \note expands to > **Note:** ...
    expectContains(out, '> **Note:**')
    expectContains(out, 'My note')
    // Should NOT contain HTML
    expectNotContains(out, '<blockquote>')
  } finally { cleanup(tmp) }
})

await test('markdown mode preserves frontmatter', async () => {
  const tmp = makeTempDir()
  try {
    writeFixture(tmp, 'pages/p.md', '---\ntitle: Test\ndate: 2024-01-01\n---\n\nContent.')

    const { Site } = await import('../src/core/Site.js')
    const site = new Site({ output: join(tmp, 'dist'), format: 'markdown' })
    site.addPage(join(tmp, 'pages/p.md'))
    await site.build()

    const out = readOutput(tmp, 'dist/p.md')
    expectContains(out, 'title: Test')
    expectContains(out, 'date: 2024-01-01')
  } finally { cleanup(tmp) }
})

await test('\\textinput works in markdown mode (replacement)', async () => {
  const tmp = makeTempDir()
  try {
    writeFixture(tmp, 'pages/main.md', String.raw`# Main

\textinput{snippet.md}`)
    writeFixture(tmp, 'pages/snippet.md', '## Included section\n\nThis was included.')

    const { Site } = await import('../src/core/Site.js')
    const site = new Site({ output: join(tmp, 'dist'), format: 'markdown' })
    site.addPage(join(tmp, 'pages/main.md'))
    await site.build()

    const out = readOutput(tmp, 'dist/main.md')
    expectContains(out, '## Included section')
    expectNotContains(out, '\\textinput')
  } finally { cleanup(tmp) }
})

suite('Pipeline — addFolder')

await test('addFolder discovers all .md files', async () => {
  const tmp = makeTempDir()
  try {
    writeFixture(tmp, 'pages/a.md', '# A')
    writeFixture(tmp, 'pages/b.md', '# B')
    writeFixture(tmp, 'pages/sub/c.md', '# C')

    const { Site } = await import('../src/core/Site.js')
    const site = new Site({ output: join(tmp, 'dist'), format: 'html' })
    site.addFolder(join(tmp, 'pages'))
    await site.build()

    if (!existsSync(join(tmp, 'dist/a.html'))) throw new Error('a.html not found')
    if (!existsSync(join(tmp, 'dist/b.html'))) throw new Error('b.html not found')
    if (!existsSync(join(tmp, 'dist/sub/c.html'))) throw new Error('sub/c.html not found')
  } finally { cleanup(tmp) }
})

await test('addFolder with urlPrefix prepends to output path', async () => {
  const tmp = makeTempDir()
  try {
    writeFixture(tmp, 'posts/hello.md', '# Hello post')

    const { Site } = await import('../src/core/Site.js')
    const site = new Site({ output: join(tmp, 'dist'), format: 'html' })
    site.addFolder(join(tmp, 'posts'), { urlPrefix: '/blog' })
    await site.build()

    if (!existsSync(join(tmp, 'dist/blog/hello.html'))) {
      throw new Error('dist/blog/hello.html not found')
    }
  } finally { cleanup(tmp) }
})

suite('Pipeline — build errors')

await test('build reports error for missing \\textinput file', async () => {
  const tmp = makeTempDir()
  try {
    writeFixture(tmp, 'pages/bad.md', String.raw`\textinput{nonexistent.md}`)

    const { Site } = await import('../src/core/Site.js')
    const site = new Site({ output: join(tmp, 'dist') })
    site.addPage(join(tmp, 'pages/bad.md'))
    const result = await site.build()

    if (result.errors.length === 0) throw new Error('Expected a build error')
    expectContains(result.errors[0].message, 'not found')
  } finally { cleanup(tmp) }
})

await test('build continues after one page error', async () => {
  const tmp = makeTempDir()
  try {
    writeFixture(tmp, 'pages/good.md', '# Good page')
    writeFixture(tmp, 'pages/bad.md',  String.raw`\textinput{ghost.md}`)

    const { Site } = await import('../src/core/Site.js')
    const site = new Site({ output: join(tmp, 'dist') })
    site.addFolder(join(tmp, 'pages'))
    const result = await site.build()

    // good.html should still be written despite bad.md failing
    if (!existsSync(join(tmp, 'dist/good.html'))) throw new Error('good.html not written')
    if (result.errors.length === 0) throw new Error('Expected one error')
  } finally { cleanup(tmp) }
})

// ═══════════════════════════════════════════════════════════════════════════════
// SUMMARY
// ═══════════════════════════════════════════════════════════════════════════════

const total = passed + failed
console.log(`\n${'─'.repeat(50)}`)
if (failed === 0) {
  console.log(`✓ All ${total} tests passed`)
} else {
  console.log(`✗ ${failed} of ${total} tests failed`)
  process.exit(1)
}
