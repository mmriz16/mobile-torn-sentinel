---
description: How to publish EAS updates with changelog for the What's New modal
---

# EAS Update with Changelog (Android Only)

This workflow ensures your changelog message is properly formatted and the in-app "What's New" modal is updated.

> **Note:** Updates are only published for Android. iOS is not supported.

## Pre-Update Checklist

Before running `eas update`, you MUST:

### 1. Update App Version

Update `APP_VERSION` constant in `app/(tabs)/index.tsx`:

```tsx
// Current app version - update this when releasing new versions
const APP_VERSION = "1.0.X"; // <- Change to new version
```

### 2. Update Changelog Component

Update `app/(modals)/changelog.tsx` with the new version info:

- Update the version number in the header (e.g., "Version 1.0.2")
- Update the date (e.g., "Jan, 20 2026")
- Add/update the changelog items under "Improvements & Changes" and "Fixed" sections

Example structure in `changelog.tsx`:

```tsx
<Text className="text-white/50 uppercase" style={...}>Version 1.0.X</Text>
<Text className="text-white/70 uppercase" style={...}>Mon, DD YYYY</Text>

{/* Improvements & Changes */}
<Text className="text-white/70" style={...}>- New feature description</Text>
<Text className="text-white/70" style={...}>- Another improvement</Text>

{/* Fixed */}
<Text className="text-white/70" style={...}>- Bug fix description</Text>
```

## EAS Update Command Format

```bash
eas update --platform android --channel <channel> --message "<version>
- <change 1>
- <change 2>
- <change 3>"
```

## Rules

1. **First line**: Version (e.g., `v1.2.0` or `Version 1.2.0`)
2. **Following lines**: Changes, each starting with `-`, `*`, or `•`
3. **Language**: English only
4. **Keep it short**: Max 5-7 bullet points
5. **User-facing only**: Don't include technical/internal changes
6. **Platform**: Android Only (always use `--platform android`)
7. **Sync versions**: Make sure APP_VERSION in index.tsx matches the changelog.tsx version

## Examples

### ✅ Good

```bash
eas update --platform android --channel production --message "v1.3.0
- Added dark mode support
- Fixed login timeout issue
- Improved faction stats loading speed
- New bazaar price alerts"
```

### ✅ Good (with categories)

```bash
eas update --platform android --channel production --message "v2.0.0
- New: Travel cost calculator
- New: Chain timer widget
- Fixed: Notifications not showing
- Improved: App startup performance"
```

### ❌ Bad

```bash
# Too technical
eas update --platform android --channel production --message "v1.3.0
- Refactored useEffect hooks
- Fixed TypeScript types in api.ts
- Updated dependencies"

# No version on first line
eas update --platform android --channel production --message "New update
- Added dark mode"

# Non-English
eas update --platform android --channel production --message "v1.3.0
- Tambah fitur baru"

# Missing --platform android
eas update --channel production --message "v1.3.0
- Some change"
```

## Quick Template

// turbo
```bash
eas update --platform android --channel production --message "v<VERSION>
- <FEATURE/FIX 1>
- <FEATURE/FIX 2>
- <FEATURE/FIX 3>"
```

## Channels

- `production` - Live users
- `preview` - Beta testers (if configured)

## Full Workflow Summary

1. **Update `APP_VERSION`** in `app/(tabs)/index.tsx`
2. **Update changelog content** in `app/(modals)/changelog.tsx`
3. **Commit changes** to git
4. **Run `eas update --platform android`** with proper message format