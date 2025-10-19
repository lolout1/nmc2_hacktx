/**
 * API endpoint to validate session data quality
 * Quick check of position snapshot count without full decompression
 */

const zlib = require("zlib");
const f1Url = "https://livetiming.formula1.com";

/**
 * Quick validation of a single session
 * Returns position snapshot count and quality rating
 */
async function validateSession(sessionPath) {
  try {
    // Fetch just the Position.z file for validation
    const response = await fetch(
      `${f1Url}/static/${sessionPath}Position.z.json`,
      {
        headers: {
          "User-Agent": "tdjsnelling/monaco",
        },
        // Short timeout for quick validation
        signal: AbortSignal.timeout(5000),
      }
    );

    if (response.status !== 200) {
      return { valid: false, reason: "No position data available" };
    }

    const data = await response.json();
    
    // Decompress if it's a string (compressed)
    let positionData;
    if (typeof data === "string") {
      try {
        const decompressed = zlib.inflateRawSync(Buffer.from(data, "base64")).toString();
        positionData = JSON.parse(decompressed);
      } catch (e) {
        return { valid: false, reason: "Failed to decompress" };
      }
    } else {
      positionData = data;
    }

    const snapshotCount = positionData.Position?.length || 0;

    // Check if positions actually vary (not all identical)
    let hasMovement = false;
    if (snapshotCount >= 2) {
      const pos1 = positionData.Position[0];
      const pos2 = positionData.Position[1];
      
      if (pos1?.Entries && pos2?.Entries) {
        const firstDriver = Object.keys(pos1.Entries)[0];
        const coord1 = pos1.Entries[firstDriver];
        const coord2 = pos2.Entries[firstDriver];
        
        if (coord1 && coord2) {
          const distance = Math.sqrt(
            Math.pow((coord2.X || 0) - (coord1.X || 0), 2) +
            Math.pow((coord2.Y || 0) - (coord1.Y || 0), 2)
          );
          hasMovement = distance >= 1;
        }
      }
    }

    // Quality rating
    let quality = "unknown";
    let stars = 0;
    
    if (snapshotCount >= 200 && hasMovement) {
      quality = "excellent";
      stars = 5;
    } else if (snapshotCount >= 100 && hasMovement) {
      quality = "great";
      stars = 4;
    } else if (snapshotCount >= 50 && hasMovement) {
      quality = "good";
      stars = 3;
    } else if (snapshotCount >= 10 && hasMovement) {
      quality = "fair";
      stars = 2;
    } else if (snapshotCount >= 2 && hasMovement) {
      quality = "poor";
      stars = 1;
    } else {
      quality = "insufficient";
      stars = 0;
    }

    return {
      valid: snapshotCount >= 2 && hasMovement,
      snapshotCount,
      hasMovement,
      quality,
      stars,
    };
  } catch (e) {
    return { 
      valid: false, 
      reason: e.name === 'TimeoutError' ? "Timeout" : e.message 
    };
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

    const validation = await validateSession(sessionPath);

    return res.status(200).json({
      sessionPath,
      ...validation,
      timestamp: new Date().toISOString(),
    });
  } catch (e) {
    console.error("Error validating session:", e);
    return res.status(500).json({ 
      error: "Failed to validate session", 
      message: e.message 
    });
  }
}

