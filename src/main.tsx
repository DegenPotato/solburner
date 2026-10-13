// Node globals (Buffer, process, global) that @solana/* deps assume are present
// are injected by `vite-plugin-node-polyfills` (see vite.config.ts) — it patches
// every chunk that needs them, which is safe across dev and production bundling.
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './index.css';

const container = document.getElementById('root');
if (!container) throw new Error('Root element #root not found');

try {
  createRoot(container).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
} catch (error) {
  // Last-resort visible fallback so a mount-time crash never shows a blank page.
  container.innerHTML = `
    <div style="min-height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:12px;font-family:system-ui;color:#e9f2ec;background:#080b09;padding:24px;text-align:center">
      <h1 style="font-size:20px;margin:0">Failed to start</h1>
      <p style="color:#96a59c;max-width:480px;margin:0">${error instanceof Error ? error.message : 'Unknown error'}</p>
    </div>`;
  throw error;
}
