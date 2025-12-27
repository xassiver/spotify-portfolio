<br/>

<p align="center">
  <img src="https://user-images.githubusercontent.com/45073703/177566625-9b84e793-4559-4475-ba54-8d3d5f4123d4.png" width="35%">

  <h4 align="center">Spotify and Discord Minimalist Portfolio</h4>

  <p align="center">
    <a href="https://github.com/xassiver/spotify-portfolio/issues"><img src="https://img.shields.io/github/issues/xassiver/spotify-portfolio"/></a>
    <a href="https://github.com/xassiver/spotify-portfolio/stargazers"><img src="https://img.shields.io/github/stars/xassiver/spotify-portfolio"/></a>
    <a href="https://github.com/xassiver/spotify-portfolio/network/members"><img src="https://img.shields.io/github/forks/xassiver/spotify-portfolio"/></a>
    <a href="https://github.com/xassiver/spotify-portfolio/commits/main"><img src="https://img.shields.io/github/last-commit/xassiver/spotify-portfolio/main"/></a>
    <a href="https://github.com/xassiver/spotify-portfolio/blob/main/CONTRIBUTING.md"><img src="https://img.shields.io/badge/contributions-welcome-brightgreen.svg?style=flat"/></a>
    <a href="https://github.com/xassiver/spotify-portfolio/blob/main/LICENSE"><img src="https://img.shields.io/github/license/xassiver/spotify-portfolio"/></a>
  </p>

  <p align="center">
    <a href="https://xassiver.github.io/spotify-portfolio">View Demo</a>
    ·
    <a href="https://github.com/xassiver/spotify-portfolio/issues">Report Bug</a>
    ·
    <a href="https://github.com/xassiver/spotify-portfolio/discussions">Request Feature</a>
  </p>
</p>

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
