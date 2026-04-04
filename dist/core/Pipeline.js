import { readFile, writeFile, mkdir } from 'fs/promises';
import { resolve, dirname, join, relative } from 'path';
import matter from 'gray-matter';
import pc from 'picocolors';
import { parseOrThrow } from '../parser/parse.js';
import { expand } from '../parser/expand.js';
import { renderMarkdown } from '../render/markdown.js';
import { registerBuiltins } from './builtins.js';
/**
 * Process a single page through the full pipeline:
 *   read → strip frontmatter → expand commands → (render markdown) → (apply layout) → write
 */
export async function processPage(entry, ctx) {
    const { siteConfig, registry, layoutRenderer, cssTag } = ctx;
    const { sourcePath, relPath, options } = entry;
    const format = options.format ?? siteConfig.format ?? 'html';
    // Determine output path
    const outputPath = buildOutputPath(siteConfig.output, relPath, format, options.urlPrefix);
    try {
        // 1. Read source
        const raw = await readFile(sourcePath, 'utf-8');
        // 2. Strip frontmatter
        const { content: body, data: frontmatter } = matter(raw);
        // 3. Build a per-page registry that includes built-ins scoped to this file's directory
        //    User-defined commands from the site registry take priority over built-ins.
        const pageRegistry = registry.clone();
        registerBuiltins(pageRegistry, dirname(sourcePath));
        // 4. Parse and expand commands
        const nodes = parseOrThrow(body, sourcePath);
        const expanded = await expand(nodes, pageRegistry, { sourcePath });
        let finalOutput;
        if (format === 'markdown') {
            // Markdown passthrough mode: write expanded markdown as-is
            // Re-attach frontmatter so the output file is a valid .md
            finalOutput = matter.stringify(expanded, frontmatter);
        }
        else {
            // HTML mode: render markdown → apply layout
            const html = await renderMarkdown(expanded);
            // Determine layout
            const layoutName = frontmatter.layout ??
                options.layout ??
                siteConfig.defaultLayout;
            if (layoutName && layoutRenderer.has(layoutName)) {
                finalOutput = await layoutRenderer.render({
                    layoutName,
                    content: html,
                    frontmatter,
                    css: cssTag,
                });
            }
            else {
                // No layout: output raw HTML
                finalOutput = html;
            }
        }
        // 5. Write output
        await mkdir(dirname(outputPath), { recursive: true });
        await writeFile(outputPath, finalOutput, 'utf-8');
        const relOut = relative(process.cwd(), outputPath);
        console.log(`  ${pc.green('✓')} ${pc.dim(relative(process.cwd(), sourcePath))} ${pc.dim('→')} ${pc.cyan(relOut)}`);
        return { inputPath: sourcePath, outputPath, ok: true };
    }
    catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        console.error(`  ${pc.red('✗')} ${pc.dim(relative(process.cwd(), sourcePath))}: ${pc.red(message)}`);
        return {
            inputPath: sourcePath,
            outputPath,
            ok: false,
            error: { file: sourcePath, message, cause: err },
        };
    }
}
// ─── Helpers ──────────────────────────────────────────────────────────────────
function buildOutputPath(outputDir, relPath, // e.g. "posts/hello.md"
format, urlPrefix) {
    // Strip .md extension
    const withoutExt = relPath.replace(/\.md$/, '');
    // Apply optional URL prefix
    const withPrefix = urlPrefix
        ? join(urlPrefix.replace(/^\//, ''), withoutExt)
        : withoutExt;
    // Choose file extension
    const ext = format === 'markdown' ? '.md' : '.html';
    // index → index.html (not index/index.html)
    return resolve(outputDir, withPrefix + ext);
}
//# sourceMappingURL=Pipeline.js.map