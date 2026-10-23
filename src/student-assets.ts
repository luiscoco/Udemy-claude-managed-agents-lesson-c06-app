import type { IncomingMessage, ServerResponse } from "node:http";
import { readFile } from "node:fs/promises";
import path from "node:path";
// A fixed allowlist; request paths can never select arbitrary local files.
const assets: Record<string, [string, string]> = {
  "/prism.js": ["prism.js", "text/javascript; charset=utf-8"],
  "/code-highlighting.js": ["code-highlighting.js", "text/javascript; charset=utf-8"],
  "/code-highlighting.css": ["code-highlighting.css", "text/css; charset=utf-8"],
  "/guide.html": ["guide.html", "text/html; charset=utf-8"],
  "/architecture.html": ["architecture.html", "text/html; charset=utf-8"],
  "/student.css": ["student.css", "text/css; charset=utf-8"],
  "/navigation.js": ["navigation.js", "text/javascript; charset=utf-8"],
  "/architecture.svg": ["architecture.svg", "image/svg+xml"],
  "/architecture.png": ["architecture.png", "image/png"],
  "/env-redacted.png": ["../docs/images/env-redacted.png", "image/png"],
};
export async function serveStudentAsset(req: IncomingMessage, res: ServerResponse): Promise<boolean> {
  const asset = assets[new URL(req.url || "/", "http://localhost").pathname];
  if (req.method !== "GET" || !asset) return false;
  const data = await readFile(path.resolve("public", asset[0]));
  res.writeHead(200, { "Content-Type": asset[1], "Cache-Control": "no-store" });
  res.end(data);
  return true;
}
