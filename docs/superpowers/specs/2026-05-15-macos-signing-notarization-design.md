# macOS Signing and Notarization for Tagged Releases

## Context

AI Review is packaged with `electron-builder`. The release workflow builds macOS and Linux artifacts when a `v*` tag is pushed, then uploads those artifacts to a GitHub Release and updates the Homebrew cask. The macOS package currently disables signing with `mac.identity: null`, so release DMGs are not signed or notarized.

The goal is to sign and notarize the `AI Review.app` and macOS DMG for standalone Developer ID distribution outside the Mac App Store. CI and pull request builds should remain unsigned.

## Scope

This change applies only to tagged release builds in `.github/workflows/release.yml`.

In scope:

- Sign macOS release builds with a Developer ID Application certificate.
- Notarize macOS release artifacts with Apple ID and app-specific password credentials.
- Staple notarization tickets through the packaging flow where supported by `electron-builder`.
- Verify the signed app and release artifact before uploading to GitHub Releases.
- Keep PR and branch CI builds unsigned.

Out of scope:

- Mac App Store distribution.
- App Store Connect API key notarization.
- Windows signing.
- Linux signing.
- `.pkg` installer signing.

## Required GitHub Secrets

The release workflow expects these secrets to exist:

- `CSC_LINK`: Base64-encoded `.p12` export of the Developer ID Application certificate and private key.
- `CSC_KEY_PASSWORD`: Password used when exporting the `.p12`.
- `APPLE_ID`: Apple ID email for an account on the paid Apple Developer team.
- `APPLE_APP_SPECIFIC_PASSWORD`: App-specific password generated for that Apple ID.
- `APPLE_TEAM_ID`: 10-character Apple Developer Team ID.

The certificate must be a Developer ID Application certificate. A Mac App Distribution, Apple Distribution, or development certificate is not correct for standalone DMG distribution. A Developer ID Installer certificate is only needed if the project later adds a `.pkg` target.

## Packaging Design

`electron-builder.yml` should allow signing for macOS release builds by removing `mac.identity: null`. Electron Builder will discover the imported Developer ID identity from the CI keychain using `CSC_LINK` and `CSC_KEY_PASSWORD`.

The macOS configuration should explicitly enable hardened runtime and include Electron-compatible entitlements. The entitlements must support modern Electron on Apple Silicon, including JIT behavior required by Chromium. The entitlements should stay minimal and be shared by the parent app and inherited child processes.

The release workflow should expose Apple notarization credentials only to the macOS build step on tag builds:

- `CSC_LINK`
- `CSC_KEY_PASSWORD`
- `APPLE_ID`
- `APPLE_APP_SPECIFIC_PASSWORD`
- `APPLE_TEAM_ID`

With those variables present, `electron-builder` should sign and notarize the app bundle during the existing `pnpm exec electron-builder --publish never` release step. After DMG creation, the workflow should submit each generated DMG to Apple with `xcrun notarytool`, wait for acceptance, and staple the ticket to the DMG.

## Verification Design

After packaging, the macOS release job should verify the app bundle before artifact upload:

- Locate `release/mac-arm64/AI Review.app` or the generated macOS app path.
- Run `codesign --verify --deep --strict --verbose=2` on the app bundle.
- Run `spctl --assess --type execute --verbose` on the app bundle.
- Inspect notarization/stapling state for every generated DMG with `xcrun stapler validate` when DMGs exist.

If any verification fails, the release job should fail before creating the GitHub Release.

## Data Flow

1. A `v*` tag push starts the release workflow.
2. The macOS matrix job installs dependencies and builds frontend, Electron main/preload code, and Rust sidecar binaries.
3. `electron-builder` packages the macOS app.
4. Electron Builder imports or uses the Developer ID Application certificate from `CSC_LINK`.
5. Electron Builder signs the app bundle and nested executables.
6. Electron Builder submits the signed app bundle to Apple notarization using `APPLE_ID`, `APPLE_APP_SPECIFIC_PASSWORD`, and `APPLE_TEAM_ID`.
7. The workflow submits each generated DMG to Apple notarization using the same Apple ID credentials.
8. The workflow staples the accepted notarization ticket to each DMG.
9. The workflow verifies app signatures, Gatekeeper assessment, and DMG stapling.
10. Verified DMGs are uploaded as release artifacts.

## Error Handling

Missing signing or notarization secrets should fail the tagged macOS release build, not silently publish unsigned macOS artifacts.

Verification failures should print the relevant tool output and stop the workflow. The release job should not upload macOS artifacts unless signing and notarization verification pass.

Linux release behavior should remain unchanged.

## Testing

Local tests:

- Run the existing test suite.
- Run the release build command without signing secrets only if the packaging config still supports local unsigned development builds through `electron:build:dir`.

CI validation:

- PR CI continues to run unsigned Electron directory builds.
- A tagged release build validates the full signing, notarization, stapling, and artifact upload flow.

Because Apple notarization requires live Apple services and CI secrets, the complete success path is only fully testable from a tagged GitHub Actions release run.
