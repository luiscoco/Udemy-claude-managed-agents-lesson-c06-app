/** Optional one-time provisioning. Reuses IDs already present in .env. */
import Anthropic from "@anthropic-ai/sdk";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
if (!process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_API_KEY.startsWith("your_")) {
  throw new Error("Set your own ANTHROPIC_API_KEY in .env first.");
}
const client = new Anthropic({ maxRetries: 0 });
let contents = existsSync(".env") ? readFileSync(".env", "utf8") : "";
function save(key: string, value: string) {
  const pattern = new RegExp("^\\s*" + key + "=.*$", "m");
  contents = pattern.test(contents) ? contents.replace(pattern, key + "=" + value) : contents.trimEnd() + "\n" + key + "=" + value + "\n";
  writeFileSync(".env", contents, { mode: 0o600 });
}
const valid = (value: string | undefined) => Boolean(value && !value.startsWith("your_"));
if (!valid(process.env.CLAUDE_MANAGED_ENVIRONMENT_ID)) {
  const environment = await client.beta.environments.create({
    name: "C06 student environment",
    config: { type: "cloud", networking: { type: "limited" } },
  });
  // Save immediately so a later agent failure does not lose the environment ID.
  save("CLAUDE_MANAGED_ENVIRONMENT_ID", environment.id);
}
if (!valid(process.env.CLAUDE_MANAGED_AGENT_ID)) {
  const agent = await client.beta.agents.create({
    name: "C06 text-only student agent",
    model: process.env.CLAUDE_MODEL || "claude-opus-5-5",
    system: "Answer the student's question clearly and briefly.",
    tools: [], mcp_servers: [], skills: [],
  });
  save("CLAUDE_MANAGED_AGENT_ID", agent.id);
}
console.log("Prerequisite IDs are saved in your local .env. Existing configured IDs were reused.");
