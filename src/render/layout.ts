import { Eta } from 'eta'
import { readFile } from 'fs/promises'
import { existsSync } from 'fs'
import { resolve } from 'path'
import type { Frontmatter, SiteConfig } from '../types.js'

/**
 * Manages layout templates using the Eta template engine.
 *
 * Eta uses <%~ ... %> for unescaped HTML output (needed for page content),
 * <%= ... %> for escaped output, and <% ... %> for logic.
 *
 * Example layout (layouts/base.eta):
 *
 *   <!DOCTYPE html>
 *   <html lang="en">
 *   <head>
 *     <meta charset="UTF-8">
 *     <title><%= it.title %> — <%= it.site.title %></title>
 *     <%~ it.css %>
 *   </head>
 *   <body>
 *     <main><%~ it.content %></main>
 *   </body>
 *   </html>
 */
export class LayoutRenderer {
  private eta: Eta
  private templates = new Map<string, string>()

  constructor(private siteConfig: SiteConfig) {
    this.eta = new Eta({ autoEscape: true })
  }

  /**
   * Register a named layout from a file path.
   */
  async addLayout(name: string, templatePath: string): Promise<void> {
    const fullPath = resolve(templatePath)
    if (!existsSync(fullPath)) {
      throw new Error(`Layout "${name}": template file not found at ${fullPath}`)
    }
    const source = await readFile(fullPath, 'utf-8')
    this.templates.set(name, source)
  }

  /**
   * Render a page's HTML content into a layout template.
   *
   * The template receives an `it` object with:
   *   - it.content   — the rendered page HTML (use <%~ it.content %> to avoid escaping)
   *   - it.title     — from frontmatter
   *   - it.css       — injected CSS <link> or <style> tags
   *   - it.site      — site-level config vars
   *   - it.*         — all other frontmatter fields
   */
  async render(params: RenderParams): Promise<string> {
    const { layoutName, content, frontmatter, css } = params

    const template = this.templates.get(layoutName)
    if (!template) {
      throw new Error(
        `Layout "${layoutName}" not found. ` +
        `Registered layouts: ${[...this.templates.keys()].join(', ') || '(none)'}`
      )
    }

    const context = {
      content,
      css,
      site: this.siteConfig.siteVars ?? {},
      ...frontmatter,
      // Ensure title always exists (fallback to empty string)
      title: frontmatter.title ?? '',
    }

    return this.eta.renderString(template, context)
  }

  has(name: string): boolean {
    return this.templates.has(name)
  }

  names(): string[] {
    return [...this.templates.keys()]
  }
}

export interface RenderParams {
  layoutName: string
  content: string
  frontmatter: Frontmatter
  /** Pre-rendered CSS tags to inject into <head> */
  css: string
}
