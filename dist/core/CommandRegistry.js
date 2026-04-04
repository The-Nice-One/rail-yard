/**
 * Registry mapping command names to their handlers.
 *
 * A handler receives already-expanded string arguments and returns a string
 * (markdown or raw HTML). Async handlers are fully supported.
 *
 * Built-in commands (like \textinput) are pre-registered but can be overridden
 * by user-defined commands with the same name.
 */
export class CommandRegistry {
    handlers = new Map();
    /**
     * Register a command. If a command with the same name already exists,
     * it is replaced (last registration wins).
     */
    register(name, handler) {
        validateCommandName(name);
        this.handlers.set(name, handler);
        return this;
    }
    /**
     * Register a command only if no command with that name exists yet.
     * Used internally for built-ins so users can always override them.
     */
    registerDefault(name, handler) {
        if (!this.handlers.has(name)) {
            this.register(name, handler);
        }
        return this;
    }
    /**
     * Look up a handler by name. Returns undefined if not registered.
     */
    get(name) {
        return this.handlers.get(name);
    }
    /**
     * Check if a command is registered.
     */
    has(name) {
        return this.handlers.has(name);
    }
    /**
     * Remove a command registration.
     */
    unregister(name) {
        this.handlers.delete(name);
        return this;
    }
    /**
     * Return the names of all registered commands.
     */
    names() {
        return Array.from(this.handlers.keys());
    }
    /**
     * Clone this registry (used for per-page command scoping in the future).
     */
    clone() {
        const next = new CommandRegistry();
        for (const [name, handler] of this.handlers) {
            next.handlers.set(name, handler);
        }
        return next;
    }
}
// ─── Helpers ──────────────────────────────────────────────────────────────────
function validateCommandName(name) {
    if (!/^[a-zA-Z][a-zA-Z0-9_]*$/.test(name)) {
        throw new Error(`Invalid command name: "${name}". ` +
            `Command names must start with a letter and contain only letters, digits, and underscores.`);
    }
}
//# sourceMappingURL=CommandRegistry.js.map