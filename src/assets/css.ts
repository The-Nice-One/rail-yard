import { bundle } from 'lightningcss'
import { readFileSync, writeFileSync } from 'fs'
import { createHash } from 'crypto'
import { resolve, basename, join } from 'path'
import { mkdirSync } from 'fs'

export interface CSSProcessOptions {
  /** Absolute path to the CSS entry file */
  inputPath: string
  /** Directory to write the processed CSS file to */
  outputDir: string
  /** If true, minify the output */
  minify?: boolean
  /** If true, append a content hash to the filename (cache busting) */
  fingerprint?: boolean
}

export interface CSSProcessResult {
  /** The output file path that was written */
  outputPath: string
  /** An HTML <link> tag ready to inject into <head> */
  linkTag: string
  /** The relative URL path (e.g. "/styles/main.abc123.css") */
  urlPath: string
}

/**
 * Process a CSS file through lightningcss.
 *
 * This resolves @import statements, applies vendor prefixes for modern CSS
 * features, and optionally minifies and fingerprints the output.
 */
export function processCSS(options: CSSProcessOptions): CSSProcessResult {
  const { inputPath, outputDir, minify = true, fingerprint = true } = options

  const fullInputPath = resolve(inputPath)

  const { code } = bundle({
    filename: fullInputPath,
    minify,
    sourceMap: false,
  })

  const css = code.toString()

  // Generate content hash for cache-busting
  const hash = fingerprint
    ? '.' + createHash('sha256').update(css).digest('hex').slice(0, 8)
    : ''

  const base = basename(inputPath, '.css')
  const outputFilename = `${base}${hash}.css`

  mkdirSync(outputDir, { recursive: true })
  const outputPath = join(outputDir, outputFilename)
  writeFileSync(outputPath, css)

  // Build a root-relative URL path.
  // Since we don't know the site's base URL here, we use a root-relative path.
  const urlPath = `/css/${outputFilename}`
  const linkTag = `<link rel="stylesheet" href="${urlPath}">`

  return { outputPath, linkTag, urlPath }
}

/**
 * Combine multiple CSS results into a single HTML string of <link> tags.
 */
export function buildCSSTag(results: CSSProcessResult[]): string {
  return results.map(r => r.linkTag).join('\n')
}
