/**
 * API endpoint to fetch historical session data
 * Streams data files for a specific session
 */

const zlib = require("zlib");
const f1Url = "https://livetiming.formula1.com";

// List of all data feeds we need to fetch
const dataFeeds = [
  "Heartbeat",
  "CarData.z",
  "Position.z",
  "ExtrapolatedClock",
  "TimingStats",
  "TimingAppData",
  "WeatherData",
  "TrackStatus",
  "DriverList",
  "RaceControlMessages",
  "SessionInfo",
  "SessionData",
  "LapCount",
  "TimingData",
  "TeamRadio",
];

/**
 * Decompress F1 data if it's compressed
 * F1 API returns base64-encoded, deflate-compressed JSON objects
 */
function decompressData(data, feedName) {
  if (typeof data === "string") {
    try {
      // Decompress base64-encoded, deflate-compressed data
      const decompressed = zlib.inflateRawSync(Buffer.from(data, "base64")).toString();
      const parsed = JSON.parse(decompressed);
      
      // Log what we received for debugging
      if (feedName === 'Position.z' && parsed.Position) {
        console.log(`[API] Position.z: ${parsed.Position.length} position snapshots`);
      } else if (feedName === 'CarData.z' && parsed.Entries) {
        console.log(`[API] CarData.z: ${parsed.Entries.length} telemetry snapshots`);
      }
      
      return parsed;
    } catch (e) {
      // If decompression fails, try parsing as JSON directly
      try {
        return JSON.parse(data);
      } catch (e2) {
        console.error(`[API] Failed to parse ${feedName}:`, e2.message);
        return data;
      }
    }
  }
  return data;
}

/**
 * Fetch a single data file from F1 static API
 */
async function fetchDataFeed(sessionPath, feedName) {
  try {
    const response = await fetch(`${f1Url}/static/${sessionPath}${feedName}.json`, {
      headers: {
        "User-Agent": "tdjsnelling/monaco",
      },
    });

    if (response.status === 200) {
      let data = await response.json();
      
      // If this is a .z file (compressed), decompress it
      if (feedName.endsWith(".z")) {
        data = decompressData(data, feedName);
      }
      
      return { feed: feedName, data, success: true };
    }
    return { feed: feedName, data: null, success: false };
  } catch (e) {
    return { feed: feedName, data: null, success: false, error: e.message };
  }
}

export default async function handler(req, res) {
  try {
    if (req.method !== "GET") {
      return res.status(405).json({ error: "Method not allowed" });
    }

    const { sessionPath } = req.query;

    if (!sessionPath) {
      return res.status(400).json({ error: "sessionPath is required" });
    }

    // Fetch all data feeds in parallel
    const results = await Promise.all(
      dataFeeds.map((feed) => fetchDataFeed(sessionPath, feed))
    );

    // Combine all successful feeds into a single state object
    const sessionData = {};
    results.forEach(({ feed, data, success }) => {
      if (success && data) {
        // Remove .z extension from compressed feeds
        const feedName = feed.replace(".z", "");
        sessionData[feedName] = data;
      }
    });

    // Check if we got any data
    if (Object.keys(sessionData).length === 0) {
      return res.status(404).json({ 
        error: "No data found for this session",
        sessionPath 
      });
    }

    return res.status(200).json({
      sessionPath,
      data: sessionData,
      timestamp: new Date().toISOString(),
    });
  } catch (e) {
    console.error("Error fetching session data:", e);
    return res.status(500).json({ 
      error: "Failed to fetch session data", 
      message: e.message 
    });
  }
}

