#!/usr/bin/env python3
"""Generate the ai-review Homebrew cask file."""
import os
import pathlib

VERSION = os.environ["VERSION"]
SHA_ARM = os.environ["SHA_ARM"]

CASK = f'''\
cask "ai-review" do
  version "{VERSION}"
  sha256 "{SHA_ARM}"

  url "https://github.com/mrmans0n/ai-review/releases/download/v#{{version}}/AI.Review_#{{version}}_aarch64.dmg"
  name "AI Review"
  desc "Desktop code review tool for AI-generated diffs"
  homepage "https://github.com/mrmans0n/ai-review"

  depends_on arch: :arm64

  app "AI Review.app"
  binary "#{{appdir}}/AI Review.app/Contents/MacOS/AI Review", target: "air"

  zap trash: [
    "~/Library/Application Support/com.nacholopez.ai-review",
    "~/Library/Caches/com.nacholopez.ai-review",
  ]
end
'''

pathlib.Path("Casks/ai-review.rb").write_text(CASK)
print(f"Updated cask to {VERSION}")
