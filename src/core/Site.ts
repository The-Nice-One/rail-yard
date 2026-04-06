import { resolve, relative, dirname, basename } from "path";
import { existsSync } from "fs";
import { mkdir } from "fs/promises";
import pc from "picocolors";
import type {
  SiteConfig,
  PageEntry,
  CSSEntry,
  StaticEntry,
  LayoutEntry,
  BuildResult,
  CommandHandler,
  PageOptions,
  OutputFormat,
} from "../types.js";
import { CommandRegistry } from "./CommandRegistry.js";
import { LayoutRenderer } from "../render/layout.js";
import {
  processCSS,
  buildCSSTag,
  type CSSProcessResult,
} from "../assets/css.js";
import { copyStatic } from "../assets/static.js";
import { scanFolder, type AddFolderOptions } from "../helpers/addFolder.js";
import { processPage } from "./Pipeline.js";

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
export class Site {
  private config: Required<SiteConfig>;
  private registry = new CommandRegistry();
  private layoutRenderer: LayoutRenderer;
  private pages: PageEntry[] = [];
  private cssEntries: CSSEntry[] = [];
  private staticEntries: StaticEntry[] = [];
  private layoutEntries: LayoutEntry[] = [];

  constructor(config: SiteConfig) {
    this.config = {
      output: config.output,
      baseUrl: config.baseUrl ?? "",
      format: config.format ?? "html",
      defaultLayout: config.defaultLayout ?? "",
      siteVars: config.siteVars ?? {},
    };
    this.layoutRenderer = new LayoutRenderer(this.config);
  }

  // ─── Command definition ─────────────────────────────────────────────────────

  /**
   * Define a custom command. The handler receives already-expanded string
   * arguments and should return a string (markdown or raw HTML).
   *
   *   site.defineCommand('note', content => `> **Note:** ${content}`)
   *   site.defineCommand('badge', (label, color) => `<span class="badge badge-${color}">${label}</span>`)
   *   site.defineCommand('latestPosts', async () => { ... })
   */
  defineCommand(name: string, handler: CommandHandler): this {
    this.registry.register(name, handler);
    return this;
  }

  // ─── Asset registration ─────────────────────────────────────────────────────

  /**
   * Add a CSS file. It will be processed by lightningcss (resolves @import,
   * minifies, fingerprints) and a <link> tag will be injected into all layouts.
   *
   *   site.addCSS('./styles/main.css')
   */
  addCSS(sourcePath: string): this {
    this.cssEntries.push({ sourcePath: resolve(sourcePath) });
    return this;
  }

  /**
   * Copy a file or directory to the output directory verbatim.
   *
   *   site.addStatic('./public')          // copies to dist/public/
   *   site.addStatic('./robots.txt', '')  // copies to dist/robots.txt
   */
  addStatic(sourcePath: string, destSubPath?: string): this {
    this.staticEntries.push({ sourcePath: resolve(sourcePath), destSubPath });
    return this;
  }

  // ─── Layout registration ────────────────────────────────────────────────────

  /**
   * Register a named layout template (.eta file).
   *
   *   site.addLayout('default', './layouts/base.eta')
   *   site.addLayout('post',    './layouts/post.eta')
   */
  addLayout(name: string, templatePath: string): this {
    this.layoutEntries.push({ name, templatePath: resolve(templatePath) });
    return this;
  }

  // ─── Page registration ──────────────────────────────────────────────────────

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
  addPage(
    sourcePath: string,
    options: PageOptions & { basePath?: string } = {},
  ): this {
    const fullPath = resolve(sourcePath);
    const { basePath, ...pageOptions } = options;
    // relPath is basename unless basePath is provided, in which case it's relative to that base.
    // This prevents absolute-path weirdness when addPage is called with paths outside process.cwd().
    const relPath = basePath
      ? relative(resolve(basePath), fullPath)
      : basename(fullPath);
    this.pages.push({ sourcePath: fullPath, relPath, options: pageOptions });
    return this;
  }

  /**
   * Register all markdown files in a directory (recursive by default).
   *
   *   site.addFolder('./posts', { layout: 'post', urlPrefix: '/blog' })
   *   site.addFolder('./wiki',  { format: 'markdown' })
   */
  addFolder(folderPath: string, options: AddFolderOptions = {}): this {
    const entries = scanFolder(folderPath, options);
    this.pages.push(...entries);
    return this;
  }

  // ─── Build ──────────────────────────────────────────────────────────────────

  /**
   * Execute the full build.
   *
   * Pages are processed in parallel (Promise.all) since each is independent.
   * CSS and static assets are processed first.
   */
  async build(): Promise<BuildResult> {
    const startMs = Date.now();

    console.log(
      `\n${pc.bold(pc.cyan("◆ rail-yard"))} building to ${pc.dim(this.config.output)}\n`,
    );

    const errors: BuildResult["errors"] = [];
    let cssWritten = 0;
    let staticCopied = 0;

    // 1. Prepare output directory
    await mkdir(this.config.output, { recursive: true });

    // 2. Load layouts
    for (const entry of this.layoutEntries) {
      await this.layoutRenderer.addLayout(entry.name, entry.templatePath);
    }

    // 3. Process CSS
    const cssResults: CSSProcessResult[] = [];
    if (this.cssEntries.length > 0) {
      console.log(pc.bold("CSS"));
      const cssOutputDir = resolve(this.config.output, "css");
      for (const entry of this.cssEntries) {
        try {
          const result = processCSS({
            inputPath: entry.sourcePath,
            outputDir: cssOutputDir,
            minify: true,
            fingerprint: true,
          });
          cssResults.push(result);
          cssWritten++;
          console.log(
            `  ${pc.green("✓")} ${pc.dim(relative(process.cwd(), entry.sourcePath))} ${pc.dim("→")} ${pc.cyan(result.urlPath)}`,
          );
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          errors.push({ file: entry.sourcePath, message: msg, cause: err });
          console.error(`  ${pc.red("✗")} ${entry.sourcePath}: ${pc.red(msg)}`);
        }
      }
      console.log();
    }

    // 4. Copy static assets
    if (this.staticEntries.length > 0) {
      console.log(pc.bold("Static"));
      for (const entry of this.staticEntries) {
        try {
          const { dest } = copyStatic({
            sourcePath: entry.sourcePath,
            outputDir: this.config.output,
            destSubPath: entry.destSubPath,
          });
          staticCopied++;
          console.log(
            `  ${pc.green("✓")} ${pc.dim(relative(process.cwd(), entry.sourcePath))} ${pc.dim("→")} ${pc.cyan(relative(process.cwd(), dest))}`,
          );
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          errors.push({ file: entry.sourcePath, message: msg });
        }
      }
      console.log();
    }

    // 5. Build all pages (in parallel)
    if (this.pages.length > 0) {
      console.log(pc.bold("Pages"));
      const cssTag = buildCSSTag(cssResults);

      const results = await Promise.all(
        this.pages.map((entry) =>
          processPage(entry, {
            siteConfig: this.config,
            registry: this.registry,
            layoutRenderer: this.layoutRenderer,
            cssTag,
          }),
        ),
      );

      for (const result of results) {
        if (!result.ok && result.error) {
          errors.push(result.error);
        }
      }
    }

    const durationMs = Date.now() - startMs;
    const pagesWritten =
      this.pages.length -
      errors.filter((e) => this.pages.some((p) => p.sourcePath === e.file))
        .length;

    console.log();
    if (errors.length === 0) {
      console.log(
        pc.green(pc.bold(`✓ Done`)) +
          pc.dim(
            ` in ${durationMs}ms — ${this.pages.length} pages, ${cssWritten} CSS, ${staticCopied} static`,
          ),
      );
    } else {
      console.log(
        pc.yellow(pc.bold(`⚠ Done with ${errors.length} error(s)`)) +
          pc.dim(` in ${durationMs}ms`),
      );
    }
    console.log();

    return { pagesWritten, cssWritten, staticCopied, durationMs, errors };
  }

  // ─── Accessors (useful for testing / programmatic inspection) ───────────────

  get pageCount(): number {
    return this.pages.length;
  }
  get outputDir(): string {
    return this.config.output;
  }
  get format(): OutputFormat {
    return this.config.format;
  }
}
