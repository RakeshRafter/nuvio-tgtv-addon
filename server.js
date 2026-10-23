import express from "express";

const app = express();
const PORT = process.env.PORT || 3000;
const BASE = (process.env.TGTV_BASE_URL || "https://livetgtv.lovable.app").replace(/\/+$/, "");
const ADDON_ID = "community.nuvio.tgtv.live";
const ADDON_VERSION = "1.0.0";

app.disable("x-powered-by");
app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.sendStatus(204);
  next();
});

async function getJson(url) {
  const response = await fetch(url, { headers: { "Accept": "application/json" } });
  if (!response.ok) throw new Error(`Upstream returned HTTP ${response.status}`);
  return response.json();
}

function channelId(metaId) {
  const match = /^tgtv-v2:(.+)$/.exec(metaId || "");
  return match ? match[1] : null;
}

app.get("/manifest.json", (_req, res) => {
  res.json({
    id: ADDON_ID,
    version: ADDON_VERSION,
    name: "TG TV Live (V2)",
    description: "24/7 HLS channels from the TG TV public V2 catalogue. Stream links are resolved when opened.",
    resources: ["catalog", "meta", "stream"],
    types: ["tv"],
    catalogs: [{
      type: "tv",
      id: "tgtv-v2-live",
      name: "TG TV Live",
      extra: [{ name: "search", isRequired: false }]
    }],
    idPrefixes: ["tgtv-v2:"]
  });
});

app.get("/catalog/tv/tgtv-v2-live.json", async (req, res) => {
  try {
    const q = typeof req.query.search === "string" ? req.query.search.trim() : "";
    const url = new URL(`${BASE}/api/public/v2/channels`);
    if (q) url.searchParams.set("q", q);
    const data = await getJson(url);
    const channels = Array.isArray(data.channels) ? data.channels : [];
    const metas = channels.map(ch => ({
      id: `tgtv-v2:${String(ch.id)}`,
      type: "tv",
      name: String(ch.name || `Channel ${ch.id}`),
      poster: ch.logo || `${BASE}/favicon.ico`,
      posterShape: "landscape",
      description: "Live channel · TG TV V2",
      genres: ["Live TV"]
    }));
    res.json({ metas });
  } catch (err) {
    res.status(502).json({ metas: [], error: "Could not load TG TV channel catalogue", detail: err.message });
  }
});

app.get("/meta/tv/:id.json", async (req, res) => {
  const id = channelId(req.params.id);
  if (!id) return res.status(400).json({ meta: null, error: "Invalid channel id" });
  try {
    const data = await getJson(`${BASE}/api/public/v2/channels`);
    const ch = (data.channels || []).find(item => String(item.id) === id);
    if (!ch) return res.status(404).json({ meta: null });
    res.json({ meta: {
      id: `tgtv-v2:${id}`,
      type: "tv",
      name: String(ch.name || `Channel ${id}`),
      poster: ch.logo || `${BASE}/favicon.ico`,
      posterShape: "landscape",
      description: "Live channel · TG TV V2",
      genres: ["Live TV"]
    }});
  } catch (err) {
    res.status(502).json({ meta: null, error: err.message });
  }
});

app.get("/stream/tv/:id.json", async (req, res) => {
  const id = channelId(req.params.id);
  if (!id) return res.status(400).json({ streams: [], error: "Invalid channel id" });
  try {
    // Resolve at playback time: TG TV documents that relay URLs are signed/short-lived.
    const data = await getJson(`${BASE}/api/public/v2/channels/${encodeURIComponent(id)}`);
    const servers = Array.isArray(data.servers) ? data.servers : [];
    const streams = servers
      .filter(server => server && typeof server.playable === "string" && server.playable.startsWith("https://"))
      .map((server, index) => ({
        name: "TG TV V2",
        title: server.label || `Server ${index + 1}`,
        url: server.playable,
        behaviorHints: { notWebReady: true }
      }));
    res.json({ streams });
  } catch (err) {
    res.status(502).json({ streams: [], error: "Could not resolve live stream", detail: err.message });
  }
});

app.get("/", (_req, res) => res.type("text").send("TG TV Live addon is running. Use /manifest.json to install it in a compatible Nuvio client."));
app.listen(PORT, () => console.log(`TG TV Nuvio addon listening on ${PORT}`));
