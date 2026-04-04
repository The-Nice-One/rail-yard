import chokidar from 'chokidar';
import pc from 'picocolors';
import { resolve, relative } from 'path';
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
export async function watch(site, options = {}) {
    const { paths = ['.'], debounceMs = 100 } = options;
    // Initial build
    await site.build();
    console.log(pc.dim(`\n  watching for changes (${paths.join(', ')})…\n`));
    let debounceTimer;
    let building = false;
    const watcher = chokidar.watch(paths, {
        ignored: [
            /(^|[/\\])\../, // dotfiles
            /node_modules/,
            resolve(site.outputDir), // ignore changes in output dir (prevents loops)
        ],
        persistent: true,
        ignoreInitial: true,
    });
    const rebuild = (changedPath) => {
        if (debounceTimer)
            clearTimeout(debounceTimer);
        debounceTimer = setTimeout(async () => {
            if (building)
                return;
            building = true;
            console.log(pc.dim(`\n  changed: ${relative(process.cwd(), changedPath)}`));
            try {
                await site.build();
            }
            finally {
                building = false;
            }
        }, debounceMs);
    };
    watcher.on('change', rebuild);
    watcher.on('add', rebuild);
    watcher.on('unlink', rebuild);
    // Keep process alive
    process.on('SIGINT', async () => {
        console.log(pc.dim('\n  stopping watch…'));
        await watcher.close();
        process.exit(0);
    });
}
//# sourceMappingURL=watch.js.map