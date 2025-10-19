# Historical Data Replay Feature

## Overview

Monaco now supports replaying historical F1 session data in addition to live timing. This feature allows you to watch past races, qualifying sessions, and practice sessions with full timing data, as if they were happening live.

## Features

### 🎬 Full Session Replay
- Replay any F1 session from 2018 onwards
- All timing data including car telemetry, positions, sector times, and more
- Authentic experience with the same UI as live sessions

### ⏯️ Playback Controls
- **Play/Pause**: Control playback at any time
- **Seek**: Jump to any point in the session
- **Speed Control**: Watch at 0.5x, 1x, 2x, 5x, or 10x speed
- **Reset**: Jump back to the beginning
- **Progress Bar**: Visual timeline with draggable scrubber

### 🗄️ Smart Caching
- Automatic caching of session data
- Memory cache for fast access (up to 5 sessions)
- LocalStorage persistence (up to 3 sessions)
- LRU eviction policy for optimal memory usage

### 🔄 Retry Logic & Error Handling
- Automatic retry for failed requests (up to 3 attempts)
- Exponential backoff with jitter
- Comprehensive error boundaries
- Graceful degradation

### 🚀 Performance Optimizations
- Parallel data fetching
- Efficient timeline construction
- Minimal re-renders
- Compressed data support

## Usage

### Accessing Historical Sessions

1. **From No Connection Screen**
   - If there's no live session, click "BROWSE HISTORICAL SESSIONS"

2. **From Live Session**
   - Click "📚 BROWSE HISTORY" button in the top-right corner

3. **From No Session Screen**
   - Click "BROWSE HISTORICAL SESSIONS" button

### Browsing Sessions

1. Select a year from the dropdown (2018-present)
2. Browse through race weekends
3. Click on a race weekend to expand sessions
4. Click on any session to start replay

### Playback Controls

The playback control bar appears at the bottom of the screen during replay:

- **Progress Bar**: Click or drag to seek
- **Play/Pause**: Control playback
- **Reset**: Return to session start
- **Speed Buttons**: Choose playback speed (0.5x - 10x)
- **Exit Replay**: Return to live mode

### Keyboard Shortcuts (Future Enhancement)
- `Space`: Play/Pause
- `Left/Right Arrow`: Seek ±10 seconds
- `Up/Down Arrow`: Change speed
- `R`: Reset to start
- `Esc`: Exit replay mode

## Architecture

### Backend Components

#### API Endpoints

**`/api/sessions/list`**
- Fetches available sessions for a given year
- Returns structured data with meetings and sessions
- Supports year parameter (defaults to current year)

**`/api/sessions/data`**
- Fetches all timing data for a specific session
- Processes compressed data formats
- Returns unified state object

#### Server Updates

**`server.js`**
- Dual mode support (live/replay)
- Client mode tracking via WeakMap
- Independent data streams per client

### Frontend Components

#### Core Components

**`SessionBrowser`** (`components/SessionBrowser.js`)
- Year selector
- Meeting cards with expandable sessions
- Session type indicators (Race/Qualifying/Sprint/Practice)
- Loading and error states

**`PlaybackControls`** (`components/PlaybackControls.js`)
- Fixed bottom bar during replay
- Progress bar with drag support
- Speed selector
- Session information display

**`ErrorBoundary`** (`components/ErrorBoundary.js`)
- Catches React errors
- Displays user-friendly error UI
- Development mode error details
- Reset and reload options

#### Utilities

**`replayEngine.js`** (`utils/replayEngine.js`)
- Timeline construction from session data
- Playback state management
- Speed control
- Seek functionality
- Event processing

**`sessionCache.js`** (`utils/sessionCache.js`)
- Dual-layer caching (memory + localStorage)
- LRU eviction
- Size limits and quota management
- Cache statistics

**`apiClient.js`** (`utils/apiClient.js`)
- Fetch wrapper with retry logic
- Timeout support
- Exponential backoff
- Batch fetching support

### Data Flow

```
User selects session
    ↓
Check cache
    ↓
Cache miss? → Fetch from API (with retry)
    ↓
Process compressed data
    ↓
Build timeline
    ↓
Initialize replay engine
    ↓
Start playback
    ↓
Update UI (60 FPS)
```

## Technical Details

### Timeline Construction

The replay engine converts F1's data structure into a timeline of events:

1. **Static Data**: SessionInfo, DriverList, etc. (loaded once)
2. **Time-Series Data**: CarData, Position (sorted by timestamp)
3. **Event Data**: RaceControlMessages, TeamRadio (sorted by UTC)

### State Management

- **Live Mode**: WebSocket updates from server
- **Replay Mode**: Local state from replay engine
- **Mode Switching**: Clean transitions with proper cleanup

### Caching Strategy

```
Memory Cache (Fast, 5 sessions)
    ↓ (LRU eviction)
LocalStorage (Persistent, 3 sessions)
    ↓ (Quota management)
API (Network, unlimited)
```

### Error Handling

- **Network Errors**: Automatic retry with backoff
- **Parse Errors**: Graceful degradation
- **React Errors**: Error boundary with reset
- **Cache Errors**: Automatic cleanup

## Configuration

### Cache Settings

Edit `utils/sessionCache.js`:

```javascript
const MAX_MEMORY_CACHE_SIZE = 5;  // Memory cache limit
const MAX_LOCALSTORAGE_SIZE = 3;  // localStorage limit
```

### Retry Settings

Edit `utils/apiClient.js`:

```javascript
const defaultOptions = {
  maxRetries: 3,
  timeout: 30000,
  retryableStatuses: [429, 500, 502, 503, 504]
};
```

### Playback Settings

Edit `components/PlaybackControls.js`:

```javascript
const speeds = [0.5, 1, 2, 5, 10];  // Available speeds
```

## Performance Considerations

### Memory Usage
- Each session: ~2-10 MB
- Memory cache: ~10-50 MB
- localStorage: ~6-30 MB

### Network Usage
- Average session: 3-8 MB download
- Cached sessions: 0 MB download
- Compressed data reduces size by ~60%

### CPU Usage
- Timeline construction: One-time cost
- Playback: Minimal (event processing)
- UI updates: Optimized with React best practices

## Browser Compatibility

- **Chrome/Edge**: Full support
- **Firefox**: Full support
- **Safari**: Full support (localStorage may have stricter limits)
- **Mobile**: Supported (touch-friendly controls)

## Troubleshooting

### Session won't load
- Check browser console for errors
- Try refreshing the page
- Clear cache: `localStorage.clear()`
- Check network connectivity

### Playback stutters
- Reduce playback speed
- Close other tabs/applications
- Check browser performance settings

### Cache quota exceeded
- Clear old sessions: "Exit Replay" button
- Reduce cache limits in settings
- Use browser's clear storage option

## Future Enhancements

### Planned Features
- [ ] Keyboard shortcuts
- [ ] Bookmarks/favorite moments
- [ ] Session comparison mode
- [ ] Export timing data
- [ ] Share replay links with timestamps
- [ ] Picture-in-picture mode
- [ ] Commentary audio integration

### Performance Improvements
- [ ] Web Workers for timeline processing
- [ ] IndexedDB for larger cache
- [ ] Progressive data loading
- [ ] Predictive prefetching

## API Reference

### ReplayEngine

```javascript
const engine = new ReplayEngine(timeline, {
  playbackSpeed: 1,
  onStateUpdate: (state) => { /* callback */ }
});

engine.play();
engine.pause();
engine.seek(50); // 50% through session
engine.setSpeed(2); // 2x speed
engine.reset();
engine.getProgress(); // Returns 0-100
engine.getCurrentTime(); // Returns UTC timestamp
engine.destroy();
```

### SessionCache

```javascript
import sessionCache from '@monaco/utils/sessionCache';

sessionCache.has(sessionPath);
sessionCache.get(sessionPath);
sessionCache.set(sessionPath, data);
sessionCache.remove(sessionPath);
sessionCache.clear();
sessionCache.getStats();
```

### API Client

```javascript
import { fetchJSON } from '@monaco/utils/apiClient';

const data = await fetchJSON('/api/endpoint', options, {
  maxRetries: 3,
  timeout: 30000,
  onRetry: (attempt, max, delay) => { /* callback */ }
});
```

## Contributing

When adding new features to the replay system:

1. Follow the modular architecture
2. Add error handling and loading states
3. Update this documentation
4. Test with various session types
5. Consider performance impact
6. Add TypeScript types (future)

## Credits

- Formula 1 timing data: Formula 1
- Map data: api.multiviewer.app
- Implementation: Monaco project

## License

Same as Monaco project

