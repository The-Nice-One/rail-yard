import type { Frontmatter, SiteConfig } from '../types.js';
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
export declare class LayoutRenderer {
    private siteConfig;
    private eta;
    private templates;
    constructor(siteConfig: SiteConfig);
    /**
     * Register a named layout from a file path.
     */
    addLayout(name: string, templatePath: string): Promise<void>;
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
    render(params: RenderParams): Promise<string>;
    has(name: string): boolean;
    names(): string[];
}
export interface RenderParams {
    layoutName: string;
    content: string;
    frontmatter: Frontmatter;
    /** Pre-rendered CSS tags to inject into <head> */
    css: string;
}
//# sourceMappingURL=layout.d.ts.map