# SyncForge

**Real-time collaboration for local development projects.**

Git manages history. SyncForge manages live collaboration.

## What is SyncForge?

SyncForge is a real-time project synchronization platform that allows multiple developers to work on the same project simultaneously from their own computers while keeping every project file synchronized automatically.

Unlike cloud IDEs, remote desktops, or screen sharing tools, every collaborator has a complete local copy of the project. Developers continue using their preferred tools, frameworks, and workflows.

Whenever a file changes on one machine, the change is automatically propagated to all connected collaborators.

## Quick Start

### 1. Start the server

```bash
# Start the sync server (requires Node.js 18+)
npx tsx src/server.ts

# Or with Docker for the infrastructure stack
docker compose up -d
SYNCFORGE_PORT=4200 npx tsx src/server.ts
```

### 2. Create a project

```bash
# In your project directory
npx tsx src/agent.ts init --name "my-app"
```

This creates a project on the sync server and returns an invite token.

### 3. Share with collaborators

```bash
syncforge share
```

### 4. Join a project

```bash
# On a collaborator's machine
syncforge join <project-id>
```

### 5. Start syncing

```bash
# On each machine (including the owner)
syncforge start
```

Now any file change on any machine is instantly propagated to all collaborators.

## CLI Commands

| Command | Description |
|---|---|
| `syncforge init` | Create a new project |
| `syncforge share` | Generate an invite link |
| `syncforge join <id>` | Join an existing project |
| `syncforge start` | Begin file synchronization |
| `syncforge status` | Show project and sync status |
| `syncforge stop` | Stop synchronization (Ctrl+C) |
| `syncforge leave` | Leave the current project |

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
  │  Agent A │        │  Agent B │        │  Agent C │
  │ (Owner)  │        │ (Dev)    │        │ (Dev)    │
  └────┬─────┘        └────┬─────┘        └────┬─────┘
       │                   │                   │
       ▼                   ▼                   ▼
  ┌──────────┐        ┌──────────┐        ┌──────────┐
  │ Project  │        │ Project  │        │ Project  │
  │ (Local)  │        │ (Local)  │        │ (Local)  │
  └──────────┘        └──────────┘        └──────────┘
```

Every user owns a complete local copy. The server coordinates synchronization.

## Sync Ignore

Create a `.syncignore` file (shared) or `.syncignore.local` (local-only) to exclude files from synchronization:

```
# .syncignore
node_modules/
dist/
.env
.DS_Store
```

## Conflict Resolution

**Last Write Wins (LWW)** — the most recent change to a file is authoritative. Simple, predictable, and sufficient for MVP.

## Tech Stack

- **Runtime:** Node.js / TypeScript
- **Real-time:** WebSocket (`ws`)
- **CLI:** Commander + Chalk + Ora
- **File Watching:** Chokidar
- **HTTP:** Express

## Development

```bash
# Install dependencies
npm install

# Typecheck
npm run typecheck

# Build
npm run build

# Run server
npm run server

# Run CLI
npm run dev init
```

## Future Features

- Presence indicators (who's editing what)
- Activity feed
- Project snapshots
- Offline sync queue
- End-to-end encryption
- Git integration
- Team permissions
