import type { PageEntry, PageOptions } from '../types.js';
export interface AddFolderOptions extends PageOptions {
    /**
     * Glob pattern for files to include.
     * Default: "**\/*.md"
     */
    pattern?: string;
}
/**
 * Scan a directory for markdown files and return PageEntry objects.
 *
 * This is used internally by Site.addFolder() to expand a directory
 * into individual page registrations.
 *
 * @param folderPath  Directory to scan
 * @param options     Page options applied to all discovered pages
 * @returns           Array of PageEntry objects ready to add to the site
 */
export declare function scanFolder(folderPath: string, options?: AddFolderOptions): PageEntry[];
//# sourceMappingURL=addFolder.d.ts.map