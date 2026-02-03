---
description: Production Build Workflow (Version Bump, Changelog, Build)
---

1. Ask the user for the list of changelog items (improvements, changes, fixes) for this new version. If the user doesn't provide any, you can infer them from recent changes or use a generic message like "Bug fixes and performance improvements".

2. Run the preparation script to bump the version, update configuration, and insert the changelog card. Pass the changelog items as arguments.
   Example: `node scripts/prepare-production-build.js "Added new feature X" "Fixed bug Y"`
// turbo
node scripts/prepare-production-build.js

3. Read the output of the script to confirm the new version number (look for "READY_FOR_BUILD: x.x.x").

4. Run the EAS build command with the production profile. Include the version and changelog used in the build message.
   Example: `eas build --platform android --profile production --message "v1.1.9 - Added new feature X, Fixed bug Y"`

eas build --platform android --profile production
