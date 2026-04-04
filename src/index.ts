// ─── Main API ─────────────────────────────────────────────────────────────────
export { Site } from './core/Site.js'
export { watch } from './core/watch.js'

// ─── Lower-level building blocks (for advanced use) ───────────────────────────
export { CommandRegistry } from './core/CommandRegistry.js'
export { parse, parseOrThrow } from './parser/parse.js'
export { expand } from './parser/expand.js'
export { renderMarkdown } from './render/markdown.js'
export { LayoutRenderer } from './render/layout.js'
export { processCSS } from './assets/css.js'
export { scanFolder } from './helpers/addFolder.js'

// ─── Types ────────────────────────────────────────────────────────────────────
export type {
  SiteConfig,
  PageOptions,
  OutputFormat,
  CommandHandler,
  BuildResult,
  BuildError,
  Frontmatter,
  ASTNode,
  TextNode,
  CodeFenceNode,
  InlineCodeNode,
  CommandNode,
} from './types.js'
