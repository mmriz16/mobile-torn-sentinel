---
description: Workflow for managing EAS Updates and Builds
---

# /eas-release - EAS Deployment

$ARGUMENTS

---

## Purpose

This command manages Expo Application Services (EAS) updates and builds for the mobile application.

---

## Sub-commands

```
/eas-release update    - Publish an OTA update (Android only by default)
/eas-release build     - Trigger a native build
/eas-release status    - Check build status
```

---

## EAS Update Flow (Android Only)

// turbo-all

1. **Check Environment**
   - Ensure you are on the correct branch.
   - Confirm changes are committed (optional, but recommended).

2. **Run Update (Android Only)**
   - **Command**: `eas update --platform android --branch production --message "<message>"`
   - Default branch: `production`
   - **Interactive**: If `--message` is missing, ask the user or generate from recent git commits.

   > [!IMPORTANT]
   > EAS Update works for JavaScript/asset changes only. Native changes require a rebuild.

   > [!TIP]
   > To update ALL platforms, add `--platform all` explicitly:
   > `eas update --platform all --branch <branch-name> --message "<message>"`

---

## EAS Build Flow

1. **Select Platform**
   - `android`, `ios`, or `all`

2. **Select Profile**
   - Common profiles: `development`, `preview`, `production` (defined in `eas.json`)

3. **Run Build**
   - **Command**: `eas build --platform <platform> --profile <profile>`
   - **Tip**: Add `--local` to build locally if configured.

---

## Examples

```
/eas-release update --message "Fix login bug"
/eas-release update --branch production --message "Release v1.2"
/eas-release update --platform all --branch preview --message "Cross-platform fix"
/eas-release build --platform android --profile preview
```
