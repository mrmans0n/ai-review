#!/usr/bin/env bash
set -euo pipefail
# gather.sh — Collect trending AI news from web and produce a brief
# Usage: ./gather.sh [output-dir]   (default: ~/clawd/docs/ai)

OUTDIR="${1:-$HOME/clawd/docs/ai}"
mkdir -p "$OUTDIR"

TIMESTAMP=$(date +%Y-%m-%d)
OUTFILE="${OUTDIR}/ai-zeitgeist-${TIMESTAMP}.md"
SEARCH_SCRIPT="${HOME}/.claude/skills/web-search-cli/scripts/web_search.sh"

echo "# AI Zeitgeist — ${TIMESTAMP}" > "$OUTFILE"
echo "" >> "$OUTFILE"

# Top AI news
echo "## AI News" >> "$OUTFILE"
"$SEARCH_SCRIPT" --count 5 "trending AI news today $(date '+%B %d %Y')" \
  | python3 -c "
import json, sys
data = json.load(sys.stdin)
for item in data[:5]:
    print(f'- **{item[\"title\"]}**')
    print(f'  {item[\"abstract\"][:200]}')
    print(f'  source: {item[\"url\"]}')
    print()
" >> "$OUTFILE" 2>/dev/null || echo "  (search failed)" >> "$OUTFILE"

# Trending dev tools
echo "## Trending Developer Tools & Repos" >> "$OUTFILE"
"$SEARCH_SCRIPT" --count 5 "AI developer tools trending May 2026" \
  | python3 -c "
import json, sys
data = json.load(sys.stdin)
for item in data[:5]:
    print(f'- **{item[\"title\"]}**')
    print(f'  {item[\"abstract\"][:200]}')
    print(f'  source: {item[\"url\"]}')
    print()
" >> "$OUTFILE" 2>/dev/null || echo "  (search failed)" >> "$OUTFILE"

echo "" >> "$OUTFILE"
echo "_Generated at $(date)_" >> "$OUTFILE"
echo "Briefing saved to $OUTFILE"
