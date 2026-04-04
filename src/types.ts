// ─── AST Node Types (output of the PEG parser) ───────────────────────────────

export interface TextNode {
  type: 'text'
  value: string
}

export interface CodeFenceNode {
  type: 'codefence'
  lang: string
  content: string
}

export interface InlineCodeNode {
  type: 'inlinecode'
  content: string
}

export interface CommandNode {
  type: 'command'
  name: string
  args: ASTNode[][]  // each arg is a list of nodes (may contain sub-commands)
}

export type ASTNode = TextNode | CodeFenceNode | InlineCodeNode | CommandNode

// ─── Command Handler Types ────────────────────────────────────────────────────

/**
 * A command handler receives already-expanded string arguments and returns
 * a string (markdown or HTML). May be async.
 */
export type CommandHandler = (...args: string[]) => string | Promise<string>

// ─── Page & Site Config ───────────────────────────────────────────────────────

/** Output format for the pipeline */
export type OutputFormat = 'html' | 'markdown'

export interface PageOptions {
  /** Layout name to use (must be registered via site.addLayout) */
  layout?: string
  /** URL prefix prepended when generating output paths */
  urlPrefix?: string
  /** Override the site-level output format for this page */
  format?: OutputFormat
}

export interface SiteConfig {
  /** Directory to write output files to */
  output: string
  /** Base URL for the site (used in HTML <base> or sitemap) */
  baseUrl?: string
  /** Default output format (default: 'html') */
  format?: OutputFormat
  /** Default layout name */
  defaultLayout?: string
  /** Site-level variables available in layouts */
  siteVars?: Record<string, unknown>
}

// ─── Internal Page Model ─────────────────────────────────────────────────────

export interface PageEntry {
  /** Absolute path to the source .md file */
  sourcePath: string
  /** Relative path from source root (for output path calculation) */
  relPath: string
  options: PageOptions
}

export interface CSSEntry {
  sourcePath: string
}

export interface StaticEntry {
  sourcePath: string
  destSubPath?: string
}

export interface LayoutEntry {
  name: string
  templatePath: string
}

// ─── Build Result ─────────────────────────────────────────────────────────────

export interface BuildResult {
  pagesWritten: number
  cssWritten: number
  staticCopied: number
  durationMs: number
  errors: BuildError[]
}

export interface BuildError {
  file: string
  message: string
  cause?: unknown
}

// ─── Parsed Frontmatter ───────────────────────────────────────────────────────

export interface Frontmatter {
  title?: string
  layout?: string
  date?: string
  tags?: string[]
  [key: string]: unknown
}
