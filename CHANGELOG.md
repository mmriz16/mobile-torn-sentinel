# Changelog

## [1.1.0] - 2026-01-24

### Added
- **Persistent Caching**: Implemented local storage caching using `AsyncStorage`. Data now persists across app restarts, enabling instant loading and offline support for previously viewed content.
- **Offline Support**: The app can now display cached user profile, faction data, and gym stats without an active internet connection.
- **Optimized API Calls**: significantly reduced the number of network requests by using cached data for static or slow-changing resources (like Item Database, Education Courses, and Gym Perks).
- **Reduced Lag**: Navigating between tabs is now smoother and faster due to eliminated redundant API fetches.

### Changed
- Refactored `src/services/torn-api.ts` to use a unified caching strategy.
- Updated `eas.json` to build APK for production profile.
