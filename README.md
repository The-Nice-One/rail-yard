# commark

A command-driven markdown preprocessor and static site generator, inspired by [Franklin.jl](https://franklinjl.org/).

Define custom `\commands{like}{this}` in TypeScript. Use them anywhere in Markdown. Output HTML, or stay in Markdown.

```
\note{This is a built-in note command.}

\newcommand{\badge}[1]{<span class="badge">#1</span>}

\badge{stable}

\textinput{shared/footer.md}
```

---

## Features

- **LaTeX-style commands** — `\cmd{arg1}{arg2}` syntax, fully recursive
- **TypeScript handlers** — commands call real TS functions, including `async`
- **Two output modes** — HTML (SSG) or Markdown passthrough (wiki preprocessor)
- **Programmatic builder API** — no folder conventions, just `site.addPage()` and `site.addFolder()`
- **Built-in commands** — `\textinput`, `\note`, `\warn`, `\details`, `\newcommand`, `\html`
- **Code fence protection** — commands inside `` ``` `` blocks are never expanded
- **CSS processing** — lightningcss bundles, minifies, and fingerprints CSS
- **Live reload dev server** — SSE-based, zero config
- **Watch mode** — chokidar-powered incremental rebuilds

---

## Install

```bash
npm install commark
```

---

## Quick start

```ts
// build.ts
import { Site, watch } from 'commark'

const isWatch = process.argv.includes('--watch')

const site = new Site({
  output:        './dist',
  format:        'html',         // or 'markdown'
  defaultLayout: 'default',
  siteVars:      { title: 'My Site' },
})

// Custom commands
site.defineCommand('badge', (label, color) =>
  `<span class="badge" style="background:${color}">${label}</span>`
)

site.defineCommand('fetchLatest', async () => {
  const data = await fetch('https://api.example.com/posts').then(r => r.json())
  return data.posts.map((p: any) => `- [${p.title}](${p.url})`).join('\n')
})

// Assets
site.addCSS('./styles/main.css')
site.addStatic('./public')

// Layouts
site.addLayout('default', './layouts/base.eta')
site.addLayout('post', './layouts/post.eta')

// Pages
site.addPage('./pages/index.md')
site.addFolder('./posts', { layout: 'post', urlPrefix: '/blog' })

if (isWatch) {
  await watch(site, { paths: ['./pages', './posts', './layouts', './styles'] })
} else {
  await site.build()
}
```

Run it:

```bash
npx tsx build.ts          # one-off build
npx tsx build.ts --watch  # build + watch + live reload
commark serve             # same, via CLI
```

---

## Command syntax

Commands follow LaTeX brace syntax: `\commandName{arg1}{arg2}`.

```markdown
\note{This is a note.}
\wrap{strong}{bold text}
\badge{v1.0}{green}
```

### Zero-argument commands

```markdown
\siteName
\currentYear
```

### Nested commands

Arguments are expanded before being passed to the handler, so nesting works naturally:

```markdown
\upper{\wrap{em}{hello}}
→ <EM>HELLO</EM>
```

### Commands inside code fences are never expanded

````markdown
```
\note{this is NOT expanded — it appears literally}
```
````

### Escaped backslash

`\\` produces a literal `\` in the output.

---

## Built-in commands

| Command | Usage | Output |
|---------|-------|--------|
| `\textinput` | `\textinput{path/to/file.md}` | Inlines file content (recursively expanded) |
| `\textinputraw` | `\textinputraw{path/to/file.ts}` | Inlines file in a fenced code block |
| `\note` | `\note{content}` | `> **Note:** content` |
| `\warn` | `\warn{content}` | `> **⚠ Warning:** content` |
| `\details` | `\details{summary}{content}` | HTML `<details>/<summary>` block |
| `\html` | `\html{<raw html>}` | Pass-through raw HTML |
| `\newcommand` | `\newcommand{\name}{body with #1}` | Define a new command inline |

All built-ins can be overridden with `site.defineCommand('note', ...)`.

### `\newcommand` — inline command definition

Define commands inside Markdown files, Franklin-style:

```markdown
\newcommand{\greeting}{Hello, #1! You are visitor #2.}

\greeting{World}{42}
```

- `#1`, `#2`, … are replaced with positional arguments at call time
- The command is available for the rest of the current page
- `\newcommand` itself produces no output

---

## Site builder API

### `new Site(config)`

```ts
const site = new Site({
  output:        './dist',          // required — output directory
  baseUrl:       'https://…',       // optional — used in sitemaps etc.
  format:        'html',            // 'html' | 'markdown' (default: 'html')
  defaultLayout: 'default',         // layout to use when none is specified
  siteVars:      { title: 'Blog' }, // available as it.site.* in layouts
})
```

### `site.defineCommand(name, handler)`

Register a custom command. The handler receives already-expanded string arguments.

```ts
// Sync
site.defineCommand('upper', (s) => s.toUpperCase())

// Multi-arg
site.defineCommand('link', (href, label) => `[${label}](${href})`)

// Async
site.defineCommand('weather', async (city) => {
  const data = await fetchWeather(city)
  return `**${city}:** ${data.temp}°C`
})

// Re-emitting commands (the output is re-expanded)
site.defineCommand('twoNotes', (a, b) => `\\note{${a}}\n\n\\note{${b}}`)
```

### `site.addCSS(path)`

Process a CSS file through [lightningcss](https://lightningcss.dev/): resolves `@import`, minifies, and fingerprints the filename. A `<link>` tag is injected into all layouts automatically.

```ts
site.addCSS('./styles/main.css')   // → /css/main.a1b2c3d4.css
```

### `site.addStatic(sourcePath, destSubPath?)`

Copy a file or directory verbatim to the output directory.

```ts
site.addStatic('./public')           // → dist/public/
site.addStatic('./robots.txt', '')   // → dist/robots.txt
site.addStatic('./images', 'img')    // → dist/img/
```

### `site.addLayout(name, templatePath)`

Register a named [Eta](https://eta.js.org/) layout template.

```ts
site.addLayout('default', './layouts/base.eta')
site.addLayout('post',    './layouts/post.eta')
```

**Template variables:**

| Variable | Type | Description |
|----------|------|-------------|
| `it.content` | `string` | Rendered page HTML — use `<%~ it.content %>` |
| `it.title` | `string` | From frontmatter |
| `it.css` | `string` | `<link>` tags for all registered CSS |
| `it.site` | `object` | `siteVars` from site config |
| `it.*` | `any` | All other frontmatter fields |

**Example layout:**

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title><%= it.title %> — <%= it.site.title %></title>
  <%~ it.css %>
</head>
<body>
  <main><%~ it.content %></main>
</body>
</html>
```

### `site.addPage(sourcePath, options?)`

Register a single Markdown page.

```ts
site.addPage('./pages/index.md')
site.addPage('./pages/about.md', { layout: 'minimal' })
site.addPage('./pages/draft.md', { format: 'markdown' }) // per-page format override

// Preserve directory structure relative to a base path
site.addPage('./pages/blog/post.md', { basePath: './pages' })
// → dist/blog/post.html
```

**Page options:**

| Option | Type | Description |
|--------|------|-------------|
| `layout` | `string` | Layout name (overrides `defaultLayout`) |
| `urlPrefix` | `string` | Prepend to output path, e.g. `/blog` |
| `format` | `'html' \| 'markdown'` | Override site format for this page |
| `basePath` | `string` | Base dir for computing output path from source |

### `site.addFolder(folderPath, options?)`

Discover and register all `.md` files in a directory (recursively).

```ts
site.addFolder('./pages')
site.addFolder('./posts', { layout: 'post', urlPrefix: '/blog' })
site.addFolder('./wiki',  { format: 'markdown', pattern: '**/*.md' })
```

Accepts all page options, plus:

| Option | Type | Description |
|--------|------|-------------|
| `pattern` | `string` | Glob pattern (default: `**/*.md`) |

### `await site.build()`

Execute the build. Returns a `BuildResult`:

```ts
const result = await site.build()
// {
//   pagesWritten: 12,
//   cssWritten: 1,
//   staticCopied: 1,
//   durationMs: 84,
//   errors: []
// }
```

Build errors are collected rather than thrown — all other pages still build even if one fails.

---

## Frontmatter

Standard YAML frontmatter is supported via `gray-matter`:

```markdown
---
title: My Post
layout: post
date: 2024-01-15
tags: [rust, systems]
customVar: hello
---

# My Post

\note{Written on #{ it.date }.}
```

All frontmatter fields are available in layouts as `it.<field>`. The `layout` field selects which registered layout to use. The `title` field populates `it.title`.

---

## Markdown output mode (wiki preprocessor)

Set `format: 'markdown'` to skip HTML rendering entirely. Commands expand into their markdown/text output, and `.md` files are written to the output directory with frontmatter preserved.

This replaces simple regex-based preprocessors (like a `\textinput` script) with a proper parser that handles nesting, code fence protection, and arbitrary command definitions.

```ts
const site = new Site({ output: './wiki-out', format: 'markdown' })
site.addFolder('./docs')
await site.build()
// Outputs expanded .md files ready for GitHub Wiki, Docusaurus, etc.
```

---

## CLI

```
commark build [--config path]          Build to HTML
commark serve [--config path]          Build + watch + dev server
commark preprocess -i <dir> -o <dir>   Markdown-only preprocessor
commark new <project-name>             Scaffold a new project
```

`commark serve` starts a dev server with SSE-based live reload — no configuration needed, just open `http://localhost:3000`.

`commark preprocess` is a drop-in replacement for simple regex-based preprocessors. It reads all `.md` files from `<dir>`, expands `\textinput` and any other built-in commands, and writes expanded `.md` files to the output directory.

---

## Watch mode

```ts
import { watch } from 'commark'

await watch(site, {
  paths:      ['./pages', './layouts', './styles'],
  debounceMs: 100,
})
```

`watch()` runs an initial full build, then rebuilds on any file change in the watched paths. The output directory is automatically excluded from the watch to prevent loops.

---

## How it works

The pipeline has a clean break point — command expansion is separate from HTML rendering:

```
Source (.md)
  → Strip frontmatter          (gray-matter)
  → Parse commands             (PEG grammar compiled by peggy)
  → Expand commands            (depth-first, async, recursive re-expansion)
  → [STOP here in markdown mode]
  → Render markdown → HTML     (unified + remark + rehype)
  → Apply layout               (Eta)
  → Write output
```

**Commands are expanded before Markdown is parsed.** This means command output can itself contain Markdown (including headings, lists, links), which will be rendered correctly. It also means command output can contain further `\commands`, which are re-expanded recursively up to a configurable depth limit.

**Code fences are opaque.** The parser recognises `` ```...``` `` and `` `...` `` blocks and emits them as opaque nodes that bypass expansion. Commands inside code examples are never called.

---

## Project layout

```
src/
├── core/
│   ├── Site.ts            ← Builder class (public API)
│   ├── Pipeline.ts        ← Per-page build orchestration
│   ├── CommandRegistry.ts ← Command storage and lookup
│   ├── builtins.ts        ← Built-in command definitions
│   └── watch.ts           ← Watch mode
├── parser/
│   ├── grammar.peggy      ← PEG grammar source
│   ├── grammar.gen.ts     ← Pre-compiled parser (auto-generated)
│   ├── parse.ts           ← parse() / parseOrThrow()
│   └── expand.ts          ← AST walker and command dispatcher
├── render/
│   ├── markdown.ts        ← unified pipeline
│   └── layout.ts          ← Eta layout renderer
├── assets/
│   ├── css.ts             ← lightningcss integration
│   └── static.ts          ← Static file copy
├── cli/
│   ├── cli.ts             ← CLI entry point
│   ├── devServer.ts       ← SSE dev server
│   └── scaffold.ts        ← commark new
├── helpers/
│   └── addFolder.ts       ← glob-based folder scanner
├── types.ts               ← All shared TypeScript types
└── index.ts               ← Public API exports
```

---

## Differences from Franklin.jl

| Feature | Franklin.jl | commark |
|---------|-------------|---------|
| Command syntax | `\cmd{arg}` | `\cmd{arg}` ✓ |
| Calls real language functions | ✓ (Julia) | ✓ (TypeScript) |
| Async command handlers | ✗ | ✓ |
| Markdown output mode | ✗ | ✓ |
| Programmatic builder API | ✗ (folder-tree) | ✓ |
| Maintenance status | Unmaintained | Active |

---

## License

MIT
