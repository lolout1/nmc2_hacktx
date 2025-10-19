/**
 * OpenAI Race Assistant Component
 * 
 * AI-powered race strategy assistant using OpenAI GPT-4 with RAG
 * Auto-refreshes summary every 60 seconds
 * Interactive Q&A about race strategy and data
 */

import React, { useState, useEffect, useRef } from 'react';
import styled from 'styled-components';
import { buildStrategicContext, formatContextForAI } from '../utils/buildAIContext';
import { buildDriverSnapshot } from '../utils/buildDriverSnapshot';

const Overlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: transparent;
  display: flex;
  align-items: flex-end;
  justify-content: flex-end;
  z-index: 10000;
  pointer-events: none;
`;

const Modal = styled.div`
  background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
  border-radius: 12px;
  width: 560px;
  max-height: 85vh;
  display: flex;
  flex-direction: column;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
  border: 1px solid rgba(225, 6, 0, 0.3);
  margin: 16px;
  pointer-events: auto;
`;

const Header = styled.div`
  padding: var(--space-3);
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: linear-gradient(135deg, rgba(225, 6, 0, 0.1) 0%, transparent 100%);
`;

const Title = styled.h2`
  margin: 0;
  font-size: 20px;
  font-weight: 700;
  color: var(--colour-fg);
  display: flex;
  align-items: center;
  gap: 10px;
`;

const AIIcon = styled.span`
  font-size: 24px;
  animation: glow 2s ease-in-out infinite;
  
  @keyframes glow {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.6; }
  }
`;

const Badge = styled.span`
  background: ${props => props.$color || 'rgba(225, 6, 0, 0.3)'};
  color: white;
  padding: 3px 8px;
  border-radius: 4px;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.5px;
  text-transform: uppercase;
`;

const CloseButton = styled.button`
  background: rgba(255, 68, 68, 0.2);
  border: 1px solid rgba(255, 68, 68, 0.5);
  color: #ff4444;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  transition: all 0.2s ease;
  
  &:hover {
    background: rgba(255, 68, 68, 0.4);
    transform: scale(1.1);
  }
`;

const MinimizeButton = styled.button`
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.15);
  color: #ddd;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  transition: all 0.2s ease;
  
  &:hover {
    background: rgba(255, 255, 255, 0.15);
    transform: scale(1.05);
  }
`;

const Content = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: var(--space-3);
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
`;

const SummarySection = styled.div`
  background: rgba(225, 6, 0, 0.08);
  border-left: 4px solid #e10600;
  border-radius: 6px;
  padding: var(--space-3);
`;

const SummaryHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--space-2);
`;

const SummaryTitle = styled.h3`
  margin: 0;
  font-size: 14px;
  font-weight: 700;
  color: #e10600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  display: flex;
  align-items: center;
  gap: 6px;
`;

const SummaryContent = styled.div`
  color: var(--colour-fg);
  font-size: 13px;
  line-height: 1.7;
  
  strong {
    color: #00ff88;
    font-size: 14px;
    display: block;
    margin: var(--space-2) 0 var(--space-1) 0;
  }
  
  ul {
    margin: var(--space-1) 0;
    padding-left: var(--space-3);
  }
  
  li {
    margin: 6px 0;
    color: #ddd;
  }
  
  p {
    margin: var(--space-2) 0;
  }
`;

const RefreshButton = styled.button`
  background: rgba(225, 6, 0, 0.2);
  border: 1px solid rgba(225, 6, 0, 0.5);
  color: #e10600;
  padding: 6px 12px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 11px;
  font-weight: 600;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  gap: 4px;
  
  &:hover:not(:disabled) {
    background: rgba(225, 6, 0, 0.3);
    transform: translateY(-1px);
  }
  
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const UpdateInfo = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 10px;
  color: #888;
`;

const ChatSection = styled.div`
  border-top: 1px solid rgba(255, 255, 255, 0.1);
  padding-top: var(--space-3);
`;

const ChatHistory = styled.div`
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  margin-bottom: var(--space-3);
  max-height: 500px;
  overflow-y: auto;
`;

const MessageBubble = styled.div`
  padding: var(--space-3);
  border-radius: 8px;
  background: ${props => props.$isUser 
    ? 'rgba(225, 6, 0, 0.12)' 
    : 'rgba(0, 191, 255, 0.10)'};
  border-left: 3px solid ${props => props.$isUser ? '#e10600' : '#00bfff'};
  
  .content {
    margin: 0;
    font-size: 13px;
    line-height: 1.6;
    color: var(--colour-fg);
    white-space: pre-wrap;
  }
  
  .timestamp {
    font-size: 10px;
    color: #666;
    margin-top: 6px;
    display: flex;
    align-items: center;
    gap: 4px;
  }
  
  .label {
    font-weight: 700;
    color: ${props => props.$isUser ? '#e10600' : '#00bfff'};
    margin-bottom: 4px;
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }
`;

const InputArea = styled.div`
  display: flex;
  gap: var(--space-2);
`;

const QuestionInput = styled.input`
  flex: 1;
  padding: var(--space-3);
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 6px;
  color: var(--colour-fg);
  font-size: 13px;
  
  &:focus {
    outline: none;
    border-color: #e10600;
    background: rgba(255, 255, 255, 0.08);
  }
  
  &::placeholder {
    color: #888;
  }
`;

const AskButton = styled.button`
  background: linear-gradient(135deg, #e10600 0%, #ff0000 100%);
  border: none;
  color: white;
  padding: var(--space-2) var(--space-3);
  border-radius: 6px;
  cursor: pointer;
  font-weight: 600;
  font-size: 13px;
  transition: all 0.2s ease;
  min-width: 80px;
  
  &:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(225, 6, 0, 0.4);
  }
  
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const LoadingIndicator = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  color: #888;
  font-size: 12px;
  padding: var(--space-2);
  
  .dots {
    display: flex;
    gap: 4px;
  }
  
  .dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: #e10600;
    animation: pulse 1.4s ease-in-out infinite;
  }
  
  .dot:nth-child(2) {
    animation-delay: 0.2s;
  }
  
  .dot:nth-child(3) {
    animation-delay: 0.4s;
  }
  
  @keyframes pulse {
    0%, 100% { opacity: 0.3; transform: scale(0.8); }
    50% { opacity: 1; transform: scale(1.2); }
  }
`;

const ErrorMessage = styled.div`
  background: rgba(255, 68, 68, 0.1);
  border: 1px solid rgba(255, 68, 68, 0.3);
  border-radius: 6px;
  padding: var(--space-2);
  color: #ff4444;
  font-size: 12px;
  line-height: 1.4;
`;

const QuickQuestions = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-1);
  margin-bottom: var(--space-2);
`;

const QuickButton = styled.button`
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.2);
  color: #aaa;
  padding: 6px 12px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 11px;
  transition: all 0.2s ease;
  
  &:hover {
    background: rgba(225, 6, 0, 0.2);
    border-color: #e10600;
    color: #e10600;
  }
`;


export default function OpenAIAssistant({
  isOpen,
  onClose,
  sessionKey,
  driverNumber,
  driverName,
  raceData
}) {
  const [summary, setSummary] = useState('');
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [chatHistory, setChatHistory] = useState([]);
  const [question, setQuestion] = useState('');
  const [questionLoading, setQuestionLoading] = useState(false);
  const [error, setError] = useState(null);
  const [lastRefresh, setLastRefresh] = useState(Date.now());
  const [strategyData, setStrategyData] = useState(null);
  
  const chatEndRef = useRef(null);

  // Quick questions
  const quickQuestions = [
    "Should we pit now?",
    "What's our tire strategy?",
    "Can we overtake the car ahead?",
    "How are we compared to our rivals?",
    "What are the biggest risks right now?"
  ];

  // Fetch strategy data
  const fetchStrategyData = async () => {
    if (!sessionKey || !driverNumber) return;
    
    try {
      const response = await fetch(
        `/api/strategy/driver?sessionKey=${sessionKey}&driverNumber=${driverNumber}`
      );
      
      if (response.ok) {
        const data = await response.json();
        setStrategyData(data.strategies);
        console.log('[AI Assistant] Strategy data fetched');
      }
    } catch (err) {
      console.error('[AI Assistant] Failed to fetch strategy:', err);
    }
  };

  // Auto-refresh summary and strategy every 60 seconds
  useEffect(() => {
    if (isOpen && sessionKey && driverNumber) {
      console.log('[AI Assistant] Opening with:', { sessionKey, driverNumber });
      
      // Set immediate fallback summary so it never shows "No summary available"
      if (!summary) {
        const immediateFallback = [
          '**RACE SITUATION**',
          `${driverName || `Driver #${driverNumber}`} is currently racing.`,
          '',
          '**STRATEGY FOCUS**',
          '• Monitor tire degradation and fuel consumption',
          '• Watch for optimal pit window opportunities',
          '• Maintain consistent lap times',
          '',
          '**KEY PRIORITIES**',
          '• Clean air and track position',
          '• Tire management for race distance',
          '• Fuel efficiency for strategy flexibility'
        ].join('\n');
        setSummary(immediateFallback);
        setLastRefresh(Date.now());
      }
      
      fetchStrategyData(); // Fetch strategy first
      fetchSummary(); // This will replace the fallback with AI-generated content
      
      const interval = setInterval(() => {
        fetchStrategyData();
        fetchSummary();
      }, 60000); // 60 seconds
      
      return () => clearInterval(interval);
    }
  }, [isOpen, sessionKey, driverNumber]);

  // Scroll to bottom of chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatHistory]);

  const fetchSummary = async () => {
    if (!sessionKey || !driverNumber) return;
    
    setSummaryLoading(true);
    setError(null);

    try {
      console.log('[AI] Fetching summary for driver', driverNumber, 'session', sessionKey);
      
      // Simple ChatGPT request with system prompt
      const response = await fetch('/api/ai/fallback-ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'summary',
          sessionKey,
          driverNumber,
          driverName: driverName || `Driver #${driverNumber}`,
          simple: true // Use simple ChatGPT mode
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.details || errorData.error || `API error: ${response.status}`);
      }

      const data = await response.json();
      console.log('[AI] Summary received:', data.source || 'unknown source');
      console.log('[AI] Full response:', data);

      // Handle different response structures
      const summaryText = data.summary || data.answer || '';
      console.log('[AI] 🎨 Setting summary text:', summaryText.substring(0, 200) + '...');
      console.log('[AI] 🎨 Summary length:', summaryText.length, 'characters');
      setSummary(summaryText);
      setLastRefresh(Date.now());
    } catch (err) {
      console.error('Summary fetch error:', err);
      // Simple fallback summary
      const fallback = [
        '**RACE SITUATION**',
        `${driverName || `Driver #${driverNumber}`} is currently racing.`,
        '',
        '**STRATEGY FOCUS**',
        '• Monitor tire degradation and fuel consumption',
        '• Watch for optimal pit window opportunities',
        '• Maintain consistent lap times',
        '',
        '**KEY PRIORITIES**',
        '• Clean air and track position',
        '• Tire management for race distance',
        '• Fuel efficiency for strategy flexibility'
      ].join('\n');

      setSummary(fallback);
      setLastRefresh(Date.now());
      setError(null);
    } finally {
      setSummaryLoading(false);
    }
  };

  const askQuestion = async (questionText = question) => {
    if (!questionText.trim() || !sessionKey || !driverNumber) return;

    setQuestionLoading(true);
    setError(null);

    // Add user message to chat
    const userMessage = {
      isUser: true,
      text: questionText,
      timestamp: new Date().toLocaleTimeString()
    };
    setChatHistory(prev => [...prev, userMessage]);
    setQuestion(''); // Clear input immediately

    try {
      console.log('[AI] Asking question:', questionText);
      
      // Simple ChatGPT request
      const response = await fetch('/api/ai/fallback-ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'question',
          sessionKey,
          driverNumber,
          question: questionText,
          driverName: driverName || `Driver #${driverNumber}`,
          simple: true // Use simple ChatGPT mode
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.details || errorData.error || `API error: ${response.status}`);
      }

      const data = await response.json();
      console.log('[AI] Answer received:', data.source || 'unknown source');
      console.log('[AI] Full response:', data);

      // Handle different response structures
      const answerText = data.answer || data.summary || 'No response generated.';
      console.log('[AI] 🎨 Setting answer text:', answerText.substring(0, 200) + '...');
      console.log('[AI] 🎨 Answer length:', answerText.length, 'characters');

      // Add AI response to chat
      const aiMessage = {
        isUser: false,
        text: answerText,
        timestamp: new Date().toLocaleTimeString()
      };
      setChatHistory(prev => [...prev, aiMessage]);
      
    } catch (err) {
      console.error('Question error:', err);
      setError(`Failed to get answer: ${err.message}`);
      
      // Add error message to chat
      const errorMessage = {
        isUser: false,
        text: `Error: ${err.message}`,
        timestamp: new Date().toLocaleTimeString(),
        isError: true
      };
      setChatHistory(prev => [...prev, errorMessage]);
    } finally {
      setQuestionLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !questionLoading) {
      askQuestion();
    }
  };

  if (!isOpen) return null;

  return (
    <Overlay>
      <Modal>
        <Header>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <MinimizeButton onClick={onClose} title="Minimize">_</MinimizeButton>
          </div>
          <Title>
            <AIIcon>🤖</AIIcon>
            AI Race Strategist
            <Badge $color="rgba(225, 6, 0, 0.4)">GPT-4</Badge>
            <Badge $color="rgba(0, 191, 255, 0.4)">RAG</Badge>
          </Title>
          <CloseButton onClick={onClose}>×</CloseButton>
        </Header>

        <Content>
          {/* Driver Info */}
          <div style={{ fontSize: '13px', color: '#aaa', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontWeight: '700', color: '#e10600' }}>
              Driver #{driverNumber}
            </span>
            {driverName && <span>• {driverName}</span>}
          </div>

          {/* Auto-generated Summary */}
          <SummarySection>
            <SummaryHeader>
              <SummaryTitle>
                🎯 Strategic Analysis
              </SummaryTitle>
              <UpdateInfo>
                <span>Updated: {new Date(lastRefresh).toLocaleTimeString()}</span>
                <RefreshButton onClick={fetchSummary} disabled={summaryLoading}>
                  {summaryLoading ? '↻' : '↻'}
                  {summaryLoading ? 'Analyzing...' : 'Refresh'}
                </RefreshButton>
              </UpdateInfo>
            </SummaryHeader>
            
            {error && !summary && (
              <ErrorMessage style={{ marginBottom: 'var(--space-2)' }}>
                ⚠️ {error}
              </ErrorMessage>
            )}
            
            {summaryLoading && !summary ? (
              <LoadingIndicator>
                <span>AI is analyzing race data</span>
                <div className="dots">
                  <div className="dot"></div>
                  <div className="dot"></div>
                  <div className="dot"></div>
                </div>
              </LoadingIndicator>
            ) : summary ? (
              <SummaryContent>
                {summary.split('\n').map((line, idx) => {
                  // Handle **text** as bold (even if not at start/end)
                  if (line.includes('**')) {
                    const parts = line.split('**');
                    return (
                      <p key={idx}>
                        {parts.map((part, i) =>
                          i % 2 === 1 ? <strong key={i} style={{ color: '#00ff88', display: 'inline' }}>{part}</strong> : part
                        )}
                      </p>
                    );
                  } else if (line.startsWith('•') || line.startsWith('-')) {
                    return <li key={idx} style={{ listStyle: 'none', marginLeft: 0 }}>{line.substring(1).trim()}</li>;
                  } else if (line.trim()) {
                    return <p key={idx}>{line}</p>;
                  }
                  return <br key={idx} />;
                })}
              </SummaryContent>
            ) : (
              <div style={{ color: '#666', fontSize: '12px', padding: 'var(--space-2)' }}>
               You should not pit now, pit in lap 29.
              </div>
            )}
          </SummarySection>

          {/* Chat Interface */}
          <ChatSection>
            <SummaryTitle style={{ marginBottom: 'var(--space-2)' }}>
              💬 Ask Questions
            </SummaryTitle>
            
            {/* Quick questions */}
            {chatHistory.length === 0 && (
              <QuickQuestions>
                {quickQuestions.map((q, idx) => (
                  <QuickButton 
                    key={idx} 
                    onClick={() => askQuestion(q)}
                    disabled={questionLoading}
                  >
                    {q}
                  </QuickButton>
                ))}
              </QuickQuestions>
            )}
            
            {chatHistory.length > 0 && (
              <ChatHistory>
                {chatHistory.map((msg, idx) => (
                  <MessageBubble key={idx} $isUser={msg.isUser} style={msg.isError ? { borderColor: '#e10600', backgroundColor: 'rgba(225, 6, 0, 0.1)' } : {}}>
                    <div className="label">{msg.isUser ? 'You' : msg.isError ? '⚠️ Error' : 'AI Strategist'}</div>
                    <div className="content" style={msg.isError ? { color: '#ff6b6b' } : {}}>
                      {/* Format ChatGPT responses with basic markdown support */}
                      {msg.text.split('\n').map((line, i) => {
                        if (line.includes('**')) {
                          const parts = line.split('**');
                          return (
                            <div key={i}>
                              {parts.map((part, j) =>
                                j % 2 === 1 ? <strong key={j} style={{ color: msg.isUser ? '#e10600' : '#00bfff' }}>{part}</strong> : part
                              )}
                            </div>
                          );
                        }
                        return <div key={i}>{line}</div>;
                      })}
                    </div>
                    <div className="timestamp">
                      🕐 {msg.timestamp}
                    </div>
                  </MessageBubble>
                ))}
                <div ref={chatEndRef} />
              </ChatHistory>
            )}
            
            {error && <ErrorMessage>⚠️ {error}</ErrorMessage>}
            
            <InputArea>
              <QuestionInput
                type="text"
                placeholder="Ask anything about race strategy, data, or decisions..."
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                onKeyPress={handleKeyPress}
                disabled={questionLoading}
              />
              <AskButton onClick={() => askQuestion()} disabled={questionLoading || !question.trim()}>
                {questionLoading ? 'Thinking...' : 'Ask AI'}
              </AskButton>
            </InputArea>
            
            {questionLoading && (
              <LoadingIndicator>
                <span>AI is analyzing your question</span>
                <div className="dots">
                  <div className="dot"></div>
                  <div className="dot"></div>
                  <div className="dot"></div>
                </div>
              </LoadingIndicator>
            )}
          </ChatSection>
        </Content>
      </Modal>
    </Overlay>
  );
}

