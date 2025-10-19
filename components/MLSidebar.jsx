// Optional: Add toggle button to show/hide sidebar
// components/SidebarToggle.jsx

import styled from 'styled-components';
import { useState } from 'react';

const ToggleButton = styled.button`
  position: fixed;
  left: ${props => props.open ? '320px' : '0'};
  top: 50%;
  transform: translateY(-50%);
  width: 30px;
  height: 60px;
  background: #e10600;
  border: none;
  border-radius: 0 8px 8px 0;
  color: white;
  cursor: pointer;
  z-index: 1001;
  transition: left 0.3s ease;
  
  &:hover {
    background: #ff0000;
  }
`;

export const SidebarWithToggle = ({ children }) => {
  const [isOpen, setIsOpen] = useState(true);

  return (
    <>
      <div style={{ 
        transform: isOpen ? 'translateX(0)' : 'translateX(-320px)',
        transition: 'transform 0.3s ease'
      }}>
        {children}
      </div>
      
      <ToggleButton open={isOpen} onClick={() => setIsOpen(!isOpen)}>
        {isOpen ? '◀' : '▶'}
      </ToggleButton>
    </>
  );
};
