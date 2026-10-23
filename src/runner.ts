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
