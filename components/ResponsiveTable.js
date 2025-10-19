import styled from "styled-components";

export default styled.div`
  display: grid;
  grid-template-columns: 1fr;
  min-height: 450px;
  overflow-x: auto;
  background: linear-gradient(135deg, rgba(26, 26, 38, 0.6) 0%, rgba(18, 18, 26, 0.4) 100%);
  backdrop-filter: blur(8px);
  border: 1px solid var(--color-border-default);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-md);
  transition: all var(--transition-normal);
  
  &:hover {
    border-color: var(--color-border-strong);
    box-shadow: var(--shadow-lg);
  }

  @media screen and (min-width: 1700px) {
    grid-template-columns: ${({ cols }) => cols ?? "50% 50%"};
  }
  
  /* Custom scrollbar */
  &::-webkit-scrollbar {
    height: 8px;
  }
  
  &::-webkit-scrollbar-track {
    background: var(--color-bg-primary);
  }
  
  &::-webkit-scrollbar-thumb {
    background: var(--color-blue-tertiary);
    border-radius: var(--radius-sm);
    
    &:hover {
      background: var(--color-blue-primary);
    }
  }
`;
