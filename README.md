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

## How the app was build

### 1. Put the provider behind a small interface

The runner depends on create, open and send plus an explicit source label. The interface lets authored fixtures exercise the same consumer contract as the live adapter.

Source: [src/runner.ts](src/runner.ts#L3)

```typescript
export interface Provider {
  source: "fixture" | "live";
  create(): Promise<string>;
  open(id: string): Promise<AsyncIterable<Frame>>;
  send(id: string, prompt: string): Promise<void>;
}
```

### 2. Make fixture completion deliberate

The fixture yields authored running and message frames. The incomplete variant omits idle/end_turn, so a plausible answer cannot make the run completed.

Source: [src/runner.ts](src/runner.ts#L4)

```typescript
export function fixture(incomplete = false): Provider {
  return {
    source: "fixture",
    async create() {
      return "fixture-session";
    },
    async open() {
      return (async function* () {
        yield { type: "running" };
        yield {
          type: "message",
          text: "This is an authored example, not a live model response.",
        };
        if (!incomplete) yield { type: "idle", reason: "end_turn" };
      })();
    },
    async send() {},
  };
}
```

### 3. Create, observe, then send in one runner

The shared runner opens observation before sending and starts at incomplete. It promotes that state only from lifecycle evidence, retaining source labels on emitted frames.

Source: [src/runner.ts](src/runner.ts#L15) · selected statements

```typescript
const id = await provider.create();

// ... other source statements omitted ...
const stream = await provider.open(id);

await provider.send(id, prompt);

// ... other source statements omitted ...
let outcome = "incomplete";

// ... other source statements omitted ...
for await (const frame of stream) {
  send(frame);
  if (frame.type === "idle")
    outcome = frame.reason === "end_turn" ? "completed" : `paused: ${frame.reason}`;
  else if (frame.type === "terminated") outcome = "terminated";
  else if (frame.type === "error") outcome = "error";
}
```

## Validation

```powershell
npm test
python scripts/verify-walkthrough.py
```

The source hash check detects when walkthrough excerpts need refreshing. Browser verification covers page navigation, readable text, mobile layout, dark mode, diagram and image routes. Local scenarios and live provider calls are recorded separately in the workspace verification report; local success is not evidence of a live provider operation.

## Repository contents

Application sources, student web pages, safe configuration example and documentation images are included. `node_modules`, `presentation`, `output`, `reviewed`, `v3`, `teaching-material`, build output, local journals, credentials and local resource files are ignored. Existing teaching videos and presentations remain in the original workspace.
