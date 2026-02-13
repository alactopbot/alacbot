---
name: create-skill
description: Create a new skill at runtime. Use when the user asks you to add a new tool or capability, or when you need a tool that doesn't exist yet.
---

# Create Skill

## When to use
Use this skill when:
- The user asks to "create a tool/skill for X"
- You need a capability that no existing skill provides
- The user wants to extend the bot with new functionality

## Parameters
- `name` (string, required): Skill name in kebab-case (e.g. `my-skill`).
- `description` (string, required): What the skill does and when to use it.
- `tool_name` (string, required): The tool function name in snake_case (e.g. `my_skill`).
- `parameters_json` (string, required): JSON string of the parameters schema.
- `handler_code` (string, required): The TypeScript handler body (receives `params`).

## Output
Creates a new skill directory under `~/alacbot/skills/` with SKILL.md and tool.ts, then auto-loads it.
