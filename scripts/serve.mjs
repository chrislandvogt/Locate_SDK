// Serves app/ on http://localhost:5180 for checking a build before pushing. No dependencies.
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../app");
const port = Number(process.env.PORT) || 5180;
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
  if (p === "/__mock/chat" && req.method === "POST") return void mockChat(req, res);
  const file = path.normalize(path.join(root, p.endsWith("/") ? p + "index.html" : p));
  if (!file.startsWith(root)) { res.writeHead(403).end(); return; }
  fs.readFile(file, (err, buf) => {
    if (err) { res.writeHead(404, { "content-type": "text/plain" }).end("Not found"); return; }
    res.writeHead(200, { "content-type": MIME[path.extname(file)] || "application/octet-stream", "cache-control": "no-store" }).end(buf);
  });
}).listen(port, "127.0.0.1", () => console.log(`App on http://localhost:${port}`));
