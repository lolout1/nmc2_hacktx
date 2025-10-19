/**
 * OpenF1 Data Transformer
 * Converts OpenF1 API data format to the format expected by our replay engine
 * 
 * OpenF1 provides:
 * - location: [{date, driver_number, x, y, z, ...}, ...]
 * - car_data: [{date, driver_number, speed, rpm, throttle, brake, n_gear, drs, ...}, ...]
 * - drivers: [{driver_number, full_name, team_name, team_colour, ...}, ...]
 * 
 * We need to transform this to Monaco's format:
 * - Position: {Position: [{Timestamp, Entries: {driver_number: {X, Y, Z, Status}}}]}
 * - CarData: {Entries: [{Utc, Cars: {driver_number: {Speed, RPM, Throttle, ...}}}]}
 * - DriverList: {driver_number: {RacingNumber, BroadcastName, Tla, TeamName, TeamColour}}
 */

/**
 * Transform OpenF1 drivers data to Monaco DriverList format
 * @param {Array} drivers - OpenF1 drivers array
 * @returns {Object} Monaco DriverList format
 */
export function transformDrivers(drivers) {
  const driverList = {};
  
  drivers.forEach(driver => {
    driverList[driver.driver_number] = {
      RacingNumber: String(driver.driver_number),
      BroadcastName: driver.broadcast_name || driver.full_name,
      Tla: driver.name_acronym || driver.broadcast_name?.substring(0, 3) || 'UNK',
      FirstName: driver.first_name,
      LastName: driver.last_name,
      FullName: driver.full_name,
      TeamName: driver.team_name,
      TeamColour: driver.team_colour,
      HeadshotUrl: driver.headshot_url,
      CountryCode: driver.country_code,
    };
  });

  console.log(`[Transformer] Transformed ${Object.keys(driverList).length} drivers`);
  return driverList;
}

/**
 * Transform OpenF1 location data to Monaco Position format
 * Groups location data by timestamp and creates Position snapshots
 * @param {Array} locationData - OpenF1 location data array
 * @returns {Object} Monaco Position format: {Position: [snapshots]}
 */
export function transformLocation(locationData) {
  if (!locationData || locationData.length === 0) {
    console.warn('[Transformer] No location data to transform');
    return { Position: [] };
  }

  // Group location data by timestamp (date field)
  const groupedByTime = {};
  
  locationData.forEach(point => {
    const timestamp = point.date;
    if (!groupedByTime[timestamp]) {
      groupedByTime[timestamp] = {
        Timestamp: timestamp,
        Entries: {},
      };
    }
    
    groupedByTime[timestamp].Entries[point.driver_number] = {
      X: point.x,
      Y: point.y,
      Z: point.z,
      Status: 'OnTrack', // OpenF1 doesn't provide status, assume on track
    };
  });

  // Convert to array and sort by timestamp
  const positionSnapshots = Object.values(groupedByTime).sort((a, b) => {
    return new Date(a.Timestamp) - new Date(b.Timestamp);
  });

  console.log(`[Transformer] Created ${positionSnapshots.length} position snapshots from ${locationData.length} location points`);
  
  // Sample check: log first and last snapshot
  if (positionSnapshots.length > 0) {
    const first = positionSnapshots[0];
    const last = positionSnapshots[positionSnapshots.length - 1];
    console.log(`[Transformer] First position timestamp: ${first.Timestamp}, drivers: ${Object.keys(first.Entries).length}`);
    console.log(`[Transformer] Last position timestamp: ${last.Timestamp}, drivers: ${Object.keys(last.Entries).length}`);
  }

  return {
    Position: positionSnapshots,
  };
}

/**
 * Transform OpenF1 car_data to Monaco CarData format
 * Groups car data by timestamp and creates CarData snapshots
 * @param {Array} carData - OpenF1 car_data array
 * @returns {Object} Monaco CarData format: {Entries: [snapshots]}
 */
export function transformCarData(carData) {
  if (!carData || carData.length === 0) {
    console.warn('[Transformer] No car data to transform');
    return { Entries: [] };
  }

  // Group car data by timestamp
  const groupedByTime = {};
  
  carData.forEach(data => {
    const timestamp = data.date;
    if (!groupedByTime[timestamp]) {
      groupedByTime[timestamp] = {
        Utc: timestamp,
        Cars: {},
      };
    }
    
    groupedByTime[timestamp].Cars[data.driver_number] = {
      Channels: {
        0: data.rpm || 0,           // RPM
        2: data.speed || 0,          // Speed (km/h)
        3: data.n_gear || 0,         // Gear
        4: data.throttle || 0,       // Throttle (0-100)
        5: data.brake ? 100 : 0,     // Brake (0 or 100)
        45: data.drs || 0,           // DRS status
      },
    };
  });

  // Convert to array and sort by timestamp
  const carDataSnapshots = Object.values(groupedByTime).sort((a, b) => {
    return new Date(a.Utc) - new Date(b.Utc);
  });

  console.log(`[Transformer] Created ${carDataSnapshots.length} car data snapshots from ${carData.length} car data points`);

  return {
    Entries: carDataSnapshots,
  };
}

/**
 * Transform OpenF1 race_control messages to Monaco RaceControlMessages format
 * @param {Array} raceControl - OpenF1 race_control array
 * @returns {Object} Monaco RaceControlMessages format
 */
export function transformRaceControl(raceControl) {
  const messages = {};
  
  if (raceControl && raceControl.length > 0) {
    raceControl.forEach((msg, index) => {
      const key = msg.date || `msg_${index}`;
      messages[key] = {
        Utc: msg.date,
        Lap: msg.lap_number,
        Category: msg.category,
        Flag: msg.flag,
        Scope: msg.scope,
        Sector: msg.sector,
        Message: msg.message,
        Status: msg.status,
      };
    });
  }

  console.log(`[Transformer] Transformed ${Object.keys(messages).length} race control messages`);
  
  return {
    Messages: messages,
  };
}

/**
 * Transform OpenF1 weather data to Monaco WeatherData format
 * Uses the most recent weather data point
 * @param {Array} weather - OpenF1 weather array
 * @returns {Object} Monaco WeatherData format
 */
export function transformWeather(weather) {
  if (!weather || weather.length === 0) {
    return {
      AirTemp: 25,
      TrackTemp: 30,
      Humidity: 50,
      Pressure: 1013,
      WindDirection: 0,
      WindSpeed: 0,
      Rainfall: 0,
    };
  }

  // Use the most recent weather data
  const latest = weather[weather.length - 1];

  return {
    AirTemp: latest.air_temperature || 25,
    TrackTemp: latest.track_temperature || 30,
    Humidity: latest.humidity || 50,
    Pressure: latest.pressure || 1013,
    WindDirection: latest.wind_direction || 0,
    WindSpeed: latest.wind_speed || 0,
    Rainfall: latest.rainfall || 0,
  };
}

/**
 * Transform OpenF1 session and meeting info to Monaco SessionInfo format
 * @param {Object} sessionInfo - OpenF1 session object
 * @param {Object} meeting - OpenF1 meeting object
 * @returns {Object} Monaco SessionInfo format
 */
export function transformSessionInfo(sessionInfo, meeting) {
  return {
    Meeting: {
      Name: meeting.meeting_name,
      OfficialName: meeting.meeting_official_name || meeting.meeting_name,
      Location: meeting.location,
      Country: {
        Name: meeting.country_name,
        Code: meeting.country_code,
      },
      Circuit: {
        Key: meeting.circuit_key,
        ShortName: meeting.circuit_short_name,
      },
    },
    Name: sessionInfo.session_name,
    Type: sessionInfo.session_type,
    StartDate: sessionInfo.date_start,
    EndDate: sessionInfo.date_end,
    GmtOffset: sessionInfo.gmt_offset,
    Path: `${sessionInfo.year}/${meeting.meeting_name}/`, // For compatibility
  };
}

/**
 * Create timing data from positions and laps
 * This creates a basic timing table structure
 * @param {Array} positions - OpenF1 position data
 * @param {Array} drivers - OpenF1 drivers data
 * @param {Array} laps - OpenF1 laps data
 * @returns {Object} Monaco TimingData format
 */
export function transformTimingData(positions, drivers, laps) {
  const lines = {};
  
  // Safety check - ensure arrays exist
  const safePositions = positions || [];
  const safeDrivers = drivers || [];
  const safeLaps = laps || [];
  
  // Get the latest position for each driver
  const latestPositions = {};
  if (safePositions.length > 0) {
    safePositions.forEach(pos => {
      if (pos && pos.driver_number !== undefined) {
        latestPositions[pos.driver_number] = pos.position || 0;
      }
    });
  }

  // Create timing lines for each driver
  safeDrivers.forEach(driver => {
    if (!driver || driver.driver_number === undefined) {
      return;
    }
    
    const driverLaps = safeLaps.filter(lap => lap.driver_number === driver.driver_number);
    const lastLap = driverLaps[driverLaps.length - 1];
    const position = latestPositions[driver.driver_number] || (Object.keys(lines).length + 1);

    lines[driver.driver_number] = {
      RacingNumber: String(driver.driver_number),
      Line: String(position),
      Position: String(position),
      ShowPosition: true,
      NumberOfLaps: driverLaps.length,
      InPit: false,
      PitOut: false,
      Stopped: false,
      Retired: false,
      Status: 0,
      Sectors: lastLap ? [
        { Value: lastLap.duration_sector_1 || 0 },
        { Value: lastLap.duration_sector_2 || 0 },
        { Value: lastLap.duration_sector_3 || 0 },
      ] : [
        { Value: 0 },
        { Value: 0 },
        { Value: 0 },
      ],
      BestLapTime: {
        Value: lastLap?.lap_duration || 0,
      },
      LastLapTime: {
        Value: lastLap?.lap_duration || 0,
      },
    };
  });

  console.log(`[Transformer] Created timing data for ${Object.keys(lines).length} drivers`);

  return {
    Lines: lines,
    SessionPart: 1,
  };
}

/**
 * Create timing stats (speed trap data)
 * @param {Array} laps - OpenF1 laps data
 * @param {Array} drivers - OpenF1 drivers data
 * @returns {Object} Monaco TimingStats format
 */
export function transformTimingStats(laps, drivers) {
  const lines = {};
  
  const safeDrivers = drivers || [];
  const safeLaps = laps || [];
  
  // Create stats for each driver
  safeDrivers.forEach(driver => {
    if (!driver || driver.driver_number === undefined) {
      return;
    }
    
    const driverLaps = safeLaps.filter(lap => lap.driver_number === driver.driver_number);
    
    // Find best speeds from laps
    let bestI1Speed = 0;
    let bestI2Speed = 0;
    let bestSTSpeed = 0;
    
    driverLaps.forEach(lap => {
      if (lap.i1_speed && lap.i1_speed > bestI1Speed) bestI1Speed = lap.i1_speed;
      if (lap.i2_speed && lap.i2_speed > bestI2Speed) bestI2Speed = lap.i2_speed;
      if (lap.st_speed && lap.st_speed > bestSTSpeed) bestSTSpeed = lap.st_speed;
    });
    
    lines[driver.driver_number] = {
      RacingNumber: String(driver.driver_number),
      BestSpeeds: {
        I1: { Value: bestI1Speed || 0 },
        I2: { Value: bestI2Speed || 0 },
        ST: { Value: bestSTSpeed || 0 },
      },
      PersonalBestLapTime: driverLaps.length > 0 
        ? { Value: Math.min(...driverLaps.map(l => l.lap_duration || Infinity)) }
        : { Value: 0 },
    };
  });

  console.log(`[Transformer] Created timing stats for ${Object.keys(lines).length} drivers`);

  return {
    Lines: lines,
  };
}

/**
 * Transform complete OpenF1 session data to Monaco replay format
 * This is the main entry point for data transformation
 * @param {Object} openf1Data - Complete OpenF1 data object
 * @returns {Object} Monaco-compatible session data
 */
export function transformCompleteSession(openf1Data) {
  console.log('[Transformer] Starting complete session transformation');
  
  const {
    sessionInfo,
    meeting,
    drivers,
    locationData,
    carData,
    laps,
    positions,
    raceControl,
    intervals,
    weather,
  } = openf1Data;

  // Transform each data type
  const monacoData = {
    // Static data
    SessionInfo: transformSessionInfo(sessionInfo, meeting),
    DriverList: transformDrivers(drivers),
    WeatherData: transformWeather(weather),
    TimingData: transformTimingData(positions, drivers, laps),
    TimingStats: transformTimingStats(laps, drivers),
    TimingAppData: {
      Lines: {}, // Not available in OpenF1
    },
    
    // Time-series data
    Position: transformLocation(locationData),
    CarData: transformCarData(carData),
    RaceControlMessages: transformRaceControl(raceControl),
    TeamRadio: {
      Captures: {}, // Not available in OpenF1 (requires team_radio endpoint)
    },
    
    // Additional data
    SessionData: {
      StatusSeries: [], // Not available in OpenF1
    },
    TrackStatus: {
      Status: '1',
      Message: 'AllClear',
    },
    LapCount: {
      CurrentLap: laps.length > 0 ? Math.max(...laps.map(l => l.lap_number)) : 0,
      TotalLaps: laps.length > 0 ? Math.max(...laps.map(l => l.lap_number)) : 0,
    },
    Heartbeat: {
      Utc: new Date().toISOString(),
    },
    ExtrapolatedClock: {
      Utc: sessionInfo.date_start,
      Remaining: '00:00:00',
      Extrapolating: false,
    },
  };

  console.log('[Transformer] Transformation complete');
  console.log('[Transformer] Summary:', {
    drivers: Object.keys(monacoData.DriverList).length,
    positionSnapshots: monacoData.Position.Position.length,
    carDataSnapshots: monacoData.CarData.Entries.length,
    raceControlMessages: Object.keys(monacoData.RaceControlMessages.Messages).length,
  });

  return monacoData;
}

export default {
  transformDrivers,
  transformLocation,
  transformCarData,
  transformRaceControl,
  transformWeather,
  transformSessionInfo,
  transformTimingData,
  transformTimingStats,
  transformCompleteSession,
};

