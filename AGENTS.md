# AGENTS.md

## Project Goal
This is a browser game deployed to GitHub Pages. Keep it playable, fast, and simple.

## How To Work
- Make small, safe changes that fit the existing Vite, React, TypeScript, and Canvas 2D structure.
- Explain changes in plain English.
- Do not rewrite the whole game unless asked.
- Do not remove existing gameplay unless asked.
- Keep assets optimized for web.
- Use relative paths so the game works under the GitHub Pages project URL.
- Treat `src/game/GameEngine.ts`, input handling, saves, PWA caching, and deploy config as high-risk areas.

## Commands
- Install dependencies: `npm ci`
- Start local dev server: `npm run dev`
- Build production version: `npm run build`
- Preview production build: `npm run preview`
- Typecheck only: `npm run typecheck`

## Before Finishing
- Run `npm run build` when Node/npm dependencies are available.
- Fix build or type errors introduced by the change.
- Summarize what changed and what should be tested manually.
