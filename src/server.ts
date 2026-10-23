import { serveStudentAsset } from "./student-assets";
import http from "node:http";
import { readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import Anthropic from "@anthropic-ai/sdk";
import { fixture, live, run } from "./runner";
if (existsSync(".env")) process.loadEnvFile(".env");
const port = Number(process.env.PORT || 3006);
const key=process.env.ANTHROPIC_API_KEY || "", agent=process.env.CLAUDE_MANAGED_AGENT_ID || "", environment=process.env.CLAUDE_MANAGED_ENVIRONMENT_ID || "";
const liveReady = process.env.LIVE_ENABLED === "true" && [key,agent,environment].every(v => v && !v.startsWith("your_"));
http.createServer(async (req,res) => {
  res.setHeader("Cache-Control","no-store");
  try {
    if (await serveStudentAsset(req, res)) return;
    if(req.method === "GET" && req.url === "/api/config") { res.writeHead(200,{"Content-Type":"application/json"}); res.end(JSON.stringify({liveReady})); return; }
    if(req.method === "POST" && req.url === "/api/run") {
      const origin=req.headers.origin; if(origin && origin !== `http://127.0.0.1:${port}` && origin !== `http://localhost:${port}`) { res.writeHead(403).end(); return; }
      let raw=""; for await(const chunk of req) { raw += chunk; if(raw.length > 12000) throw new Error("Request too large"); }
      const data=JSON.parse(raw || "{}"); if(!["fixture", "incomplete", "live"].includes(data.mode) || typeof data.prompt !== "string" || !data.prompt.trim() || data.prompt.length > 2000) throw new Error("Choose a mode and enter a prompt of up to 2,000 characters.");
      if(data.mode === "live" && !liveReady) throw new Error("Live mode is disabled or not configured in .env.");
      res.writeHead(200,{"Content-Type":"application/x-ndjson; charset=utf-8"});
      try { const provider=data.mode === "live" ? live(new Anthropic({apiKey:key}),agent,environment) : fixture(data.mode === "incomplete"); await run(provider,data.prompt.trim(), f => { if (!res.destroyed) res.write(JSON.stringify(f)+"\n"); }); }
      catch(error) { if(!res.destroyed) res.write(JSON.stringify({type:"error",text:error instanceof Error ? error.message : "Run failed",source:data.mode === "live" ? "live" : "fixture"})+"\n"); }
      res.end(); return;
    }
    const files: Record<string,string>={"/":"index.html","/style.css":"style.css","/app.js":"app.js","/astronaut.png":"astronaut.png"};
    if(req.method === "GET" && req.url && files[req.url]) { const f=files[req.url]; const data=await readFile(path.join(__dirname,"..","public",f)); res.writeHead(200,{"Content-Type":f.endsWith(".png")?"image/png":f.endsWith(".css")?"text/css":f.endsWith(".js")?"text/javascript":"text/html; charset=utf-8"}); res.end(data); return; }
    res.writeHead(404).end("Not found");
  } catch(error) { res.writeHead(400,{"Content-Type":"application/json"}); res.end(JSON.stringify({error:error instanceof Error ? error.message : "Request failed"})); }
}).listen(port,"127.0.0.1",()=>console.log(`Open http://127.0.0.1:${port}`));
