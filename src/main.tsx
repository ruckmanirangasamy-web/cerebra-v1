import { StrictMode } from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.tsx';
import './index.css';

console.log('[Main] Starting Cerebra application...');

const rootElement = document.getElementById('root');

if (!rootElement) {
  console.error('[Main] Root element not found!');
  document.body.innerHTML = `
    <div style="padding: 20px; background: #fee; color: #c00; border: 2px solid #fcc; margin: 20px; border-radius: 8px; font-family: sans-serif;">
      <h1 style="margin-top: 0;">Critical Error: Root Element Missing</h1>
      <p>The application could not find the root element. Please check index.html.</p>
    </div>
  `;
} else {
  console.log('[Main] Root element found, attempting to render...');
  try {
    ReactDOM.createRoot(rootElement).render(
      <StrictMode>
        <App />
      </StrictMode>
    );
    console.log('[Main] React root created and render initiated');
  } catch (error: any) {
    console.error("[Main] Critical Render Error:", error);
    rootElement.innerHTML = `
      <div style="padding: 20px; background: #0a0e1a; color: #fff; border: 2px solid #ef4444; margin: 20px; border-radius: 8px; font-family: sans-serif;">
        <h1 style="margin-top: 0; color: #ef4444;">Critical Mount Error</h1>
        <p style="color: #d1d5db;">The application failed to initialize. Check the console for details.</p>
        <pre style="white-space: pre-wrap; word-break: break-all; background: #000; padding: 12px; border-radius: 4px; overflow: auto; max-height: 400px; color: #fca5a5; font-size: 12px;">${error?.stack || error?.message || String(error)}</pre>
        <button onclick="window.location.reload()" style="margin-top: 12px; padding: 8px 16px; background: #fff; color: #000; border: none; border-radius: 6px; cursor: pointer; font-weight: 600;">
          Reload Page
        </button>
      </div>
    `;
  }
}
