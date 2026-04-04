/*
 * Commark Command Grammar (Peggy)
 *
 * Key fix: two separate "char" rules.
 *   - TopChar  -> matches ANY character (including { and }) at document level
 *   - ArgChar  -> matches anything EXCEPT } { \ ` inside braced arguments
 *
 * This prevents } from being consumed as a plain character inside an arg,
 * which would cause BracedArg to fail to find its closing delimiter.
 */

Document
  = nodes:TopNode* EOF
    { return nodes; }

TopNode
  = CodeFence
  / InlineCode
  / EscapedBackslash
  / Command
  / TopChar

TopChar
  = ch:.
    { return { type: "text", value: ch }; }

CodeFence
  = "```" lang:$([^\n\r]*) [\n\r] content:CodeFenceContent "```"
    { return { type: "codefence", lang: lang.trim(), content: content }; }

CodeFenceContent
  = $( (!("```") .)* )

InlineCode
  = "`" content:$([^`\n\r]*) "`"
    { return { type: "inlinecode", content: content }; }

EscapedBackslash
  = "\\\\"
    { return { type: "text", value: "\\" }; }

Command
  = "\\" name:Identifier args:BracedArg*
    { return { type: "command", name: name, args: args }; }

BracedArg
  = "{" nodes:ArgNode* "}"
    { return nodes; }

ArgNode
  = CodeFence
  / InlineCode
  / EscapedBackslash
  / Command
  / NestedBraceText
  / ArgChar

NestedBraceText
  = "{" content:$([^{}]*) "}"
    { return { type: "text", value: "{" + content + "}" }; }

ArgChar
  = ch:[^{}\\`]
    { return { type: "text", value: ch }; }

Identifier
  = $([a-zA-Z][a-zA-Z0-9_]*)

EOF = !.
