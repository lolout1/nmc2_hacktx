/**
 * Playback Controls Component
 * Controls for historical session playback (play/pause/seek/speed)
 */

import { useState, useEffect, useRef } from "react";
import styled from "styled-components";
import moment from "moment";

const ControlsContainer = styled.div`
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  background-color: var(--colour-bg);
  border-top: 1px solid var(--colour-border);
  padding: var(--space-3);
  z-index: 1000;
  box-shadow: 0 -2px 10px rgba(0, 0, 0, 0.3);
`;

const ControlsInner = styled.div`
  max-width: 1400px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
`;

const ProgressBar = styled.div`
  width: 100%;
  height: 8px;
  background-color: var(--colour-offset);
  border-radius: 4px;
  cursor: pointer;
  position: relative;
  overflow: hidden;

  &:hover {
    height: 12px;
  }

  transition: height 0.2s;
`;

const ProgressFill = styled.div`
  height: 100%;
  background: linear-gradient(90deg, red, yellow, limegreen);
  border-radius: 4px;
  transition: width 0.1s linear;
`;

const ButtonRow = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: var(--space-3);
`;

const ButtonGroup = styled.div`
  display: flex;
  gap: var(--space-2);
  align-items: center;
`;

const ControlButton = styled.button`
  padding: var(--space-2) var(--space-3);
  min-width: 80px;
  font-weight: ${({ primary }) => (primary ? "bold" : "normal")};
  background-color: ${({ primary }) =>
    primary ? "red" : "var(--colour-offset)"};
  
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const SpeedButton = styled.button`
  padding: var(--space-2);
  min-width: 50px;
  background-color: ${({ active }) =>
    active ? "red" : "var(--colour-offset)"};
  font-weight: ${({ active }) => (active ? "bold" : "normal")};
`;

const TimeDisplay = styled.div`
  font-family: monospace;
  font-size: 14px;
  color: grey;
`;

const SessionInfo = styled.div`
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
`;

export default function PlaybackControls({
  isPlaying,
  progress,
  currentTime,
  playbackSpeed,
  sessionInfo,
  onPlay,
  onPause,
  onSeek,
  onSpeedChange,
  onReset,
  onExit,
}) {
  const [isDragging, setIsDragging] = useState(false);
  const progressBarRef = useRef(null);

  // Cap at 5x for accurate tracking - 10x causes cars to go off track due to interpolation limits
  const speeds = [0.5, 1, 2, 5];

  const handleProgressClick = (e) => {
    if (!progressBarRef.current) return;
    
    const rect = progressBarRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percentage = (x / rect.width) * 100;
    onSeek(Math.max(0, Math.min(100, percentage)));
  };

  const handleProgressMouseDown = (e) => {
    setIsDragging(true);
    handleProgressClick(e);
  };

  const handleProgressMouseMove = (e) => {
    if (isDragging && progressBarRef.current) {
      handleProgressClick(e);
    }
  };

  const handleProgressMouseUp = () => {
    setIsDragging(false);
  };

  useEffect(() => {
    if (isDragging) {
      document.addEventListener("mousemove", handleProgressMouseMove);
      document.addEventListener("mouseup", handleProgressMouseUp);
      return () => {
        document.removeEventListener("mousemove", handleProgressMouseMove);
        document.removeEventListener("mouseup", handleProgressMouseUp);
      };
    }
  }, [isDragging]);

  const formatTime = (utcString) => {
    if (!utcString) return "--:--:--";
    return moment.utc(utcString).format("HH:mm:ss");
  };

  return (
    <ControlsContainer>
      <ControlsInner>
        <ProgressBar
          ref={progressBarRef}
          onClick={handleProgressClick}
          onMouseDown={handleProgressMouseDown}
        >
          <ProgressFill style={{ width: `${progress}%` }} />
        </ProgressBar>

        <ButtonRow>
          <SessionInfo>
            <div>
              <strong>
                {sessionInfo?.meeting?.officialName || "Historical Session"}
              </strong>
              {" - "}
              {sessionInfo?.session?.name || "Replay Mode"}
            </div>
            <TimeDisplay>
              Time: {formatTime(currentTime)} | Progress: {progress.toFixed(1)}%
            </TimeDisplay>
          </SessionInfo>

          <ButtonGroup>
            <ControlButton onClick={onReset} title="Reset to beginning">
              ⏮ Reset
            </ControlButton>
            
            {isPlaying ? (
              <ControlButton onClick={onPause} primary title="Pause">
                ⏸ Pause
              </ControlButton>
            ) : (
              <ControlButton onClick={onPlay} primary title="Play">
                ▶ Play
              </ControlButton>
            )}
          </ButtonGroup>

          <ButtonGroup>
            <span style={{ marginRight: "var(--space-2)" }}>Speed:</span>
            {speeds.map((speed) => (
              <SpeedButton
                key={speed}
                active={playbackSpeed === speed}
                onClick={() => onSpeedChange(speed)}
                title={`${speed}x speed`}
              >
                {speed}x
              </SpeedButton>
            ))}
          </ButtonGroup>

          <ControlButton onClick={onExit}>
            ✕ Exit Replay
          </ControlButton>
        </ButtonRow>
      </ControlsInner>
    </ControlsContainer>
  );
}

