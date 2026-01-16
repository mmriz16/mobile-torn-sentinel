---
description: How to publish EAS updates with changelog for the What's New modal
---

# EAS Update with Changelog

This workflow ensures your changelog message is properly formatted for the in-app "What's New" modal.

## Format

```bash
eas update --channel <channel> --message "<version>
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

## Examples

### ✅ Good

```bash
eas update --channel production --message "v1.3.0
- Added dark mode support
- Fixed login timeout issue
- Improved faction stats loading speed
- New bazaar price alerts"
```

### ✅ Good (with categories)

```bash
eas update --channel production --message "v2.0.0
- New: Travel cost calculator
- New: Chain timer widget
- Fixed: Notifications not showing
- Improved: App startup performance"
```

### ❌ Bad

```bash
# Too technical
eas update --channel production --message "v1.3.0
- Refactored useEffect hooks
- Fixed TypeScript types in api.ts
- Updated dependencies"

# No version on first line
eas update --channel production --message "New update
- Added dark mode"

# Non-English
eas update --channel production --message "v1.3.0
- Tambah fitur baru"
```

## Quick Template

// turbo
```bash
eas update --channel production --message "v<VERSION>
- <FEATURE/FIX 1>
- <FEATURE/FIX 2>
- <FEATURE/FIX 3>"
```

## Channels

- `production` - Live users
- `preview` - Beta testers (if configured)
