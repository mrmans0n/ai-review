# Prompt Preview: File Path Chips

## Summary

Render file path + line references as compact chips in the prompt preview screen, similar to Cursor's file reference pills. A toggle switches between the rich (chip) view and the existing raw textarea.

## Approach

Parse-and-render in PromptPreview (Approach A). `generatePrompt()` stays unchanged. PromptPreview parses its output to render chips in a read-only rich view.

## Behavior

- `viewMode` state: `"rich"` (default) or `"raw"`.
- Toggle button in the header switches between them.
- **Rich mode**: Read-only. Prompt text is parsed line by line:
  - Comment lines matching `` - `path:line(-line)?` — text `` render as a flex row with a chip + comment text.
  - All other lines render as plain text paragraphs.
- **Raw mode**: Existing `<textarea>` with `editablePrompt`, editable as today.
- **Copy** always uses `editablePrompt` (the raw text), regardless of which view is active.

## Chip display

- Full path `src/components/FileViewer.tsx:10-15` renders as chip: **FileViewer.tsx (L10-L15)**
- Single line `src/lib/utils.ts:42` renders as chip: **utils.ts (L42)**
- Styled as: rounded pill, monospace, muted background (`bg-gray-700 text-gray-200 rounded-full px-2 py-0.5 text-xs font-mono`).

## Parsing

Regex: `/^- `(.+?):(\d+)(?:-(\d+))?` — (.+)$/`

Non-matching lines render as plain text. This naturally handles context headers, blank lines, and the intro line.

## Scope

- Only `PromptPreview.tsx` is modified.
- No changes to `generatePrompt()`, types, or other components.
