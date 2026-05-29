# Diff Line Selection — Manual Verification

Run: `pnpm electron:dev`

Open a repo with a multi-file diff containing insertions, deletions, and unchanged lines.

## Test Cases

### 1. Old-side text selection
- [ ] Click and drag to select text on the OLD (left) side of a split diff
- [ ] Selection should highlight only old-side text; new side should NOT get selected
- [ ] Press `c` → comment form opens with correct old-side line range

### 2. New-side text selection
- [ ] Click and drag to select text on the NEW (right) side of a split diff
- [ ] Selection should highlight only new-side text; old side should NOT get selected
- [ ] Press `c` → comment form opens with correct new-side line range

### 3. Cross-side text selection
- [ ] Try to select text that spans from old side to new side
- [ ] `optimizeSelection` should constrain the selection to the starting side
- [ ] Press `c` → comment opens on the anchor side only, no error

### 4. Selection after previous selection
- [ ] Select text on old side, press Escape or click away
- [ ] Now select text on NEW side → should work (not permanently blocked)
- [ ] Confirms `data-selecting` is properly cleaned up

### 5. Gutter click
- [ ] Click a line number on the old gutter → comment opens on old side
- [ ] Click a line number on the new gutter → comment opens on new side

### 6. Gutter shift+click range
- [ ] Click line 10 on new gutter
- [ ] Shift+click line 15 on new gutter → comment opens for lines 10-15, new side
- [ ] Click line 5 on old gutter
- [ ] Shift+click line 8 on old gutter → comment opens for lines 5-8, old side

### 7. Gutter drag selection
- [ ] Mouse down on line 10 new gutter, drag to line 14 → highlight appears
- [ ] Release → comment form opens for lines 10-14, new side
- [ ] Repeat on old gutter → same behavior, old side

### 8. `c` key with hover
- [ ] Hover over a new-side line, press `c` → comment on that line, new side
- [ ] Hover over an old-side line, press `c` → comment on that line, old side

### 9. Widget interaction
- [ ] Add a comment on a line
- [ ] Select text on lines around the comment widget
- [ ] Press `c` → comment range is valid, not broken by widget DOM

### 10. Unified view
- [ ] Switch to unified view
- [ ] Select text and press `c` → comment opens correctly
- [ ] Gutter click → comment opens correctly
