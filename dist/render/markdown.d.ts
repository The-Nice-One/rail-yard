/**
 * Convert a markdown string to an HTML string.
 *
 * Raw HTML embedded in the markdown (emitted by commands like \details or \html)
 * is preserved and rendered correctly, not escaped.
 */
export declare function renderMarkdown(markdown: string): Promise<string>;
//# sourceMappingURL=markdown.d.ts.map