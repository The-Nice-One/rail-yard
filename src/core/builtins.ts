import { readFile } from 'fs/promises'
import { resolve, dirname, extname } from 'path'
import { existsSync } from 'fs'
import type { CommandRegistry } from './CommandRegistry.js'

/**
 * Register all built-in commands into the registry.
 * These use `registerDefault` so users can freely override any of them.
 *
 * @param registry  The CommandRegistry to populate
 * @param sourceDir The directory of the file being processed (for relative path resolution)
 */
export function registerBuiltins(registry: CommandRegistry, sourceDir: string): void {

  // ── \textinput{path} ──────────────────────────────────────────────────────
  // Reads a file and inlines its content verbatim.
  // Paths are resolved relative to sourceDir.
  // The inlined content re-enters the expansion pipeline, so nested \commands work.
  registry.registerDefault('textinput', async (path: string) => {
    const fullPath = resolve(sourceDir, path.trim())
    if (!existsSync(fullPath)) {
      throw new Error(`\\textinput: file not found: "${path}" (resolved to: ${fullPath})`)
    }
    return readFile(fullPath, 'utf-8')
  })

  // ── \textinputraw{path} ───────────────────────────────────────────────────
  // Like \textinput but wraps the content in a fenced code block.
  // Useful for showing source code files inline.
  registry.registerDefault('textinputraw', async (path: string) => {
    const fullPath = resolve(sourceDir, path.trim())
    if (!existsSync(fullPath)) {
      throw new Error(`\\textinputraw: file not found: "${path}"`)
    }
    const content = await readFile(fullPath, 'utf-8')
    const lang = extname(path).slice(1) // e.g. "ts", "rs", "py"
    return `\`\`\`${lang}\n${content}\n\`\`\``
  })

  // ── \note{content} ────────────────────────────────────────────────────────
  // Renders a markdown blockquote styled as a note.
  registry.registerDefault('note', (content: string) => {
    return `> **Note:** ${content}`
  })

  // ── \warn{content} ────────────────────────────────────────────────────────
  registry.registerDefault('warn', (content: string) => {
    return `> **⚠ Warning:** ${content}`
  })

  // ── \details{summary}{content} ────────────────────────────────────────────
  // Renders an HTML <details>/<summary> collapsible block.
  registry.registerDefault('details', (summary: string, content: string) => {
    return [
      `<details>`,
      `<summary>${summary}</summary>`,
      ``,
      content,
      ``,
      `</details>`,
    ].join('\n')
  })

  // ── \html{content} ────────────────────────────────────────────────────────
  // Pass raw HTML through. In markdown mode this is emitted as-is.
  // In HTML mode, rehype-raw ensures it renders correctly.
  registry.registerDefault('html', (content: string) => content)

  // ── \newcommand{name}{body} ───────────────────────────────────────────────
  // Franklin-style inline command definition.
  // \newcommand{\cmdname}{The body with #1 for arg 1, #2 for arg 2, etc.}
  // This is handled specially: we register a new command at expansion time.
  // Note: this mutates the registry during expansion (intentional — matches LaTeX behaviour).
  registry.registerDefault('newcommand', (name: string, body: string) => {
    // Strip leading backslash if present (Franklin style: \newcommand{\name}{...})
    const cmdName = name.startsWith('\\') ? name.slice(1) : name

    registry.register(cmdName, (...args: string[]) => {
      // Replace #1, #2, ... with positional arguments
      return body.replace(/#(\d+)/g, (_, n) => {
        const idx = parseInt(n, 10) - 1
        return args[idx] ?? ''
      })
    })

    return '' // \newcommand itself produces no output
  })
}
