/**
 * API endpoint to fetch list of available F1 sessions for a given year
 * Returns sessions grouped by race weekends
 */

const f1Url = "https://livetiming.formula1.com";

export default async function handler(req, res) {
  try {
    if (req.method !== "GET") {
      return res.status(405).json({ error: "Method not allowed" });
    }

    const { year } = req.query;
    const targetYear = year || new Date().getFullYear();

    // Fetch the index file which contains all sessions for the year
    const indexResponse = await fetch(
      `${f1Url}/static/${targetYear}/Index.json`,
      {
        headers: {
          "User-Agent": "tdjsnelling/monaco",
        },
      }
    );

    if (indexResponse.status !== 200) {
      return res.status(404).json({ 
        error: "No sessions found for this year",
        year: targetYear 
      });
    }

    const data = await indexResponse.json();

    // Parse and structure the sessions data
    const sessions = Object.entries(data.Meetings || {}).map(([key, meeting]) => {
      const meetingSessions = Object.entries(meeting.Sessions || {}).map(
        ([sessionKey, session]) => ({
          key: sessionKey,
          name: session.Name,
          type: session.Type,
          path: session.Path,
          startDate: session.StartDate,
          endDate: session.EndDate,
        })
      );

      return {
        key,
        name: meeting.Name,
        officialName: meeting.OfficialName,
        location: meeting.Location,
        country: meeting.Country,
        circuit: meeting.Circuit,
        sessions: meetingSessions,
      };
    });

    return res.status(200).json({
      year: targetYear,
      meetings: sessions,
    });
  } catch (e) {
    console.error("Error fetching sessions:", e);
    return res.status(500).json({ 
      error: "Failed to fetch sessions", 
      message: e.message 
    });
  }
}

