---
name: bash
description: Execute a bash command and return output. Use for running shell commands, scripts, installing packages, git operations, etc.
---

# Bash

## When to use
Use this skill when the user needs to run any shell command — build, test, git, file operations, etc.

## Parameters
- `command` (string, required): The bash command to execute.
- `timeout` (number, optional): Timeout in milliseconds. Defaults to 60000 (60s).

## Notes
- Captures both stdout and stderr
- Supports pipes, redirects, and chained commands
- Times out after 60 seconds by default
