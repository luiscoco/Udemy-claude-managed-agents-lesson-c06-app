import { test } from "node:test";
import assert from "node:assert/strict";
import { fixture, run } from "./runner";
test("fixture completion requires an end-turn event", async () => {
 const frames: string[] = []; const outcome = await run(fixture(), "hello", f => frames.push(f.type));
 assert.equal(outcome, "completed"); assert.ok(frames.includes("idle"));
});
test("a stream ending after text is incomplete", async () => {
 const outcome = await run(fixture(true), "hello", () => {}); assert.equal(outcome, "incomplete");
});
