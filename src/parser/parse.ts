import { compiledParser } from './grammar.gen.js'
import type { ASTNode } from '../types.js'

export interface ParseError {
  message: string
  location?: {
    start: { line: number; column: number; offset: number }
    end:   { line: number; column: number; offset: number }
  }
}

export interface ParseSuccess { ok: true;  nodes: ASTNode[] }
export interface ParseFailure { ok: false; error: ParseError }
export type ParseResult = ParseSuccess | ParseFailure

/**
 * Parse a document string into an AST.
 * Returns a discriminated union — callers can handle errors without try/catch.
 */
export function parse(source: string, sourceName = '<input>'): ParseResult {
  try {
    const nodes = compiledParser.parse(source, {
      grammarSource: sourceName,
    }) as ASTNode[]
    return { ok: true, nodes }
  } catch (err: unknown) {
    if (isPeggyError(err)) {
      return { ok: false, error: { message: err.message, location: err.location } }
    }
    return { ok: false, error: { message: err instanceof Error ? err.message : String(err) } }
  }
}

/**
 * Parse and throw on failure. Used in contexts where errors are handled upstream.
 */
export function parseOrThrow(source: string, sourceName = '<input>'): ASTNode[] {
  const result = parse(source, sourceName)
  if (!result.ok) {
    throw new Error(`Parse error in ${sourceName}: ${result.error.message}`)
  }
  return result.nodes
}

interface PeggyError extends Error {
  location?: ParseError['location']
}
function isPeggyError(err: unknown): err is PeggyError {
  return err instanceof Error && 'location' in err
}
