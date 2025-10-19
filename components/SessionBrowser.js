/**
 * Session Browser Component
 * Allows users to browse and select historical F1 sessions
 * Modern UI with glass-morphism and blue accents
 */

import { useState, useEffect } from "react";
import styled, { keyframes, css } from "styled-components";
import moment from "moment";
import { fetchJSON } from "@monaco/utils/apiClient";
import { GlassCard, ModernButton, Badge, Flex, Spinner } from "./ModernUI";

const fadeIn = keyframes`
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
`;

const BrowserContainer = styled.div`
  width: 100%;
  max-width: 1400px;
  margin: 0 auto;
  padding: var(--spacing-xl);
  ${css`animation: ${fadeIn} 0.5s ease-out;`}
`;

const Header = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--spacing-xl);
  padding-bottom: var(--spacing-lg);
  border-bottom: 1px solid var(--color-border-strong);
  position: relative;
  
  &::after {
    content: '';
    position: absolute;
    bottom: -1px;
    left: 0;
    width: 100px;
    height: 2px;
    background: linear-gradient(90deg, var(--color-blue-primary) 0%, transparent 100%);
  }
  
  h1 {
    font-size: var(--font-xxxl);
    background: linear-gradient(135deg, var(--color-text-primary) 0%, var(--color-blue-primary) 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
  }
`;

const YearSelector = styled.div`
  display: flex;
  gap: var(--spacing-sm);
  align-items: center;
`;

const MeetingCard = styled(GlassCard)`
  margin-bottom: var(--spacing-lg);
  overflow: hidden;
  border: 1px solid var(--color-border-strong);
  
  &:hover {
    border-color: var(--color-blue-primary);
  }
`;

const MeetingHeader = styled.div`
  padding: var(--spacing-lg);
  background: linear-gradient(135deg, 
    rgba(0, 180, 255, 0.1) 0%, 
    transparent 100%
  );
  cursor: pointer;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid var(--color-border-default);
  transition: all var(--transition-fast);
  
  &:hover {
    background: linear-gradient(135deg, 
      rgba(0, 180, 255, 0.15) 0%, 
      transparent 100%
    );
  }
  
  h2 {
    font-size: var(--font-xl);
    color: var(--color-text-primary);
    display: flex;
    align-items: center;
    gap: var(--spacing-sm);
  }
`;

const SessionList = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: var(--spacing-md);
  padding: var(--spacing-lg);
  background: rgba(10, 10, 15, 0.3);
`;

const SessionCard = styled.button`
  padding: var(--spacing-lg);
  border: 1px solid var(--color-border-default);
  border-radius: var(--radius-lg);
  background: linear-gradient(135deg, 
    rgba(26, 26, 38, 0.8) 0%, 
    rgba(18, 18, 26, 0.6) 100%
  );
  backdrop-filter: blur(8px);
  cursor: pointer;
  text-align: left;
  transition: all var(--transition-normal);
  position: relative;
  overflow: hidden;
  
  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 2px;
    background: linear-gradient(90deg, 
      transparent 0%, 
      var(--color-blue-primary) 50%, 
      transparent 100%
    );
    opacity: 0;
    transition: opacity var(--transition-fast);
  }

  &:hover {
    background: linear-gradient(135deg, 
      rgba(26, 26, 38, 1) 0%, 
      rgba(18, 18, 26, 0.8) 100%
    );
    border-color: var(--color-blue-primary);
    transform: translateY(-4px);
    box-shadow: var(--shadow-glow);
    
    &::before {
      opacity: 1;
    }
  }

  &:disabled {
    opacity: 0.4;
    cursor: not-allowed;
    
    &:hover {
      transform: none;
      box-shadow: none;
    }
  }
`;

const LoadingContainer = styled.div`
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  padding: var(--spacing-xxl);
  gap: var(--spacing-lg);
`;

const ErrorMessage = styled(GlassCard)`
  padding: var(--spacing-lg);
  background: linear-gradient(135deg, 
    rgba(255, 51, 85, 0.15) 0%, 
    rgba(255, 51, 85, 0.05) 100%
  );
  border: 1px solid rgba(255, 51, 85, 0.5);
  margin-bottom: var(--spacing-lg);
`;

const InfoBanner = styled(GlassCard)`
  padding: var(--spacing-lg);
  background: linear-gradient(135deg, 
    rgba(0, 180, 255, 0.12) 0%, 
    rgba(0, 180, 255, 0.05) 100%
  );
  border: 1px solid rgba(0, 120, 255, 0.5);
  border-radius: 4px;
  margin-bottom: var(--space-3);
  font-size: 14px;
  line-height: 1.6;
  
  strong {
    color: rgba(0, 180, 255, 1);
  }
`;

const SessionType = styled.span`
  display: inline-block;
  padding: 2px 8px;
  border-radius: 3px;
  font-size: 11px;
  font-weight: bold;
  background-color: ${({ type }) => {
    switch (type) {
      case "Race":
        return "red";
      case "Qualifying":
        return "yellow";
      case "Sprint":
        return "orange";
      default:
        return "var(--colour-offset)";
    }
  }};
  color: ${({ type }) =>
    type === "Qualifying" ? "var(--colour-bg)" : "var(--colour-fg)"};
  margin-bottom: var(--space-2);
`;

export default function SessionBrowser({ onSelectSession, onBack }) {
  const [meetings, setMeetings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expandedMeeting, setExpandedMeeting] = useState(null);
  const [interpolationQuality, setInterpolationQuality] = useState('HIGH');

  useEffect(() => {
    fetchSessions();
  }, []);

  const fetchSessions = async () => {
    setLoading(true);
    setError(null);
    try {
      // Fetch OpenF1 sessions
      const data = await fetchJSON(
        `/api/openf1/sessions`,
        {},
        {
          maxRetries: 3,
          onRetry: (attempt, maxRetries) => {
            console.log(`Retrying OpenF1 sessions fetch: ${attempt}/${maxRetries}`);
          },
        }
      );
      
      // Transform OpenF1 sessions to meeting format
      const transformedMeetings = data.sessions.map(session => ({
        key: session.sessionKey,
        name: session.name,
        officialName: session.name,
        location: session.location,
        country: {
          Name: session.countryName,
        },
        circuit: session.circuitShortName,
        sessions: [{
          key: session.sessionKey,
          name: session.sessionName,
          type: session.sessionType,
          startDate: session.dateStart,
          endDate: session.dateEnd,
          sessionKey: session.sessionKey,
          meetingKey: session.meetingKey,
        }],
      }));
      
      setMeetings(transformedMeetings);
      // Auto-expand the first (and only) meeting
      if (transformedMeetings.length > 0) {
        setExpandedMeeting(transformedMeetings[0].key);
      }
    } catch (e) {
      setError(e.message || "Failed to fetch OpenF1 sessions");
      console.error("Error fetching OpenF1 sessions:", e);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectSession = (meeting, session) => {
    onSelectSession({
      sessionKey: session.sessionKey,
      meetingKey: session.meetingKey,
      name: session.name,
      type: session.type,
      interpolationQuality,
    });
  };

  const toggleMeeting = (meetingKey) => {
    setExpandedMeeting(expandedMeeting === meetingKey ? null : meetingKey);
  };

  return (
    <BrowserContainer>
      <Header>
        <div>
          <h1>
            OPENF1 HISTORICAL SESSION
          </h1>
          <p style={{ color: "var(--color-text-secondary)", fontSize: "var(--font-lg)", marginTop: "var(--spacing-sm)" }}>
            Select the historical session to replay
          </p>
        </div>
        <Flex $gap="var(--spacing-lg)">
          <YearSelector>
            <label htmlFor="quality-select" title="Animation smoothness" style={{ 
              fontSize: "var(--font-base)", 
              fontWeight: "var(--font-semibold)",
              color: "var(--color-text-secondary)"
            }}>
              Quality:
            </label>
            <select
              id="quality-select"
              value={interpolationQuality}
              onChange={(e) => setInterpolationQuality(e.target.value)}
              style={{
                padding: "var(--spacing-sm) var(--spacing-md)",
                background: "rgba(18, 18, 26, 0.8)",
                border: "1px solid var(--color-border-default)",
                borderRadius: "var(--radius-md)",
                color: "var(--color-text-primary)",
                fontSize: "var(--font-base)",
                cursor: "pointer",
                transition: "all var(--transition-fast)",
              }}
            >
              <option value="LOW">Low (5x)</option>
              <option value="MEDIUM">Medium (10x)</option>
              <option value="HIGH">High (20x)</option>
              <option value="ULTRA">Ultra (30x)</option>
            </select>
          </YearSelector>
          
          {onBack && (
            <ModernButton $variant="secondary" onClick={onBack}>
              ← BACK TO LIVE
            </ModernButton>
          )}
        </Flex>
      </Header>

      <InfoBanner $accent>
        <div style={{ lineHeight: 1.8 }}>
          <Flex $gap="var(--spacing-sm)" $align="flex-start" style={{ marginBottom: "var(--spacing-md)" }}>
            <Badge $variant="info" $glow>🏎️ OpenF1 API</Badge>
            <span style={{ color: "var(--color-text-primary)", fontSize: "var(--font-base)" }}>
              Now using OpenF1 API for historical replay data
            </span>
          </Flex>
          
          <div style={{ fontSize: "var(--font-base)", color: "var(--color-text-secondary)" }}>
            <strong style={{ color: "var(--color-text-primary)" }}>✅ Available Session:</strong>
            <ul style={{ marginTop: "var(--spacing-sm)", marginBottom: "var(--spacing-md)", paddingLeft: "var(--spacing-lg)" }}>
              <li><strong style={{ color: "var(--color-blue-primary)" }}>2023 Singapore Grand Prix - Practice 1</strong></li>
              <li>Complete location data (X,Y,Z coordinates) for real-time map tracking</li>
              <li>Full telemetry: car position, speed, throttle, brake, RPM, gear, DRS</li>
              <li>Race control messages, lap times, and driver information</li>
            </ul>
            
            <p style={{ fontSize: "var(--font-sm)", color: "var(--color-text-tertiary)", marginBottom: "var(--spacing-sm)" }}>
              <strong>Note:</strong> Practice sessions have the most complete telemetry data.
            </p>
            
            <p style={{ fontSize: "var(--font-sm)" }}>
              Data source: <a href="https://openf1.org" target="_blank" rel="noopener noreferrer" 
                style={{ color: "var(--color-blue-primary)", fontWeight: "var(--font-semibold)" }}>
                api.openf1.org
              </a>
            </p>
          </div>
        </div>
      </InfoBanner>

      {error && (
        <ErrorMessage>
          <Flex $gap="var(--spacing-sm)">
            <Badge $variant="error">⚠️</Badge>
            <div>
              <strong style={{ color: "var(--color-error)", fontSize: "var(--font-lg)" }}>Error Loading Sessions</strong>
              <p style={{ marginTop: "var(--spacing-xs)", color: "var(--color-text-secondary)" }}>{error}</p>
            </div>
          </Flex>
        </ErrorMessage>
      )}

      {loading ? (
        <LoadingContainer>
          <Spinner $size="40px" />
          <p style={{ fontSize: "var(--font-lg)", color: "var(--color-text-secondary)" }}>
            Loading OpenF1 sessions...
          </p>
        </LoadingContainer>
      ) : (
        <div>
          {meetings.length === 0 ? (
            <p style={{ textAlign: "center", padding: "var(--space-4)" }}>
              No OpenF1 sessions available
            </p>
          ) : (
            meetings.map((meeting) => (
              <MeetingCard key={meeting.key}>
                <MeetingHeader onClick={() => toggleMeeting(meeting.key)}>
                  <div>
                    <strong>{meeting.officialName}</strong>
                    <br />
                    <span style={{ color: "grey", fontSize: "14px" }}>
                      {meeting.location}, {meeting.country?.Name || meeting.country}
                    </span>
                  </div>
                  <span>{expandedMeeting === meeting.key ? "▼" : "►"}</span>
                </MeetingHeader>

                {expandedMeeting === meeting.key && (
                  <SessionList>
                    {meeting.sessions.map((session) => (
                      <SessionCard
                        key={session.key}
                        onClick={() => handleSelectSession(meeting, session)}
                      >
                        <SessionType type={session.type}>
                          {session.type}
                        </SessionType>
                        <div>
                          <strong>{session.name}</strong>
                        </div>
                        <div style={{ fontSize: "12px", color: "grey", marginTop: "var(--space-2)" }}>
                          {session.startDate && moment.utc(session.startDate).format("MMM D, HH:mm")} UTC
                        </div>
                      </SessionCard>
                    ))}
                  </SessionList>
                )}
              </MeetingCard>
            ))
          )}
        </div>
      )}
    </BrowserContainer>
  );
}

