export interface DevServerOptions {
    port?: number;
    /** Directory to serve. Defaults to auto-detecting from build config. */
    root?: string;
}
/**
 * Minimal dev server with:
 *  - Static file serving from the output directory
 *  - SPA-style fallback: /path → /path.html → /path/index.html
 *  - Live-reload via Server-Sent Events (no WebSockets needed)
 *  - Injected <script> snippet into every HTML response
 */
export declare function createServer(options?: DevServerOptions): Promise<void>;
//# sourceMappingURL=devServer.d.ts.map