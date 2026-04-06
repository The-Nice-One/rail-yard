import type { PageEntry, SiteConfig, BuildError } from '../types.js';
import type { CommandRegistry } from './CommandRegistry.js';
import type { LayoutRenderer } from '../render/layout.js';
export interface PipelineContext {
    siteConfig: SiteConfig;
    registry: CommandRegistry;
    layoutRenderer: LayoutRenderer;
    /** Pre-built CSS tag string to inject into layouts */
    cssTag: string;
}
export interface PageResult {
    inputPath: string;
    outputPath: string;
    ok: boolean;
    error?: BuildError;
}
/**
 * Process a single page through the full pipeline:
 *   read → strip frontmatter → expand commands → (render markdown) → (apply layout) → write
 */
export declare function processPage(entry: PageEntry, ctx: PipelineContext): Promise<PageResult>;
//# sourceMappingURL=Pipeline.d.ts.map