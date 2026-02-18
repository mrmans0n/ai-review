#!/usr/bin/env python3
"""Generate the ai-review Homebrew cask file."""
import os
import pathlib

VERSION = os.environ["VERSION"]
SHA_ARM = os.environ["SHA_ARM"]
SHA_INTEL = os.environ["SHA_INTEL"]

CASK = f'''\
cask "ai-review" do
  version "{VERSION}"

  on_arm do
    sha256 "{SHA_ARM}"
    url "https://github.com/mrmans0n/ai-review/releases/download/v#{{version}}/AI.Review_#{{version}}_aarch64.dmg"
  end

  on_intel do
    sha256 "{SHA_INTEL}"
    url "https://github.com/mrmans0n/ai-review/releases/download/v#{{version}}/AI.Review_#{{version}}_x64.dmg"
  end

  name "AI Review"
  desc "Desktop code review tool for AI-generated diffs"
  homepage "https://github.com/mrmans0n/ai-review"

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
