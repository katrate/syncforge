# SyncForge

**Real-time collaboration for local development projects.**

Git manages history. SyncForge manages live collaboration.

[![Release](https://img.shields.io/github/v/release/katrate/syncforge)](https://github.com/katrate/syncforge/releases)
[![License](https://img.shields.io/github/license/katrate/syncforge)](LICENSE)
[![Platform](https://img.shields.io/badge/platform-macOS%20%7C%20Linux%20%7C%20Windows-blue)](https://github.com/katrate/syncforge)

---

## ⚡ Quick Install

### macOS / Linux
```bash
curl -fsSL https://raw.githubusercontent.com/katrate/syncforge/master/scripts/install.sh | bash
```

### Windows (PowerShell)
```powershell
powershell -c "irm https://raw.githubusercontent.com/katrate/syncforge/master/scripts/install.ps1 | iex"
```

### Any OS (manual)
```bash
git clone https://github.com/katrate/syncforge.git
cd syncforge
npm install
npm run build
```

---

## What is SyncForge?

SyncForge is a real-time project synchronization platform that allows multiple developers to work on the same project simultaneously from their own computers while keeping every project file synchronized automatically.

Unlike cloud IDEs, remote desktops, or screen sharing tools, every collaborator has a complete local copy of the project. Developers continue using their preferred tools, frameworks, and workflows.

Whenever a file changes on one machine, the change is automatically propagated to all connected collaborators.

---

## Quick Start

### 1. Start the server

```bash
# One person runs the server
syncforge server
```

### 2. Create a project

```bash
# In your project directory (the owner does this)
syncforge init --name "my-app"
```

This creates a project, auto-starts the server if not running, and begins syncing.

### 3. Share with collaborators

```bash
syncforge share
```

### 4. Join the project (collaborator)

```bash
# On a collaborator's machine (replace IP with the server's address)
syncforge join <project-id> --server http://192.168.1.5:4200
```

The --server flag saves the URL to config — only needed once.

### 5. Start syncing

```bash
# init and join auto-start syncing — no extra command needed
```

After init/join, sync starts automatically. Any file change on any machine is instantly synced to everyone. Press Ctrl+C to stop.

---

## CLI Commands

| Command | Description |
|---|---|
| `syncforge server`  | Start the sync server (auto-started by init if needed) |
| `syncforge init`    | Create a project (auto-starts server + sync) |
| `syncforge share`   | Share invite link with collaborators |
| `syncforge join <id>` | Join a project (auto-starts sync) |
| `syncforge start`   | Begin file synchronization |
| `syncforge status`  | Show project and sync status |
| `syncforge stop`    | Stop synchronization (Ctrl+C) |
| `syncforge leave`   | Leave the current project |
| `syncforge update`  | Check for updates |
| `syncforge uninstall` | Remove SyncForge |

---

## Architecture

```
                  ┌─────────────────────┐
                  │    Sync Server      │
                  │  (WebSocket + HTTP) │
                  └──────────┬──────────┘
                             │
        ┌────────────────────┼────────────────────┐
        │                    │                    │
        ▼                    ▼                    ▼
  ┌──────────┐        ┌──────────┐        ┌──────────┐
  │  Agent   │        │  Agent   │        │  Agent   │
  │ (macOS)  │        │ (Linux)  │        │ (Windows)│
  └────┬─────┘        └────┬─────┘        └────┬─────┘
       │                   │                   │
       ▼                   ▼                   ▼
  ┌──────────┐        ┌──────────┐        ┌──────────┐
  │ Project  │        │ Project  │        │ Project  │
  │ (Local)  │        │ (Local)  │        │ (Local)  │
  └──────────┘        └──────────┘        └──────────┘
```

Every user owns a complete local copy. The server coordinates synchronization.

---

## Cross-Platform Support

SyncForge runs on **macOS, Linux, and Windows** because it's built on:

| Component | Technology | macOS | Linux | Windows |
|---|---|---|---|---|
| Runtime | Node.js 18+ | ✅ | ✅ | ✅ |
| File Watching | Chokidar | ✅ | ✅ | ✅ |
| WebSocket | ws | ✅ | ✅ | ✅ |
| CLI | Commander | ✅ | ✅ | ✅ |
| Install script | bash | ✅ | ✅ | — |
| Install script | PowerShell | — | — | ✅ |
| Installation | npm | ✅ | ✅ | ✅ |
| Dev server | Hot-reload | ✅ | ✅ | ✅ |

### Platform-Specific Notes

**macOS:**
- File watching uses `fsevents` (native macOS API) — ultra low latency
- `.syncignore` can include `*.DS_Store`
- Run `brew install node` if Node.js is missing

**Linux:**
- File watching uses `inotify` (kernel-level)
- Works on all distros (Ubuntu, Fedora, Arch, etc.)
- Run `sudo apt install nodejs npm` if needed

**Windows:**
- File watching uses `ReadDirectoryChangesW` (native Windows API)
- `.syncignore` can include `Thumbs.db`
- **Restart your terminal** after global install if `syncforge` isn't recognized
- If still not found, add `%APPDATA%\npm` to your PATH manually

---

## Sync Ignore

Create a `.syncignore` file (shared) or `.syncignore.local` (local-only) to exclude files from sync:

```
# .syncignore
node_modules/
dist/
.env
.DS_Store
Thumbs.db
```

---

## Project Structure

```
syncforge/
├── bin/            # CLI wrapper for global install
├── scripts/        # Install / update / uninstall scripts
├── src/
│   ├── cli/        # Commands: init, share, join, start, stop, status, leave
│   ├── server/     # HTTP + WebSocket server
│   ├── agent/      # File watcher, sync client, updater
│   ├── protocol/   # Message types, event types
│   └── config/     # Environment variable loader
├── docker-compose.yml
├── DOCUMENTATION.md
└── README.md
```

---

## Development

```bash
# Install
npm install

# Typecheck
npm run typecheck

# Build
npm run build

# Run server
syncforge server

# Run CLI
syncforge init --name "my-project"
syncforge start

# Update
syncforge update

# Uninstall
syncforge uninstall
```

---

## Tech Stack

- **Runtime:** Node.js / TypeScript (cross-platform)
- **Real-time:** WebSocket (`ws`)
- **CLI:** Commander + Chalk + Ora
- **File Watching:** Chokidar (fsevents / inotify / ReadDirectoryChangesW)
- **HTTP:** Express

---

## Documentation

See **[DOCUMENTATION.md](DOCUMENTATION.md)** for the full reference:
- Architecture deep-dive
- Protocol specification
- API reference
- Security model
- Troubleshooting guide
- Complete project docs

---

## License

[MIT](LICENSE)
