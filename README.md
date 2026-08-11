# TacOps

Reads your local Tacticus credentials, fetches your live account data, shows your current
operations board and uses an integer-programming solver to suggest ways to dispatch the rest of
your operations.

## Tech specs

TacOps is a [Tauri](https://tauri.app/) desktop app: a Rust backend (`src-tauri/`) paired with a
React/TypeScript frontend (`src/`), running in the OS's native webview.

### Backend (`src-tauri/`)

- **Rust** + [Tauri v2](https://v2.tauri.app/), using `reqwest` for HTTP and `serde`/`serde_json` for
  (de)serialization.
- `src-tauri/src/credentials.rs` — locates and parses the local Tacticus credentials file (see
  [Credentials](#credentials) below) and exposes it to the frontend as the `find_credentials`
  Tauri command.
- `src-tauri/src/loki.rs` — replays the game client's `APP_START` → `CONNECT` → `GET_PLAYER`
  handshake against Snowprint's Loki API to fetch the full player state (roster, resources,
  expeditions board, ...), exposed as the `fetch_player_data` command. Device/hardware fingerprint
  fields are intentionally left as generic fake values.
- **macOS and Windows** — credential auto-discovery is implemented for both. Other platforms
  (e.g. Linux) aren't implemented.

### Frontend (`src/`)

- **React 19** + **TypeScript**, built with **Vite**, styled with **Tailwind CSS v4**
  (`@tailwindcss/vite`, CSS-first config — no `tailwind.config.js`).
- `src/main.tsx` / `src/App.tsx` — entry point and top-level layout (environment toggle, GO
  button, tabs).
- `src/components/` — presentational `.tsx` components (tables, icon helpers, tabs, toggle).
- `src/api/` — Tauri `invoke` calls and shared types.
- `src/board/`, `src/characters/`, `src/rank/`, `src/rarity/`, `src/progression/`, `src/factions/`
  — pure `.ts` logic: decoding raw save-data fields (`progressionIndex`, `rank`, ...) into
  domain enums, resolving game-data ids (traits, damage profiles, factions, portraits, ...) to
  the matching asset URL, and view-model functions that turn raw API data into plain objects
  ready for a component to render.
- `src/assets/` — game data (`character-data.json`, `ability-data.json`, `mow-data.json`) and
  icon/portrait images, checked into the repo.

### Building and running

```sh
npm install          # install frontend deps (also fetches the Rust deps on first Tauri run)
npm run tauri dev     # run the app in dev mode (hot-reloading webview + Tauri backend)
npm run tauri build   # produce a release build/installer
```

`npm run dev` / `npm run build` alone only run the Vite frontend (useful for quick UI iteration or
`tsc`/build verification) — they don't start the Tauri window or backend commands, so `find_credentials`
and `fetch_player_data` won't be available; use the `tauri` scripts above to run the full app.

### Building for distribution

`npm run tauri build` produces a native installer for whatever OS you run it on — e.g. on macOS
that's `src-tauri/target/release/bundle/macos/tacops.app` and a `.dmg`; on Windows it's a `.msi`
and an NSIS `.exe` under the equivalent `bundle/` folders. It only builds for the host you're
running it on — Tauri doesn't support cross-compiling to another OS without extra toolchains, and
that path is fragile enough that it isn't set up here.

To get a build for the *other* OS without owning that hardware, use the GitHub Actions workflows
instead: [`.github/workflows/build-macos.yml`](.github/workflows/build-macos.yml) and
[`.github/workflows/build-windows.yml`](.github/workflows/build-windows.yml). Both are triggered
manually (Actions tab → pick the workflow → "Run workflow") and build natively on GitHub-hosted
runners — macOS builds both `aarch64` and `x86_64` as separate installers, Windows builds the
native MSI/NSIS installers. Both attach their output to the same **draft** GitHub Release (tag
`app-v<version>`), so running either (or both) leaves you with one release page holding whichever
installers you've built — nothing is published publicly until you choose to publish that draft.

### Credentials

TacOps doesn't manage login — it reads the credentials the actual Tacticus game client already
wrote to disk. Which file it reads depends on the OS:

| OS | Path | API domain |
|---|---|---|
| macOS | `~/Library/Application Support/com.snowprintstudios.tacticus/live-loki_user_data.json` | `api-live.loki.snowprintstudios.com` |
| Windows | `%USERPROFILE%\AppData\LocalLow\Snowprint\Warhammer 40,000_ Tacticus\live-loki_user_data.json` | `api-live.loki.snowprintstudios.com` |

This file needs at least `userId` and `clientSecret`; `snowId` is used when present.

## Style requirements

See [AGENTS.md](AGENTS.md) — this section is the canonical source; AGENTS.md just points here so
the rules only live in one place.

- Use Tailwind CSS for styling instead of hand-written stylesheets, unless there's a really good
  reason not to.
- Layout/rendering code goes in `.tsx` files. Logic goes in `.ts` files. No exceptions.
