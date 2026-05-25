import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './App';
import { registerServiceWorker } from './pwa/registerServiceWorker';
import './styles/global.css';
import './styles/pixel-ui.css';

// iOS Safari rubber-band guard. CSS alone doesn't stop two-finger pinch
// or top-of-page drag in some iOS versions; this catches the rest.
// Single-finger touchmoves are blocked at the document root, so the
// page itself never scrolls. Inner panes that NEED to scroll (codex
// entries, settings list) have their own scroll containers and stop
// propagation, so their swipes still work.
document.addEventListener('touchmove', (e) => {
  if (e.touches.length > 1) { e.preventDefault(); return; }
  const target = e.target as HTMLElement | null;
  // Walk up the DOM looking for an explicitly-scrollable container.
  let n: HTMLElement | null = target;
  while (n && n !== document.body) {
    const s = getComputedStyle(n);
    const oy = s.overflowY;
    if ((oy === 'auto' || oy === 'scroll') && n.scrollHeight > n.clientHeight) {
      return; // let the inner pane scroll
    }
    const ox = s.overflowX;
    if ((ox === 'auto' || ox === 'scroll') && n.scrollWidth > n.clientWidth) {
      return;
    }
    n = n.parentElement;
  }
  e.preventDefault();
}, { passive: false });

// Block gesture (pinch-to-zoom) and double-tap zoom on iOS.
document.addEventListener('gesturestart', (e) => e.preventDefault());

const root = ReactDOM.createRoot(document.getElementById('root')!);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

registerServiceWorker();
