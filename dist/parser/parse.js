import { compiledParser } from './grammar.gen.js';
/**
 * Parse a document string into an AST.
 * Returns a discriminated union — callers can handle errors without try/catch.
 */
export function parse(source, sourceName = '<input>') {
    try {
        const nodes = compiledParser.parse(source, {
            grammarSource: sourceName,
        });
        return { ok: true, nodes };
    }
    catch (err) {
        if (isPeggyError(err)) {
            return { ok: false, error: { message: err.message, location: err.location } };
        }
        return { ok: false, error: { message: err instanceof Error ? err.message : String(err) } };
    }
}
/**
 * Parse and throw on failure. Used in contexts where errors are handled upstream.
 */
export function parseOrThrow(source, sourceName = '<input>') {
    const result = parse(source, sourceName);
    if (!result.ok) {
        throw new Error(`Parse error in ${sourceName}: ${result.error.message}`);
    }
    return result.nodes;
}
function isPeggyError(err) {
    return err instanceof Error && 'location' in err;
}
//# sourceMappingURL=parse.js.map