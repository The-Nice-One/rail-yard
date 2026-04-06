import { cpSync, mkdirSync, statSync, existsSync } from 'fs';
import { resolve, join, basename } from 'path';
/**
 * Copy a file or directory of static assets to the output directory.
 * Directories are copied recursively, preserving structure.
 */
export function copyStatic(options) {
    const { sourcePath, outputDir, destSubPath } = options;
    const fullSource = resolve(sourcePath);
    if (!existsSync(fullSource)) {
        throw new Error(`Static asset not found: ${sourcePath} (resolved to: ${fullSource})`);
    }
    const stat = statSync(fullSource);
    const subPath = destSubPath !== undefined ? destSubPath : basename(fullSource);
    const dest = subPath ? join(outputDir, subPath) : outputDir;
    mkdirSync(dest, { recursive: true });
    if (stat.isDirectory()) {
        cpSync(fullSource, dest, { recursive: true });
    }
    else {
        cpSync(fullSource, join(dest, basename(fullSource)));
    }
    return { source: fullSource, dest };
}
//# sourceMappingURL=static.js.map