/**
 * Strategy Focus Selector
 * Allows race engineers to select which driver to focus strategy calculations on
 */
import styled from "styled-components";
import { useState, useEffect } from "react";

const SelectorBar = styled.div`
  position: absolute;
  top: 10px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 200;
  
  display: flex;
  gap: var(--space-3);
  align-items: center;
  
  background: var(--colour-bg);
  border: 1px solid var(--colour-border);
  border-radius: 8px;
  padding: var(--space-2) var(--space-3);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
  
  transition: all 0.2s ease;
  
  &:hover {
    box-shadow: 0 6px 16px rgba(0, 0, 0, 0.5);
  }
`;

const Label = styled.span`
  font-size: 12px;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.7);
  text-transform: uppercase;
  letter-spacing: 0.5px;
`;

const DriverSelectWrapper = styled.div`
  position: relative;
  display: flex;
  align-items: center;
  gap: var(--space-2);
`;

const TeamIndicator = styled.div`
  width: 4px;
  height: 32px;
  background: ${props => props.$color || 'grey'};
  border-radius: 2px;
  box-shadow: 0 0 8px ${props => props.$color || 'grey'}40;
`;

const DriverSelect = styled.select`
  background: var(--colour-offset);
  color: var(--colour-fg);
  border: 1px solid var(--colour-border);
  border-radius: 4px;
  padding: var(--space-2) var(--space-3);
  font-size: 13px;
  font-weight: 600;
  min-width: 220px;
  cursor: pointer;
  transition: all 0.2s ease;
  
  &:hover {
    background: rgba(255, 255, 255, 0.08);
    border-color: rgba(0, 180, 255, 0.5);
  }
  
  &:focus {
    outline: 2px solid rgba(0, 180, 255, 0.6);
    outline-offset: 2px;
    background: rgba(255, 255, 255, 0.1);
  }
  
  option {
    background: var(--colour-bg);
    padding: var(--space-2);
  }
`;

const QuickSelectButtons = styled.div`
  display: flex;
  gap: var(--space-1);
`;

const QuickButton = styled.button`
  background: ${props => props.$active ? 'rgba(0, 180, 255, 0.3)' : 'var(--colour-offset)'};
  border: 1px solid ${props => props.$active ? 'rgba(0, 180, 255, 0.8)' : 'var(--colour-border)'};
  color: ${props => props.$active ? 'rgba(0, 180, 255, 1)' : 'rgba(255, 255, 255, 0.7)'};
  border-radius: 4px;
  padding: var(--space-1) var(--space-2);
  font-size: 11px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  
  &:hover {
    background: rgba(0, 180, 255, 0.2);
    border-color: rgba(0, 180, 255, 0.6);
    transform: translateY(-1px);
  }
`;

const CompareModeToggle = styled.button`
  background: ${props => props.$active ? 'rgba(0, 180, 255, 0.3)' : 'transparent'};
  border: 1px solid ${props => props.$active ? 'rgba(0, 180, 255, 1)' : 'rgba(255, 255, 255, 0.3)'};
  color: ${props => props.$active ? 'rgba(0, 180, 255, 1)' : 'rgba(255, 255, 255, 0.7)'};
  border-radius: 4px;
  padding: var(--space-2) var(--space-3);
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  gap: var(--space-2);
  
  &:hover {
    background: rgba(0, 180, 255, 0.2);
    border-color: rgba(0, 180, 255, 0.8);
    transform: translateY(-1px);
  }
`;

const PositionBadge = styled.span`
  background: ${props => {
    if (props.$position === 1) return 'gold';
    if (props.$position === 2) return 'silver';
    if (props.$position === 3) return '#CD7F32';
    return 'rgba(255, 255, 255, 0.2)';
  }};
  color: ${props => props.$position <= 3 ? 'black' : 'white'};
  padding: 2px 6px;
  border-radius: 3px;
  font-size: 10px;
  font-weight: 700;
  margin-right: 6px;
`;

const StrategyFocusSelector = ({ 
  driverList = {}, 
  selectedDriver, 
  onDriverSelect,
  compareMode = false,
  onCompareModeToggle 
}) => {
  const [smartSelection, setSmartSelection] = useState(null);

  // Sort drivers by position
  const sortedDrivers = Object.entries(driverList)
    .filter(([_, driver]) => driver && driver.RacingNumber)
    .sort((a, b) => {
      const posA = a[1]?.Line?.Position || 999;
      const posB = b[1]?.Line?.Position || 999;
      return posA - posB;
    });

  // Smart selection: find interesting battles
  useEffect(() => {
    if (sortedDrivers.length === 0) return;

    // Find closest battle (smallest gap between consecutive drivers)
    let closestGap = Infinity;
    let battleDrivers = null;

    for (let i = 0; i < sortedDrivers.length - 1; i++) {
      const [num1, driver1] = sortedDrivers[i];
      const [num2, driver2] = sortedDrivers[i + 1];
      
      const gap = Math.abs(
        (driver1?.Line?.GapToLeader || 0) - 
        (driver2?.Line?.GapToLeader || 0)
      );
      
      if (gap < closestGap && gap > 0) {
        closestGap = gap;
        battleDrivers = [num1, num2];
      }
    }

    setSmartSelection(battleDrivers);
  }, [driverList]);

  // Auto-select leader on first load if nothing selected
  useEffect(() => {
    if (!selectedDriver && sortedDrivers.length > 0) {
      const [leaderNum] = sortedDrivers[0];
      onDriverSelect(leaderNum);
    }
  }, [sortedDrivers, selectedDriver, onDriverSelect]);

  const getDriverColor = (driver) => {
    return driver?.TeamColour ? `#${driver.TeamColour}` : 'grey';
  };

  const selectedDriverData = driverList[selectedDriver];
  const selectedColor = selectedDriverData ? getDriverColor(selectedDriverData) : 'grey';

  // Quick select top 3
  const top3 = sortedDrivers.slice(0, 3);

  return (
    <SelectorBar>
      <Label>🎯 Strategy Focus:</Label>
      
      <DriverSelectWrapper>
        <TeamIndicator $color={selectedColor} />
        
        <DriverSelect 
          value={selectedDriver || ''} 
          onChange={(e) => onDriverSelect(e.target.value)}
        >
          <option value="">Select Driver...</option>
          
          {sortedDrivers.map(([driverNum, driver]) => {
            const position = driver?.Line?.Position || '?';
            const name = driver?.Tla || driver?.BroadcastName || `#${driverNum}`;
            const team = driver?.TeamName || '';
            const gap = driver?.Line?.GapToLeader || 0;
            const gapStr = gap > 0 ? ` +${gap.toFixed(1)}s` : ' LEAD';
            
            return (
              <option key={driverNum} value={driverNum}>
                P{position} | {name} | {team}{position > 1 ? gapStr : ''}
              </option>
            );
          })}
        </DriverSelect>
      </DriverSelectWrapper>
      
      {/* Quick select buttons */}
      <QuickSelectButtons>
        {top3.map(([driverNum, driver], idx) => (
          <QuickButton
            key={driverNum}
            $active={selectedDriver === driverNum}
            onClick={() => onDriverSelect(driverNum)}
            title={`P${idx + 1}: ${driver.Tla || driver.BroadcastName}`}
          >
            P{idx + 1}
          </QuickButton>
        ))}
      </QuickSelectButtons>
      
      {/* Compare mode toggle */}
      <CompareModeToggle 
        $active={compareMode}
        onClick={onCompareModeToggle}
        title="Compare strategies for multiple drivers"
      >
        <span>{compareMode ? '✓' : '◫'}</span>
        {compareMode ? 'Comparing' : 'Compare'}
      </CompareModeToggle>
    </SelectorBar>
  );
};

export default StrategyFocusSelector;

