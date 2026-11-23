// Serves app/ on http://localhost:5180: the build preview, and the presenter-only AI chat.
// Binds to 127.0.0.1 only, so phones in the room can't reach it; the public Pages site never has AI.
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "../app");
const port = Number(process.env.PORT) || 5180;

// ---------- presenter-only AI proxy ----------
// The key stays in live-build/.env (gitignored) and in this process; the browser never sees it.
const env = { ...process.env };
const envFile = path.resolve(here, "../.env");
if (fs.existsSync(envFile)) {
  for (const line of fs.readFileSync(envFile, "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !line.trim().startsWith("#")) env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
}
const AI_MODEL = env.AI_MODEL || "claude-opus-5-5";
let claude = null;
let Anthropic = null;
if (env.ANTHROPIC_API_KEY) {
  try {
    ({ default: Anthropic } = await import("@anthropic-ai/sdk"));
    claude = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY, timeout: 30_000, maxRetries: 1 });
  } catch {
    console.warn("AI chat off: run `npm install` in live-build to add the Anthropic SDK.");
  }
}

// Takes the assistant's chat-completions-shaped request and answers in the same shape, so
// features/assistant.js needs no changes. System messages (instructions + map context) become `system`.
async function aiChat(req, res) {
  const reply = (code, obj) => res.writeHead(code, { "content-type": "application/json" }).end(JSON.stringify(obj));
  let body = "";
  for await (const c of req) { body += c; if (body.length > 200_000) return reply(413, { error: "too large" }); }
  const msgs = JSON.parse(body || "{}").messages || [];
  const system = msgs.filter((m) => m.role === "system").map((m) => String(m.content)).join("\n\n");
  const messages = msgs.filter((m) => m.role === "user" || m.role === "assistant").map((m) => ({ role: m.role, content: String(m.content) }));
  if (!messages.length || messages[0].role !== "user") return reply(400, { error: "conversation must start with the user" });
  try {
    const response = await claude.beta.messages.create({
      model: AI_MODEL,
      max_tokens: 4000,
      output_config: { effort: "low" }, // short map answers: low effort keeps it quick on stage
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default", // if the model declines, the API retries on a fallback model in the same call
      system,
      messages,
    });
    if (response.stop_reason === "refusal") {
      return reply(200, { choices: [{ message: { content: JSON.stringify({ reply: "I can't help with that one. Try a question about the map.", action: null }) } }] });
    }
    const text = response.content.filter((b) => b.type === "text").map((b) => b.text).join("");
    return reply(200, { choices: [{ message: { content: text } }] });
  } catch (e) {
    const status = e instanceof Anthropic.RateLimitError ? 429 : e instanceof Anthropic.APIError ? 502 : 500;
    console.warn(`AI chat error: ${e.status ?? ""} ${e.message}`);
    return reply(status, { error: "model unavailable" });
  }
}
// The presenter's runtime config, built here rather than kept as a file in app/:
//  - arcgisApiKey: the ArcGIS Location Platform key from live-build/.env (ARCGIS_API_KEY), for basemap
//    styles, search, directions and places. The public site gets the same key from the Pages secret.
//  - foundry: points the assistant at this server's /__ai/chat proxy, only when the Anthropic key is set.
function runtimeConfig() {
  return `window.RUNTIME_CONFIG = ${JSON.stringify({
    arcgisApiKey: env.ARCGIS_API_KEY || "",
    foundry: claude
      ? { url: "/__ai/chat", key: "local-proxy", model: "", auth: "api-key", label: AI_MODEL === "claude-opus-5-5" ? "Claude Opus 5.5" : AI_MODEL }
      : { url: "", key: "", model: "", auth: "api-key", label: "Assistant" },
  })};\n`;
}

const MIME = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8", ".json": "application/json", ".svg": "image/svg+xml", ".png": "image/png", ".ico": "image/x-icon" };

// Local-only mock of a chat-completions endpoint, for testing the assistant without a key.
// Point runtime-config.js foundry.url at http://localhost:5180/__mock/chat. Never deployed (Pages is static).
async function mockChat(req, res) {
  let body = "";
  for await (const c of req) body += c;
  const msgs = JSON.parse(body || "{}").messages || [];
  const q = String(msgs.at(-1)?.content || "").toLowerCase();
  let out = { reply: "I can only answer from the layers on this map.", action: null };
  if (q.includes("victoria")) out = { reply: "Here are the council areas in Victoria.", action: { type: "filter", layer: "abs-lga-2021", where: "state_name_2021 = 'Victoria'" } };
  else if (q.includes("inject")) out = { reply: "Trying something unsafe.", action: { type: "filter", layer: "abs-lga-2021", where: "1=1; DROP TABLE lga" } };
  else if (q.includes("unknown field")) out = { reply: "Filtering on a made-up field.", action: { type: "filter", layer: "abs-lga-2021", where: "population > 100000" } };
  else if (q.includes("clear")) out = { reply: "Clearing filters.", action: { type: "clear" } };
  else if (q.startsWith("explain")) out = { reply: "This is a local government area: the boundary of one council, from the ABS 2021 boundaries.", action: null };
  res.writeHead(200, { "content-type": "application/json" }).end(JSON.stringify({ choices: [{ message: { content: "```json\n" + JSON.stringify(out) + "\n```" } }] }));
}

http.createServer((req, res) => {
  const p = decodeURIComponent(new URL(req.url, "http://x").pathname);
  if (p === "/runtime-config.js") {
    res.writeHead(200, { "content-type": "text/javascript; charset=utf-8", "cache-control": "no-store" }).end(runtimeConfig());
    return;
  }
  if (p === "/__mock/chat" && req.method === "POST") return void mockChat(req, res);
  if (p === "/__ai/chat" && req.method === "POST") {
    if (!claude) { res.writeHead(503, { "content-type": "application/json" }).end('{"error":"AI chat not configured"}'); return; }
    return void aiChat(req, res);
  }
  const file = path.normalize(path.join(root, p.endsWith("/") ? p + "index.html" : p));
  if (!file.startsWith(root)) { res.writeHead(403).end(); return; }
  fs.readFile(file, (err, buf) => {
    if (err) { res.writeHead(404, { "content-type": "text/plain" }).end("Not found"); return; }
    res.writeHead(200, { "content-type": MIME[path.extname(file)] || "application/octet-stream", "cache-control": "no-store" }).end(buf);
  });
}).listen(port, "127.0.0.1", () => {
  console.log(`App on http://localhost:${port}`);
  console.log(`  AI chat: ${claude ? `${AI_MODEL} via /__ai/chat (presenter laptop only)` : "off (no ANTHROPIC_API_KEY in live-build/.env)"}`);
  console.log(`  ArcGIS key: ${env.ARCGIS_API_KEY ? "set (basemap styles, search, directions, places)" : "not set (keyless tiles; no directions or places)"}`);
});
