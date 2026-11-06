# AGENTS.md — Dreambox (a.k.a. Maham's Sanctuary)

## What this is
Dreambox is a **single-page-ish static tribute site** (vanilla HTML/CSS/JS, no build step, no framework). It's a collection of poetic/romantic sections with interactive features: sky observatory, companion sprites, firefly catching, memory tree, puzzle hunts, quiz unlocks, secret letters, dream journal, wish system, admin panel, and PWA support.

Data sync uses **Firebase Realtime Database** via `fb-db.js`. On `localhost` it falls back to `localStorage` so everything works without Firebase.

## How to run locally
```powershell
node serve.js
# opens http://localhost:8478
```
`serve.js` (14 lines) is a tiny static file server on port **8478**. No install step beyond `node`.

## Where everything lives

### Entry points (HTML)
| File | Purpose |
|------|---------|
| `index.html` | Home / landing page, main section index |
| `admin.html` | Admin dashboard (passkey: `dreambox`) |
| `story.html` | Story chapters |
| `dream.html` | Dream journal |
| `love.html`, `make-her-sleep.html`, `i-remember.html`, `for-tonight.html`, `promises.html` | Poetic sections |
| `photo-gallery.html` | Gallery |
| `sky-observatory.html`, `sky-generator.html`, `sky-generator-living.html`, `sky-living.js`, `skies.js` | Sky engine |
| `stats.html`, `world-progress.js` | Stats / world progress dashboard |
| `timeline.html` | Timeline |
| `turnon-history.html` | Turn-on history |
| `guide.html`, `documentation.html`, `the-making-of.html` | Docs |
| `quiz.js` + `quiz.json` | Quiz system |
| `100-organs.html` | 100 poetic organs sections |
| `404.html` | Not found |

### Core JS (load order matters)
| File | Role |
|------|------|
| `fb-db.js` | Firebase Realtime Database wrapper + localStorage fallback. Exposes global `FB`: `init, getAll, get, put, delete, clear, set, on, blobToBase64, base64ToBlob, toArray, esc`. Config at line ~109. |
| `feature-flags.js` | Global `window.FeatureFlags`: `get(id), set(id, val), toggle(id), list(), onReady(fn)`. Reads Firebase `config/features` if online, else localStorage. |
| `style.css` | All styles; theme variables at top (`--bg`, `--parchment`, `--gold`, `--ruby`, ...). |
| `content-common.js` | Shared content rendering helpers used across sections. |
| `sw.js` | Service worker (PWA caching). |
| `manifest.json` | PWA manifest. |
| `serve.js` | Local dev server. |

### Feature modules (one per concern)
`activity-tracker.js`, `adaptive-text.js`, `anime.min.js`, `butterfly-collection.js`, `companion-boy.js`, `companion-girl.js`, `dragon-companion.js`, `events.js`, `firefly-jar.js`, `global-easter-eggs.js`, `global-interactions.js`, `install-prompt.js`, `interactions.js`, `interactive.js`, `landscape.js`, `letters.js`, `lock.js`, `matrix-rain.js`, `motion-masterpiece.js`, `music.js`, `puzzle-hunt.js`, `random-constellations.js`, `secret-letters.js`, `section-lock.js`, `sky-living.js`, `sky-observatory.js`, `story-text.js`, `track.js`, `tree-of-memories.js`, `world-progress.js`.

### Assets
- `boy-assets/`, `girl-assets/` — companion sprite atlases (`atlas.json`, `atlas.png`).
- `cursor images/` — custom cursor PNGs/JPGs.
- `parallax/` — parallax layer PNGs.
- `anime.min.js` — animation library vendored.

### Config
- `firebase.json`, `netlify.toml` — deployment config.
- `database.rules.json` — Firebase RTDB security rules (write-gated to one admin UID; public read).
- `.gitignore` — ignores `node_modules`, logs, env.

## Firebase (required for cloud sync; optional locally)
1. Create Firebase project → Realtime Database (test mode).
2. Add a web app → copy `firebaseConfig`.
3. Paste into `fb-db.js` line ~109 (replace placeholder values).
4. Publish `database.rules.json` to Firebase Realtime Database → Rules.
5. Admin passkey: `dreambox` (entered in `admin.html`).

On `localhost` no Firebase is needed: `fb-db.js` detects `location.hostname` and uses `localStorage` (`ash-fb-store`).

## Feature flags
Features are toggled via `window.FeatureFlags`. Full list in `feature-flags.js:6` (`ALL_FEATURES`). Default-on unless `defaultOff: true`. Admin panel manages flags under `config/features` in Firebase.

## Admin panel
- URL: `admin.html`, passkey `dreambox`.
- Manages: sections, gallery, songs, letters, dreams, timeline, quiz, settings, feature flags.
- Writes to Firebase stores: `songs`, `sectionUnlock`, `rareLinks`, `project-*`, `turnOn`, `config/gallery`, `config/features`, `activity`, `interactions`, `wishes`, `letters`, `memories`, `dreams`, etc.

## Data stores (Firebase `dreambox/` root)
`songs`, `sectionUnlock`, `rareLinks`, `project-puzzles`, `project-events`, `project-texts`, `turnOn`, `config`, `activity`, `interactions`, `wishes`, `songRequests`, `userSongs`, `reviews`, `sectionRequests`, `letters`, `quizHistory`, `memories`, `selfLetters`, `dreams`, `lanterns`, `ourStoryAnswers`, `stats`, `userData`.

`userData` holds per-user localStorage snapshot keys (see `fb-db.js:285`) synced every 30s / on `beforeunload`.

## Conventions / gotchas
- **No build step.** Edit files, refresh browser.
- Paths are root-relative (`/style.css`, `/fb-db.js`) — works behind `serve.js` and Netlify.
- Blobs (audio/images) are stored base64-encoded (`_<field>Base64` + `_<field>Type`) then decoded back to `Blob` on read (`decodeBlobs`).
- `FB.get`/`FB.put` return Promises; on localhost they resolve from `localStorage`.
- Feature flag changes via Firebase propagate through `FB.on('config', 'features', ...)`; offline they stay in localStorage.
- `&&` / `||` are fine in shell scripts; this repo's shell is PowerShell 5.1 — avoid `&&`/`||` when running git one-liners.

## Quick AI context summary
- Start here: `index.html` + `style.css`.
- Data layer: `fb-db.js` (global `FB`).
- Feature toggles: `feature-flags.js` (global `window.FeatureFlags`).
- Admin: `admin.html` (passkey `dreambox`).
- Local dev: `node serve.js` → `http://localhost:8478`.
- Firebase config: `fb-db.js:109`; rules: `database.rules.json`.
