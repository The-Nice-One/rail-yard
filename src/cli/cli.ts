#!/usr/bin/env node
/**
 * commark CLI
 *
 * Usage:
 *   commark build [--config path]          Full HTML build
 *   commark serve [--config path]          Build + watch + dev server
 *   commark preprocess -i ./in -o ./out    Markdown-only preprocessor (replaces preprocess.jl)
 *   commark new <project-name>             Scaffold a new project
 */

import { readFileSync, existsSync } from 'fs'
import { resolve, join, relative } from 'path'
import pc from 'picocolors'
import { createServer } from './devServer.js'

const [, , command, ...argv] = process.argv

function help(): void {
  console.log(`
${pc.bold(pc.cyan('commark'))} — command-driven markdown preprocessor and SSG

${pc.bold('Usage:')}
  commark ${pc.cyan('build')}       [--config path]         Build the site to HTML
  commark ${pc.cyan('serve')}       [--config path]         Build, watch, and serve locally
  commark ${pc.cyan('preprocess')}  -i <dir> -o <dir>       Markdown-only command preprocessor
  commark ${pc.cyan('new')}         <project-name>          Scaffold a new project
  commark ${pc.cyan('help')}                                 Show this message

${pc.bold('Options:')}
  --config, -c    Path to build config file (default: ./build.ts or ./commark.config.ts)
  --port, -p      Dev server port (default: 3000)

${pc.bold('Examples:')}
  commark build
  commark serve --port 4000
  commark preprocess -i ./docs -o ./dist-wiki
  commark new my-site
`)
}

async function runBuild(args: string[], watch: boolean): Promise<void> {
  const configPath = getArg(args, '--config', '-c') ?? findConfig()
  if (!configPath) {
    console.error(pc.red('✗ No build config found. Create build.ts or commark.config.ts, or use --config.'))
    process.exit(1)
  }

  console.log(pc.dim(`Using config: ${relative(process.cwd(), configPath)}\n`))

  // Inject --watch into process.argv so build scripts can check for it
  if (watch && !process.argv.includes('--watch')) {
    process.argv.push('--watch')
  }

  try {
    // Dynamically import the user's build script
    await import(resolve(configPath))
  } catch (err) {
    console.error(pc.red(`✗ Build failed: ${err instanceof Error ? err.message : err}`))
    process.exit(1)
  }
}

async function runPreprocess(args: string[]): Promise<void> {
  const inputDir  = getArg(args, '--input', '-i')
  const outputDir = getArg(args, '--output', '-o')
  const port      = parseInt(getArg(args, '--port', '-p') ?? '3000', 10)

  if (!inputDir || !outputDir) {
    console.error(pc.red('✗ preprocess requires --input (-i) and --output (-o)'))
    console.log(pc.dim('  Example: commark preprocess -i ./docs -o ./dist-wiki'))
    process.exit(1)
  }

  const { Site } = await import('../core/Site.js')

  const site = new Site({
    output: resolve(outputDir),
    format: 'markdown',
  })

  site.addFolder(inputDir)
  await site.build()
}

async function runServe(args: string[]): Promise<void> {
  const port = parseInt(getArg(args, '--port', '-p') ?? '3000', 10)

  // First run the build with --watch
  process.argv.push('--watch')
  const buildPromise = runBuild(args, true)

  // Give the build a moment to start, then launch the dev server
  setTimeout(async () => {
    await createServer({ port })
  }, 200)

  await buildPromise
}

async function runNew(args: string[]): Promise<void> {
  const name = args[0]
  if (!name) {
    console.error(pc.red('✗ Usage: commark new <project-name>'))
    process.exit(1)
  }

  const { scaffold } = await import('./scaffold.js')
  await scaffold(name)
}

// ─── Dispatch ────────────────────────────────────────────────────────────────

switch (command) {
  case 'build':
    await runBuild(argv, false)
    break
  case 'serve':
    await runServe(argv)
    break
  case 'preprocess':
    await runPreprocess(argv)
    break
  case 'new':
    await runNew(argv)
    break
  case 'help':
  case '--help':
  case '-h':
  case undefined:
    help()
    break
  default:
    console.error(pc.red(`✗ Unknown command: ${command}`))
    help()
    process.exit(1)
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getArg(args: string[], ...flags: string[]): string | undefined {
  for (const flag of flags) {
    const idx = args.indexOf(flag)
    if (idx !== -1 && args[idx + 1]) return args[idx + 1]
  }
  return undefined
}

function findConfig(): string | undefined {
  const candidates = ['commark.config.ts', 'build.ts', 'commark.config.js', 'build.js']
  for (const c of candidates) {
    if (existsSync(join(process.cwd(), c))) return join(process.cwd(), c)
  }
  return undefined
}
