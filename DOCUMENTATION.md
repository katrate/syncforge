# SyncForge — Complete Project Documentation

**Version:** 0.1.0  
**Repository:** https://github.com/katrate/syncforge  
**License:** MIT

---

## Table of Contents

1. [Introduction](#1-introduction)
2. [Architecture Overview](#2-architecture-overview)
3. [Project Structure](#3-project-structure)
4. [Core Concepts](#4-core-concepts)
5. [Components in Detail](#5-components-in-detail)
   - 5.1 [Sync Server](#51-sync-server)
   - 5.2 [Sync Agent](#52-sync-agent)
   - 5.3 [CLI](#53-cli)
   - 5.4 [Protocol](#54-protocol)
   - 5.5 [Configuration](#55-configuration)
6. [Data Flow](#6-data-flow)
7. [CLI Command Reference](#7-cli-command-reference)
8. [Protocol Reference](#8-protocol-reference)
9. [API Reference](#9-api-reference)
10. [Sync Ignore System](#10-sync-ignore-system)
11. [Conflict Resolution](#11-conflict-resolution)
12. [Security Model](#12-security-model)
13. [Installation](#13-installation)
14. [Usage Guide](#14-usage-guide)
15. [Development Guide](#15-development-guide)
16. [Deployment Guide](#16-deployment-guide)
17. [Update & Uninstall](#17-update--uninstall)
18. [Troubleshooting](#18-troubleshooting)
19. [Future Roadmap](#19-future-roadmap)
20. [Contributing](#20-contributing)

---

## 1. Introduction

### What is SyncForge?

SyncForge is a **real-time project synchronization platform** that allows multiple developers to work on the same project simultaneously from their own computers while keeping every project file synchronized automatically.

### The Problem

Modern collaboration still relies heavily on Git's commit-push-pull-merge cycle. While Git is excellent for version control, it is not optimized for active real-time collaboration. This creates delays, merge conflicts, and friction during active development sessions.

### The Solution

SyncForge creates a **live project environment** where changes appear across all machines in real time. No commits. No pushes. No pulls. No manual synchronization.

Whenever a file changes on one machine, the change is automatically propagated to all connected collaborators. Since tools already watch local files, most applications update automatically without requiring plugins.

### Core Philosophy

SyncForge is **not**:
- A cloud IDE
- A code editor
- A Git replacement
- IDE-specific

SyncForge **is** a synchronization engine. It synchronizes project files. If a tool stores information in files, SyncForge can synchronize it.

---

## 2. Architecture Overview

```
                    ┌─────────────────────────┐
                    │      Sync Server        │
                    │   (WebSocket + HTTP)    │
                    │  Port 4200 (default)    │
                    └───────────┬─────────────┘
                                │
        ┌───────────────────────┼───────────────────────┐
        │                       │                       │
        ▼                       ▼                       ▼
  ┌────────────┐         ┌────────────┐         ┌────────────┐
  │  Agent A   │         │  Agent B   │         │  Agent C   │
  │  (Owner)   │         │  (Dev)     │         │  (Dev)     │
  └─────┬──────┘         └─────┬──────┘         └─────┬──────┘
        │                      │                      │
        ▼                      ▼                      ▼
  ┌────────────┐         ┌────────────┐         ┌────────────┐
  │  Project   │         │  Project   │         │  Project   │
  │  (Local)   │         │  (Local)   │         │  (Local)   │
  └────────────┘         └────────────┘         └────────────┘
```

### Key Architectural Decisions

| Decision | Rationale |
|---|---|
| **Centralized server** | Simple conflict resolution (LWW), easy to manage |
| **Local file copies** | Developers keep their tools, IDE, and workflows |
| **WebSocket** | Persistent, low-latency, bidirectional communication |
| **File-agnostic** | Any file type, any framework, any tool |
| **Last-Write-Wins** | Predictable behavior, no complex merge logic needed for MVP |

### System Components

1. **Sync Server** — Central coordinator (HTTP + WebSocket)
2. **Sync Agent** — Local daemon on each machine
3. **CLI** — User interface for managing sync
4. **File Watcher** — Detects local file changes
5. **Sync Protocol** — Defines how agents communicate

---

## 3. Project Structure

```
syncforge/
│
├── bin/                          # CLI wrapper scripts
│   └── syncforge.js              # Global command wrapper
│
├── scripts/                      # Utility scripts
│   ├── update.mjs                # Self-updater
│   └── uninstall.mjs             # Uninstaller
│
├── src/                          # Source code
│   ├── agent.ts                  # Agent entry point
│   ├── server.ts                 # Server entry point
│   │
│   ├── cli/                      # CLI implementation
│   │   ├── index.ts              # Commander setup
│   │   ├── version.ts            # Version constant
│   │   ├── config-store.ts       # Local credential persistence
│   │   └── commands/             # Individual CLI commands
│   │       ├── init.ts           # syncforge init
│   │       ├── share.ts          # syncforge share
│   │       ├── join.ts           # syncforge join
│   │       ├── start.ts          # syncforge start
│   │       ├── stop.ts           # syncforge stop
│   │       ├── status.ts         # syncforge status
│   │       └── leave.ts          # syncforge leave
│   │
│   ├── protocol/                 # Shared protocol definitions
│   │   ├── events.ts             # File change event types
│   │   └── messages.ts           # WebSocket message envelope
│   │
│   ├── config/                   # Configuration
│   │   └── index.ts              # Environment variable loader
│   │
│   ├── server/                   # Server implementation
│   │   ├── app.ts                # Express HTTP server
│   │   ├── websocket.ts          # WebSocket handler
│   │   ├── room.ts               # Room/connection management
│   │   ├── auth.ts               # JWT authentication
│   │   └── sequencer.ts          # Event sequence numbers
│   │
│   └── agent/                    # Agent implementation
│       ├── watcher.ts            # Chokidar file watcher
│       ├── syncer.ts             # WebSocket sync client
│       ├── updater.ts            # Local file update engine
│       └── ignore.ts             # .syncignore parser
│
├── dist/                         # Compiled JavaScript output
├── node_modules/                 # Dependencies (installed)
│
├── package.json                  # Project metadata & dependencies
├── tsconfig.json                 # TypeScript configuration
├── .syncignore                   # Default ignore patterns
├── .gitignore                    # Git ignore patterns
├── docker-compose.yml            # Infrastructure (Postgres, Redis, MinIO)
├── README.md                     # Quick-start guide
├── DOCUMENTATION.md              # This file
└── LICENSE                       # MIT license
```

---

## 4. Core Concepts

### Project

A **project** is the unit of collaboration in SyncForge. Each project has:
- A unique alphanumeric ID (8 characters)
- A human-readable name
- An owner (creator)
- A set of members (collaborators)
- A project room on the server

### Room

A **room** is a server-side construct that groups all WebSocket connections belonging to one project. When an event is broadcast, it goes to all members of a room.

### Event

An **event** represents a file system change. Events have:
- A type (create, modify, delete, rename, move)
- A file path (relative to project root)
- Optional content (base64-encoded for create/modify)
- A sequence number (assigned by server)
- A sender ID (who made the change)

### Agent

An **agent** is the local process running on each developer's machine. The agent:
- Watches the project directory for changes
- Sends detected changes to the server
- Receives remote changes from the server
- Applies remote changes to local files

### Sequence Number

Each event is assigned a **monotonically increasing sequence number** by the server. These numbers establish total ordering of events within a project. The event with the highest sequence number for any given file is considered authoritative (Last-Write-Wins).

---

## 5. Components in Detail

### 5.1 Sync Server

The sync server is the central coordinator. It consists of:

#### HTTP API (`src/server/app.ts`)

| Method | Endpoint | Description |
|---|---|---|
| GET | `/health` | Health check |
| POST | `/api/projects` | Create a new project |
| POST | `/api/projects/join` | Join an existing project via invite token |
| GET | `/api/projects/:id` | Get project info and members |
| GET | `/api/projects/owner/:ownerId` | List owner's projects |

#### WebSocket Server (`src/server/websocket.ts`)

The WebSocket handler manages:
- Authentication (JWT token verification)
- Message routing (auth, file_change, ping/pong)
- Connection lifecycle (connect, disconnect, error)

#### Room Manager (`src/server/room.ts`)

The room manager:
- Creates and destroys project rooms
- Tracks room members (userId → WebSocket map)
- Broadcasts events to all room members (with optional exclusion)
- Integrates with the sequencer for event ordering

#### Auth (`src/server/auth.ts`)

Authentication uses JWT:
- **Session tokens**: 7-day expiry, used for WebSocket connections
- **Invite tokens**: 24-hour expiry, used for sharing project access
- **Token verification**: Decodes and validates tokens

#### Sequencer (`src/server/sequencer.ts`)

The sequencer:
- Assigns sequence numbers to events
- Tracks the last event per file path
- Implements Last-Write-Wins conflict resolution

---

### 5.2 Sync Agent

The sync agent runs locally on each machine.

#### File Watcher (`src/agent/watcher.ts`)

Uses Chokidar for cross-platform file watching:
- Detects: create, modify, delete, rename operations
- Debounces rapid events (editor auto-saves)
- Integrates with .syncignore patterns
- Configurable depth (default: 99 levels)

Key design decisions:
- **Debounce**: 100ms default, prevents duplicate events from save operations
- **Ignore filtering**: Applied both in chokidar's `ignored` option and after event emission
- **Cross-platform**: Works on Windows, macOS, and Linux

#### Sync Client (`src/agent/syncer.ts`)

Manages the WebSocket connection to the server:
- Authentication handshake
- Event sending (file changes)
- Event receiving (remote changes)
- Automatic reconnection with exponential backoff
- Heartbeat pings (every 25 seconds)

Reconnection strategy:
- Initial delay: 2 seconds
- Exponential backoff: 2s → 4s → 8s → 16s → cap at 30s
- Max attempts: 10 (configurable)

#### Local Update Engine (`src/agent/updater.ts`)

Applies remote events to local files:
- Write (create/modify): Creates directories as needed, writes base64-decoded content
- Delete: Removes files, ignores ENOENT errors
- Rename/Move: Atomically renames files
- Batch apply: Processes multiple events sequentially
- Snapshot apply: Downloads full project state when joining

#### Ignore Parser (`src/agent/ignore.ts`)

Parses .syncignore files:
- Supports glob patterns (via minimatch)
- Comment lines (starting with `#`)
- Negation patterns (prefixed with `!`)
- Two file sources: `.syncignore` (shared) and `.syncignore.local` (local-only)

---

### 5.3 CLI

The CLI is built with Commander and provides 7 commands:

| Command | File | Description |
|---|---|---|
| `init` | `init.ts` | Create project on server, save credentials |
| `share` | `share.ts` | Display invite link and members |
| `join` | `join.ts` | Join existing project via ID/token |
| `start` | `start.ts` | Start file watching + sync connection |
| `stop` | `stop.ts` | Display stop instructions |
| `status` | `status.ts` | Show project and connection status |
| `leave` | `leave.ts` | Clear local credentials, leave project |

#### Config Store (`config-store.ts`)

Persists agent configuration to `~/.syncforge.json`:
- `projectId` — Active project
- `userId` — Local user identifier
- `sessionToken` — JWT for authentication
- `serverUrl` — WebSocket server URL
- `projectDir` — Directory being synchronized

---

### 5.4 Protocol

The protocol defines all communication between agents and the server.

#### Message Envelope (`src/protocol/messages.ts`)

Every WebSocket message has the structure:
```typescript
{
  type: MessageType;    // Message identifier
  payload: T;           // Type-specific payload
  timestamp: string;    // ISO-8601 timestamp
}
```

#### Message Types

| Type | Direction | Payload | Description |
|---|---|---|---|
| `auth` | Agent→Server | `AuthPayload` | Authentication request |
| `auth_ok` | Server→Agent | `AuthOkPayload` | Authentication success |
| `auth_error` | Server→Agent | `AuthErrorPayload` | Authentication failure |
| `file_change` | Both | `FileChangePayload` | File system event |
| `file_batch` | Both | `FileBatchPayload` | Batch of file events |
| `ping` | Agent→Server | `PingPayload` | Heartbeat |
| `pong` | Server→Agent | `PongPayload` | Heartbeat response |
| `presence` | Server→Agent | `PresencePayload` | Join/leave notification |
| `error` | Server→Agent | `ErrorPayload` | Error notification |
| `project_snapshot` | Server→Agent | `ProjectSnapshotPayload` | Full project state |
| `ack` | Server→Agent | `AckPayload` | Event acknowledgment |

#### File Events (`src/protocol/events.ts`)

```typescript
interface FileEvent {
  id: string;           // Unique event identifier
  projectId: string;    // Project this belongs to
  senderId: string;     // Who originated this change
  changeType: ChangeType; // create | modify | delete | rename | move
  path: string;         // Relative file path
  oldPath?: string;     // Previous path (rename/move)
  content?: string;     // Base64-encoded content (create/modify)
  mode?: number;        // File permissions
  sequence: number;     // Server-assigned ordering
  timestamp: string;    // When the event was generated
}
```

---

### 5.5 Configuration

Configuration is loaded from environment variables:

| Variable | Default | Description |
|---|---|---|
| `SYNCFORGE_PORT` | `4200` | Server HTTP/WebSocket port |
| `SYNCFORGE_HOST` | `0.0.0.0` | Server bind address |
| `SYNCFORGE_PROJECT_DIR` | `cwd` | Project directory to watch |
| `SYNCFORGE_JWT_SECRET` | Dev-only default | JWT signing secret |
| `SYNCFORGE_WS_RECONNECT_MS` | `2000` | Initial reconnect delay |
| `SYNCFORGE_WS_MAX_RECONNECT` | `10` | Max reconnection attempts |
| `SYNCFORGE_WATCH_DEBOUNCE_MS` | `100` | File watcher debounce interval |
| `SYNCFORGE_STORAGE_DIR` | `./syncforge_data` | Server storage directory |
| `SYNCFORGE_API_URL` | `http://localhost:4200` | Server HTTP URL (for CLI) |

---

## 6. Data Flow

### File Change → All Collaborators

```
┌──────────┐     ┌──────────┐     ┌──────────┐     ┌──────────┐     ┌──────────┐
│ Developer │     │  File    │     │  Sync    │     │  Sync    │     │ Other    │
│  Edits    │────▶│ Watcher  │────▶│  Agent   │────▶│  Server  │────▶│ Agents   │
│  File     │     │Detects   │     │Sends     │     │Broadcasts│     │ Receive  │
└──────────┘     └──────────┘     └──────────┘     └──────────┘     └──────────┘
                                                      │
                                                      ▼
                                               ┌──────────────┐
                                               │  Sequencer   │
                                               │ (Assigns seq │
                                               │  number)     │
                                               └──────────────┘


┌──────────┐     ┌──────────┐     ┌──────────┐
│  Other   │     │  Agent   │     │  Local   │
│  Agents  │────▶│ Applies  │────▶│  File    │────▶ Dev tools detect change
│ Receive  │     │  Change  │     │ Updated  │      & hot-reload
└──────────┘     └──────────┘     └──────────┘
```

### Step-by-step:

1. **Developer A** edits `src/auth.js`
2. **File Watcher** detects the modification (via chokidar)
3. **Watcher** debounces (100ms) to avoid duplicates
4. **Watcher** emits a `WatchEvent` to its callback
5. **Sync Client** reads the file content, encodes as base64
6. **Sync Client** sends a `file_change` message over WebSocket
7. **Sync Server** receives the message in its WebSocket handler
8. **Room Manager** assigns a sequence number via the Sequencer
9. **Room Manager** broadcasts the event to all room members (except sender)
10. **Other Agents** receive the `file_change` message
11. **Local Update Engine** decodes base64 and writes the file
12. **Local tools** (dev server, IDE) detect the file change automatically

---

## 7. CLI Command Reference

### `syncforge init`

Initialize a new project.

```
Usage: syncforge init [options]

Options:
  -n, --name <name>  Project name (default: current directory name)

Example:
  syncforge init --name "my-web-app"
```

What happens:
1. Generates a local user ID
2. Sends a POST request to the server to create the project
3. Receives a project ID, session token, and invite token
4. Saves these to `~/.syncforge.json`
5. Displays the project ID and invite token

---

### `syncforge share`

Display invite information for the current project.

```
Usage: syncforge share

Example:
  syncforge share
```

What happens:
1. Reads local config to find the current project
2. Fetches project info from the server
3. Displays the project ID and invite link
4. Lists current project members

---

### `syncforge join`

Join an existing project.

```
Usage: syncforge join <project-id-or-token> [options]

Options:
  -t, --token <token>  Invite token (if different from first argument)

Example:
  syncforge join abc12345
  syncforge join <invite-token>
```

What happens:
1. Generates a local user ID
2. Sends a POST request to validate the invite
3. Receives project info and a session token
4. Saves these to `~/.syncforge.json`

---

### `syncforge start`

Start file synchronization.

```
Usage: syncforge start [options]

Options:
  --server  Also start the sync server locally

Example:
  syncforge start
  syncforge start --server
```

What happens:
1. Loads local config
2. Optionally starts the sync server (if `--server`)
3. Loads .syncignore patterns
4. Starts the file watcher (chokidar)
5. Connects to the sync server via WebSocket
6. Begins sending local changes and receiving remote changes
7. Runs until interrupted (Ctrl+C)

---

### `syncforge status`

Show current synchronization status.

```
Usage: syncforge status

Example:
  syncforge status
```

What happens:
1. Reads local config
2. If connected to a project, displays project info and members
3. If not connected, displays guidance on next steps

---

### `syncforge leave`

Leave the current project.

```
Usage: syncforge leave

Example:
  syncforge leave
```

What happens:
1. Reads local config
2. Removes `~/.syncforge.json`
3. Does NOT delete any project files (they stay on disk)

---

### `syncforge stop`

Stop synchronization.

```
Usage: syncforge stop

Example:
  syncforge stop
```

Note: Since the agent runs as a foreground process, use Ctrl+C in the terminal where `syncforge start` is running.

---

## 8. Protocol Reference

For complete details, see `src/protocol/messages.ts` and `src/protocol/events.ts`.

### WebSocket Connection

1. Agent connects to `ws://<server>:<port>/ws`
2. Agent sends an `auth` message with its session token
3. Server validates the token and responds with `auth_ok`
4. Agent begins sending/receiving file change events
5. Agent sends `ping` every 25 seconds; server responds with `pong`

### Authentication Flow

```
Agent                          Server
  │                              │
  │──── auth(token,projectId) ──▶│
  │                              │── verify JWT
  │                              │── check project exists
  │                              │── add to room
  │◀── auth_ok(sessionId) ──────│
  │                              │
```

### File Change Flow

```
Agent A                       Server                    Agent B
  │                              │                         │
  │──── file_change(event) ────▶│                         │
  │                              │── assign sequence #    │
  │◀── ack(eventId, seq) ──────│                         │
  │                              │── broadcast to room    │
  │                              │──── file_change(event) ──▶│
  │                              │                         │── apply to local FS
```

---

## 9. API Reference

### POST `/api/projects`

Create a new project.

**Request:**
```json
{
  "name": "my-project",
  "ownerId": "user_abc123",
  "ownerName": "Alice"
}
```

**Response (201):**
```json
{
  "projectId": "x7k3m9pq",
  "name": "my-project",
  "sessionToken": "eyJhbG...",
  "inviteToken": "eyJhbG..."
}
```

---

### POST `/api/projects/join`

Join a project via invite token.

**Request:**
```json
{
  "inviteToken": "eyJhbG...",
  "userId": "user_def456",
  "userName": "Bob"
}
```

**Response (200):**
```json
{
  "projectId": "x7k3m9pq",
  "name": "my-project",
  "ownerId": "user_abc123",
  "sessionToken": "eyJhbG..."
}
```

---

### GET `/api/projects/:id`

Get project details and current members.

**Response:**
```json
{
  "id": "x7k3m9pq",
  "name": "my-project",
  "ownerId": "user_abc123",
  "createdAt": "2026-01-15T10:30:00.000Z",
  "members": [
    { "userId": "user_abc123", "displayName": "Alice" },
    { "userId": "user_def456", "displayName": "Bob" }
  ]
}
```

---

### GET `/health`

Health check endpoint.

**Response:**
```json
{
  "status": "ok",
  "uptime": 3600.42
}
```

---

## 10. Sync Ignore System

Not every file should be synchronized. SyncForge uses two ignore files:

### `.syncignore` (Shared)

This file is shared with all collaborators. It defines project-wide exclusions.

Location: Project root (`.syncignore`)

**Default patterns:**
```
# Dependencies
node_modules/
vendor/

# Build output
dist/
build/
.next/

# Environment files
.env
.env.*
secrets.json
*.key

# IDE files
.vscode/
.idea/

# OS files
.DS_Store
Thumbs.db

# Temporary files
.cache/
tmp/
*.log

# Git
.git/

# SyncForge
.syncignore
.syncignore.local
```

### `.syncignore.local` (Local-Only)

This file is never shared. It defines machine-specific exclusions.

Location: Project root (`.syncignore.local`)

**Example uses:**
```
debug.log
local-test-data.json
personal-notes.txt
secrets/local.env
```

### Pattern Format

| Pattern | Meaning |
|---|---|
| `node_modules/` | Ignore directory and all contents |
| `*.log` | Ignore all .log files |
| `build/` | Ignore build directory |
| `!important.log` | Do NOT ignore important.log (negation) |
| `# comment` | Comment line (ignored) |

---

## 11. Conflict Resolution

### Last-Write-Wins (LWW)

SyncForge uses **Last-Write-Wins** for conflict resolution:

```
Developer A edits:  config.json  →  Sequence 104
Developer B edits:  config.json  →  Sequence 105

Result: Sequence 105 (Developer B's change) is authoritative.
```

**How it works:**
1. Every event is assigned a sequence number by the server
2. Sequence numbers are monotonically increasing per project
3. When two events affect the same file, the one with the higher sequence number wins
4. If sequence numbers are equal, the later timestamp wins

**Why LWW?**
- Simple and predictable
- No locking required
- No merge engine needed
- No CRDT complexity
- Sufficient for MVP development
- Can be upgraded to more sophisticated strategies later

---

## 12. Security Model

### Authentication

1. **Project access requires invitation**
2. Only authorized users can join, send, or receive updates
3. Authentication uses JWT (JSON Web Tokens)

### Token Types

| Token | Purpose | Expiry |
|---|---|---|
| Session token | WebSocket authentication | 7 days |
| Invite token | Sharing project access | 24 hours |

### Future Security Features

- GitHub authentication
- Google authentication
- End-to-end encryption
- Organization workspaces
- Role-based permissions (Owner, Admin, Editor, Viewer)

---

## 13. Installation

### Prerequisites

- **Node.js** 18.0 or later
- **npm** 9.0 or later

### Option 1: Clone and Install

```bash
git clone https://github.com/katrate/syncforge.git
cd syncforge
npm install
npm run build
```

### Option 2: Global Install (Future)

```bash
npm install -g syncforge
```

### Option 3: Docker Infrastructure

For the database-backed deployment:

```bash
docker compose up -d
```

This starts:
- **PostgreSQL** 16 on port 5432
- **Redis** 7 on port 6379
- **MinIO** on ports 9000 (API) and 9001 (Console)

---

## 14. Usage Guide

### Starting a Collaboration Session

**Step 1: Start the server** (one person)

```bash
cd syncforge
npm run server
```

Or start the server as part of the agent:
```bash
npm run dev -- start --server
```

**Step 2: Create a project** (project owner)

```bash
cd /path/to/your/project
npm run dev -- init --name "my-app"
```

This outputs:
```
✔ Project "my-app" created!

  Project ID:   x7k3m9pq
  Invite Token: eyJhbGciOiJIUzI1NiIs...

Share the invite token with collaborators:
  syncforge share

To start syncing:
  syncforge start
```

**Step 3: Share the project**

```bash
npm run dev -- share
```

**Step 4: Join the project** (collaborators)

```bash
cd /path/to/local/project
npm run dev -- join x7k3m9pq
```

**Step 5: Start syncing** (everyone)

```bash
npm run dev -- start
```

Now any file change on any machine is instantly synchronized!

### Stopping Synchronization

Press `Ctrl+C` in the terminal where `syncforge start` is running.

---

## 15. Development Guide

### Setup

```bash
git clone https://github.com/katrate/syncforge.git
cd syncforge
npm install
```

### Development Commands

```bash
npm run build       # Compile TypeScript to JavaScript
npm run typecheck   # Type-check without emitting files
npm run dev         # Run the CLI in development mode
npm run server      # Run the server in development mode
npm run clean       # Remove dist/
```

### TypeScript Configuration

See `tsconfig.json`:

- **Target:** ES2022
- **Module:** ESNext (native ESM)
- **Strict mode:** Enabled
- **Module resolution:** Bundler
- **Output:** `dist/`

### Testing

```bash
# Run typecheck (static analysis)
npm run typecheck

# Build and run
npm run build && node dist/agent.js status
```

### Project Conventions

- **Code style:** TypeScript with strict mode
- **Module system:** ES modules (import/export)
- **Error handling:** try/catch with typed errors
- **Async:** async/await throughout
- **Naming:** camelCase for functions/variables, PascalCase for classes/types

---

## 16. Deployment Guide

### Development Deployment

```bash
# Start the server
SYNCFORGE_PORT=4200 npm run server

# In another terminal, start the agent
npm run dev -- init --name "my-app"
npm run dev -- start
```

### Production Deployment

For production, you'll want to:

1. **Build the project:**
   ```bash
   npm run build
   ```

2. **Set environment variables:**
   ```bash
   export SYNCFORGE_PORT=4200
   export SYNCFORGE_HOST=0.0.0.0
   export SYNCFORGE_JWT_SECRET="your-strong-secret-here"
   ```

3. **Run the server:**
   ```bash
   node dist/server.js
   ```

4. **Set up infrastructure (optional):**
   ```bash
   docker compose up -d postgres redis minio
   ```

### Infrastructure

| Service | Purpose | Port |
|---|---|---|
| PostgreSQL | User data, projects, sessions | 5432 |
| Redis | Active connections, presence, caching | 6379 |
| MinIO | Project snapshots, file storage | 9000/9001 |

---

## 17. Update & Uninstall

### Updating

SyncForge includes a built-in updater script:

```bash
# Check for updates
node scripts/update.mjs --check

# Update (interactive)
node scripts/update.mjs

# Force reinstall
node scripts/update.mjs --force
```

The updater:
1. Checks GitHub API for the latest release
2. Compares versions using semver
3. Downloads and extracts the latest release
4. Replaces source files (preserving config)
5. Reinstalls dependencies
6. Rebuilds the project

### Uninstalling

```bash
# Check what would be removed
node scripts/uninstall.mjs --check

# Uninstall (interactive)
node scripts/uninstall.mjs

# Force uninstall (non-interactive)
node scripts/uninstall.mjs --force
```

The uninstaller:
1. Detects SyncForge installations (local, global npm, config files)
2. Lists all artifacts that will be removed
3. Removes: `node_modules/`, `dist/`, `syncforge_data/`, `~/.syncforge.json`
4. Preserves: `src/` source files, project configuration
5. Unlinks global CLI command if installed globally

---

## 18. Troubleshooting

### Connection Issues

| Symptom | Likely Cause | Solution |
|---|---|---|
| "Connection refused" | Server not running | Start the server: `npm run server` |
| "Invalid token" | Token expired | Run `syncforge init` again to get new tokens |
| "Project not found" | Wrong project ID | Check the project ID with `syncforge status` |
| WebSocket disconnects | Network issue | Agent auto-reconnects with backoff |

### File Sync Issues

| Symptom | Likely Cause | Solution |
|---|---|---|
| Files not syncing | .syncignore blocking | Check `.syncignore` patterns |
| Changes not appearing | Agent not running | Run `syncforge start` |
| Files constantly re-syncing | Binary files in watcher | Add `*.bin` to `.syncignore` |
| Permission errors | File access rights | Check file permissions |

### Common Errors

**"No project found"**
→ Run `syncforge init` or `syncforge join <id>` first.

**"Server unreachable"**
→ Ensure the sync server is running and accessible.

**"Failed to parse message"**
→ WebSocket message was corrupted; agent will retry.

---

## 19. Future Roadmap

### Short-term

- [ ] Project snapshot download on join
- [ ] Proper `syncforge stop` with PID file management
- [ ] Filtered .syncignore.local from sync
- [ ] Unit tests for core components
- [ ] CI/CD pipeline

### Medium-term

- [ ] **Presence indicators** — "Rahul is editing: src/auth.js"
- [ ] **Activity feed** — Timeline of changes with timestamps
- [ ] **Project snapshots** — Restore previous project states
- [ ] **Offline synchronization** — Queue changes, apply on reconnect
- [ ] **End-to-end encryption** — Encrypted project synchronization

### Long-term

- [ ] **Git integration** — Automatic commits and snapshot creation
- [ ] **Team permissions** — Owner, Admin, Editor, Viewer roles
- [ ] **GitHub authentication**
- [ ] **Google authentication**
- [ ] **Organization workspaces**
- [ ] **Performance benchmarks** — Target: <200ms sync latency
- [ ] **Native binaries** — Compile with Bun/Node.js bundler

---

## 20. Contributing

### How to Contribute

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/my-feature`
3. Make your changes
4. Run typecheck: `npm run typecheck`
5. Build: `npm run build`
6. Commit and push
7. Open a Pull Request

### Code Style

- TypeScript with strict mode
- ES modules (import/export)
- Clear JSDoc comments for public APIs
- Error messages that explain the problem and solution

### Development Setup

```bash
git clone https://github.com/katrate/syncforge.git
cd syncforge
npm install
npm run build
```

---

## Quick Reference Card

```
┌──────────────────────────────────────────────────────────┐
│                   SyncForge Quick Reference              │
├──────────────────────────────────────────────────────────┤
│                                                          │
│  📦 Install         npm install && npm run build         │
│  🚀 Start Server    npm run server                       │
│  📋 Init Project    npm run dev -- init --name "app"     │
│  🔗 Share           npm run dev -- share                 │
│  👋 Join            npm run dev -- join <project-id>     │
│  🔄 Start Sync      npm run dev -- start                 │
│  ⏹ Stop Sync       Ctrl+C                               │
│  ℹ️ Status          npm run dev -- status                │
│  🚪 Leave           npm run dev -- leave                 │
│  🔄 Update          node scripts/update.mjs              │
│  🗑 Uninstall       node scripts/uninstall.mjs           │
│                                                          │
│  📁 Config file     ~/.syncforge.json                    │
│  📁 Ignore file     .syncignore / .syncignore.local     │
│  🖥 Server port     4200 (default)                       │
│  🔌 WebSocket      ws://localhost:4200                   │
│                                                          │
└──────────────────────────────────────────────────────────┘
```

---

*SyncForge v0.1.0 — Real-time collaboration for local development projects.*  
*Git manages history. SyncForge manages live collaboration.*
