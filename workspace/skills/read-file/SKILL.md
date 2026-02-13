---
name: read-file
description: Read the contents of a file. Use when the user asks to view, read, inspect, or cat a file.
---

# Read File

## When to use
Use this skill when the user wants to see the contents of a file on disk.

## Parameters
- `path` (string, required): The absolute or relative file path to read. Supports `~` for home directory.

## Notes
- Returns the file content as text
- Handles encoding as UTF-8
