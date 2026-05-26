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
document.addEventListener('gesturechange', (e) => e.preventDefault());
document.addEventListener('gestureend', (e) => e.preventDefault());

// iOS Safari fires `dblclick` after a fast double-tap on any element
// even with viewport user-scalable=no; explicit suppression is the only
// fully-reliable shield. The game itself never uses dblclick events.
document.addEventListener('dblclick', (e) => e.preventDefault(), { passive: false });

// Selection menu can pop up on long-press of canvas / buttons on older
// iOS. Suppress globally — the game has no text the player should select.
document.addEventListener('selectstart', (e) => {
  const t = e.target as HTMLElement | null;
  // Allow selection inside scroll panes that might contain copyable text.
  if (t && t.closest('[data-allow-select]')) return;
  e.preventDefault();
}, { passive: false });

// Prevent the iOS Safari context menu on long-press of buttons. The
// passive: false flag lets us actually cancel.
document.addEventListener('contextmenu', (e) => e.preventDefault(), { passive: false });

const root = ReactDOM.createRoot(document.getElementById('root')!);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

registerServiceWorker();
