# Changelog

All notable changes to Echo will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.3.0] - 2026-01-01

### Added
- 🎨 New app icon - Space bottle rocket design
- Generated all icon sizes (32, 180, 192, 512px)
- New favicon

### Changed
- 📝 Complete README redesign inspired by Fladder
- Large centered icon at the top
- Navigation menu and badges
- Added sendecho.app as homepage

## [1.2.3] - 2026-01-01

### Fixed
- 🍎 iOS PWA status bar white band
- Added `viewport-fit=cover` to viewport meta
- Matched theme-color with actual background (#0a0a12)
- Using `100dvh` for better mobile viewport

## [1.2.2] - 2026-01-01

### Added
- ✨ "Send a new signal" button
- Users can now send multiple signals
- Secondary button style (subtle design)

## [1.2.1] - 2026-01-01

### Changed
- 🎨 Updated app icon
- Display "ECHO" instead of just "E"
- Removed decorative circles
- Added gradient to text (white → purple)

## [1.2.0] - 2026-01-01

### Added
- ✨ Liquid Glass UI redesign
- Glassmorphism effects with `backdrop-filter: blur()`
- Glass cards, buttons, and pills
- Purple/blue accent gradients
- Enhanced shooting stars with color trails
- Accessibility: `prefers-reduced-motion` support

### Changed
- Complete CSS overhaul
- Safe area support for iOS notch/home indicator
- Smoother animations with cubic-bezier

## [1.1.1] - 2026-01-01

### Fixed
- 🍎 iOS PWA icons (PNG instead of SVG)
- iOS status bar style (`black-translucent`)
- Added iOS-specific meta tags

## [1.1.0] - 2026-01-01

### Added
- 🛡️ Auto-moderation (messages with 3+ reports deleted)
- 📦 Gzip compression
- Storage optimization (limit seen messages to 100)
- Docker badge in README
- Health check endpoint documentation

### Changed
- Improved CSP (removed `unsafe-inline` for scripts)
- External JavaScript file (`app.js`)

## [1.0.0] - 2026-01-01

### Added
- 🚀 First stable release
- Anonymous messaging system (send to receive)
- Space-themed UI with animated starfield
- Shooting stars animation
- Cosmic sound effects via Web Audio API
- PWA support (installable on mobile)
- Rate limiting (5 messages per 2 minutes)
- Report system for inappropriate content
- SQLite database with better-sqlite3
- Docker support with health check
- Helmet.js security headers
- Strict CSP
- SQL injection protection

---

[1.3.0]: https://github.com/GitCroque/echo/releases/tag/v1.3.0
[1.2.3]: https://github.com/GitCroque/echo/releases/tag/v1.2.3
[1.2.2]: https://github.com/GitCroque/echo/releases/tag/v1.2.2
[1.2.1]: https://github.com/GitCroque/echo/releases/tag/v1.2.1
[1.2.0]: https://github.com/GitCroque/echo/releases/tag/v1.2.0
[1.1.1]: https://github.com/GitCroque/echo/releases/tag/v1.1.1
[1.1.0]: https://github.com/GitCroque/echo/releases/tag/v1.1.0
[1.0.0]: https://github.com/GitCroque/echo/releases/tag/v1.0.0

