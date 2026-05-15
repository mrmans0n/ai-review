# macOS Signing and Notarization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Sign, notarize, staple, and verify tagged macOS release builds for standalone Developer ID distribution.

**Architecture:** Keep PR and branch builds unsigned while allowing tagged release builds to use `electron-builder`'s built-in macOS signing and notarization support. Add minimal Electron entitlements, expose Apple credentials only in the release macOS build step, and fail release builds before upload if signature or notarization validation fails.

**Tech Stack:** GitHub Actions, electron-builder, Electron, macOS `codesign`, `spctl`, `xcrun stapler`, pnpm, Rust/Cargo.

---

## File Structure

- Modify `electron-builder.yml`: remove the disabled macOS signing identity and add hardened runtime plus entitlement paths.
- Create `build/entitlements.mac.plist`: main app entitlements for Electron/Chromium runtime behavior.
- Create `build/entitlements.mac.inherit.plist`: inherited entitlements for child processes and helper binaries.
- Modify `.github/workflows/release.yml`: provide signing/notarization secrets only to the macOS release build step and verify the packaged macOS artifacts before upload.

## Task 1: Enable macOS signing configuration

**Files:**

- Modify: `electron-builder.yml`
- Create: `build/entitlements.mac.plist`
- Create: `build/entitlements.mac.inherit.plist`

- [ ] **Step 1: Add Electron-compatible entitlements**

Create `build/entitlements.mac.plist` with:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>com.apple.security.cs.allow-jit</key>
  <true/>
  <key>com.apple.security.cs.allow-unsigned-executable-memory</key>
  <true/>
  <key>com.apple.security.cs.disable-library-validation</key>
  <true/>
</dict>
</plist>
```

Create `build/entitlements.mac.inherit.plist` with:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>com.apple.security.cs.allow-jit</key>
  <true/>
  <key>com.apple.security.cs.allow-unsigned-executable-memory</key>
  <true/>
  <key>com.apple.security.cs.disable-library-validation</key>
  <true/>
</dict>
</plist>
```

- [ ] **Step 2: Update electron-builder macOS config**

Change `electron-builder.yml` from:

```yaml
mac:
  target:
    - target: dmg
      arch:
        - arm64
        - x64
  identity: null
  category: public.app-category.developer-tools
  icon: icons/icon.icns
  artifactName: "${productName}-${version}-${arch}.${ext}"
```

to:

```yaml
mac:
  target:
    - target: dmg
      arch:
        - arm64
        - x64
  hardenedRuntime: true
  entitlements: build/entitlements.mac.plist
  entitlementsInherit: build/entitlements.mac.inherit.plist
  category: public.app-category.developer-tools
  icon: icons/icon.icns
  artifactName: "${productName}-${version}-${arch}.${ext}"
```

- [ ] **Step 3: Verify config syntax**

Run:

```bash
pnpm exec electron-builder --config electron-builder.yml --dir --mac --arm64 --publish never
```

Expected: packaging starts and does not fail on YAML or entitlement parsing. It may fail locally if macOS signing identity or release build prerequisites are unavailable; that is acceptable if the error occurs after config parsing.

- [ ] **Step 4: Commit**

Run:

```bash
git add electron-builder.yml build/entitlements.mac.plist build/entitlements.mac.inherit.plist
git commit -m "Configure macOS signing entitlements"
```

## Task 2: Add release signing and notarization credentials

**Files:**

- Modify: `.github/workflows/release.yml`

- [ ] **Step 1: Add macOS-only environment variables to the Build app step**

Change the existing `Build app` step from:

```yaml
      - name: Build app
        run: |
          pnpm exec tsc
          pnpm exec vite build
          pnpm electron:tsc
          cd core
          cargo build --release -p core-sidecar -p core-launcher
          cd ..
          pnpm exec electron-builder --publish never
```

to:

```yaml
      - name: Build app
        env:
          CSC_LINK: ${{ matrix.os == 'macos-latest' && secrets.CSC_LINK || '' }}
          CSC_KEY_PASSWORD: ${{ matrix.os == 'macos-latest' && secrets.CSC_KEY_PASSWORD || '' }}
          APPLE_ID: ${{ matrix.os == 'macos-latest' && secrets.APPLE_ID || '' }}
          APPLE_APP_SPECIFIC_PASSWORD: ${{ matrix.os == 'macos-latest' && secrets.APPLE_APP_SPECIFIC_PASSWORD || '' }}
          APPLE_TEAM_ID: ${{ matrix.os == 'macos-latest' && secrets.APPLE_TEAM_ID || '' }}
        run: |
          pnpm exec tsc
          pnpm exec vite build
          pnpm electron:tsc
          cd core
          cargo build --release -p core-sidecar -p core-launcher
          cd ..
          pnpm exec electron-builder --publish never
```

- [ ] **Step 2: Confirm unsigned Linux behavior remains unchanged**

Run:

```bash
git diff -- .github/workflows/release.yml
```

Expected: the only behavior change before verification is the `env` block. Linux receives empty signing variables because the expressions are gated by `matrix.os == 'macos-latest'`.

- [ ] **Step 3: Commit**

Run:

```bash
git add .github/workflows/release.yml
git commit -m "Add macOS release signing secrets"
```

## Task 3: Verify signed macOS release artifacts before upload

**Files:**

- Modify: `.github/workflows/release.yml`

- [ ] **Step 1: Add macOS verification step after Build app**

Insert this step immediately after `Build app` and before `Collect artifacts (macOS)`:

```yaml
      - name: Verify signed macOS artifacts
        if: matrix.os == 'macos-latest'
        shell: bash
        run: |
          set -euo pipefail

          APP_PATH="$(find release -maxdepth 2 -name 'AI Review.app' -type d | head -n 1)"
          if [ -z "$APP_PATH" ]; then
            echo "AI Review.app not found under release/"
            find release -maxdepth 3 -print
            exit 1
          fi

          codesign --verify --deep --strict --verbose=2 "$APP_PATH"
          spctl --assess --type execute --verbose "$APP_PATH"

          DMG_PATH="$(find release -maxdepth 1 -name '*.dmg' -type f | head -n 1)"
          if [ -z "$DMG_PATH" ]; then
            echo "DMG not found under release/"
            find release -maxdepth 2 -print
            exit 1
          fi

          xcrun stapler validate "$DMG_PATH"
```

- [ ] **Step 2: Make macOS artifact collection fail when no DMG exists**

Change `Collect artifacts (macOS)` from:

```yaml
      - name: Collect artifacts (macOS)
        if: matrix.os == 'macos-latest'
        shell: bash
        run: |
          mkdir -p artifacts
          cp release/*.dmg artifacts/ || true
          ls -la artifacts/
```

to:

```yaml
      - name: Collect artifacts (macOS)
        if: matrix.os == 'macos-latest'
        shell: bash
        run: |
          mkdir -p artifacts
          cp release/*.dmg artifacts/
          ls -la artifacts/
```

- [ ] **Step 3: Validate workflow YAML**

Run:

```bash
pnpm exec prettier --check .github/workflows/release.yml || true
```

Expected: If Prettier is unavailable or not configured for YAML, the command may fail. In that case, inspect the YAML indentation manually with `sed -n '80,130p' .github/workflows/release.yml`.

- [ ] **Step 4: Commit**

Run:

```bash
git add .github/workflows/release.yml
git commit -m "Verify notarized macOS release artifacts"
```

## Task 4: Run final verification

**Files:**

- Verify: `electron-builder.yml`
- Verify: `.github/workflows/release.yml`
- Verify: `build/entitlements.mac.plist`
- Verify: `build/entitlements.mac.inherit.plist`

- [ ] **Step 1: Run frontend tests**

Run:

```bash
pnpm test:run
```

Expected: Vitest passes.

- [ ] **Step 2: Run frontend build**

Run:

```bash
pnpm build
```

Expected: TypeScript and Vite build pass.

- [ ] **Step 3: Run Electron directory build**

Run:

```bash
pnpm electron:build:dir
```

Expected: Local unsigned directory build passes, preserving the CI PR build path.

- [ ] **Step 4: Inspect final diff**

Run:

```bash
git diff --stat HEAD~3..HEAD
git status --short
```

Expected: Only the signing config, entitlements, release workflow, and planning/spec documents are changed. The worktree is clean after commits.
