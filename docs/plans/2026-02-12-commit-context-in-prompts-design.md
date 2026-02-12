# Commit/Branch Context in Generated Prompts

## Problem

When reviewing an old commit or a different branch, the generated prompt only contains file/line comments with no indication of what was being reviewed. A coding agent receiving these comments has no way to know the code may have changed since the reviewed version.

## Design

Extend `generatePrompt` to accept an optional context object. When the review targets a specific commit or branch, prepend a context header to the prompt telling the LLM what was reviewed and to apply fixes to the current HEAD.

### Context type

```ts
interface PromptContext {
  mode: DiffMode;              // "unstaged" | "staged" | "commit"
  commitRef?: string;          // e.g. "HEAD~1"
  selectedCommit?: CommitInfo; // hash, message, author
  selectedBranch?: BranchInfo; // name, short_hash
}
```

### Conditional header rules

- **Unstaged/staged**: No header (comments are about current working state).
- **Commit selected**: `These comments are from reviewing commit {short_hash} ("{message}"). Apply the feedback to the current version of the code.`
- **Branch selected**: `These comments are from reviewing branch {name} (at {short_hash}). Apply the feedback to the current version of the code.`
- **Commit ref only** (no selected commit/branch): `These comments are from reviewing changes relative to {commitRef}. Apply the feedback to the current version of the code.`

### Files changed

1. `src/lib/promptGenerator.ts` - Add `PromptContext` parameter, conditionally prepend header
2. `src/App.tsx` - Pass context from existing state (`diffMode`, `selectedCommit`, `selectedBranch`)
3. `src/lib/promptGenerator.test.ts` - Test cases for each context variant
