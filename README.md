# TG TV Live addon for Nuvio

A small Stremio-protocol addon intended for compatible Nuvio builds. It reads the TG TV V2 24/7 catalogue and resolves HLS relay URLs when a channel is opened.

## Important limitations

- This addon uses **V2 only**. It does not implement the V1 ClearKey/DRM channel API.
- A catalogue entry does not guarantee a working stream. TG TV documents that some channels have no working server and signed relay URLs expire.
- Use only channels and streams you are authorized to access. Availability and playback depend on TG TV, the upstream provider, region, and Nuvio's player support.
- This is source code, not a hosted addon. You must deploy it to a public HTTPS Node.js host before adding it to Nuvio.

## Run locally

Requires Node.js 18 or newer.

```sh
npm install
npm start
```

Then test `http://localhost:3000/manifest.json`.

## Deploy

Deploy this folder as a Node.js web service or Docker container. Set the service's start command to `npm start`, expose the assigned port, and use the HTTPS service URL in Nuvio. Optional environment variable:

- `TGTV_BASE_URL` — defaults to `https://livetgtv.lovable.app`

## Install in Nuvio

1. Open **Settings → Content & Discovery → Addons** (or the Addons screen on TV).
2. Choose **Install from URL**.
3. Paste `https://YOUR-HOST/manifest.json` using your deployed HTTPS hostname.
4. Install and look for the **TG TV Live** catalogue.

## Endpoints

- `/manifest.json` — addon manifest
- `/catalog/tv/tgtv-v2-live.json` — live channel catalogue; supports `?search=`
- `/meta/tv/tgtv-v2:<id>.json` — channel metadata
- `/stream/tv/tgtv-v2:<id>.json` — fresh playback server URLs

## Troubleshooting

- If the catalogue is empty, check that `https://livetgtv.lovable.app/api/public/v2/channels` is reachable.
- If a channel appears but will not play, the server may be offline, the relay URL may have expired, or the Nuvio build may not support that stream.
- Keep the addon private to your own use if the source provider's terms require it.
