# TG TV Live addon for Nuvio — v2

Adds both TG TV public catalogues, search, category/genre metadata, and logos where the API provides them.

## Features
- **V1 live channels:** Uses `/api/public/channels`, including source-provided category and logo fields.
- **V2 24/7 channels:** Uses `/api/public/v2/channels`, with playback-time resolution of short-lived HLS relay links.
- **Search:** Both catalogues accept `search` input and forward it to TG TV.
- **Categories:** V1 uses source categories; V2 gets a best-effort category guess from channel names because the documented V2 API does not include categories.
- **Logos:** V1 logos are used directly; V2 matches names against V1 logos when possible.
- **Playback:** V2 server choices are exposed as separate streams. V1 sources are exposed, but ClearKey DRM playback is not guaranteed.

## Deploy on Render
Push these files to your existing GitHub repository, replacing the old versions. Render should redeploy automatically. Keep build command `npm install`, start command `npm start`, and root directory blank.

`TGTV_BASE_URL` is optional and defaults to `https://livetgtv.lovable.app`.

## Test after deployment
- `https://YOUR-HOST/health`
- `https://YOUR-HOST/manifest.json`
- `https://YOUR-HOST/catalog/tv/tgtv-v1-live.json`
- `https://YOUR-HOST/catalog/tv/tgtv-v2-live.json`
- Search example: `https://YOUR-HOST/catalog/tv/tgtv-v1-live.json?search=star`

## Install/update in Nuvio
Use `https://YOUR-HOST/manifest.json`. If Nuvio has cached the old manifest/catalogue, remove and re-add the addon or refresh addons.

## Limitations
- V1 can return signed MPEG-DASH sources and ClearKey DRM details. Generic stream responses do not guarantee DRM playback in every Nuvio player.
- V2 categories are heuristic and V2 logos are matched by exact channel name to V1 where possible.
- Some channels may be offline or geo-restricted. Signed URLs expire, so they are resolved when playback starts.
- Use only content you are authorized to access.
