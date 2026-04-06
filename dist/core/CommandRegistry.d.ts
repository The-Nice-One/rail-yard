import type { CommandHandler } from '../types.js';
/**
 * Registry mapping command names to their handlers.
 *
 * A handler receives already-expanded string arguments and returns a string
 * (markdown or raw HTML). Async handlers are fully supported.
 *
 * Built-in commands (like \textinput) are pre-registered but can be overridden
 * by user-defined commands with the same name.
 */
export declare class CommandRegistry {
    private handlers;
    /**
     * Register a command. If a command with the same name already exists,
     * it is replaced (last registration wins).
     */
    register(name: string, handler: CommandHandler): this;
    /**
     * Register a command only if no command with that name exists yet.
     * Used internally for built-ins so users can always override them.
     */
    registerDefault(name: string, handler: CommandHandler): this;
    /**
     * Look up a handler by name. Returns undefined if not registered.
     */
    get(name: string): CommandHandler | undefined;
    /**
     * Check if a command is registered.
     */
    has(name: string): boolean;
    /**
     * Remove a command registration.
     */
    unregister(name: string): this;
    /**
     * Return the names of all registered commands.
     */
    names(): string[];
    /**
     * Clone this registry (used for per-page command scoping in the future).
     */
    clone(): CommandRegistry;
}
//# sourceMappingURL=CommandRegistry.d.ts.map