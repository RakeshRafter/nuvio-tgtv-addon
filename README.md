# TG TV Live for Nuvio — v2.1 M3U integration

This keeps the existing Stremio-compatible addon endpoints and adds an M3U playlist for **Nuvio Enhanced → Settings → Integrations → Live TV → Playlists**.

## New endpoints

- `/live.m3u` — M3U playlist for TG TV V2 24/7 channels, including channel logos where available and inferred group categories.
- `/play/tgtv-v2%3ACHANNEL_ID` — resolves a fresh TG TV playable URL at playback time and redirects the player to it.
- `/health` — health check.
- `/manifest.json` and the existing `/catalog`, `/meta`, and `/stream` endpoints remain available for addon-compatible clients.

## Deploy to Render

1. Replace `server.js` in the existing GitHub repository with this version.
2. Commit and push to `main`; Render should redeploy automatically.
3. Keep build command `npm install`, start command `npm start`, and root directory blank.
4. Optional: set `PUBLIC_BASE_URL` to your Render service's public origin (for example `https://your-service.onrender.com`, with no trailing slash). If omitted, the service builds the playlist URLs from the incoming request host.
5. Test `https://YOUR-HOST/health` and `https://YOUR-HOST/live.m3u`.

## Add to Nuvio Enhanced on iOS

1. Open **Settings → Integrations → Live TV → Playlists**.
2. Add a remote playlist URL: `https://YOUR-HOST/live.m3u`.
3. Enable the playlist and make sure **Show Live TV in navigation** is enabled.

Replace `YOUR-HOST` with the actual Render hostname. Do not include `/manifest.json` when adding the M3U playlist.

## Notes / limitations

- The M3U playlist uses TG TV V2 channels because its playback path provides short-lived playable URLs that can be resolved on demand. The `/play/...` route resolves a fresh URL and responds with an HTTP 302 redirect.
- V1 streams remain available through the addon endpoints, but some may use ClearKey DRM and may not play in Nuvio's generic Live TV player.
- Categories for V2 are inferred from channel names; the upstream V2 catalogue may not provide categories.
- This changes the backend service only; it does not modify or rebuild the Nuvio iOS app.
- Use only streams you are authorized to access.
