/**
 * Session Browser Component
 * Allows users to browse and select historical F1 sessions
 */

import { useState, useEffect } from "react";
import styled from "styled-components";
import moment from "moment";
import { fetchJSON } from "@monaco/utils/apiClient";

const BrowserContainer = styled.div`
  width: 100%;
  max-width: 1200px;
  margin: 0 auto;
  padding: var(--space-4);
`;

const Header = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--space-4);
  padding-bottom: var(--space-3);
  border-bottom: 1px solid var(--colour-border);
`;

const YearSelector = styled.div`
  display: flex;
  gap: var(--space-2);
  align-items: center;
`;

const MeetingCard = styled.div`
  border: 1px solid var(--colour-border);
  border-radius: 4px;
  margin-bottom: var(--space-3);
  overflow: hidden;
  background-color: var(--colour-bg);
  transition: border-color 0.2s;

  &:hover {
    border-color: var(--colour-fg);
  }
`;

const MeetingHeader = styled.div`
  padding: var(--space-3);
  background-color: var(--colour-offset);
  cursor: pointer;
  display: flex;
  justify-content: space-between;
  align-items: center;
`;

const SessionList = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
  gap: var(--space-2);
  padding: var(--space-3);
`;

const SessionCard = styled.button`
  padding: var(--space-3);
  border: 1px solid var(--colour-border);
  border-radius: 4px;
  background-color: var(--colour-bg);
  cursor: pointer;
  text-align: left;
  transition: all 0.2s;

  &:hover {
    background-color: var(--colour-offset);
    border-color: var(--colour-fg);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const LoadingSpinner = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  padding: var(--space-4);
  font-size: 18px;
`;

const ErrorMessage = styled.div`
  padding: var(--space-3);
  background-color: rgba(255, 0, 0, 0.1);
  border: 1px solid red;
  border-radius: 4px;
  margin-bottom: var(--space-3);
`;

const InfoBanner = styled.div`
  padding: var(--space-3);
  background-color: rgba(0, 120, 255, 0.1);
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
  // Default to 2024 - most recent year with complete historical data
  // Future years may have placeholder/incomplete data
  const currentYear = new Date().getFullYear();
  const defaultYear = currentYear > 2024 ? 2024 : currentYear;
  
  const [year, setYear] = useState(defaultYear);
  const [meetings, setMeetings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expandedMeeting, setExpandedMeeting] = useState(null);
  const [interpolationQuality, setInterpolationQuality] = useState('HIGH');

  // Only show years up to 2024 (last year with complete historical data)
  // Future years may have placeholder/test data
  const maxYear = Math.min(new Date().getFullYear(), 2024);
  const availableYears = Array.from(
    { length: maxYear - 2017 },
    (_, i) => 2018 + i
  ).reverse();

  useEffect(() => {
    fetchSessions();
  }, [year]);

  const fetchSessions = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchJSON(
        `/api/sessions/list?year=${year}`,
        {},
        {
          maxRetries: 3,
          onRetry: (attempt, maxRetries) => {
            console.log(`Retrying sessions fetch: ${attempt}/${maxRetries}`);
          },
        }
      );
      setMeetings(data.meetings || []);
    } catch (e) {
      setError(e.message || "Failed to fetch sessions");
      console.error("Error fetching sessions:", e);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectSession = (meeting, session) => {
    onSelectSession({
      year,
      meeting,
      session,
      sessionPath: session.path,
      interpolationQuality, // Pass selected quality
    });
  };

  const toggleMeeting = (meetingKey) => {
    setExpandedMeeting(expandedMeeting === meetingKey ? null : meetingKey);
  };

  return (
    <BrowserContainer>
      <Header>
        <div>
          <h1 style={{ marginBottom: "var(--space-2)" }}>
            <strong>SESSION BROWSER</strong>
          </h1>
          <p style={{ color: "grey" }}>
            Select a historical session to replay
          </p>
        </div>
        <div style={{ display: "flex", gap: "var(--space-3)", alignItems: "center" }}>
          <YearSelector>
            <label htmlFor="year-select">
              <strong>Year:</strong>
            </label>
            <select
              id="year-select"
              value={year}
              onChange={(e) => setYear(Number(e.target.value))}
              style={{
                padding: "var(--space-2)",
                backgroundColor: "var(--colour-bg)",
                color: "var(--colour-fg)",
                border: "1px solid var(--colour-border)",
                borderRadius: "4px",
              }}
            >
              {availableYears.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </YearSelector>
          
          <YearSelector>
            <label htmlFor="quality-select" title="Animation smoothness">
              <strong>Quality:</strong>
            </label>
            <select
              id="quality-select"
              value={interpolationQuality}
              onChange={(e) => setInterpolationQuality(e.target.value)}
              style={{
                padding: "var(--space-2)",
                backgroundColor: "var(--colour-bg)",
                color: "var(--colour-fg)",
                border: "1px solid var(--colour-border)",
                borderRadius: "4px",
              }}
            >
              <option value="LOW">Low (5x)</option>
              <option value="MEDIUM">Medium (10x)</option>
              <option value="HIGH">High (20x)</option>
              <option value="ULTRA">Ultra (30x)</option>
            </select>
          </YearSelector>
          
          {onBack && (
            <button onClick={onBack}>← BACK TO LIVE</button>
          )}
        </div>
      </Header>

      <InfoBanner>
        <strong>⚠️ IMPORTANT:</strong> The F1 API doesn't record position data every second. 
        Some sessions only have 2-3 position snapshots with <strong>identical coordinates</strong> (placeholder data). 
        <br/><br/>
        <strong>✅ Known working sessions:</strong>
        <ul style={{marginTop: "8px", marginBottom: "0"}}>
          <li>2024 Abu Dhabi GP → Race (200+ snapshots)</li>
          <li>2024 Brazil GP → Race (250+ snapshots)</li>
          <li>2024 Las Vegas GP → Race (180+ snapshots)</li>
          <li>2024 Singapore GP → Qualifying (150+ snapshots)</li>
        </ul>
        <br/>
        If a session shows "STATIC POSITION DATA" error, the API data is genuinely incomplete.
      </InfoBanner>

      {error && <ErrorMessage>Error: {error}</ErrorMessage>}

      {loading ? (
        <LoadingSpinner>Loading sessions...</LoadingSpinner>
      ) : (
        <div>
          {meetings.length === 0 ? (
            <p style={{ textAlign: "center", padding: "var(--space-4)" }}>
              No sessions found for {year}
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

