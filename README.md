# Echo

> Anonymous messages through the void

Echo is a minimalist web application where users can send and receive anonymous messages from strangers. Like bottles thrown into the cosmic ocean, your messages travel through the void to be discovered by other lost souls.

![Echo Screenshot](https://img.shields.io/badge/status-live-brightgreen) ![License](https://img.shields.io/badge/license-MIT%20with%20conditions-blue)

## Concept

The rules are simple:
1. **Send a signal** to the universe
2. **Receive signals** from strangers in return
3. No accounts, no registration, completely anonymous

You must transmit before you can receive. Each message you receive is unique - you'll never see the same one twice.

## Features

- **Anonymous messaging** - No accounts, no tracking
- **Space-themed UI** - Animated starfield with parallax effect and shooting stars
- **Sound effects** - Subtle cosmic sounds on message reception (toggleable)
- **PWA ready** - Installable on mobile devices
- **Rate limiting** - Protection against spam (5 messages per 2 minutes)
- **Report system** - Flag inappropriate content
- **Secure** - Helmet.js security headers, CSP, SQL injection protection

## Tech Stack

| Component | Technology |
|-----------|------------|
| Backend | Node.js + Express |
| Database | SQLite (better-sqlite3) |
| Frontend | Vanilla HTML/CSS/JS |
| Deployment | Docker |

## Quick Start

### With Docker (recommended)

```bash
# Clone the repository
git clone https://github.com/jugue/echo.git
cd echo

# Start the application
docker compose up -d

# Access at http://localhost:3000
```

### Without Docker

```bash
# Install dependencies
npm install

# Create data directory
mkdir -p /data

# Start the server
npm start
```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/message` | Send a new message |
| `POST` | `/api/message/random` | Get a random message (with exclusion list) |
| `POST` | `/api/report` | Report inappropriate content |
| `GET` | `/api/stats` | Get total message count |

### Example: Send a message

```bash
curl -X POST http://localhost:3000/api/message \
  -H "Content-Type: application/json" \
  -d '{"content": "Hello from the void"}'
```

### Example: Receive a message

```bash
curl -X POST http://localhost:3000/api/message/random \
  -H "Content-Type: application/json" \
  -d '{"exclude": []}'
```

## Project Structure

```
echo/
├── server.js           # Express backend
├── public/
│   ├── index.html      # Frontend (HTML + CSS + JS)
│   ├── manifest.json   # PWA manifest
│   ├── sw.js           # Service worker
│   └── icon.svg        # App icon
├── package.json
├── Dockerfile
├── docker-compose.yml
└── README.md
```

## Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3000` | Server port |
| Data directory | `/data` | SQLite database location |

## Security

- **Helmet.js** - Security headers (XSS, clickjacking, MIME sniffing protection)
- **Content Security Policy** - Strict CSP to prevent script injection
- **Rate limiting** - 5 messages per 2 minutes per IP
- **Input validation** - 500 character limit, sanitized inputs
- **Prepared statements** - SQL injection protection
- **Body size limit** - 10KB max request size

## Deployment

Echo runs on port 3000 by default. Use your preferred solution to expose the application (reverse proxy, tunnel, direct exposure, etc.).

For production, consider:
- Running behind a reverse proxy
- Setting `NODE_ENV=production`
- Using a persistent volume for `/data`

## License

This project is licensed under a modified MIT License with the following conditions:

- **Attribution required** - Credit the original author in derivative works
- **Permission required for commercial use** - Contact the author before deploying commercially or publicly

See [LICENSE](LICENSE) for details.

## Author

Created by [@jugue](https://github.com/jugue)

---

*"Somewhere, someone is listening"*
