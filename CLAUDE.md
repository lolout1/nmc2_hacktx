# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

Start development server:
```bash
yarn dev
```

Production build and start:
```bash
yarn build
yarn start
```

Code quality:
```bash
yarn lint
```

## Application Architecture

Monaco is a Formula 1 live timing dashboard with dual-mode operation:

### Core Structure
- **Frontend**: Next.js React app with styled-components
- **Backend**: Custom Node.js server (server.js) with WebSocket support
- **Data Sources**:
  - Live: Formula 1 Live Timing API via SignalR WebSocket
  - Historical: Internal API endpoints for session replay

### Operational Modes

**Live Mode**:
- Connects to F1's live timing stream via SignalR WebSocket
- Real-time data processing and state management
- Automatic reconnection with retry logic

**Replay Mode**:
- Historical session data from 2018+ via `/api/sessions/` endpoints
- Timeline-based playback engine with interpolation
- Smart caching (memory + localStorage) with LRU eviction
- Playback controls (play/pause/seek/speed)

### Key Components

**Server (server.js)**:
- Dual-mode WebSocket server supporting live/replay clients
- Client mode tracking via WeakMap
- SignalR connection management with negotiation/retry
- Compressed data handling (zlib inflation)

**Main App (pages/index.js)**:
- Mode state management (live/browser/replay)
- WebSocket client initialization and message handling
- Replay engine integration with ReplayEngine class
- Progress tracking and playback controls

**Replay System**:
- `utils/replayEngine.js`: Timeline construction and playback state
- `utils/sessionCache.js`: Dual-layer caching with size limits
- `utils/apiClient.js`: Fetch wrapper with retry/timeout logic
- `components/PlaybackControls.js`: Fixed bottom bar UI
- `components/SessionBrowser.js`: Historical session selection

**Data Components**:
- `components/Driver.js`: Individual driver timing display
- `components/Map.js`: Live track map with driver positions
- `components/Radio.js`: Team radio message playback

### Data Processing

**Live Data Flow**:
1. SignalR WebSocket connection with F1 API
2. Compressed data decompression (CarData.z, Position.z)
3. Deep object merging for state updates
4. Real-time UI updates via WebSocket to clients

**Replay Data Flow**:
1. API fetch from `/api/sessions/data` with retry logic
2. Timeline construction from historical snapshots
3. Position interpolation for smooth playback
4. Local state management via ReplayEngine

### Configuration

The app uses CSS custom properties for theming and spacing defined in `pages/_app.js`. Component styling follows a monospace, minimal design system with responsive breakpoints.

### API Endpoints

- `/api/sessions/list`: Available sessions by year
- `/api/sessions/data`: Full session data with compression support
- `/api/map.js`: Circuit track map data

Node.js version requirement: >=18.0.0 (specified in package.json engines)