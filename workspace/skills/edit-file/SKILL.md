---
name: edit-file
description: Edit a file by replacing a specific string with new content. Use for precise code modifications.
---

# Edit File

## When to use
Use this skill for surgical edits to existing files — replacing specific text with new text.

## Parameters
- `path` (string, required): File path to edit.
- `old_str` (string, required): The exact string to find in the file.
- `new_str` (string, required): The replacement string.

## Notes
- The `old_str` must match exactly (including whitespace)
- Only replaces the first occurrence
- Fails if `old_str` is not found
