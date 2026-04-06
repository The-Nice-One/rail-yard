import type { ASTNode } from '../types.js';
import type { CommandRegistry } from '../core/CommandRegistry.js';
export interface ExpandOptions {
    /** Source file path, used for error messages */
    sourcePath?: string;
    /** Maximum recursion depth for command expansion (guards against infinite loops) */
    maxDepth?: number;
}
/**
 * Walk an AST and expand all command nodes by calling their registered handlers.
 *
 * Expansion is depth-first: each argument is fully expanded into a string before
 * being passed to the command handler. This mirrors how LaTeX macros work.
 *
 * Commands whose output contains further \commands are re-parsed and expanded
 * (recursive expansion), up to maxDepth.
 */
export declare function expand(nodes: ASTNode[], registry: CommandRegistry, options?: ExpandOptions, depth?: number): Promise<string>;
//# sourceMappingURL=expand.d.ts.map