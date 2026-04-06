import { mkdirSync, writeFileSync } from "fs";
import { join } from "path";
import pc from "picocolors";
/**
 * Scaffold a new rail-yard project with a sensible starter structure.
 */
export async function scaffold(name) {
    const root = join(process.cwd(), name);
    console.log(`\n${pc.bold(pc.cyan("◆ rail-yard"))} scaffolding ${pc.bold(name)}\n`);
    const dirs = ["", "pages", "layouts", "styles", "public"];
    for (const dir of dirs) {
        const full = join(root, dir);
        mkdirSync(full, { recursive: true });
        if (dir)
            console.log(`  ${pc.green("+")} ${name}/${dir}/`);
    }
    const files = {
        "package.json": packageJson(name),
        "build.ts": buildScript(name),
        "pages/index.md": indexPage(name),
        "pages/about.md": aboutPage(),
        "layouts/base.eta": baseLayout(name),
        "styles/main.css": mainCSS(),
        ".gitignore": gitignore(),
        "README.md": readme(name),
    };
    for (const [rel, content] of Object.entries(files)) {
        const full = join(root, rel);
        writeFileSync(full, content, "utf-8");
        console.log(`  ${pc.green("+")} ${name}/${rel}`);
    }
    console.log(`
${pc.green(pc.bold("✓ Done!"))} Your project is ready.

${pc.bold("Next steps:")}

  ${pc.cyan(`cd ${name}`)}
  ${pc.cyan("npm install")}
  ${pc.cyan("npx tsx build.ts")}          build once
  ${pc.cyan("rail-yard serve")}             build + watch + live reload
`);
}
// ─── File templates ───────────────────────────────────────────────────────────
function packageJson(name) {
    return (JSON.stringify({
        name,
        version: "0.1.0",
        description: "",
        type: "module",
        scripts: {
            build: "npx tsx build.ts",
            serve: "rail-yard serve",
            preprocess: "rail-yard preprocess -i ./docs -o ./wiki",
        },
        dependencies: {
            "rail-yard": "*",
        },
        devDependencies: {
            tsx: "^4.19.0",
            typescript: "^5.6.0",
            "@types/node": "^22.0.0",
        },
    }, null, 2) + "\n");
}
function buildScript(name) {
    return `import { Site, watch } from 'rail-yard'
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
`;
}
function indexPage(name) {
    // Single \\ in a template literal writes one \ to disk — correct for rail-yard commands.
    return `---
title: Home
layout: default
---

# Welcome to ${name}

\\note{This is a built-in note command. Edit \`pages/index.md\` to get started.}

## What is rail-yard?

rail-yard is a command-driven markdown preprocessor and static site generator.
You can define custom commands in your \`build.ts\` and use them anywhere in markdown.

## Example commands

\\badge{new}{#0070f3}

## File inclusion

Use \`\\textinput{path/to/file.md}\` to inline another file's content.

## Learn more

- [About](/about)
`;
}
function aboutPage() {
    return `---
title: About
layout: default
---

# About

This site was built with [rail-yard](https://github.com/The-Nice-One/rail-yard).

\\warn{Remember to update this page with your own content!}
`;
}
function baseLayout(name) {
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
    <p>Built with rail-yard.</p>
  </footer>
</body>
</html>
`;
}
function mainCSS() {
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
`;
}
function gitignore() {
    return `node_modules/
dist/
dist-wiki/
.DS_Store
*.js.map
`;
}
function readme(name) {
    return `# ${name}

Built with [rail-yard](https://github.com/The-Nice-One/rail-yard).

## Development

\`\`\`bash
npx tsx build.ts          # one-off build
rail-yard serve             # build + watch + live reload
rail-yard preprocess -i ./docs -o ./wiki   # markdown passthrough mode
\`\`\`

## Custom commands

Edit \`build.ts\` to add your own commands:

\`\`\`ts
site.defineCommand('myCmd', (arg1, arg2) => \`**\${arg1}**: \${arg2}\`)
\`\`\`

Then use in any markdown file:

\`\`\`
\\myCmd{label}{content}
\`\`\`
`;
}
//# sourceMappingURL=scaffold.js.map