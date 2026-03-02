<h1 align="center">
  <br>
  <a href="https://github.com/GitCroque/echo"><img src="https://raw.githubusercontent.com/GitCroque/echo/main/public/icon-512.png" alt="Echo" width="200"></a>
  <br>
  Echo
  <br>
</h1>

<h4 align="center">Anonymous messages through the void — A cosmic bottle in the digital ocean.</h4>

<p align="center">
  <a href="https://echo.letmiko.app"><strong>echo.letmiko.app</strong></a>
</p>

<p align="center">
  <a href="#concept">Concept</a> •
  <a href="#features">Features</a> •
  <a href="#screenshots">Screenshots</a> •
  <a href="#quick-start">Quick Start</a> •
  <a href="#api">API</a> •
  <a href="#license">License</a>
</p>

<div align="center">

[![Status](https://img.shields.io/badge/status-live-brightgreen)](https://github.com/GitCroque/echo)
[![GitHub Release](https://img.shields.io/github/v/release/GitCroque/echo?display_name=tag)](https://github.com/GitCroque/echo/releases/latest)
[![Docker](https://img.shields.io/badge/docker-ghcr.io%2Fgitcroque%2Fecho-blue?logo=docker)](https://ghcr.io/gitcroque/echo)
[![License](https://img.shields.io/badge/license-MIT%20with%20conditions-blue)](LICENSE)

</div>

<br>

## Concept

Echo is a minimalist web application where users can send and receive anonymous messages from strangers. Like bottles thrown into the cosmic ocean, your messages travel through the void to be discovered by other lost souls.

**The rules are simple:**
1. 📡 **Send a signal** to the universe
2. 👂 **Receive signals** from strangers in return
3. 🔒 No accounts, no registration, completely anonymous

> You must transmit before you can receive. Each message you receive is unique — you'll never see the same one twice.

## Features

- **Anonymous messaging** — No accounts, no tracking
- **Liquid Glass UI** — Beautiful glassmorphism design inspired by iOS
- **Space-themed** — Animated starfield with parallax and shooting stars
- **Sound effects** — Cosmic sounds on message reception (toggleable)
- **PWA ready** — Installable on iOS, Android & Desktop
- **Auto-moderation** — Messages with 3+ reports are automatically removed
- **Rate limiting** — Protection against spam (5 messages per 2 minutes)
- **Secure** — Helmet.js, strict CSP, SQL injection protection

## Screenshots

<div align="center">
  <img src="https://img.shields.io/badge/coming_soon-screenshots-gray?style=for-the-badge" alt="Screenshots coming soon">
</div>

## Tech Stack

| Component | Technology |
|-----------|------------|
| Backend | Node.js + Express |
| Database | SQLite (better-sqlite3) |
| Frontend | Vanilla HTML/CSS/JS |
| Deployment | Docker |

## Quick Start

### 🐳 With Docker (recommended)

```bash
docker run -d \
  --name echo \
  -p 3000:3000 \
  -v echo-data:/data \
  --restart unless-stopped \
  ghcr.io/gitcroque/echo:latest
```

Then open http://localhost:3000

### 📦 With Docker Compose

```yaml
services:
  echo:
    image: ghcr.io/gitcroque/echo:latest
    ports:
      - "3000:3000"
    volumes:
      - echo-data:/data
    restart: unless-stopped

volumes:
  echo-data:
```

### 🔧 Build locally

```bash
git clone https://github.com/GitCroque/echo.git
cd echo
npm install
npm start
```

## API

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/message` | Send a new message |
| `POST` | `/api/message/random` | Get a random message |
| `POST` | `/api/report` | Report inappropriate content |
| `GET` | `/api/stats` | Get total message count |
| `GET` | `/health` | Health check endpoint |

<details>
<summary>📝 API Examples</summary>

**Send a message:**
```bash
curl -X POST http://localhost:3000/api/message \
  -H "Content-Type: application/json" \
  -d '{"content": "Hello from the void"}'
```

**Receive a message:**
```bash
curl -X POST http://localhost:3000/api/message/random \
  -H "Content-Type: application/json" \
  -d '{"exclude": []}'
```

</details>

## Project Structure

```
echo/
├── server.js              # Express backend
├── public/
│   ├── index.html         # Frontend (HTML + CSS)
│   ├── app.js             # Frontend JavaScript
│   ├── manifest.json      # PWA manifest
│   ├── sw.js              # Service worker
│   └── icon-*.png         # App icons
├── .github/workflows/     # CI/CD pipeline
├── Dockerfile
├── docker-compose.yml
└── README.md
```

## Security

- 🛡️ **Helmet.js** — Security headers (XSS, clickjacking protection)
- 🔐 **Strict CSP** — No unsafe-inline scripts
- ⏱️ **Rate limiting** — 5 messages per 2 minutes per IP
- ✅ **Input validation** — 140 character limit
- 💉 **SQL protection** — Prepared statements only
- 🤖 **Auto-moderation** — Community-driven content removal

## Docker Tags

| Tag | Description |
|-----|-------------|
| `latest` | Latest stable release |
| `1.3.0` | Specific version |
| `1.3` | Latest patch of 1.3.x |
| `1` | Latest 1.x.x version |

## License

This project is licensed under a modified MIT License:

- ✅ **Attribution required** — Credit the original author
- 📧 **Permission required for commercial use** — Contact author first

See [LICENSE](LICENSE) for details.

## Author

Created with 💜 by [@GitCroque](https://github.com/GitCroque)

---

<p align="center">
  <i>"Somewhere, someone is listening"</i>
</p>
