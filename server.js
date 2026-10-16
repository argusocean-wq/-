import http from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL(".", import.meta.url));
const port = Number(process.env.PORT || 3000);
const mime = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".ico": "image/x-icon"
};

const server = http.createServer(async (req, res) => {
  if (req.method !== "GET" && req.method !== "HEAD") {
    res.writeHead(405, { Allow: "GET, HEAD", "Content-Type": "text/plain; charset=utf-8" });
    return res.end("Method Not Allowed");
  }

  const rawPath = new URL(req.url || "/", "http://localhost").pathname;
  const requested = rawPath === "/" ? "/web-test/index.html" : decodeURIComponent(rawPath);
  const safePath = normalize(requested).replace(/^([.][.][/\\])+/, "");
  const absolute = join(root, safePath);

  if (!absolute.startsWith(root)) {
    res.writeHead(403, { "Content-Type": "text/plain; charset=utf-8" });
    return res.end("Forbidden");
  }

  try {
    const body = await readFile(absolute);
    res.writeHead(200, {
      "Content-Type": mime[extname(absolute)] || "application/octet-stream",
      "X-Content-Type-Options": "nosniff",
      "Referrer-Policy": "strict-origin-when-cross-origin",
      "Cache-Control": "no-cache"
    });
    res.end(req.method === "HEAD" ? undefined : body);
  } catch {
    res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("Not Found");
  }
});

server.listen(port, "0.0.0.0", () => {
  console.log(`Exam bank foundation listening on 0.0.0.0:${port}`);
});
