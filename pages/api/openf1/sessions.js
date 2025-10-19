/**
 * API endpoint to list available OpenF1 sessions
 * For now, returns a single curated historical session (2023 Singapore GP Race)
 */

export default async function handler(req, res) {
  try {
    if (req.method !== 'GET') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    // Curated sessions with complete location data (X,Y,Z coordinates for map)
    // Practice sessions have the most complete telemetry data
    // session_key=9161 is Practice 1 from 2023 Singapore GP (meeting_key=1219)
    
    const curatedSessions = [
      {
        sessionKey: 9161,
        meetingKey: 1219,
        name: '2023 Singapore Grand Prix - Practice 1',
        sessionName: 'Practice 1',
        countryName: 'Singapore',
        circuitShortName: 'Singapore',
        location: 'Marina Bay',
        dateStart: '2023-09-16T09:30:00+00:00',
        dateEnd: '2023-09-16T10:30:00+00:00',
        year: 2023,
        sessionType: 'Practice',
        description: 'Full practice session with complete telemetry, location, and car data',
      },
    ];

    return res.status(200).json({
      sessions: curatedSessions,
      count: curatedSessions.length,
      source: 'OpenF1 API',
    });
  } catch (error) {
    console.error('Error fetching OpenF1 sessions:', error);
    return res.status(500).json({
      error: 'Failed to fetch sessions',
      message: error.message,
    });
  }
}

