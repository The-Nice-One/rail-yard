---
title: Commark Demo
layout: default
---

# Welcome

\note{This is a built-in note command.}

\warn{Watch out — this is a warning!}

## File inclusion

\textinput{snippets/greeting.md}

## Inline command definition

\newcommand{\hi}{**Hello, #1!**}

\hi{World}

## Custom commands from build.ts

\badge{stable}{green} \since{1.0}

## Collapsible

\details{Click to expand}{This content is inside a details block. It supports **markdown**.}

## Code fence (commands NOT expanded inside)

```typescript
const x = "\note{this is not expanded}"
```
