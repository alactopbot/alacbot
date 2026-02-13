---
name: create-command
description: Create a new slash command at runtime. Use when the user asks to add a new command or shortcut.
---

# Create Command

## When to use
Use this skill when:
- The user asks to "create a command for X"
- The user wants a new slash shortcut

## Parameters
- `name` (string, required): Command name in kebab-case (e.g. `my-cmd`).
- `aliases` (string, required): Comma-separated aliases (e.g. `/my-cmd,/mc`).
- `description` (string, required): What the command does.
- `handler_code` (string, required): TypeScript handler body. Receives `(args: string[])` and must return `{ type, message }`.

## Output
Creates a new `.ts` file under `~/alacbot/commands/` and auto-loads it.
