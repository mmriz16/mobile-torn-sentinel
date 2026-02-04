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
/eas-release update    - Publish an OTA update
/eas-release build     - Trigger a native build
/eas-release status    - Check build status
```

---

## EAS Update Flow

1. **Check Environment**
   - Ensure you are on the correct branch.
   - Confirm changes are committed (optional, but recommended).

2. **Run Update**
   - **Command**: `eas update --branch <branch-name> --message "<message>"`
   - **Interactive**: If arguments are missing, satisfy them interactively.

   > [!IMPORTANT]
   > EAS Update works for JavaScript/asset changes only. Native changes require a rebuild.

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
/eas-release update --branch preview --message "Fix login bug"
/eas-release build --platform android --profile preview
```
