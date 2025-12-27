# Spotify Discord Status (Lanyard) — Web Preview

A small, mobile-friendly web UI that listens to a Discord user's Spotify presence via Lanyard and shows a playable preview, album-driven accent color, progress ring and a tiny Discord mini-profile. This repository is ready to drop on GitHub Pages or any static host.

## Features
- Connects to Lanyard's websocket to receive presence updates for a Discord user.
- Shows album artwork circle with a progress ring and a play/ pause preview (when available).
- Dynamic accent color extracted from album art.
- Bass-reactive glow visualization using the Web Audio API.
- Mouse-wheel volume control while hovering the play button.
- Small Discord mini-profile (avatar + username) under the player.

## Quick start (locally)
1. Clone the repo.
2. Serve the folder with any static server (VS Code Live Server, `npx serve`, or GitHub Pages).
3. Open the site in a modern browser (Chrome, Edge, Firefox). Audio preview playback requires user gesture to start on some browsers.

## Configuration
- Change the target Discord user by editing `USER_ID` in `app.js`.
- The project uses Lanyard's public websocket (`wss://api.lanyard.rest/socket`). No server-side component required.
- The app attempts to fetch preview audio from iTunes / Deezer and uses a CORS proxy for Deezer (may vary over time).
