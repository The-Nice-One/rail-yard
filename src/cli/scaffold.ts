import { mkdirSync, writeFileSync } from 'fs'
import { join } from 'path'
import pc from 'picocolors'

/**
 * Scaffold a new commark project with a sensible starter structure.
 */
export async function scaffold(name: string): Promise<void> {
  const root = join(process.cwd(), name)

  console.log(`\n${pc.bold(pc.cyan('◆ commark'))} scaffolding ${pc.bold(name)}\n`)

  const dirs = [
    '',
    'pages',
    'layouts',
    'styles',
    'public',
  ]

  for (const dir of dirs) {
    const full = join(root, dir)
    mkdirSync(full, { recursive: true })
    if (dir) console.log(`  ${pc.green('+')} ${name}/${dir}/`)
  }

  const files: Record<string, string> = {
    'build.ts': buildScript(name),
    'pages/index.md': indexPage(name),
    'pages/about.md': aboutPage(),
    'layouts/base.eta': baseLayout(name),
    'styles/main.css': mainCSS(),
    '.gitignore': gitignore(),
    'README.md': readme(name),
  }

  for (const [rel, content] of Object.entries(files)) {
    const full = join(root, rel)
    writeFileSync(full, content, 'utf-8')
    console.log(`  ${pc.green('+')} ${name}/${rel}`)
  }

  console.log(`
${pc.green(pc.bold('✓ Done!'))} Your project is ready.

${pc.bold('Next steps:')}

  ${pc.cyan(`cd ${name}`)}
  ${pc.cyan('npm install commark')}       (once published)
  ${pc.cyan('npx tsx build.ts')}          build now
  ${pc.cyan('commark serve')}             build + watch + live reload
`)
}

// ─── File templates ───────────────────────────────────────────────────────────

function buildScript(name: string): string {
  return `import { Site, watch } from 'commark'
import { resolve } from 'path'

const isWatch = process.argv.includes('--watch')

const site = new Site({
  output:        resolve('dist'),
  baseUrl:       'https://example.com',
  format:        'html',
  defaultLayout: 'default',
  siteVars:      { title: '${name}' },
})

// ── Custom commands ───────────────────────────────────────────────────────────

site.defineCommand('badge', (label, color) =>
  \`<span class="badge" style="background:\${color}">\${label}</span>\`
)

// ── Assets & layouts ─────────────────────────────────────────────────────────

site.addCSS('./styles/main.css')
site.addStatic('./public')
site.addLayout('default', './layouts/base.eta')

// ── Pages ────────────────────────────────────────────────────────────────────

site.addFolder('./pages', { layout: 'default' })

// ── Build ─────────────────────────────────────────────────────────────────────

if (isWatch) {
  await watch(site, { paths: ['./pages', './layouts', './styles'] })
} else {
  await site.build()
}
`
}

function indexPage(name: string): string {
  return `---
title: Home
layout: default
---

# Welcome to ${name}

\\\\note{This is a built-in note command. Edit \`pages/index.md\` to get started.}

## What is commark?

Commark is a command-driven markdown preprocessor and static site generator.
You can define custom commands in your \`build.ts\` and use them anywhere in markdown.

## Example commands

\\\\badge{new}{#0070f3}

## File inclusion

Use \`\\\\textinput{path/to/file.md}\` to inline another file's content.

## Learn more

- [About](/about)
`
}

function aboutPage(): string {
  return `---
title: About
layout: default
---

# About

This site was built with [commark](https://github.com/nicholasgasior/commark).

\\\\warn{Remember to update this page with your own content!}
`
}

function baseLayout(name: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title><%= it.title ? it.title + ' — ' + it.site.title : it.site.title %></title>
  <%~ it.css %>
</head>
<body>
  <header>
    <nav>
      <a href="/" class="site-title"><strong><%= it.site.title %></strong></a>
      <a href="/about">About</a>
    </nav>
  </header>
  <main>
    <%~ it.content %>
  </main>
  <footer>
    <p>Built with commark.</p>
  </footer>
</body>
</html>
`
}

function mainCSS(): string {
  return `*, *::before, *::after { box-sizing: border-box; }

body {
  font-family: system-ui, -apple-system, sans-serif;
  font-size: 1rem;
  line-height: 1.6;
  color: #1a1a1a;
  max-width: 800px;
  margin: 0 auto;
  padding: 2rem 1.5rem;
}

header {
  border-bottom: 1px solid #eee;
  margin-bottom: 2rem;
  padding-bottom: 1rem;
}

nav {
  display: flex;
  align-items: center;
  gap: 1.5rem;
}

nav a {
  text-decoration: none;
  color: #555;
}

nav a:hover { color: #000; }

.site-title { color: #000 !important; }

main { min-height: 60vh; }

h1, h2, h3 { line-height: 1.25; }

a { color: #0070f3; }

blockquote {
  border-left: 4px solid #ddd;
  margin: 0;
  padding: 0.5rem 1rem;
  color: #555;
  background: #fafafa;
}

pre {
  background: #1e1e1e;
  color: #d4d4d4;
  padding: 1rem 1.25rem;
  border-radius: 6px;
  overflow-x: auto;
  font-size: 0.875rem;
}

code {
  font-family: 'Cascadia Code', 'Fira Code', monospace;
  font-size: 0.9em;
}

p > code {
  background: #f0f0f0;
  padding: 0.15em 0.4em;
  border-radius: 3px;
}

details {
  background: #f5f5f5;
  border-radius: 6px;
  padding: 0.75rem 1rem;
  margin: 1rem 0;
}

summary { cursor: pointer; font-weight: 600; }

footer {
  margin-top: 3rem;
  padding-top: 1rem;
  border-top: 1px solid #eee;
  color: #999;
  font-size: 0.875rem;
}

.badge {
  display: inline-block;
  padding: 0.2em 0.6em;
  border-radius: 4px;
  font-size: 0.8em;
  font-weight: 600;
  color: #fff;
}
`
}

function gitignore(): string {
  return `node_modules/
dist/
dist-wiki/
.DS_Store
*.js.map
`
}

function readme(name: string): string {
  return `# ${name}

Built with [commark](https://github.com/nicholasgasior/commark).

## Development

\`\`\`bash
npx tsx build.ts          # one-off build
commark serve             # build + watch + live reload
commark preprocess -i ./docs -o ./wiki   # markdown passthrough mode
\`\`\`

## Custom commands

Edit \`build.ts\` to add your own commands:

\`\`\`ts
site.defineCommand('myCmd', (arg1, arg2) => \`**\${arg1}**: \${arg2}\`)
\`\`\`

Then use in any markdown file:

\`\`\`
\\\\myCmd{label}{content}
\`\`\`
`
}
