/**
 * Reusable Draggable Sidebar Component
 * Provides drag functionality and positioning for sidebar widgets
 */
import { useState, useRef, useEffect } from 'react';
import styled from 'styled-components';

const SidebarContainer = styled.div`
  position: absolute;
  background: var(--colour-bg);
  border: 1px solid var(--colour-border);
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  z-index: ${props => props.$isDragging ? 1000 : props.$zIndex || 100};
  cursor: ${props => props.$isDragging ? 'grabbing' : 'default'};
  user-select: none;
  
  /* Position */
  left: ${props => props.$position.x}px;
  top: ${props => props.$position.y}px;
  
  /* Smooth transition when not dragging */
  transition: ${props => props.$isDragging ? 'none' : 'box-shadow 0.2s'};
  
  &:hover {
    box-shadow: 0 6px 16px rgba(0, 0, 0, 0.4);
  }
`;

const DragHandle = styled.div`
  padding: var(--space-2) var(--space-3);
  background: var(--colour-offset);
  border-bottom: 1px solid var(--colour-border);
  cursor: grab;
  display: flex;
  align-items: center;
  justify-content: space-between;
  
  &:active {
    cursor: grabbing;
  }
  
  &:hover {
    background: rgba(255, 255, 255, 0.05);
  }
`;

const DragIcon = styled.span`
  font-size: 12px;
  opacity: 0.5;
  margin-right: var(--space-2);
`;

const Title = styled.span`
  font-weight: 600;
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
`;

const ContentWrapper = styled.div`
  overflow-y: auto;
  overflow-x: hidden;
`;

/**
 * DraggableSidebar Component
 * @param {string} title - Sidebar title
 * @param {object} defaultPosition - Default { x, y } position
 * @param {number} zIndex - Z-index for stacking
 * @param {ReactNode} children - Sidebar content
 * @param {string} storageKey - LocalStorage key for persisting position
 */
const DraggableSidebar = ({ 
  title, 
  defaultPosition = { x: 20, y: 20 }, 
  zIndex = 100,
  children,
  storageKey,
  icon = '⋮⋮'
}) => {
  // Load position from localStorage if available
  const loadPosition = () => {
    if (storageKey && typeof window !== 'undefined') {
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        try {
          return JSON.parse(stored);
        } catch (e) {
          console.error('Failed to parse stored position:', e);
        }
      }
    }
    return defaultPosition;
  };

  const [position, setPosition] = useState(loadPosition);
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const sidebarRef = useRef(null);

  // Save position to localStorage
  useEffect(() => {
    if (storageKey && typeof window !== 'undefined') {
      localStorage.setItem(storageKey, JSON.stringify(position));
    }
  }, [position, storageKey]);

  const handleMouseDown = (e) => {
    if (e.button !== 0) return; // Only left mouse button
    
    const rect = sidebarRef.current.getBoundingClientRect();
    setDragOffset({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
    setIsDragging(true);
  };

  const handleMouseMove = (e) => {
    if (!isDragging) return;
    
    // Calculate new position
    const newX = e.clientX - dragOffset.x;
    const newY = e.clientY - dragOffset.y;
    
    // Constrain to viewport
    const rect = sidebarRef.current.getBoundingClientRect();
    const maxX = window.innerWidth - rect.width;
    const maxY = window.innerHeight - rect.height;
    
    setPosition({
      x: Math.max(0, Math.min(newX, maxX)),
      y: Math.max(0, Math.min(newY, maxY)),
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Add global mouse event listeners when dragging
  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, dragOffset]);

  return (
    <SidebarContainer
      ref={sidebarRef}
      $position={position}
      $isDragging={isDragging}
      $zIndex={zIndex}
    >
      <DragHandle onMouseDown={handleMouseDown}>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <DragIcon>{icon}</DragIcon>
          <Title>{title}</Title>
        </div>
      </DragHandle>
      <ContentWrapper>
        {children}
      </ContentWrapper>
    </SidebarContainer>
  );
};

export default DraggableSidebar;

