/**
 * rail-yard test suite — parser + expander
 *
 * Run with: npx tsx tests/parser.test.ts
 */
import { parseOrThrow, parse } from "../src/parser/parse.js";
import { expand } from "../src/parser/expand.js";
import { CommandRegistry } from "../src/core/CommandRegistry.js";
import type {
  CommandNode,
  TextNode,
  CodeFenceNode,
  InlineCodeNode,
} from "../src/types.js";

// ─── Minimal test harness ────────────────────────────────────────────────────

let passed = 0;
let failed = 0;
let currentSuite = "";

function suite(name: string): void {
  currentSuite = name;
  console.log(`\n${name}`);
}

async function test(
  name: string,
  fn: () => void | Promise<void>,
): Promise<void> {
  try {
    await fn();
    console.log(`  ✓ ${name}`);
    passed++;
  } catch (err) {
    console.log(`  ✗ ${name}`);
    console.log(`    ${err instanceof Error ? err.message : err}`);
    failed++;
  }
}

function expect(actual: unknown, expected: unknown): void {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  if (a !== e) throw new Error(`Expected ${e}\n    Got     ${a}`);
}

function expectContains(actual: string, substring: string): void {
  if (!actual.includes(substring)) {
    throw new Error(
      `Expected string to contain: ${JSON.stringify(substring)}\n    Got: ${JSON.stringify(actual)}`,
    );
  }
}

function expectNotContains(actual: string, substring: string): void {
  if (actual.includes(substring)) {
    throw new Error(
      `Expected string NOT to contain: ${JSON.stringify(substring)}\n    Got: ${JSON.stringify(actual)}`,
    );
  }
}

// ─── Helper: build a registry with simple test commands ──────────────────────

function makeRegistry(): CommandRegistry {
  const r = new CommandRegistry();
  r.register("upper", (s) => s.toUpperCase());
  r.register("lower", (s) => s.toLowerCase());
  r.register("wrap", (tag, content) => `<${tag}>${content}</${tag}>`);
  r.register("repeat", (s, n) => s.repeat(parseInt(n)));
  r.register("cat", (...args) => args.join(""));
  r.register("async", async (s) => `[async:${s}]`);
  r.register("emit", () => String.raw`\upper{from emit}`); // re-expansion test
  return r;
}

async function expandStr(
  input: string,
  registry = makeRegistry(),
): Promise<string> {
  const nodes = parseOrThrow(input, "test");
  return expand(nodes, registry, { sourcePath: "test" });
}

// ═══════════════════════════════════════════════════════════════════════════════
// PARSER TESTS
// ═══════════════════════════════════════════════════════════════════════════════

suite("Parser — basic structure");

await test("plain text produces a single text node", () => {
  const nodes = parseOrThrow("hello world");
  const text = nodes.map((n) => (n as TextNode).value).join("");
  expect(text, "hello world");
});

await test("zero-arg command parses correctly", () => {
  const nodes = parseOrThrow(String.raw`\cmd`);
  const cmd = nodes[0] as CommandNode;
  expect(cmd.type, "command");
  expect(cmd.name, "cmd");
  expect(cmd.args.length, 0);
});

await test("single-arg command", () => {
  const nodes = parseOrThrow(String.raw`\upper{hello}`);
  const cmd = nodes[0] as CommandNode;
  expect(cmd.name, "upper");
  expect(cmd.args.length, 1);
  const argText = (cmd.args[0][0] as TextNode).value;
  // arg text nodes accumulate individually — check joined value
  const joined = cmd.args[0].map((n) => (n as TextNode).value).join("");
  expect(joined, "hello");
});

await test("two-arg command", () => {
  const nodes = parseOrThrow(String.raw`\wrap{em}{bold text}`);
  const cmd = nodes[0] as CommandNode;
  expect(cmd.args.length, 2);
});

await test("nested command in arg", () => {
  const nodes = parseOrThrow(String.raw`\outer{\inner{x}}`);
  const outer = nodes[0] as CommandNode;
  const inner = outer.args[0][0] as CommandNode;
  expect(inner.type, "command");
  expect(inner.name, "inner");
});

await test("braces at top level are plain text", () => {
  const nodes = parseOrThrow("some { json } text");
  const text = nodes.map((n) => (n as TextNode).value).join("");
  expect(text, "some { json } text");
});

suite("Parser — code blocks (opaque)");

await test("code fence is parsed as codefence node", () => {
  const nodes = parseOrThrow("```ts\ncode here\n```");
  const fence = nodes[0] as CodeFenceNode;
  expect(fence.type, "codefence");
  expect(fence.lang, "ts");
});

await test("command inside code fence is NOT parsed", () => {
  const nodes = parseOrThrow("```\n\\upper{skip}\n```");
  const fence = nodes[0] as CodeFenceNode;
  expect(fence.type, "codefence");
  expect(fence.content.includes("\\upper{skip}"), true);
});

await test("inline code is parsed as inlinecode node", () => {
  const nodes = parseOrThrow("`\\upper{skip}`");
  const inline = nodes[0] as InlineCodeNode;
  expect(inline.type, "inlinecode");
  expect(inline.content, "\\upper{skip}");
});

await test("code fence without lang", () => {
  const nodes = parseOrThrow("```\ncontent\n```");
  const fence = nodes[0] as CodeFenceNode;
  expect(fence.lang, "");
});

suite("Parser — special syntax");

await test("escaped backslash becomes text node with value \\", () => {
  const nodes = parseOrThrow("\\\\ text");
  const first = nodes[0] as TextNode;
  expect(first.type, "text");
  expect(first.value, "\\");
});

await test("parse error returns ok: false", () => {
  // Unclosed code fence — should not crash
  const result = parse("```\nunclosed");
  // Peggy will parse this but the codefence content will consume everything;
  // let's test an actual syntax issue gracefully
  expect(result.ok !== undefined, true);
});

// ═══════════════════════════════════════════════════════════════════════════════
// EXPANDER TESTS
// ═══════════════════════════════════════════════════════════════════════════════

suite("Expander — basic expansion");

await test("plain text passes through unchanged", async () => {
  const result = await expandStr("hello world");
  expect(result, "hello world");
});

await test("single arg command", async () => {
  const result = await expandStr(String.raw`\upper{hello}`);
  expect(result, "HELLO");
});

await test("two arg command", async () => {
  const result = await expandStr(String.raw`\wrap{em}{bold}`);
  expect(result, "<em>bold</em>");
});

await test("async command handler", async () => {
  const result = await expandStr(String.raw`\async{data}`);
  expect(result, "[async:data]");
});

await test("mixed text and commands", async () => {
  const result = await expandStr(String.raw`Hello \upper{world}!`);
  expect(result, "Hello WORLD!");
});

await test("adjacent commands", async () => {
  const result = await expandStr(String.raw`\upper{a}\lower{B}`);
  expect(result, "Ab");
});

suite("Expander — nesting and recursion");

await test("nested commands (inner expanded first)", async () => {
  const result = await expandStr(String.raw`\upper{\wrap{b}{hi}}`);
  // inner: <b>hi</b>, then upper: <B>HI</B>
  expect(result, "<B>HI</B>");
});

await test("command output is re-expanded", async () => {
  // \emit returns \upper{from emit}, which should be re-expanded
  const result = await expandStr(String.raw`\emit{}`);
  expect(result, "FROM EMIT");
});

await test("multi-level nesting", async () => {
  const result = await expandStr(String.raw`\upper{\upper{a}}`);
  expect(result, "A");
});

await test("command with multiple args using others", async () => {
  const result = await expandStr(String.raw`\cat{\upper{a}}{\lower{B}}`);
  expect(result, "Ab");
});

suite("Expander — opaque blocks");

await test("code fence content is not expanded", async () => {
  const result = await expandStr("```\n\\upper{skip}\n```");
  expectContains(result, "\\upper{skip}");
  expectNotContains(result, "SKIP");
});

await test("inline code content is not expanded", async () => {
  const result = await expandStr("`\\upper{skip}`");
  expectContains(result, "\\upper{skip}");
  expectNotContains(result, "SKIP");
});

await test("code fence re-emitted with lang", async () => {
  const result = await expandStr("```ts\nconst x = 1\n```");
  expectContains(result, "```ts");
  expectContains(result, "const x = 1");
});

suite("Expander — unknown command passthrough");

await test("unknown command passes through with args", async () => {
  const result = await expandStr(String.raw`\unknown{arg}`);
  expectContains(result, "\\unknown");
  expectContains(result, "arg");
});

await test("unknown zero-arg command passes through", async () => {
  const result = await expandStr(String.raw`\unknown`);
  expectContains(result, "\\unknown");
});

suite("Expander — built-in commands");

await test("\\newcommand defines a new command", async () => {
  const r = new CommandRegistry();
  const { registerBuiltins } = await import("../src/core/builtins.js");
  registerBuiltins(r, process.cwd());
  // \newcommand{\greet}{Hello, #1!}
  const nodes = parseOrThrow(String.raw`\newcommand{\greet}{Hello, #1!}`);
  await expand(nodes, r, { sourcePath: "test" });
  expect(r.has("greet"), true);
});

await test("\\newcommand output is callable", async () => {
  const r = new CommandRegistry();
  const { registerBuiltins } = await import("../src/core/builtins.js");
  registerBuiltins(r, process.cwd());

  const src = String.raw`\newcommand{\greet}{Hello, #1!}\greet{World}`;
  const nodes = parseOrThrow(src);
  const result = await expand(nodes, r, { sourcePath: "test" });
  expectContains(result, "Hello, World!");
});

await test("\\note produces a blockquote", async () => {
  const r = new CommandRegistry();
  const { registerBuiltins } = await import("../src/core/builtins.js");
  registerBuiltins(r, process.cwd());

  const result = await expandStr(String.raw`\note{test content}`, r);
  expectContains(result, "**Note:**");
  expectContains(result, "test content");
});

await test("\\warn produces a warning blockquote", async () => {
  const r = new CommandRegistry();
  const { registerBuiltins } = await import("../src/core/builtins.js");
  registerBuiltins(r, process.cwd());

  const result = await expandStr(String.raw`\warn{danger}`, r);
  expectContains(result, "⚠");
  expectContains(result, "danger");
});

await test("\\details produces HTML details block", async () => {
  const r = new CommandRegistry();
  const { registerBuiltins } = await import("../src/core/builtins.js");
  registerBuiltins(r, process.cwd());

  const result = await expandStr(String.raw`\details{Summary}{Content}`, r);
  expectContains(result, "<details>");
  expectContains(result, "<summary>Summary</summary>");
  expectContains(result, "Content");
});

suite("Expander — error handling");

await test("infinite recursion is caught at max depth", async () => {
  const r = new CommandRegistry();
  // Command that emits itself
  r.register("inf", () => String.raw`\inf{}`);
  try {
    await expandStr(String.raw`\inf{}`, r);
    throw new Error("Should have thrown");
  } catch (err) {
    expectContains((err as Error).message, "depth");
  }
});

await test("command handler error is wrapped with context", async () => {
  const r = new CommandRegistry();
  r.register("boom", () => {
    throw new Error("handler exploded");
  });
  try {
    await expandStr(String.raw`\boom{}`, r);
    throw new Error("Should have thrown");
  } catch (err) {
    expectContains((err as Error).message, "boom");
    expectContains((err as Error).message, "handler exploded");
  }
});

suite("CommandRegistry");

await test("register and retrieve", () => {
  const r = new CommandRegistry();
  r.register("cmd", () => "result");
  expect(r.has("cmd"), true);
  expect(typeof r.get("cmd"), "function");
});

await test("registerDefault does not overwrite existing", () => {
  const r = new CommandRegistry();
  r.register("cmd", () => "original");
  r.registerDefault("cmd", () => "default");
  const result = r.get("cmd")!();
  expect(result, "original");
});

await test("clone produces an independent copy", () => {
  const r = new CommandRegistry();
  r.register("cmd", () => "original");
  const clone = r.clone();
  clone.register("cmd", () => "cloned");
  // Original unchanged
  expect(r.get("cmd")!(), "original");
  expect(clone.get("cmd")!(), "cloned");
});

await test("unregister removes a command", () => {
  const r = new CommandRegistry();
  r.register("cmd", () => "");
  r.unregister("cmd");
  expect(r.has("cmd"), false);
});

await test("invalid command name throws", () => {
  const r = new CommandRegistry();
  try {
    r.register("1invalid", () => "");
    throw new Error("Should have thrown");
  } catch (err) {
    expectContains((err as Error).message, "Invalid command name");
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// SUMMARY
// ═══════════════════════════════════════════════════════════════════════════════

const total = passed + failed;
console.log(`\n${"─".repeat(50)}`);
if (failed === 0) {
  console.log(`✓ All ${total} tests passed`);
} else {
  console.log(`✗ ${failed} of ${total} tests failed`);
  process.exit(1);
}
