import styled from "styled-components";
import { useEffect, useState } from "react";

const PitLaneContainer = styled.div`
  position: absolute;
  top: 80px;
  right: 20px;
  background: var(--colour-bg);
  border: 1px solid var(--colour-border);
  border-radius: 8px;
  padding: var(--space-3);
  min-width: 200px;
  max-width: 250px;
  max-height: 400px;
  overflow-y: auto;
  z-index: 100;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);

  ${props => props.isEmpty && `
    display: none;
  `}
`;

const PitLaneTitle = styled.h3`
  margin: 0 0 var(--space-3) 0;
  font-size: 14px;
  font-weight: bold;
  color: var(--colour-fg);
  border-bottom: 2px solid var(--colour-border);
  padding-bottom: var(--space-2);
  display: flex;
  align-items: center;
  gap: var(--space-2);
`;

const PitIcon = styled.span`
  font-size: 18px;
`;

const PitEntry = styled.div`
  display: flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-2);
  margin-bottom: var(--space-2);
  background: rgba(255, 255, 255, 0.05);
  border-radius: 4px;
  border-left: 3px solid ${props => props.teamColor ? `#${props.teamColor}` : 'var(--colour-border)'};

  &:last-child {
    margin-bottom: 0;
  }
`;

const DriverImage = styled.img`
  width: 40px;
  height: 40px;
  border-radius: 50%;
  object-fit: cover;
  border: 2px solid ${props => props.teamColor ? `#${props.teamColor}` : 'var(--colour-border)'};
`;

const DriverImagePlaceholder = styled.div`
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: ${props => props.teamColor ? `#${props.teamColor}` : 'var(--colour-border)'};
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: bold;
  font-size: 14px;
  color: white;
  border: 2px solid ${props => props.teamColor ? `#${props.teamColor}` : 'var(--colour-border)'};
`;

const DriverInfo = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2px;
`;

const DriverName = styled.div`
  font-size: 13px;
  font-weight: bold;
  color: var(--colour-fg);
`;

const DriverNumber = styled.span`
  font-size: 11px;
  color: rgba(255, 255, 255, 0.6);
`;

const PitDuration = styled.div`
  font-size: 11px;
  color: rgba(255, 255, 255, 0.7);
  font-family: 'Courier New', monospace;
`;

const PitLap = styled.div`
  font-size: 10px;
  color: rgba(255, 255, 255, 0.5);
`;

/**
 * PitLane Component
 * Shows which drivers are currently in the pit lane
 * @param {Array} pitStops - Array of pit stop data from OpenF1
 * @param {Object} driverList - Driver information
 * @param {string} currentTime - Current session time (ISO 8601)
 */
const PitLane = ({ pitStops = [], driverList = {}, currentTime }) => {
  const [activePits, setActivePits] = useState([]);

  useEffect(() => {
    if (!pitStops || pitStops.length === 0 || !currentTime) {
      setActivePits([]);
      return;
    }

    // Find pit stops that are active at current time
    // A pit stop is active from its date to date + pit_duration
    const currentTimeMs = new Date(currentTime).getTime();
    
    const active = pitStops.filter(pit => {
      const pitStartTime = new Date(pit.date).getTime();
      const pitEndTime = pitStartTime + (pit.pit_duration * 1000); // Convert seconds to ms
      
      // Check if current time is within pit stop window
      return currentTimeMs >= pitStartTime && currentTimeMs <= pitEndTime;
    });

    // Sort by pit start time (most recent first)
    active.sort((a, b) => new Date(b.date) - new Date(a.date));

    setActivePits(active);
  }, [pitStops, currentTime]);

  if (activePits.length === 0) {
    return null; // Hide component when no one is in pit
  }

  return (
    <PitLaneContainer isEmpty={activePits.length === 0}>
      <PitLaneTitle>
        <PitIcon>🔧</PitIcon>
        PIT LANE ({activePits.length})
      </PitLaneTitle>
      
      {activePits.map((pit, index) => {
        const driver = driverList[pit.driver_number];
        const driverName = driver?.Tla || driver?.BroadcastName || `#${pit.driver_number}`;
        const teamColor = driver?.TeamColour;
        const headshotUrl = driver?.HeadshotUrl;

        return (
          <PitEntry key={`${pit.driver_number}-${pit.date}-${index}`} teamColor={teamColor}>
            {headshotUrl ? (
              <DriverImage 
                src={headshotUrl} 
                alt={driverName}
                teamColor={teamColor}
                onError={(e) => {
                  // Fallback to placeholder if image fails to load
                  e.target.style.display = 'none';
                  e.target.nextSibling.style.display = 'flex';
                }}
              />
            ) : (
              <DriverImagePlaceholder teamColor={teamColor}>
                {driverName.substring(0, 2)}
              </DriverImagePlaceholder>
            )}
            
            <DriverInfo>
              <DriverName>
                {driverName}
                <DriverNumber> #{pit.driver_number}</DriverNumber>
              </DriverName>
              <PitDuration>⏱️ {pit.pit_duration?.toFixed(1)}s</PitDuration>
              <PitLap>Lap {pit.lap_number}</PitLap>
            </DriverInfo>
          </PitEntry>
        );
      })}
    </PitLaneContainer>
  );
};

export default PitLane;

