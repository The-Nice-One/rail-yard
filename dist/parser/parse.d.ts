import type { ASTNode } from '../types.js';
export interface ParseError {
    message: string;
    location?: {
        start: {
            line: number;
            column: number;
            offset: number;
        };
        end: {
            line: number;
            column: number;
            offset: number;
        };
    };
}
export interface ParseSuccess {
    ok: true;
    nodes: ASTNode[];
}
export interface ParseFailure {
    ok: false;
    error: ParseError;
}
export type ParseResult = ParseSuccess | ParseFailure;
/**
 * Parse a document string into an AST.
 * Returns a discriminated union — callers can handle errors without try/catch.
 */
export declare function parse(source: string, sourceName?: string): ParseResult;
/**
 * Parse and throw on failure. Used in contexts where errors are handled upstream.
 */
export declare function parseOrThrow(source: string, sourceName?: string): ASTNode[];
//# sourceMappingURL=parse.d.ts.map