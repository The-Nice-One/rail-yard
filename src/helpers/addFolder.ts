import { globSync } from 'glob'
import { resolve, relative } from 'path'
import type { PageEntry, PageOptions } from '../types.js'

export interface AddFolderOptions extends PageOptions {
  /**
   * Glob pattern for files to include.
   * Default: "**\/*.md"
   */
  pattern?: string
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
export function scanFolder(folderPath: string, options: AddFolderOptions = {}): PageEntry[] {
  const { pattern = '**/*.md', ...pageOptions } = options
  const resolvedFolder = resolve(folderPath)

  const files = globSync(pattern, {
    cwd: resolvedFolder,
    absolute: true,
    nodir: true,
  })

  return files.map(absolutePath => ({
    sourcePath: absolutePath,
    relPath: relative(resolvedFolder, absolutePath),
    options: pageOptions,
  }))
}
