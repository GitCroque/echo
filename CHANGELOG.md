# Changelog

All notable changes to Echo will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.0.0] - 2026-04-22

### Added
- 🎨 Full Cosmic Signal v2 redesign: oklch color palette, Fraunces + JetBrains Mono typography, editorial hairline composition
- 🔮 Signal orb centerpiece with breathing core and staggered ambient pulses (warm for send, cool for receive)
- 📡 Dedicated receive flow screens: Ready, Listening (waveform), Message (typewriter letter with blinking cursor), Empty
- ⏳ Rate-limit screen with animated SVG countdown dial when the server returns 429
- 📊 Stats screen with grid of `total signals` and personal `sent` / `received`
- 🪪 Report modal for signal reporting with confirm/cancel
- 📲 Install pill for PWA install prompt (honors `beforeinstallprompt`, persisted dismiss)
- 🔌 Offline banner shown on `window.offline`, auto-hides on reconnect
- ✨ Shooting stars fired on transmit and periodically in the starfield
- 🔖 New `GET /api/version` endpoint returning `package.json` version; footer displays live release

### Changed
- 🧭 Client-side router: 9 screens (`home`, `send`, `transmit`, `receive-ready`, `receive-listening`, `receive-message`, `receive-empty`, `ratelimit`, `stats`) swapped with `fadeUp` transitions
- 🔤 Typography swapped from Cormorant Garamond + Space Mono to Fraunces + JetBrains Mono
- 🎛️ i18n keys flattened to dot-notation (`home.meta`, `receive.msg.report`, …); 8 languages retained (EN/FR/ES/DE/IT/PT/JA/ZH)
- 📦 Service Worker cache `echo-v24` with new font URL

### Removed
- 🗑️ Cosmos / Ocean / Aurora theme selector (replaced by a single finished theme)
- 🗑️ Nederlands, Русский, 한국어, العربية translations (kept in API contracts, removed from new copy)

### Fixed
- 🐛 CI `npm audit --omit=dev` failure: bumped transitive `path-to-regexp` to 0.1.13 (GHSA-37ch-88jc-xwx2)

## [1.9.2] - 2026-03-03

### Fixed
- 🐛 **Critical**: Docker volume not persisted (DATA_DIR missing in docker-compose)
- 🐛 Hardcoded English string in `resetReceiveSection` (i18n broken on reset)
- 🐛 Open Graph URLs pointing to old domain instead of sendecho.app
- 🐛 TOCTOU race condition in `/api/report` (existence check now inside transaction)
- 🐛 Graceful shutdown not closing HTTP server before DB
- 🐛 `req.connection.remoteAddress` deprecated (replaced with `req.socket`)

### Security
- 🔒 Non-root user in Dockerfile
- 🔒 Replaced `innerHTML` with DOM API (`createElement`/`appendChild`) in 3 places
- 🔒 Capped `exclude` array to 100 IDs server-side to prevent oversized SQL queries

### Performance
- ⚡ Cached `updateCountry` prepared statement (was re-created on every message send)
- ⚡ Moved `will-change` from all 400+ stars to only bright stars (less GPU memory)
- ⚡ Merged duplicate `@media (max-width: 600px)` CSS blocks

### Changed
- 📦 Service Worker v23
- 🐳 `npm ci --omit=dev` in Dockerfile for deterministic builds

## [1.9.1] - 2026-02-03

### Added
- 🎨 Redesigned language selector as dropdown menu with country flags
- 🏷️ Full language names displayed (English, Français, Deutsch, etc.)

### Fixed
- 🐛 App version now correctly displays in footer

### Changed
- 📦 Service Worker v21

## [1.9.0] - 2026-02-03

### Added
- 🌍 10 new languages: Spanish, German, Italian, Portuguese, Dutch, Russian, Japanese, Korean, Chinese (Simplified), Arabic
- 🔄 Auto-detection of browser language for all 12 supported languages
- 📅 Locale-aware date formatting for each language
- ↔️ RTL (right-to-left) support for Arabic with CSS adjustments
- 🏷️ App version now displays discreetly in footer

### Changed
- 📦 Service Worker v20 with updated cache

## [1.8.0] - 2026-02-02

### Performance
- ⚡ External CSS: extracted 28KB inline styles to `style.css` (better caching, HTML ~85% smaller)
- ⚡ Stats API cache: 10-second client-side TTL (fewer redundant requests)
- ⚡ Mobile optimization: 50% fewer stars on screens < 768px
- ⚡ Database index on `messages.created_at` for faster date queries

### Accessibility
- ♿ ARIA labels on all interactive buttons
- ♿ `aria-live` regions for dynamic content (messages, toasts, character counter)
- ♿ Visually hidden labels for form inputs
- ♿ Dynamic `aria-label` updates for sound toggle

### Changed
- 📦 Service Worker v19 with external CSS caching
- ♻️ Refactored `loadStats()` with `updateStatsDisplay()` helper

## [1.7.0] - 2026-02-02

### Performance
- ⚡ Typewriter effect: replaced `innerHTML +=` with `textContent` (eliminates DOM thrashing)
- ⚡ Random message: single `ORDER BY RANDOM()` query instead of COUNT + OFFSET (2x faster)
- ⚡ Country lookup: non-blocking fire-and-forget (response ~200ms faster)
- ⚡ Cache prepared SQL statements at startup
- ⚡ Pause shooting stars/satellites when tab is hidden
- ⚡ CSS `contain`/`will-change` for star animation performance

### Security
- 🔒 Rate limiting on `/api/message/random` and `/api/report` (30 req/min)
- 🔒 Atomic auto-moderation with `db.transaction()`
- 🔒 Stronger URL filter with more TLDs

### Changed
- 🐳 Multi-stage Docker build (smaller image, no build tools in runtime)
- 🌐 Translate all hardcoded UI strings (i18n)
- 📱 Open Graph and Twitter Card meta tags
- ♻️ Refactor receiveMessage/receiveMessageDirect into shared function
- 🔧 Graceful shutdown with 5s timeout safety net
- 🔧 Fix char counter warning threshold (450 → 120)
- 🔧 Add index on `reports.message_id` for faster lookups

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

[1.9.2]: https://github.com/GitCroque/echo/releases/tag/v1.9.2
[1.9.1]: https://github.com/GitCroque/echo/releases/tag/v1.9.1
[1.9.0]: https://github.com/GitCroque/echo/releases/tag/v1.9.0
[1.8.0]: https://github.com/GitCroque/echo/releases/tag/v1.8.0
[1.7.0]: https://github.com/GitCroque/echo/releases/tag/v1.7.0
[1.3.0]: https://github.com/GitCroque/echo/releases/tag/v1.3.0
[1.2.3]: https://github.com/GitCroque/echo/releases/tag/v1.2.3
[1.2.2]: https://github.com/GitCroque/echo/releases/tag/v1.2.2
[1.2.1]: https://github.com/GitCroque/echo/releases/tag/v1.2.1
[1.2.0]: https://github.com/GitCroque/echo/releases/tag/v1.2.0
[1.1.1]: https://github.com/GitCroque/echo/releases/tag/v1.1.1
[1.1.0]: https://github.com/GitCroque/echo/releases/tag/v1.1.0
[1.0.0]: https://github.com/GitCroque/echo/releases/tag/v1.0.0




