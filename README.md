# Monaco

Monaco is an open-source Formula 1 live timing dashboard with historical replay support

[f1.tdjs.dev](https://f1.tdjs.dev)

![Monaco screenshot](https://tdjs.dev/images/content/monaco.png)

## Features

- 🔴 **Live Timing**: Real-time race data during live sessions
- 🎬 **Historical Replay**: Watch past sessions from 2018 onwards
- 📊 **Comprehensive Data**: Timing, telemetry, positions, and team radio
- 🗺️ **Live Track Map**: Real-time driver positions
- ⏯️ **Playback Controls**: Play, pause, seek, and speed control
- 💾 **Smart Caching**: Fast access to previously viewed sessions
- 🎨 **Clean UI**: Minimal, focused interface

## Development

Clone the project and start it with

```
$ yarn install
$ yarn dev
```

View the dashboard at http://localhost:3000

## Historical Replay Feature

Monaco now supports replaying historical F1 sessions! Features include:

- Browse sessions from 2018 onwards
- Full timing data replay with authentic experience
- Playback controls (play/pause/seek/speed)
- Smart caching for fast loading
- Automatic retry and error handling

See [REPLAY_FEATURE.md](REPLAY_FEATURE.md) for detailed documentation.

## Usage

### Live Mode
When there's an active F1 session, Monaco automatically connects and displays live timing data.

### Replay Mode
1. Click "📚 BROWSE HISTORY" in the top-right corner
2. Select a year and race weekend
3. Choose a session to replay
4. Use playback controls to navigate through the session

## Architecture

Monaco is built with:
- **Frontend**: Next.js, React, styled-components
- **Backend**: Node.js, WebSocket (ws)
- **Data Source**: Formula 1 Live Timing API
- **Caching**: Memory + localStorage with LRU eviction
- **Error Handling**: Comprehensive retry logic and error boundaries
