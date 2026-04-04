import type { ASTNode, CommandHandler } from '../types.js'
import type { CommandRegistry } from '../core/CommandRegistry.js'

export interface ExpandOptions {
  /** Source file path, used for error messages */
  sourcePath?: string
  /** Maximum recursion depth for command expansion (guards against infinite loops) */
  maxDepth?: number
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
export async function expand(
  nodes: ASTNode[],
  registry: CommandRegistry,
  options: ExpandOptions = {},
  depth = 0
): Promise<string> {
  const { sourcePath = '<unknown>', maxDepth = 16 } = options

  if (depth > maxDepth) {
    throw new Error(
      `Command expansion exceeded maximum depth (${maxDepth}) in ${sourcePath}. ` +
      `Possible infinite recursion via nested commands.`
    )
  }

  const parts: string[] = []

  for (const node of nodes) {
    switch (node.type) {
      case 'text':
        parts.push(node.value)
        break

      case 'codefence':
        // Re-emit the code fence verbatim — never expand inside it
        parts.push(`\`\`\`${node.lang ? node.lang : ''}\n${node.content}\`\`\``)
        break

      case 'inlinecode':
        // Re-emit inline code verbatim
        parts.push(`\`${node.content}\``)
        break

      case 'command': {
        const handler = registry.get(node.name)

        if (!handler) {
          // Unknown command: pass through unexpanded (LaTeX-style passthrough)
          // This means \unknown{foo} appears literally in the output.
          const argsStr = node.args
            .map(argNodes => `{${expandSync(argNodes)}}`)
            .join('')
          parts.push(`\\${node.name}${argsStr}`)
          break
        }

        // Expand each argument independently (depth-first)
        const expandedArgs = await Promise.all(
          node.args.map(argNodes => expand(argNodes, registry, options, depth))
        )

        // Call the handler with expanded string arguments
        let result: string
        try {
          result = await handler(...expandedArgs)
        } catch (err) {
          throw new Error(
            `Command \\${node.name} threw an error in ${sourcePath}: ` +
            (err instanceof Error ? err.message : String(err)),
            { cause: err }
          )
        }

        // Re-parse and re-expand the result (commands can emit commands).
        // Always attempt re-expansion when output contains a backslash;
        // the depth check at the top of expand() catches infinite recursion.
        if (result.includes('\\')) {
          const { parseOrThrow } = await import('../parser/parse.js')
          const subNodes = parseOrThrow(result, `\\${node.name} output`)
          const reExpanded = await expand(subNodes, registry, options, depth + 1)
          parts.push(reExpanded)
        } else {
          parts.push(result)
        }
        break
      }

      default: {
        // Exhaustive check: TypeScript will error here if a new node type is added
        // without being handled
        const _exhaustive: never = node
        throw new Error(`Unhandled AST node type: ${(_exhaustive as ASTNode).type}`)
      }
    }
  }

  // Merge consecutive text into a single string (minor optimisation for output quality)
  return parts.join('')
}

/**
 * Synchronous "stringify" of unexpanded nodes — used only for the passthrough
 * case of unknown commands, where we just want the raw source back.
 */
function expandSync(nodes: ASTNode[]): string {
  return nodes
    .map(n => {
      if (n.type === 'text') return n.value
      if (n.type === 'codefence') return `\`\`\`${n.lang}\n${n.content}\`\`\``
      if (n.type === 'inlinecode') return `\`${n.content}\``
      if (n.type === 'command') {
        return `\\${n.name}${n.args.map(a => `{${expandSync(a)}}`).join('')}`
      }
      return ''
    })
    .join('')
}
