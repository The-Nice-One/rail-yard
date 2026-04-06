export interface CSSProcessOptions {
    /** Absolute path to the CSS entry file */
    inputPath: string;
    /** Directory to write the processed CSS file to */
    outputDir: string;
    /** If true, minify the output */
    minify?: boolean;
    /** If true, append a content hash to the filename (cache busting) */
    fingerprint?: boolean;
}
export interface CSSProcessResult {
    /** The output file path that was written */
    outputPath: string;
    /** An HTML <link> tag ready to inject into <head> */
    linkTag: string;
    /** The relative URL path (e.g. "/styles/main.abc123.css") */
    urlPath: string;
}
/**
 * Process a CSS file through lightningcss.
 *
 * This resolves @import statements, applies vendor prefixes for modern CSS
 * features, and optionally minifies and fingerprints the output.
 */
export declare function processCSS(options: CSSProcessOptions): CSSProcessResult;
/**
 * Combine multiple CSS results into a single HTML string of <link> tags.
 */
export declare function buildCSSTag(results: CSSProcessResult[]): string;
//# sourceMappingURL=css.d.ts.map