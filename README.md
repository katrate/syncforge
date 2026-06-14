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
npx tsx src/server.ts
```

### 2. Create a project

```bash
# In your project directory (the owner does this)
npm run dev -- init --name "my-app"
```

This creates a project and returns an invite token.

### 3. Share with collaborators

```bash
npm run dev -- share
```

### 4. Join the project

```bash
# On a collaborator's machine
npm run dev -- join <project-id>
```

### 5. Start syncing

```bash
# On every machine (owner + collaborators)
npm run dev -- start
```

Now any file change on any machine is instantly synced to everyone.

---

## CLI Commands

| Command | Description |
|---|---|
| `syncforge init` | Create a new project |
| `syncforge share` | Share invite link with collaborators |
| `syncforge join <id>` | Join an existing project |
| `syncforge start` | Begin file synchronization |
| `syncforge status` | Show project and sync status |
| `syncforge stop` | Stop synchronization (Ctrl+C) |
| `syncforge leave` | Leave the current project |

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

**Linux:**
- File watching uses `inotify` (kernel-level)
- Works on all distros (Ubuntu, Fedora, Arch, etc.)

**Windows:**
- File watching uses `ReadDirectoryChangesW` (native Windows API)
- `.syncignore` can include `Thumbs.db`
- Run PowerShell as Administrator if you want global `syncforge` command
- Use Git Bash or WSL for bash-style workflows

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
npm run server

# Run CLI
npm run dev -- init --name "my-project"
npm run dev -- start

# Update
npm run update

# Uninstall
npm run uninstall
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
