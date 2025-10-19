/**
 * Race Browser Component
 *
 * Browse and load historical race sessions
 * Shows cached races and allows fetching new ones
 */

import React, { useState, useEffect } from 'react';
import styled from 'styled-components';

const BrowserContainer = styled.div`
  position: fixed;
  top: 80px;
  right: 16px;
  width: 400px;
  max-height: 600px;
  background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
  border-radius: 12px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
  border: 1px solid rgba(225, 6, 0, 0.3);
  display: flex;
  flex-direction: column;
  z-index: 1000;
`;

const Header = styled.div`
  padding: var(--space-3);
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  background: linear-gradient(135deg, rgba(225, 6, 0, 0.1) 0%, transparent 100%);
`;

const Title = styled.h3`
  margin: 0;
  font-size: 16px;
  font-weight: 700;
  color: var(--colour-fg);
  display: flex;
  align-items: center;
  gap: 8px;
`;

const CloseButton = styled.button`
  position: absolute;
  top: 12px;
  right: 12px;
  background: rgba(255, 68, 68, 0.2);
  border: 1px solid rgba(255, 68, 68, 0.5);
  color: #ff4444;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  cursor: pointer;
  font-size: 16px;
  transition: all 0.2s ease;

  &:hover {
    background: rgba(255, 68, 68, 0.4);
    transform: scale(1.1);
  }
`;

const Content = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: var(--space-3);
`;

const StatsBar = styled.div`
  display: flex;
  justify-content: space-between;
  padding: var(--space-2);
  background: rgba(255, 255, 255, 0.03);
  border-radius: 6px;
  margin-bottom: var(--space-3);
  font-size: 11px;
  color: #aaa;
`;

const SessionList = styled.div`
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
`;

const SessionCard = styled.div`
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid ${props => props.$isActive ? '#e10600' : 'rgba(255, 255, 255, 0.1)'};
  border-radius: 8px;
  padding: var(--space-3);
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background: rgba(255, 255, 255, 0.08);
    border-color: #e10600;
    transform: translateY(-2px);
  }
`;

const SessionHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 8px;
`;

const SessionTitle = styled.div`
  font-size: 14px;
  font-weight: 700;
  color: var(--colour-fg);
`;

const SessionType = styled.span`
  background: rgba(225, 6, 0, 0.3);
  color: #ff6b6b;
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 9px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.5px;
`;

const SessionInfo = styled.div`
  font-size: 12px;
  color: #aaa;
  line-height: 1.6;
`;

const LoadButton = styled.button`
  width: 100%;
  padding: var(--space-2);
  background: linear-gradient(135deg, #e10600 0%, #ff0000 100%);
  border: none;
  border-radius: 6px;
  color: white;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  margin-top: 8px;
  transition: all 0.2s ease;

  &:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(225, 6, 0, 0.4);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const AddSection = styled.div`
  margin-top: var(--space-3);
  padding-top: var(--space-3);
  border-top: 1px solid rgba(255, 255, 255, 0.1);
`;

const Input = styled.input`
  width: 100%;
  padding: var(--space-2);
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 6px;
  color: var(--colour-fg);
  font-size: 12px;
  margin-bottom: var(--space-2);

  &:focus {
    outline: none;
    border-color: #e10600;
  }

  &::placeholder {
    color: #666;
  }
`;

const LoadingIndicator = styled.div`
  text-align: center;
  padding: var(--space-4);
  color: #888;
  font-size: 12px;
`;

const ErrorMessage = styled.div`
  background: rgba(255, 68, 68, 0.1);
  border: 1px solid rgba(255, 68, 68, 0.3);
  border-radius: 6px;
  padding: var(--space-2);
  color: #ff4444;
  font-size: 11px;
  margin-top: var(--space-2);
`;

export default function RaceBrowser({ isOpen, onClose, onLoadSession, currentSessionKey }) {
  const [sessions, setSessions] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [newSessionKey, setNewSessionKey] = useState('');
  const [fetchingSession, setFetchingSession] = useState(null);

  // Load cached sessions list
  useEffect(() => {
    if (isOpen) {
      loadSessions();
      loadStats();
    }
  }, [isOpen]);

  const loadSessions = async () => {
    try {
      const response = await fetch('/api/cache/sessions');
      const data = await response.json();

      setSessions(data.sessions || []);
    } catch (err) {
      console.error('[Race Browser] Failed to load sessions:', err);
    }
  };

  const loadStats = async () => {
    try {
      const response = await fetch('/api/cache/sessions?action=stats');
      const data = await response.json();

      setStats(data);
    } catch (err) {
      console.error('[Race Browser] Failed to load stats:', err);
    }
  };

  const handleLoadSession = async (sessionKey) => {
    setLoading(true);
    setError(null);

    try {
      console.log('[Race Browser] Loading session:', sessionKey);

      // Load from cache
      const response = await fetch(`/api/cache/sessions?action=load&sessionKey=${sessionKey}`);

      if (!response.ok) {
        throw new Error('Failed to load session');
      }

      const result = await response.json();

      // Pass to parent component
      onLoadSession(sessionKey, result.data);

      console.log('[Race Browser] ✓ Session loaded');

    } catch (err) {
      console.error('[Race Browser] Failed to load session:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleFetchAndCache = async () => {
    if (!newSessionKey.trim()) return;

    setFetchingSession(newSessionKey);
    setError(null);

    try {
      console.log('[Race Browser] Fetching session from OpenF1:', newSessionKey);

      const response = await fetch('/api/cache/fetch-historical', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionKey: newSessionKey })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch session');
      }

      const result = await response.json();

      console.log('[Race Browser] ✓ Session fetched and cached');

      // Reload sessions list
      await loadSessions();
      await loadStats();

      // Clear input
      setNewSessionKey('');

      // Auto-load the new session
      handleLoadSession(newSessionKey);

    } catch (err) {
      console.error('[Race Browser] Failed to fetch session:', err);
      setError(err.message);
    } finally {
      setFetchingSession(null);
    }
  };

  if (!isOpen) return null;

  return (
    <BrowserContainer>
      <Header>
        <Title>
          🏁 Race Browser
        </Title>
        <CloseButton onClick={onClose}>×</CloseButton>
      </Header>

      <Content>
        {/* Cache Statistics */}
        {stats && (
          <StatsBar>
            <span>Cached: {stats.totalSessions} sessions</span>
            <span>{stats.totalSizeMB} MB / {stats.maxSizeMB} MB</span>
          </StatsBar>
        )}

        {/* Session List */}
        <SessionList>
          {sessions.map(session => (
            <SessionCard
              key={session.sessionKey}
              $isActive={session.sessionKey === currentSessionKey}
              onClick={() => handleLoadSession(session.sessionKey)}
            >
              <SessionHeader>
                <SessionTitle>
                  {session.meetingName} {session.year}
                </SessionTitle>
                <SessionType>{session.sessionType}</SessionType>
              </SessionHeader>

              <SessionInfo>
                <div><strong>{session.sessionName}</strong></div>
                <div>{session.circuitName}, {session.country}</div>
                <div style={{ marginTop: '4px', fontSize: '10px', color: '#666' }}>
                  {session.sizeMB} MB
                </div>
              </SessionInfo>

              {session.sessionKey === currentSessionKey && (
                <div style={{
                  marginTop: '8px',
                  padding: '4px 8px',
                  background: 'rgba(0, 255, 136, 0.2)',
                  borderRadius: '4px',
                  color: '#00ff88',
                  fontSize: '10px',
                  fontWeight: '600',
                  textAlign: 'center'
                }}>
                  ● CURRENTLY LOADED
                </div>
              )}
            </SessionCard>
          ))}

          {sessions.length === 0 && !loading && (
            <div style={{ textAlign: 'center', color: '#666', padding: 'var(--space-4)', fontSize: '12px' }}>
              No cached sessions. Add one below.
            </div>
          )}
        </SessionList>

        {/* Add New Session */}
        <AddSection>
          <div style={{ fontSize: '12px', fontWeight: '600', color: '#e10600', marginBottom: 'var(--space-2)' }}>
            + Add Historical Race
          </div>

          <Input
            type="text"
            placeholder="Enter session key (e.g., 9161)"
            value={newSessionKey}
            onChange={(e) => setNewSessionKey(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleFetchAndCache()}
          />

          <LoadButton
            onClick={handleFetchAndCache}
            disabled={!newSessionKey.trim() || fetchingSession}
          >
            {fetchingSession ? 'Fetching from OpenF1...' : 'Fetch & Cache'}
          </LoadButton>

          {error && <ErrorMessage>⚠️ {error}</ErrorMessage>}
        </AddSection>

        {loading && <LoadingIndicator>Loading session...</LoadingIndicator>}
      </Content>
    </BrowserContainer>
  );
}
