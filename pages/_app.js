import { createGlobalStyle } from "styled-components";
import ErrorBoundary from "@monaco/components/ErrorBoundary";
import { themeVariables } from "@monaco/styles/modernTheme";

const GlobalStyle = createGlobalStyle`
  /* Modern Theme Variables */
  ${themeVariables}
  
  /* Legacy variable mapping for backward compatibility */
  :root {
    --space-0: 0px;
    --space-1: 2px;
    --space-2: 4px;
    --space-3: 8px;
    --space-4: 16px;
    --space-5: 32px;
    --space-6: 64px;
    
    /* Updated to use modern theme */
    --colour-bg: var(--color-bg-primary);
    --colour-fg: var(--color-text-primary);
    --colour-border: var(--color-border-default);
    --colour-offset: var(--color-bg-secondary);
    --colour-accent: var(--color-blue-primary);
    
    --fontSize-small: 11px;
    --fontSize-body: 13px;
    --fontFamily-body: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif;
    --fontFamily-mono: 'JetBrains Mono', 'Fira Code', 'Courier New', monospace;
  }
  
  * {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
    text-rendering: optimizeLegibility;
  }
  
  html {
    scroll-behavior: smooth;
  }
  
  body {
    background: linear-gradient(135deg, #0a0a0f 0%, #12121a 100%);
    background-attachment: fixed;
    color: var(--colour-fg);
    font-family: var(--fontFamily-body);
    font-size: var(--fontSize-small);
    line-height: 1.6;
    -webkit-text-size-adjust: 100%;
    overflow-x: hidden;
    
    @media screen and (min-width: 900px) {
      font-size: var(--fontSize-body);
    }
    
    /* Custom scrollbar */
    &::-webkit-scrollbar {
      width: 12px;
    }
    
    &::-webkit-scrollbar-track {
      background: var(--color-bg-primary);
      border-left: 1px solid var(--color-border-subtle);
    }
    
    &::-webkit-scrollbar-thumb {
      background: var(--color-blue-tertiary);
      border-radius: var(--radius-sm);
      border: 2px solid var(--color-bg-primary);
      
      &:hover {
        background: var(--color-blue-primary);
      }
    }
  }
  
  /* Modern button styles */
  button {
    appearance: none;
    background: linear-gradient(135deg, var(--color-bg-tertiary) 0%, var(--color-bg-secondary) 100%);
    color: var(--colour-fg);
    border: 1px solid var(--color-border-strong);
    padding: var(--spacing-sm) var(--spacing-md);
    font-size: var(--fontSize-small);
    font-family: var(--fontFamily-body);
    font-weight: var(--font-medium);
    cursor: pointer;
    border-radius: var(--radius-md);
    transition: all var(--transition-fast);
    position: relative;
    overflow: hidden;
    
    &::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: linear-gradient(135deg, var(--color-blue-dim) 0%, transparent 100%);
      opacity: 0;
      transition: opacity var(--transition-fast);
    }
    
    &:hover {
      border-color: var(--color-blue-primary);
      box-shadow: var(--shadow-glow);
      transform: translateY(-1px);
      
      &::before {
        opacity: 1;
      }
    }
    
    &:active {
      transform: translateY(0);
    }
    
    &:disabled {
      opacity: 0.5;
      cursor: not-allowed;
      
      &:hover {
        transform: none;
        box-shadow: none;
      }
    }

    @media screen and (min-width: 900px) {
      font-size: var(--fontSize-body);
    }
  }
  
  /* Link styles */
  a {
    color: var(--color-blue-primary);
    text-decoration: none;
    transition: color var(--transition-fast);
    
    &:hover {
      color: var(--color-blue-secondary);
      text-decoration: underline;
    }
  }
  
  /* Selection */
  ::selection {
    background: var(--color-blue-glow);
    color: var(--color-text-primary);
  }
  
  /* Focus styles */
  *:focus-visible {
    outline: 2px solid var(--color-blue-primary);
    outline-offset: 2px;
  }
  
  /* Headings */
  h1, h2, h3, h4, h5, h6 {
    font-weight: var(--font-bold);
    letter-spacing: -0.02em;
  }
  
  /* Smooth animations for everything */
  * {
    transition-property: background-color, border-color, color, fill, stroke, opacity, box-shadow, transform;
    transition-duration: var(--transition-fast);
    transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
  }
`;

export default function App({ Component, pageProps }) {
  return (
    <>
      <GlobalStyle />
      <ErrorBoundary>
        <Component {...pageProps} />
      </ErrorBoundary>
    </>
  );
}
