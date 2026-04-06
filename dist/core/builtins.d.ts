import type { CommandRegistry } from './CommandRegistry.js';
/**
 * Register all built-in commands into the registry.
 * These use `registerDefault` so users can freely override any of them.
 *
 * @param registry  The CommandRegistry to populate
 * @param sourceDir The directory of the file being processed (for relative path resolution)
 */
export declare function registerBuiltins(registry: CommandRegistry, sourceDir: string): void;
//# sourceMappingURL=builtins.d.ts.map