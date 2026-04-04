import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkGfm from 'remark-gfm';
import remarkRehype from 'remark-rehype';
import rehypeRaw from 'rehype-raw';
import rehypeStringify from 'rehype-stringify';
// Build the unified processor once and reuse it across all pages.
// This avoids re-constructing the plugin chain on every call.
const processor = unified()
    .use(remarkParse)
    .use(remarkGfm)
    .use(remarkRehype, {
    // allowDangerousHtml lets raw HTML (from \html{} commands or \details{}) pass through
    allowDangerousHtml: true,
})
    .use(rehypeRaw) // parse the raw HTML nodes so they render correctly
    .use(rehypeStringify);
/**
 * Convert a markdown string to an HTML string.
 *
 * Raw HTML embedded in the markdown (emitted by commands like \details or \html)
 * is preserved and rendered correctly, not escaped.
 */
export async function renderMarkdown(markdown) {
    const result = await processor.process(markdown);
    return String(result);
}
//# sourceMappingURL=markdown.js.map