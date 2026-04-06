export interface StaticCopyOptions {
    /** Source path (file or directory) */
    sourcePath: string;
    /** Destination directory */
    outputDir: string;
    /**
     * Optional sub-path under outputDir to copy into.
     * Defaults to the basename of sourcePath.
     * Pass '' to copy directly into outputDir.
     */
    destSubPath?: string;
}
export interface StaticCopyResult {
    source: string;
    dest: string;
}
/**
 * Copy a file or directory of static assets to the output directory.
 * Directories are copied recursively, preserving structure.
 */
export declare function copyStatic(options: StaticCopyOptions): StaticCopyResult;
//# sourceMappingURL=static.d.ts.map