/**
 * Modern UI Components
 * Reusable styled components with glass-morphism and blue accents
 */

import styled, { keyframes, css } from "styled-components";

// Animations
export const fadeIn = keyframes`
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
`;

export const slideIn = keyframes`
  from {
    transform: translateX(-20px);
    opacity: 0;
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
`;

export const glow = keyframes`
  0%, 100% {
    box-shadow: 0 0 20px rgba(0, 180, 255, 0.2);
  }
  50% {
    box-shadow: 0 0 40px rgba(0, 180, 255, 0.4);
  }
`;

export const pulse = keyframes`
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.7;
  }
`;

// Glass Card with modern styling
export const GlassCard = styled.div`
  background: ${props => props.$transparent ? 
    'rgba(18, 18, 26, 0.5)' : 
    'linear-gradient(135deg, rgba(26, 26, 38, 0.9) 0%, rgba(18, 18, 26, 0.8) 100%)'
  };
  backdrop-filter: blur(12px);
  border: 1px solid var(--color-border-default);
  border-radius: var(--radius-lg);
  padding: ${props => props.$padding || 'var(--spacing-md)'};
  box-shadow: var(--shadow-md);
  position: relative;
  overflow: hidden;
  transition: all var(--transition-normal);
  ${css`animation: ${fadeIn} 0.3s ease-out;`}
  
  /* Blue gradient accent on top */
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
    opacity: ${props => props.$accent ? 1 : 0};
  }
  
  &:hover {
    border-color: var(--color-border-strong);
    box-shadow: var(--shadow-lg), var(--shadow-glow);
    transform: translateY(-2px);
  }
`;

// Section Header with blue accent
export const SectionHeader = styled.div`
  padding: var(--spacing-md) var(--spacing-lg);
  background: linear-gradient(135deg, 
    rgba(0, 180, 255, 0.08) 0%, 
    rgba(18, 18, 26, 0.95) 100%
  );
  border-bottom: 1px solid var(--color-border-strong);
  position: relative;
  overflow: hidden;
  
  &::before {
    content: '';
    position: absolute;
    left: 0;
    top: 0;
    bottom: 0;
    width: 3px;
    background: linear-gradient(180deg, 
      var(--color-blue-primary) 0%, 
      var(--color-blue-tertiary) 100%
    );
  }
  
  p, strong {
    font-size: var(--font-base);
    font-weight: var(--font-bold);
    color: var(--color-text-primary);
    letter-spacing: 0.05em;
    text-transform: uppercase;
    position: relative;
    z-index: 1;
  }
`;

// Modern Table Container
export const ModernTable = styled.div`
  background: var(--color-bg-secondary);
  border: 1px solid var(--color-border-default);
  border-radius: var(--radius-lg);
  overflow: hidden;
  box-shadow: var(--shadow-md);
  
  /* Custom scrollbar for tables */
  * {
    scrollbar-width: thin;
    scrollbar-color: var(--color-blue-tertiary) var(--color-bg-primary);
  }
  
  *::-webkit-scrollbar {
    width: 8px;
    height: 8px;
  }
  
  *::-webkit-scrollbar-track {
    background: var(--color-bg-primary);
  }
  
  *::-webkit-scrollbar-thumb {
    background: var(--color-blue-tertiary);
    border-radius: var(--radius-sm);
    
    &:hover {
      background: var(--color-blue-primary);
    }
  }
`;

// Modern Badge
export const Badge = styled.span`
  display: inline-flex;
  align-items: center;
  padding: var(--spacing-xs) var(--spacing-sm);
  border-radius: var(--radius-full);
  font-size: var(--font-xs);
  font-weight: var(--font-semibold);
  letter-spacing: 0.02em;
  background: ${props => {
    switch(props.$variant) {
      case 'success': return 'rgba(0, 255, 136, 0.15)';
      case 'warning': return 'rgba(255, 170, 0, 0.15)';
      case 'error': return 'rgba(255, 51, 85, 0.15)';
      case 'info': return 'rgba(0, 180, 255, 0.15)';
      default: return 'rgba(255, 255, 255, 0.1)';
    }
  }};
  color: ${props => {
    switch(props.$variant) {
      case 'success': return 'var(--color-success)';
      case 'warning': return 'var(--color-warning)';
      case 'error': return 'var(--color-error)';
      case 'info': return 'var(--color-blue-primary)';
      default: return 'var(--color-text-primary)';
    }
  }};
  border: 1px solid ${props => {
    switch(props.$variant) {
      case 'success': return 'rgba(0, 255, 136, 0.3)';
      case 'warning': return 'rgba(255, 170, 0, 0.3)';
      case 'error': return 'rgba(255, 51, 85, 0.3)';
      case 'info': return 'rgba(0, 180, 255, 0.3)';
      default: return 'var(--color-border-default)';
    }
  }};
  
  ${props => props.$glow && css`
    animation: ${glow} 2s ease-in-out infinite;
  `}
`;

// Modern Button (enhanced)
export const ModernButton = styled.button`
  display: inline-flex;
  align-items: center;
  gap: var(--spacing-sm);
  padding: var(--spacing-sm) var(--spacing-lg);
  font-size: var(--font-base);
  font-weight: var(--font-semibold);
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: all var(--transition-normal);
  position: relative;
  overflow: hidden;
  white-space: nowrap;
  
  background: ${props => {
    switch(props.$variant) {
      case 'primary':
        return 'linear-gradient(135deg, var(--color-blue-primary) 0%, var(--color-blue-tertiary) 100%)';
      case 'secondary':
        return 'linear-gradient(135deg, var(--color-bg-tertiary) 0%, var(--color-bg-secondary) 100%)';
      case 'ghost':
        return 'transparent';
      default:
        return 'linear-gradient(135deg, var(--color-bg-tertiary) 0%, var(--color-bg-secondary) 100%)';
    }
  }};
  
  color: ${props => props.$variant === 'primary' ? '#fff' : 'var(--color-text-primary)'};
  
  border: 1px solid ${props => {
    switch(props.$variant) {
      case 'primary': return 'var(--color-blue-primary)';
      case 'ghost': return 'var(--color-border-default)';
      default: return 'var(--color-border-strong)';
    }
  }};
  
  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: -100%;
    width: 100%;
    height: 100%;
    background: linear-gradient(90deg, 
      transparent 0%, 
      rgba(255, 255, 255, 0.2) 50%, 
      transparent 100%
    );
    transition: left var(--transition-slow);
  }
  
  &:hover {
    transform: translateY(-2px);
    box-shadow: ${props => props.$variant === 'primary' ? 
      'var(--shadow-glow-strong)' : 
      'var(--shadow-glow)'
    };
    border-color: var(--color-blue-primary);
    
    &::before {
      left: 100%;
    }
  }
  
  &:active {
    transform: translateY(0);
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

// Modern Input
export const ModernInput = styled.input`
  padding: var(--spacing-sm) var(--spacing-md);
  background: rgba(18, 18, 26, 0.8);
  border: 1px solid var(--color-border-default);
  border-radius: var(--radius-md);
  color: var(--color-text-primary);
  font-family: var(--fontFamily-body);
  font-size: var(--font-base);
  transition: all var(--transition-fast);
  
  &:hover {
    border-color: var(--color-border-strong);
  }
  
  &:focus {
    outline: none;
    border-color: var(--color-blue-primary);
    box-shadow: 0 0 0 3px var(--color-blue-dim);
  }
  
  &::placeholder {
    color: var(--color-text-dim);
  }
`;

// Modern Select
export const ModernSelect = styled.select`
  padding: var(--spacing-sm) var(--spacing-md);
  background: rgba(18, 18, 26, 0.8);
  border: 1px solid var(--color-border-default);
  border-radius: var(--radius-md);
  color: var(--color-text-primary);
  font-family: var(--fontFamily-body);
  font-size: var(--font-base);
  cursor: pointer;
  transition: all var(--transition-fast);
  
  &:hover {
    border-color: var(--color-border-strong);
  }
  
  &:focus {
    outline: none;
    border-color: var(--color-blue-primary);
    box-shadow: 0 0 0 3px var(--color-blue-dim);
  }
`;

// Loading Spinner
export const Spinner = styled.div`
  width: ${props => props.$size || '20px'};
  height: ${props => props.$size || '20px'};
  border: 2px solid var(--color-border-default);
  border-top-color: var(--color-blue-primary);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
  
  @keyframes spin {
    to { transform: rotate(360deg); }
  }
`;

// Flex utilities
export const Flex = styled.div`
  display: flex;
  align-items: ${props => props.$align || 'center'};
  justify-content: ${props => props.$justify || 'flex-start'};
  gap: ${props => props.$gap || 'var(--spacing-md)'};
  flex-direction: ${props => props.$direction || 'row'};
  flex-wrap: ${props => props.$wrap ? 'wrap' : 'nowrap'};
`;

// Grid layout
export const Grid = styled.div`
  display: grid;
  grid-template-columns: ${props => props.$cols || 'repeat(auto-fit, minmax(250px, 1fr))'};
  gap: ${props => props.$gap || 'var(--spacing-md)'};
`;

// Status Indicator
export const StatusDot = styled.span`
  display: inline-block;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: ${props => {
    switch(props.$status) {
      case 'online': return 'var(--color-success)';
      case 'warning': return 'var(--color-warning)';
      case 'offline': return 'var(--color-error)';
      default: return 'var(--color-text-dim)';
    }
  }};
  box-shadow: 0 0 8px ${props => {
    switch(props.$status) {
      case 'online': return 'var(--color-success)';
      case 'warning': return 'var(--color-warning)';
      case 'offline': return 'var(--color-error)';
      default: return 'transparent';
    }
  }};
  
  ${props => props.$pulse && css`
    animation: ${pulse} 2s ease-in-out infinite;
  `}
`;

// Divider
export const Divider = styled.div`
  height: 1px;
  background: linear-gradient(90deg, 
    transparent 0%, 
    var(--color-border-default) 50%, 
    transparent 100%
  );
  margin: ${props => props.$spacing || 'var(--spacing-md)'} 0;
`;

export default {
  GlassCard,
  SectionHeader,
  ModernTable,
  Badge,
  ModernButton,
  ModernInput,
  ModernSelect,
  Spinner,
  Flex,
  Grid,
  StatusDot,
  Divider,
};

