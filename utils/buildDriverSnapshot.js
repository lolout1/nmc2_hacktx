/**
 * Build a compact snapshot for the selected driver from current UI state.
 * Only includes immediately relevant, low-volume metrics.
 */

export function buildDriverSnapshot(raceData, driverNumber) {
  try {
    const dn = Number(driverNumber);
    const timing = raceData?.timingData?.Lines?.[dn] || {};
    const driver = raceData?.driverList?.[dn] || {};
    const weather = raceData?.weatherData || {};

    // Optional: some pages may expose a current car data sample per driver
    // Expecting structure like raceData.carDataCurrent[driverNumber]
    const carData = raceData?.carDataCurrent?.[dn] || null;

    return {
      driver: {
        number: dn,
        name: driver?.BroadcastName || driver?.FullName || `Driver #${dn}`,
        team: driver?.TeamName || null
      },
      status: {
        position: timing?.Position ?? null,
        currentLap: raceData?.currentLap ?? null,
        inPit: !!timing?.InPit,
        lastLapTime: timing?.LastLapTime?.Value ?? null,
        bestLapTime: timing?.BestLapTime?.Value ?? null,
        gapToLeader: timing?.GapToLeader ?? null,
        intervalAhead: timing?.IntervalToPositionAhead?.Value ?? null
      },
      car: carData
        ? {
            speed: carData.speed ?? null,
            gear: carData.n_gear ?? null,
            rpm: carData.rpm ?? null,
            throttle: carData.throttle ?? null,
            drs: carData.drs ?? null,
            brake: carData.brake ?? null
          }
        : null,
      conditions: {
        airTemp: weather?.AirTemp ?? null,
        trackTemp: weather?.TrackTemp ?? null,
        humidity: weather?.Humidity ?? null,
        rainfall: weather?.Rainfall ?? null,
        windSpeed: weather?.WindSpeed ?? null,
        windDirection: weather?.WindDirection ?? null,
        pressure: weather?.Pressure ?? null
      }
    };
  } catch (e) {
    return { error: e?.message || 'Failed to build driver snapshot' };
  }
}


