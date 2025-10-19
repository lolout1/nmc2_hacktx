import styled from "styled-components";
import moment from "moment";
import DraggableSidebar from "./DraggableSidebar";

const RaceControlContent = styled.div`
  padding: var(--space-3);
  width: 350px;
  max-height: 500px;
  overflow-y: auto;
`;

const MessageList = styled.ul`
  list-style: none;
  padding: 0;
  margin: 0;
`;

const MessageItem = styled.li`
  padding: var(--space-2);
  margin-bottom: var(--space-2);
  background: rgba(255, 255, 255, 0.03);
  border-radius: 4px;
  font-size: 11px;
  border-left: 3px solid ${props => props.flagColor || 'var(--colour-border)'};
  
  &:last-child {
    margin-bottom: 0;
  }
`;

const TimeStamp = styled.span`
  color: grey;
  font-size: 10px;
  margin-right: var(--space-2);
`;

const FlagBadge = styled.span`
  background-color: ${props => props.bgColor || 'var(--colour-border)'};
  color: ${props => props.fgColor || 'var(--colour-fg)'};
  border: 1px solid var(--colour-border);
  border-radius: 3px;
  padding: 2px var(--space-2);
  margin-right: var(--space-2);
  font-size: 10px;
  font-weight: bold;
`;

const MessageText = styled.span`
  font-size: 11px;
  line-height: 1.4;
`;

const getFlagColour = (flag) => {
  switch (flag?.toLowerCase()) {
    case "green":
      return { bg: "green" };
    case "yellow":
    case "double yellow":
      return { bg: "yellow", fg: "var(--colour-bg)" };
    case "red":
      return { bg: "red" };
    case "blue":
      return { bg: "blue" };
    case "chequered":
      return { bg: "white", fg: "var(--colour-bg)" };
    default:
      return { bg: "transparent" };
  }
};

/**
 * RaceControlSidebar Component
 * Shows race control messages and track status in a compact sidebar
 */
const RaceControlSidebar = ({ raceControlMessages = {}, sessionData = {} }) => {
  if (!raceControlMessages || !raceControlMessages.Messages) {
    return null;
  }

  // Combine race control messages and session status, sort by time
  const allMessages = [
    ...Object.values(raceControlMessages.Messages || {}),
    ...Object.values(sessionData.StatusSeries || {}),
  ].sort((a, b) => {
    return moment.utc(b.Utc).diff(moment.utc(a.Utc)); // Most recent first
  });

  if (allMessages.length === 0) {
    return null;
  }

  // Show only the most recent 15 messages
  const recentMessages = allMessages.slice(0, 15);

  return (
    <DraggableSidebar
      title="🚩 RACE CONTROL"
      defaultPosition={{ x: window.innerWidth - 390, y: 80 }}
      zIndex={99}
      storageKey="race-control-position"
      icon="🚩"
    >
      <RaceControlContent>
        <MessageList>
          {recentMessages.map((event, i) => {
            const flagColors = event.Category === "Flag" ? getFlagColour(event.Flag) : {};
            const borderColor = flagColors.bg || 'var(--colour-border)';
            
            return (
              <MessageItem 
                key={`race-control-${event.Utc}-${i}`}
                flagColor={borderColor}
              >
                <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '4px' }}>
                  <TimeStamp>
                    {moment.utc(event.Utc).format("HH:mm:ss")}
                    {event.Lap && ` / L${event.Lap}`}
                  </TimeStamp>
                  
                  {event.Category === "Flag" && (
                    <FlagBadge 
                      bgColor={flagColors.bg}
                      fgColor={flagColors.fg}
                    >
                      FLAG
                    </FlagBadge>
                  )}
                </div>
                
                <MessageText>
                  {event.Message && event.Message.trim()}
                  {event.TrackStatus && `TrackStatus: ${event.TrackStatus}`}
                  {event.SessionStatus && `SessionStatus: ${event.SessionStatus}`}
                </MessageText>
              </MessageItem>
            );
          })}
        </MessageList>
      </RaceControlContent>
    </DraggableSidebar>
  );
};

export default RaceControlSidebar;

