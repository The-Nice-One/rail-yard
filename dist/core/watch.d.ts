import type { Site } from './Site.js';
export interface WatchOptions {
    /** Directories/globs to watch. Defaults to current working directory. */
    paths?: string[];
    /** Debounce delay in milliseconds (default: 100ms) */
    debounceMs?: number;
}
/**
 * Start a watch-mode build.
 *
 * Performs an initial full build, then watches for file changes and
 * triggers a rebuild on any modification.
 *
 * In the future this can be enhanced with incremental (per-page) rebuilds
 * by tracking which pages depend on which source files.
 *
 * Usage:
 *   await watch(site, { paths: ['./pages', './layouts', './styles'] })
 */
export declare function watch(site: Site, options?: WatchOptions): Promise<void>;
//# sourceMappingURL=watch.d.ts.map