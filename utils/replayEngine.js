/**
 * Replay Engine for Historical F1 Session Data
 * Handles playback, seeking, and speed control for historical sessions
 * Includes high-performance position interpolation for smooth animation
 */

import {
  expandTimelineWithInterpolation,
  INTERPOLATION_PRESETS,
  validatePositionData,
} from './positionInterpolation';

// Re-export presets for external use
export { INTERPOLATION_PRESETS } from './positionInterpolation';

/**
 * Parse compressed F1 data (base64 encoded, deflate compressed)
 * Note: In browser context, data from F1 API should already be decompressed JSON
 */
export const parseCompressed = (data) => {
  // If data is already an object, return it as-is
  if (typeof data === "object" && data !== null) {
    return data;
  }
  
  // In browser, we can't use zlib. The data from the API endpoint should already be JSON.
  // If it's a string, try to parse it as JSON
  if (typeof data === "string") {
    try {
      return JSON.parse(data);
    } catch (e) {
      console.error("Failed to parse data as JSON:", e);
      return null;
    }
  }
  
  return data;
};

/**
 * Deep merge objects, handling nested structures
 */
export const deepObjectMerge = (original = {}, modifier) => {
  if (!modifier) return original;
  const copy = { ...original };
  for (const [key, value] of Object.entries(modifier)) {
    const valueIsObject =
      typeof value === "object" && !Array.isArray(value) && value !== null;
    if (valueIsObject && !!Object.keys(value).length) {
      copy[key] = deepObjectMerge(copy[key], value);
    } else {
      copy[key] = value;
    }
  }
  return copy;
};

/**
 * Convert historical data into a timeline of events
 * Each event has a timestamp and the data update
 * @param {Object} sessionData - Raw session data from API
 * @param {Object} options - Configuration options
 * @param {boolean} options.interpolate - Enable position interpolation
 * @param {string} options.quality - Quality preset: 'LOW', 'MEDIUM', 'HIGH', 'ULTRA'
 * @returns {Array} Timeline of events
 */
export function buildTimeline(sessionData, options = {}) {
  const {
    interpolate = true,
    quality = 'HIGH', // Default to HIGH quality for HPC
  } = options;

  const timeline = [];

  // Process each data feed
  Object.entries(sessionData).forEach(([feedName, feedData]) => {
    // Handle different data formats
    if (typeof feedData === "object" && feedData !== null) {
      // Check if it's a time-series data structure
      if (feedData.Entries && Array.isArray(feedData.Entries)) {
        // Live data format: CarData.z and Position.z with Entries array
        feedData.Entries.forEach((entry) => {
          timeline.push({
            timestamp: new Date(entry.Utc).getTime(),
            feed: feedName,
            data: entry,
            utc: entry.Utc,
          });
        });
      } else if (feedName === "CarData" && feedData.Entries) {
        // Historical format: CarData.Entries is an array of telemetry snapshots
        // Each entry should be a separate timeline event
        if (Array.isArray(feedData.Entries)) {
          feedData.Entries.forEach((carDataSnapshot) => {
            if (carDataSnapshot && carDataSnapshot.Cars) {
              const timestamp = carDataSnapshot.Utc
                ? new Date(carDataSnapshot.Utc).getTime()
                : Date.now();
              
              timeline.push({
                timestamp,
                feed: feedName,
                data: carDataSnapshot,
                utc: carDataSnapshot.Utc,
              });
            }
          });
        }
      } else if (feedName === "CarData" && feedData.Utc && feedData.Cars) {
        // Historical format: Single CarData object with Utc and Cars
        timeline.push({
          timestamp: new Date(feedData.Utc).getTime(),
          feed: feedName,
          data: feedData,
          utc: feedData.Utc,
        });
      } else if (feedName === "Position" && feedData.Position) {
        // Historical format: Position.Position is an array of position snapshots
        // Each snapshot should be a separate timeline event
        if (Array.isArray(feedData.Position)) {
          // Debug: log structure of first snapshot
          if (feedData.Position.length > 0 && feedData.Position[0]) {
            console.log("[Timeline] Position snapshot structure:", Object.keys(feedData.Position[0]));
          }
          
          feedData.Position.forEach((positionSnapshot, index) => {
            if (positionSnapshot && positionSnapshot.Entries) {
              // Each snapshot in the array gets its own event
              // Try multiple timestamp fields in order of preference
              let timestamp;
              const timestampValue = positionSnapshot.Timestamp || positionSnapshot.Utc || feedData.Utc;
              
              if (timestampValue) {
                const parsed = new Date(timestampValue).getTime();
                timestamp = isNaN(parsed) ? Date.now() + index * 1000 : parsed;
              } else {
                // Fallback: use incremental timestamps
                timestamp = Date.now() + index * 1000;
                console.warn(`[Timeline] Position snapshot ${index} missing timestamp, using fallback`);
                console.warn(`[Timeline] Available keys:`, Object.keys(positionSnapshot));
              }
              
              // Debug: Log coordinates from first few snapshots to verify data varies
              if (index < 3) {
                const firstDriverNum = Object.keys(positionSnapshot.Entries)[0];
                const firstDriver = positionSnapshot.Entries[firstDriverNum];
                console.log(`[Timeline] Raw Position snapshot ${index}: Driver ${firstDriverNum} X=${firstDriver?.X?.toFixed(0)}, Y=${firstDriver?.Y?.toFixed(0)}`);
              }
              
              timeline.push({
                timestamp,
                feed: feedName,
                data: positionSnapshot,
                utc: positionSnapshot.Timestamp || positionSnapshot.Utc || feedData.Utc || new Date(timestamp).toISOString(),
              });
            }
          });
        } else if (feedData.Utc) {
          // Single position object
          timeline.push({
            timestamp: new Date(feedData.Utc).getTime(),
            feed: feedName,
            data: feedData,
            utc: feedData.Utc,
          });
        }
      } else if (feedName === "RaceControlMessages" && feedData.Messages) {
        // Race control messages
        Object.values(feedData.Messages).forEach((message) => {
          if (message.Utc) {
            timeline.push({
              timestamp: new Date(message.Utc).getTime(),
              feed: "RaceControlMessages",
              data: { Messages: { [message.Utc]: message } },
              utc: message.Utc,
            });
          }
        });
      } else if (feedName === "TeamRadio" && feedData.Captures) {
        // Team radio
        Object.values(feedData.Captures).forEach((capture) => {
          if (capture.Utc) {
            timeline.push({
              timestamp: new Date(capture.Utc).getTime(),
              feed: "TeamRadio",
              data: { Captures: { [capture.Utc]: capture } },
              utc: capture.Utc,
            });
          }
        });
      } else {
        // Static data (SessionInfo, DriverList, etc.)
        timeline.push({
          timestamp: 0, // These are loaded at the start
          feed: feedName,
          data: feedData,
          static: true,
        });
      }
    }
  });

  // Sort by timestamp
  timeline.sort((a, b) => a.timestamp - b.timestamp);

  // Apply position interpolation if enabled
  if (interpolate && INTERPOLATION_PRESETS[quality]) {
    console.log(
      `[Timeline] Applying ${quality} quality interpolation:`,
      INTERPOLATION_PRESETS[quality].description
    );

    const interpolationOptions = {
      ...INTERPOLATION_PRESETS[quality],
      onProgress: (current, total) => {
        if (current % 10 === 0) {
          console.log(
            `[Timeline] Interpolation progress: ${current}/${total} (${Math.round(
              (current / total) * 100
            )}%)`
          );
        }
      },
    };

    const expandedTimeline = expandTimelineWithInterpolation(
      timeline,
      interpolationOptions
    );

    console.log(
      `[Timeline] Interpolation complete: ${timeline.length} → ${expandedTimeline.length} events`
    );

    return expandedTimeline;
  }

  return timeline;
}

/**
 * Replay Engine Class
 * Manages playback of historical session data
 */
export class ReplayEngine {
  constructor(timeline, options = {}) {
    this.timeline = timeline;
    this.currentIndex = 0;
    this.state = {};
    this.isPlaying = false;
    this.playbackSpeed = options.playbackSpeed || 1;
    this.timeCompression = options.timeCompression || 100; // Default: 100x faster than real-time
    this.onStateUpdate = options.onStateUpdate || (() => {});
    this.interval = null;
    this.startTime = null;
    this.sessionStartTime = null;

    // Initialize with static data
    this.initializeStaticData();
  }

  /**
   * Load all static data at initialization
   */
  initializeStaticData() {
    // Load all static data
    this.timeline.forEach((event) => {
      if (event.static) {
        this.state = deepObjectMerge(this.state, { [event.feed]: event.data });
      }
    });
    
    // Skip initial empty period - find first meaningful data (first 10 position updates)
    // This avoids the "clunky start" where nothing is moving yet
    let positionCount = 0;
    const INITIAL_POSITIONS_TO_LOAD = 10; // Load first 10 position updates for smoother start
    
    for (let i = 0; i < this.timeline.length; i++) {
      const event = this.timeline[i];
      if (!event.static) {
        if (event.feed === "Position") {
          this.processEvent(event);
          positionCount++;
          if (positionCount >= INITIAL_POSITIONS_TO_LOAD) {
            break;
          }
        } else if (event.feed === "CarData" && positionCount < INITIAL_POSITIONS_TO_LOAD) {
          // Also load car data alongside positions
          this.processEvent(event);
        }
      }
    }
    
    // Don't advance currentIndex - playback should start from beginning
    // The first events will be processed again, which just appends to Entries (harmless)
    
    // Debug: Log what data we have
    console.log("Initialized replay with static data:", Object.keys(this.state));
    console.log("Has TimingData:", !!this.state.TimingData);
    console.log("Has CarData:", !!this.state.CarData);
    console.log("Has PitStops:", !!this.state.PitStops, "Count:", this.state.PitStops?.length || 0);
    
    if (this.state.CarData) {
      console.log("CarData structure in state:", {
        hasEntries: !!this.state.CarData.Entries,
        entriesLength: this.state.CarData.Entries?.length,
        keys: Object.keys(this.state.CarData).slice(0, 5)
      });
    }
    
    console.log("Timeline has", this.timeline.length, "events");
    const carDataEvents = this.timeline.filter(e => e.feed === "CarData");
    const positionEvents = this.timeline.filter(e => e.feed === "Position");
    console.log("CarData events in timeline:", carDataEvents.length);
    console.log("Position events in timeline:", positionEvents.length);
    
    // Log timeline feed types
    const feedCounts = {};
    this.timeline.forEach(e => {
      feedCounts[e.feed] = (feedCounts[e.feed] || 0) + 1;
    });
    console.log("Timeline feed distribution:", feedCounts);
    
    // Log timestamp distribution for Position events
    if (positionEvents.length > 0) {
      const first3 = positionEvents.slice(0, 3);
      console.log("First 3 Position event timestamps:", first3.map(e => ({
        index: this.timeline.indexOf(e),
        timestamp: e.timestamp,
        utc: e.utc,
        interpolated: e.interpolated
      })));
    }
    
    console.log("Processed initial events for immediate display");
    
    this.onStateUpdate(this.state);
  }

  /**
   * Start playback
   */
  play() {
    if (this.isPlaying) {
      console.warn("[Replay] Already playing, ignoring duplicate play() call");
      return;
    }
    
    // Clear any existing interval first
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
    
    this.isPlaying = true;

    if (!this.startTime && this.timeline.length > 0) {
      this.sessionStartTime = this.timeline.find((e) => !e.static)?.timestamp || 0;
      const sessionEndTime = this.timeline[this.timeline.length - 1]?.timestamp || this.sessionStartTime;
      const sessionDuration = (sessionEndTime - this.sessionStartTime) / 1000; // seconds
      const playbackDuration = sessionDuration / this.timeCompression; // seconds
      
      this.startTime = Date.now();
      console.log(`[Replay] Starting playback:`);
      console.log(`  Session duration: ${sessionDuration.toFixed(0)}s (${(sessionDuration/60).toFixed(1)} min)`);
      console.log(`  Time compression: ${this.timeCompression}x`);
      console.log(`  Playback duration: ${playbackDuration.toFixed(1)}s`);
      console.log(`  Timeline: ${this.timeline.length} events`);
      console.log(`  Starting at index: ${this.currentIndex}`);
    }

    this.interval = setInterval(() => {
      this.tick();
    }, 100); // Update every 100ms
    
    console.log(`[Replay] Play started, interval ID=${this.interval}`);
  }

  /**
   * Pause playback
   */
  pause() {
    this.isPlaying = false;
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
  }

  /**
   * Cleanup - stop all intervals and clear state
   */
  destroy() {
    console.log("[Replay] Destroying engine, cleaning up intervals");
    this.pause();
    this.timeline = [];
    this.state = {};
    this.currentIndex = 0;
  }

  /**
   * Process events based on current time
   */
  tick() {
    if (!this.isPlaying) {
      console.warn("[Replay] Tick called but not playing!");
      return;
    }

    // Apply time compression to make replay much faster than real-time
    // elapsed time is multiplied by timeCompression (e.g., 100x means 1 second of playback = 100 seconds of session time)
    const elapsed = (Date.now() - this.startTime) * this.playbackSpeed * this.timeCompression;
    const currentTime = this.sessionStartTime + elapsed;

    let updated = false;
    let eventsProcessed = 0;

    // Debug: Log tick details periodically (only every 50 events now that we have compression)
    if (this.currentIndex > 0 && this.currentIndex % 50 === 0) {
      const progressPct = ((this.currentIndex / this.timeline.length) * 100).toFixed(1);
      console.log(`[Replay] Progress: ${progressPct}% (${this.currentIndex}/${this.timeline.length} events)`);
    }

    // Process all events up to current time
    while (this.currentIndex < this.timeline.length) {
      const event = this.timeline[this.currentIndex];
      
      if (event.static || event.timestamp <= currentTime) {
        if (!event.static) {
          this.processEvent(event);
          updated = true;
          eventsProcessed++;
          
          // Debug log for important events (only for non-interpolated, every 20 events)
          if ((event.feed === "CarData" || event.feed === "Position") && !event.interpolated && this.currentIndex % 20 === 0) {
            console.log(`[Replay] Processed ${event.feed} event at index ${this.currentIndex}, timestamp=${event.timestamp}`);
          }
        }
        this.currentIndex++;
      } else {
        // Event timestamp is in the future, wait
        break;
      }
    }

    if (updated) {
      this.onStateUpdate(this.state);
    }

    // Stop if we've reached the end
    if (this.currentIndex >= this.timeline.length) {
      console.log("[Replay] Reached end of timeline, pausing");
      this.pause();
    }
  }

/**
 * Process a single event and update state
 */
  processEvent(event) {
    try {
      const { feed, data } = event;

      // Handle CarData - build Entries array for compatibility with Driver component
      if (feed === "CarData" && data.Cars) {
        // Ensure we have an Entries array structure
        const existingEntries = this.state.CarData?.Entries || [];
        const newEntry = data;
        
        this.state = deepObjectMerge(this.state, {
          CarData: {
            Entries: [...existingEntries, newEntry],
          },
        });
        
        // Log telemetry updates to debug Driver component
        if (!event.interpolated && this.currentIndex % 50 === 0) {
          const driversInEntry = Object.keys(newEntry.Cars || {});
          const firstDriver = driversInEntry[0];
          const channels = newEntry.Cars?.[firstDriver]?.Channels;
          console.log(`[Replay] Updated CarData Entries, now has ${existingEntries.length + 1} entries`, {
            timestamp: newEntry.Utc,
            drivers: driversInEntry.length,
            sampleDriver: firstDriver,
            sampleChannels: channels ? {
              rpm: channels[0],
              speed: channels[2],
              gear: channels[3],
            } : 'No channels'
          });
        }
      } else if (feed === "Position") {
        // For live playback, we need to keep a growing array for the Map component
        // The Map reads Position.Position[Position.Position.length - 1]
        // But we also want to show the LATEST position, not accumulate all history
        
        // Strategy: Keep a circular buffer of recent positions (last 10)
        const existingPosition = this.state.Position?.Position || [];
        const maxPositionHistory = 10; // Keep last 10 for smooth transitions
        
        // Add new snapshot and trim old ones
        const newPositionArray = [...existingPosition, data];
        if (newPositionArray.length > maxPositionHistory) {
          newPositionArray.shift(); // Remove oldest
        }
        
        this.state = deepObjectMerge(this.state, {
          Position: {
            Position: newPositionArray,
          },
        });
        
        // Log position updates to verify map should be updating
        if (this.currentIndex % 10 === 0) {
          const latestPos = newPositionArray[newPositionArray.length - 1];
          const firstDriverNum = latestPos.Entries ? Object.keys(latestPos.Entries)[0] : null;
          const firstDriver = firstDriverNum ? latestPos.Entries[firstDriverNum] : null;
          
          if (firstDriver) {
            const isInterpolated = event.interpolated ? "(interpolated)" : "(real)";
            console.log(`[Replay] Position update @${this.currentIndex}: Driver ${firstDriverNum} at X=${firstDriver.X?.toFixed(0)}, Y=${firstDriver.Y?.toFixed(0)} ${isInterpolated}, buffer size=${newPositionArray.length}`);
          }
        }
      } else if (feed === "TimingData" || feed === "TimingAppData" || feed === "TimingStats") {
        // These are incremental updates that should be merged
        this.state = deepObjectMerge(this.state, { [feed]: data });
      } else {
        this.state = deepObjectMerge(this.state, { [feed]: data });
      }
    } catch (error) {
      console.error("Error processing event:", error, event);
      // Continue playback despite errors
    }
  }

  /**
   * Seek to a specific time (percentage 0-100)
   */
  seek(percentage) {
    const wasPlaying = this.isPlaying;
    this.pause();

    // Find the non-static events
    const nonStaticEvents = this.timeline.filter((e) => !e.static);
    if (nonStaticEvents.length === 0) return;

    // Calculate target index
    const targetIndex = Math.floor(
      (percentage / 100) * (nonStaticEvents.length - 1)
    );

    // Reset state to static data only (without re-processing initial events)
    this.state = {};
    this.timeline.forEach((event) => {
      if (event.static) {
        this.state = deepObjectMerge(this.state, { [event.feed]: event.data });
      }
    });

    // Replay all events up to target
    this.currentIndex = 0;
    let nonStaticCount = 0;

    for (let i = 0; i < this.timeline.length; i++) {
      const event = this.timeline[i];
      
      if (!event.static) {
        if (nonStaticCount <= targetIndex) {
          this.processEvent(event);
          nonStaticCount++;
        } else {
          this.currentIndex = i;
          break;
        }
      }
    }

    // Update timing references
    if (nonStaticEvents[targetIndex]) {
      this.sessionStartTime = nonStaticEvents[targetIndex].timestamp;
      this.startTime = Date.now();
    }

    this.onStateUpdate(this.state);

    if (wasPlaying) {
      this.play();
    }
  }

  /**
   * Set playback speed (1 = normal, 2 = 2x, etc.)
   */
  setSpeed(speed) {
    // When changing speed, we need to reset the timing reference
    // to avoid jumps or weird behavior
    const wasPlaying = this.isPlaying;
    
    if (wasPlaying) {
      this.pause();
    }
    
    this.playbackSpeed = speed;
    
    // Reset timing references for smooth transition
    this.startTime = Date.now();
    
    // Calculate where we should be in session time
    if (this.timeline.length > 0 && this.currentIndex > 0) {
      const currentEvent = this.timeline[this.currentIndex];
      if (currentEvent) {
        this.sessionStartTime = currentEvent.timestamp;
      }
    }
    
    if (wasPlaying) {
      this.play();
    }
    
    console.log(`[Replay] Speed changed to ${speed}x`);
  }

  /**
   * Get current progress (0-100)
   */
  getProgress() {
    const nonStaticEvents = this.timeline.filter((e) => !e.static);
    if (nonStaticEvents.length === 0) return 0;

    let nonStaticIndex = 0;
    for (let i = 0; i < this.currentIndex; i++) {
      if (!this.timeline[i].static) {
        nonStaticIndex++;
      }
    }

    return (nonStaticIndex / nonStaticEvents.length) * 100;
  }

  /**
   * Get current session time
   */
  getCurrentTime() {
    const currentEvent = this.timeline[this.currentIndex];
    if (!currentEvent || currentEvent.static) {
      const firstNonStatic = this.timeline.find((e) => !e.static);
      return firstNonStatic?.utc || null;
    }
    return currentEvent.utc;
  }

  /**
   * Reset to beginning
   */
  reset() {
    this.pause();
    this.currentIndex = 0;
    this.state = {};
    this.startTime = null;
    this.sessionStartTime = null;
    // Re-initialize with static data and initial events
    this.initializeStaticData();
  }

  /**
   * Cleanup
   */
  destroy() {
    this.pause();
    this.timeline = [];
    this.state = {};
  }
}

