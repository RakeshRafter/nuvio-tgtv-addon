import express from "express";

const app = express();
const PORT = process.env.PORT || 3000;
const BASE = (process.env.TGTV_BASE_URL || "https://livetgtv.lovable.app").replace(/\/+$/, "");
const ADDON_ID = "community.nuvio.tgtv.live";
const ADDON_VERSION = "2.0.0";
const cache = new Map();
const CACHE_MS = 25_000;

app.disable("x-powered-by");
app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.sendStatus(204);
  next();
});

async function getJson(url) {
  const key = String(url);
  const cached = cache.get(key);
  if (cached && Date.now() - cached.at < CACHE_MS) return cached.value;
  const response = await fetch(key, { headers: { Accept: "application/json" } });
  if (!response.ok) throw new Error(`TG TV API returned HTTP ${response.status}`);
  const value = await response.json();
  cache.set(key, { at: Date.now(), value });
  return value;
}
function safeText(v) { return typeof v === "string" ? v.trim() : ""; }
function queryUrl(path, params = {}) {
  const url = new URL(`${BASE}${path}`);
  for (const [k, v] of Object.entries(params)) if (v) url.searchParams.set(k, v);
  return url;
}
function normalizeId(id) {
  const m = /^(tgtv-v1|tgtv-v2):(.+)$/.exec(id || "");
  return m ? { version: m[1], channelId: m[2] } : null;
}
function guessCategory(name) {
  const n = (name || "").toLowerCase();
  const rules = [
    ["Sports", /\b(sport|sports|espn|fox sports|star sports|tennis|cricket|football|golf|racing|nba|nfl|ufc)\b/],
    ["News", /\b(news|cnn|bbc world|ndtv|republic|times now|al jazeera|cnbc|bloomberg|sky news)\b/],
    ["Movies", /\b(movie|movies|cinema|film|hbo|star gold|sony max|zee cinema|colors cineplex)\b/],
    ["Kids", /\b(kids|cartoon|nick|nickelodeon|disney junior|baby tv|pogo|hungama)\b/],
    ["Music", /\b(music|mtv|vh1|9xm|zoom tv|mad music)\b/],
    ["Entertainment", /\b(entertainment|colors|star plus|zee tv|sony|sun tv|vijay|gemini|asianet|maha|udaya)\b/]
  ];
  for (const [category, re] of rules) if (re.test(n)) return category;
  return "General";
}
function asMeta(ch, version, logoMap = new Map()) {
  const id = String(ch.id ?? "");
  const name = safeText(ch.name) || `Channel ${id}`;
  const logo = safeText(ch.logo) || logoMap.get(name.toLowerCase()) || undefined;
  const category = safeText(ch.category) || guessCategory(name);
  return {
    id: `tgtv-${version}:${id}`,
    type: "tv",
    name,
    ...(logo ? { poster: logo, background: logo, logo } : {}),
    posterShape: "landscape",
    description: `${category} · TG TV ${version.toUpperCase()}`,
    genres: [category, "Live TV"]
  };
}
async function loadV1(params = {}) {
  const data = await getJson(queryUrl("/api/public/channels", params));
  return Array.isArray(data.channels) ? data.channels : [];
}
async function loadV2(q = "") {
  const data = await getJson(queryUrl("/api/public/v2/channels", { q }));
  return Array.isArray(data.channels) ? data.channels : [];
}
async function logoMap() {
  try {
    const list = await loadV1();
    return new Map(list.filter(ch => ch.name && ch.logo).map(ch => [String(ch.name).toLowerCase(), String(ch.logo)]));
  } catch { return new Map(); }
}

app.get("/manifest.json", (_req, res) => {
  res.json({
    id: ADDON_ID,
    version: ADDON_VERSION,
    name: "TG TV Live",
    description: "V1 and V2 live TV catalogues with search, category metadata, logos, and playback-time stream resolution.",
    resources: ["catalog", "meta", "stream"],
    types: ["tv"],
    catalogs: [
      { type: "tv", id: "tgtv-v1-live", name: "TG TV · Live Channels", extra: [{ name: "search", isRequired: false }, { name: "genre", isRequired: false }] },
      { type: "tv", id: "tgtv-v2-live", name: "TG TV · 24/7 Channels", extra: [{ name: "search", isRequired: false }, { name: "genre", isRequired: false }] }
    ],
    idPrefixes: ["tgtv-v1:", "tgtv-v2:"]
  });
});

app.get("/catalog/tv/:catalogId.json", async (req, res) => {
  const v1 = req.params.catalogId === "tgtv-v1-live";
  const v2 = req.params.catalogId === "tgtv-v2-live";
  if (!v1 && !v2) return res.status(404).json({ metas: [] });
  try {
    const q = safeText(req.query.search);
    const genre = safeText(req.query.genre);
    const [channels, logos] = await Promise.all([v1 ? loadV1(q ? { q } : {}) : loadV2(q), logoMap()]);
    let filtered = channels;
    if (genre) filtered = filtered.filter(ch => (safeText(ch.category) || guessCategory(ch.name)).toLowerCase() === genre.toLowerCase() || genre.toLowerCase() === "live tv");
    res.json({ metas: filtered.map(ch => asMeta(ch, v1 ? "v1" : "v2", logos)) });
  } catch (err) {
    res.status(502).json({ metas: [], error: "Could not load channel catalogue", detail: err.message });
  }
});

app.get("/meta/tv/:id.json", async (req, res) => {
  const parsed = normalizeId(req.params.id);
  if (!parsed) return res.status(400).json({ meta: null, error: "Invalid channel id" });
  try {
    const [channels, logos] = await Promise.all([parsed.version === "tgtv-v1" ? loadV1() : loadV2(), logoMap()]);
    const ch = channels.find(item => String(item.id) === parsed.channelId);
    if (!ch) return res.status(404).json({ meta: null });
    res.json({ meta: asMeta(ch, parsed.version === "tgtv-v1" ? "v1" : "v2", logos) });
  } catch (err) { res.status(502).json({ meta: null, error: err.message }); }
});

app.get("/stream/tv/:id.json", async (req, res) => {
  const parsed = normalizeId(req.params.id);
  if (!parsed) return res.status(400).json({ streams: [], error: "Invalid channel id" });
  try {
    if (parsed.version === "tgtv-v2") {
      const data = await getJson(`${BASE}/api/public/v2/channels/${encodeURIComponent(parsed.channelId)}`);
      const servers = Array.isArray(data.servers) ? data.servers : [];
      const streams = servers.filter(s => s && typeof s.playable === "string" && /^https:\/\//.test(s.playable)).map((s, i) => ({
        name: "TG TV V2", title: safeText(s.label) || `Server ${i + 1}`, url: s.playable,
        behaviorHints: { notWebReady: true }
      }));
      return res.json({ streams });
    }
    const data = await getJson(`${BASE}/api/public/channels/${encodeURIComponent(parsed.channelId)}`);
    const sources = Array.isArray(data.sources) ? data.sources : [];
    const streams = sources.filter(url => typeof url === "string" && /^https:\/\//.test(url)).map((url, i) => ({
      name: "TG TV V1", title: `Source ${i + 1}${data.drm?.type ? " · DRM may be required" : ""}`, url,
      behaviorHints: { notWebReady: true }
    }));
    return res.json({ streams, ...(data.drm?.type ? { note: "This channel uses ClearKey DRM. Playback depends on Nuvio/player DRM support." } : {}) });
  } catch (err) {
    res.status(502).json({ streams: [], error: "Could not resolve stream; the channel may be unavailable", detail: err.message });
  }
});
app.get("/health", (_req, res) => res.json({ ok: true, version: ADDON_VERSION }));
app.get("/", (_req, res) => res.type("text").send("TG TV Live addon is running. Open /manifest.json to install it in a compatible Nuvio client."));
app.listen(PORT, () => console.log(`TG TV Live addon v${ADDON_VERSION} listening on ${PORT}`));
