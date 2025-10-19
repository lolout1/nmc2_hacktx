/**
 * Position Interpolation Utility
 * Generates smooth, high-frequency position updates from sparse historical data
 * Enables cinematic replay quality with realistic car movement
 */

/**
 * Linear interpolation between two values
 */
function lerp(start, end, t) {
  return start + (end - start) * t;
}

/**
 * Smooth step interpolation (easing function)
 * Provides more realistic acceleration/deceleration
 */
function smoothstep(t) {
  return t * t * (3 - 2 * t);
}

/**
 * Cubic bezier easing for more natural movement
 */
function cubicBezier(t) {
  // Ease-in-out curve
  return t < 0.5
    ? 4 * t * t * t
    : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

/**
 * Interpolate position for a single driver between two snapshots
 */
function interpolateDriverPosition(startPos, endPos, t, easingFunc = smoothstep) {
  if (!startPos || !endPos) return startPos || endPos;

  const easedT = easingFunc(t);

  return {
    Status: endPos.Status, // Use latest status
    X: lerp(startPos.X, endPos.X, easedT),
    Y: lerp(startPos.Y, endPos.Y, easedT),
    Z: lerp(startPos.Z || 0, endPos.Z || 0, easedT),
  };
}

/**
 * Generate interpolated position snapshots between two position objects
 * @param {Object} startSnapshot - Starting position snapshot { Entries: {...} }
 * @param {Object} endSnapshot - Ending position snapshot
 * @param {number} steps - Number of intermediate steps to generate
 * @param {string} easingMode - 'linear', 'smooth', or 'cubic'
 * @returns {Array} Array of interpolated position snapshots
 */
export function interpolatePositions(
  startSnapshot,
  endSnapshot,
  steps = 10,
  easingMode = 'smooth'
) {
  if (!startSnapshot || !endSnapshot) {
    console.warn("[Interpolation] Missing snapshots", { startSnapshot: !!startSnapshot, endSnapshot: !!endSnapshot });
    return [];
  }

  // Validate that snapshots have required fields
  if (!startSnapshot.Entries || !endSnapshot.Entries) {
    console.warn("[Interpolation] Snapshots missing Entries", {
      start: Object.keys(startSnapshot),
      end: Object.keys(endSnapshot)
    });
    return [];
  }

  // Select easing function
  const easingFunc = {
    linear: (t) => t,
    smooth: smoothstep,
    cubic: cubicBezier,
  }[easingMode] || smoothstep;

  const interpolatedSnapshots = [];
  const startEntries = startSnapshot.Entries || {};
  const endEntries = endSnapshot.Entries || {};

  // Get all driver numbers from both snapshots
  const driverNumbers = new Set([
    ...Object.keys(startEntries),
    ...Object.keys(endEntries),
  ]);

  // Debug: Check if start and end positions are actually different
  if (steps > 1 && driverNumbers.size > 0) {
    const firstDriver = Array.from(driverNumbers)[0];
    const startPos = startEntries[firstDriver];
    const endPos = endEntries[firstDriver];
    
    if (startPos && endPos) {
      const distance = Math.sqrt(
        Math.pow((endPos.X || 0) - (startPos.X || 0), 2) +
        Math.pow((endPos.Y || 0) - (startPos.Y || 0), 2)
      );
      
      if (distance < 1) {
        console.warn(`[Interpolation] ⚠️ Start and end positions are IDENTICAL for driver ${firstDriver}! Distance=${distance.toFixed(2)}. This will result in NO MOVEMENT. Start: X=${startPos.X?.toFixed(0)}, Y=${startPos.Y?.toFixed(0)}, End: X=${endPos.X?.toFixed(0)}, Y=${endPos.Y?.toFixed(0)}`);
      } else {
        console.log(`[Interpolation] ✓ Interpolating ${steps} steps across distance=${distance.toFixed(0)} for driver ${firstDriver}`);
      }
    }
  }

  // Generate intermediate snapshots
  for (let i = 1; i < steps; i++) {
    const t = i / steps;
    const interpolatedEntries = {};

    driverNumbers.forEach((driverNum) => {
      const startPos = startEntries[driverNum];
      const endPos = endEntries[driverNum];

      if (startPos && endPos) {
        interpolatedEntries[driverNum] = interpolateDriverPosition(
          startPos,
          endPos,
          t,
          easingFunc
        );
      } else {
        // If driver only appears in one snapshot, use that position
        interpolatedEntries[driverNum] = endPos || startPos;
      }
    });

    // Calculate interpolated timestamp
    // Handle cases where Utc might be undefined or invalid
    let interpolatedUtc;
    try {
      const startTime = new Date(startSnapshot.Utc || startSnapshot.Timestamp).getTime();
      const endTime = new Date(endSnapshot.Utc || endSnapshot.Timestamp).getTime();
      
      if (!isNaN(startTime) && !isNaN(endTime)) {
        const interpolatedTime = new Date(lerp(startTime, endTime, t));
        interpolatedUtc = interpolatedTime.toISOString();
      } else {
        // Fallback: use current time offset
        interpolatedUtc = new Date(Date.now() + i * 1000).toISOString();
      }
    } catch (e) {
      console.warn("[Interpolation] Invalid timestamp, using fallback", e);
      interpolatedUtc = new Date(Date.now() + i * 1000).toISOString();
    }

    interpolatedSnapshots.push({
      Entries: interpolatedEntries,
      Utc: interpolatedUtc,
      Timestamp: interpolatedUtc, // Also set Timestamp for compatibility
      interpolated: true, // Mark as interpolated for debugging
    });
  }

  return interpolatedSnapshots;
}

/**
 * Expand a timeline with interpolated position data
 * @param {Array} timeline - Original timeline with sparse position updates
 * @param {Object} options - Configuration options
 * @returns {Array} Expanded timeline with interpolated positions
 */
export function expandTimelineWithInterpolation(timeline, options = {}) {
  const {
    stepsPerInterval = 10, // How many steps between each original snapshot
    easingMode = 'smooth',
    onProgress = null, // Callback for progress updates
  } = options;

  // Find all Position events in timeline
  const positionEvents = timeline
    .map((event, index) => ({ event, index }))
    .filter(({ event }) => event.feed === "Position" && !event.static);

  if (positionEvents.length < 2) {
    console.warn("Not enough position data for interpolation");
    return timeline;
  }

  console.log(
    `[Interpolation] Expanding ${positionEvents.length} position snapshots with ${stepsPerInterval}x interpolation`
  );

  const expandedTimeline = [...timeline];
  let insertedCount = 0;

  // Process each pair of consecutive position events
  for (let i = 0; i < positionEvents.length - 1; i++) {
    const { event: startEvent, index: startIndex } = positionEvents[i];
    const { event: endEvent } = positionEvents[i + 1];

    // Generate interpolated snapshots
    const interpolated = interpolatePositions(
      startEvent.data,
      endEvent.data,
      stepsPerInterval,
      easingMode
    );

    // Insert interpolated events into timeline
    interpolated.forEach((interpData, interpIndex) => {
      const insertIndex = startIndex + insertedCount + interpIndex + 1;

      // Calculate interpolated timestamp
      const startTime = startEvent.timestamp;
      const endTime = endEvent.timestamp;
      const t = (interpIndex + 1) / (stepsPerInterval + 1);
      const interpolatedTimestamp = lerp(startTime, endTime, t);

      expandedTimeline.splice(insertIndex, 0, {
        timestamp: interpolatedTimestamp,
        feed: "Position",
        data: interpData,
        utc: interpData.Utc,
        interpolated: true,
      });

      insertedCount++;
    });

    // Report progress
    if (onProgress) {
      onProgress(i + 1, positionEvents.length - 1);
    }
  }

  // Re-sort timeline by timestamp to maintain order
  expandedTimeline.sort((a, b) => a.timestamp - b.timestamp);

  console.log(
    `[Interpolation] Added ${insertedCount} interpolated position events. Total: ${expandedTimeline.length}`
  );

  return expandedTimeline;
}

/**
 * Configuration presets for different quality levels
 */
export const INTERPOLATION_PRESETS = {
  LOW: {
    stepsPerInterval: 5,
    easingMode: 'linear',
    description: 'Low quality - 5 steps, linear',
  },
  MEDIUM: {
    stepsPerInterval: 10,
    easingMode: 'smooth',
    description: 'Medium quality - 10 steps, smooth',
  },
  HIGH: {
    stepsPerInterval: 20,
    easingMode: 'cubic',
    description: 'High quality - 20 steps, cubic',
  },
  ULTRA: {
    stepsPerInterval: 30,
    easingMode: 'cubic',
    description: 'Ultra quality - 30 steps, cubic (HPC)',
  },
};

/**
 * Validate position data structure
 */
export function validatePositionData(positionData) {
  if (!positionData) return false;
  if (!positionData.Entries || typeof positionData.Entries !== 'object') return false;

  const entries = Object.values(positionData.Entries);
  if (entries.length === 0) return false;

  // Check that entries have required fields
  return entries.every(
    (entry) =>
      entry &&
      typeof entry.X === 'number' &&
      typeof entry.Y === 'number'
  );
}

/**
 * Calculate distance between two positions (for velocity estimation)
 */
export function calculateDistance(pos1, pos2) {
  if (!pos1 || !pos2) return 0;
  const dx = pos2.X - pos1.X;
  const dy = pos2.Y - pos1.Y;
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Estimate velocity for smoother interpolation adjustments
 */
export function estimateVelocity(startPos, endPos, timeMs) {
  if (timeMs === 0) return 0;
  const distance = calculateDistance(startPos, endPos);
  return distance / (timeMs / 1000); // Units per second
}

export default {
  interpolatePositions,
  expandTimelineWithInterpolation,
  INTERPOLATION_PRESETS,
  validatePositionData,
  calculateDistance,
  estimateVelocity,
};

