import type { SiteConfig, BuildResult, CommandHandler, PageOptions, OutputFormat } from "../types.js";
import { type AddFolderOptions } from "../helpers/addFolder.js";
/**
 * The main builder class. Accumulates configuration, then executes a build.
 *
 * Usage:
 *
 *   const site = new Site({ output: './dist', format: 'html' })
 *
 *   site.defineCommand('note', content => `> **Note:** ${content}`)
 *   site.addCSS('./styles/main.css')
 *   site.addLayout('default', './layouts/base.eta')
 *   site.addPage('./pages/index.md')
 *   site.addFolder('./posts', { layout: 'post', urlPrefix: '/blog' })
 *
 *   await site.build()
 */
export declare class Site {
    private config;
    private registry;
    private layoutRenderer;
    private pages;
    private cssEntries;
    private staticEntries;
    private layoutEntries;
    constructor(config: SiteConfig);
    /**
     * Define a custom command. The handler receives already-expanded string
     * arguments and should return a string (markdown or raw HTML).
     *
     *   site.defineCommand('note', content => `> **Note:** ${content}`)
     *   site.defineCommand('badge', (label, color) => `<span class="badge badge-${color}">${label}</span>`)
     *   site.defineCommand('latestPosts', async () => { ... })
     */
    defineCommand(name: string, handler: CommandHandler): this;
    /**
     * Add a CSS file. It will be processed by lightningcss (resolves @import,
     * minifies, fingerprints) and a <link> tag will be injected into all layouts.
     *
     *   site.addCSS('./styles/main.css')
     */
    addCSS(sourcePath: string): this;
    /**
     * Copy a file or directory to the output directory verbatim.
     *
     *   site.addStatic('./public')          // copies to dist/public/
     *   site.addStatic('./robots.txt', '')  // copies to dist/robots.txt
     */
    addStatic(sourcePath: string, destSubPath?: string): this;
    /**
     * Register a named layout template (.eta file).
     *
     *   site.addLayout('default', './layouts/base.eta')
     *   site.addLayout('post',    './layouts/post.eta')
     */
    addLayout(name: string, templatePath: string): this;
    /**
     * Register a single markdown page.
     *
     *   site.addPage('./pages/index.md')
     *   site.addPage('./pages/about.md', { layout: 'minimal' })
     *   site.addPage('./notes/draft.md', { format: 'markdown' })
     *
     * By default the output path is just the filename (basename).
     * Pass `basePath` in options to preserve a directory structure relative to that base:
     *   site.addPage('./pages/blog/post.md', { basePath: './pages' })
     *   // → dist/blog/post.html
     */
    addPage(sourcePath: string, options?: PageOptions & {
        basePath?: string;
    }): this;
    /**
     * Register all markdown files in a directory (recursive by default).
     *
     *   site.addFolder('./posts', { layout: 'post', urlPrefix: '/blog' })
     *   site.addFolder('./wiki',  { format: 'markdown' })
     */
    addFolder(folderPath: string, options?: AddFolderOptions): this;
    /**
     * Execute the full build.
     *
     * Pages are processed in parallel (Promise.all) since each is independent.
     * CSS and static assets are processed first.
     */
    build(): Promise<BuildResult>;
    get pageCount(): number;
    get outputDir(): string;
    get format(): OutputFormat;
}
//# sourceMappingURL=Site.d.ts.map