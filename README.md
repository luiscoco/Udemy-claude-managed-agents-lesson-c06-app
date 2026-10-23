# C06 · Sessions and Retained Context

Offers authored completed/incomplete fixtures and an explicitly enabled real provider path. Each run creates a new session; the sample does not offer a multi-turn resume UI.

## Concepts students will learn

- Create, open the stream, then send
- Provider interfaces and authored fixtures
- Distinguish completed and incomplete observation

## Configure and run

Use Node.js 24 or later. In PowerShell, from this repository's folder:

```powershell
node --version
npm ci
Copy-Item .env.example .env
notepad .env
```

Use your own Anthropic API key and an existing agent ID and environment ID.

For the optional live path, set your API key, then run npm run setup if you do not already have resource IDs. The script creates the environment before a text-only agent, saves each ID immediately, and reuses IDs already configured. It uses CLAUDE_MODEL or the source default; choose a model available to your account. An uncertain network failure may have created a resource: inspect your account before retrying. Fixtures work without credentials. Set LIVE_ENABLED=true only when you intend to select the live provider.

```powershell
npm start
```

Open `http://127.0.0.1:3006`. Navigation leads to `/guide.html#learning`, `/guide.html#run-guide`, `/architecture.html`, and the application lab. If you change `PORT`, use the configured port. Keep the terminal running; stop with Ctrl+C. `npm run dev` also starts the web application.

Open the lab, read the stated resource operation, and press the main Run button once. Inspect the returned IDs, configuration or events. Each live run can create a remote resource.

## Create your .env file

Copy `.env.example` to `.env` and enter your own values. Do not commit the real file. Restart the server after editing it. The example contains safe placeholders; optional settings may be left blank to use source defaults. Resource IDs and keys stay on the server.

```dotenv
ANTHROPIC_API_KEY=your_api_key
CLAUDE_MANAGED_AGENT_ID=your_agent_id
CLAUDE_MANAGED_ENVIRONMENT_ID=your_environment_id
LIVE_ENABLED=false
PORT=3006
```

## How the application was developed

The browser collects inputs; the Node host validates requests; the lesson implementation produces observable evidence. The architecture page walks through the real source with numbered steps, prerequisite configuration, source filenames and code excerpts.

### Lesson implementation

[src/runner.ts](https://github.com/luiscoco/Udemy-claude-managed-agents-lesson-c06-app/blob/main/src/runner.ts)

```typescript
import Anthropic from "@anthropic-ai/sdk";
export type Frame = { type: string; text?: string; reason?: string };
export interface Provider { source: "fixture" | "live"; create(): Promise<string>; open(id: string): Promise<AsyncIterable<Frame>>; send(id: string, prompt: string): Promise<void>; }
export function fixture(incomplete = false): Provider {
  return { source: "fixture", async create() { return "fixture-session"; }, async open() { return (async function* () { yield { type: "running" }; yield { type: "message", text: "This is an authored example, not a live model response." }; if (!incomplete) yield { type: "idle", reason: "end_turn" }; })(); }, async send() {} };
}
export function live(client: Anthropic, agent: string, environment: string): Provider {
  let stream: Awaited<ReturnType<typeof client.beta.sessions.events.stream>>;
  return { source: "live", async create() { const session = await client.beta.sessions.create({ agent, environment_id: environment, budget: { type: "limit", max_list_cost: { amount: "50", currency: "USD" } } }); return session.id; },
    async open(id) { stream = await client.beta.sessions.events.stream(id); return (async function* () { for await (const event of stream) { if (event.type === "agent.message") { for (const block of event.content) if (block.type === "text") yield { type: "message", text: block.text }; } else if (event.type === "session.status_idle") { yield { type: "idle", reason: event.stop_reason.type }; break; } else if (event.type === "session.status_terminated") { yield { type: "terminated" }; break; } else if (event.type === "session.error") { yield { type: "error", text: "Provider reported a session error." }; break; } else yield { type: event.type }; } })(); },
    async send(id, prompt) { await client.beta.sessions.events.send(id, { events: [{ type: "user.message", content: [{ type: "text", text: prompt }] }] }); } };
}
export async function run(provider: Provider, prompt: string, emit: (frame: Frame & { source: string }) => void) {
  const send = (frame: Frame) => emit({ ...frame, source: provider.source });
  const id = await provider.create(); send({ type: "session", text: id });
  const stream = await provider.open(id); await provider.send(id, prompt);
  let outcome = "incomplete";
  for await (const frame of stream) { send(frame); if (frame.type === "idle") outcome = frame.reason === "end_turn" ? "completed" : `paused: ${frame.reason}`; else if (frame.type === "terminated") outcome = "terminated"; else if (frame.type === "error") outcome = "error"; }
  send({ type: "outcome", text: outcome }); return outcome;
}
```

Read the architecture page for the remaining source excerpts and explanations, including input handling and optional provider behavior. The diagram describes this application, rather than implying that an external integration has been implemented.

## Validation

```powershell
npm test
python scripts/verify-walkthrough.py
```

The source hash check detects when walkthrough excerpts need refreshing. Browser verification covers page navigation, readable text, mobile layout, dark mode, diagram and image routes. Local scenarios and live provider calls are recorded separately in the workspace verification report; local success is not evidence of a live provider operation.

## Repository contents

Application sources, student web pages, safe configuration example and documentation images are included. `node_modules`, `presentation`, `output`, `reviewed`, `v3`, `teaching-material`, build output, local journals, credentials and local resource files are ignored. Existing teaching videos and presentations remain in the original workspace.
