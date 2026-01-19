---
description: How to publish EAS updates with changelog for the What's New modal
---

# EAS Update Workflow (Android Only)

When user says **"/eas-update"** or **"run eas-update"**, do the following steps automatically:

## Step 1: Read Current Version

Read `APP_VERSION` from `app/(tabs)/index.tsx` and increment the patch version:
- `"1.0.1"` → `"1.0.2"`
- `"1.0.9"` → `"1.0.10"`
- etc.

## Step 2: Update APP_VERSION

Update the `APP_VERSION` constant in `app/(tabs)/index.tsx`:

```tsx
const APP_VERSION = "<NEW_VERSION>";
```

## Step 3: Update Changelog Component

Update `app/(modals)/changelog.tsx`:

1. **Add a new version card AT THE TOP** (before existing version cards)
2. Format the date as: `Mon, DD YYYY` (e.g., `Jan, 20 2026`)
3. Ask user for the changelog items (or use recent changes if obvious)

The changelog should stack versions like this (newest first):

```tsx
{/* VERSION 1.0.3 - Newest */}
<Card>
    <View>Version 1.0.3 | Jan, 21 2026</View>
    <View>
        • IMPROVEMENTS & CHANGES
        - Change 1
        - Change 2
        • FIXED
        - Fix 1
    </View>
</Card>

{/* VERSION 1.0.2 */}
<Card>
    <View>Version 1.0.2 | Jan, 20 2026</View>
    ...
</Card>

{/* VERSION 1.0.1 - Oldest */}
<Card>
    <View>Version 1.0.1 | Jan, 19 2026</View>
    ...
</Card>
```

## Step 4: Run EAS Update

// turbo
```bash
eas update --platform android --channel production --message "v<NEW_VERSION>
- <CHANGE 1>
- <CHANGE 2>
- <CHANGE 3>"
```

## Rules

1. **Platform**: Android Only (always `--platform android`)
2. **Language**: English only
3. **Auto-increment**: Always increment patch version
4. **Stack changelogs**: Newest version on top, keep old versions below
5. **Ask for changes**: If changes aren't obvious, ask user what to include in changelog

## Example Conversation

**User:** eas-update  
**Agent:** 
1. Current version: 1.0.2 → New version: 1.0.3
2. What changes should I include in the changelog?

**User:** Fixed duplicate notifications, improved performance  
**Agent:** 
- Updated APP_VERSION to "1.0.3"
- Added new version card to changelog.tsx
- Running: `eas update --platform android --channel production --message "v1.0.3..."`