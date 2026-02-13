---
name: write-file
description: Write or create a file with specified content. Use when the user asks to create, write, or save a file.
---

# Write File

## When to use
Use this skill when the user wants to create a new file or overwrite an existing file.

## Parameters
- `path` (string, required): Target file path. Supports `~` for home directory.
- `content` (string, required): The content to write.

## Notes
- Creates parent directories automatically
- Overwrites if file exists
