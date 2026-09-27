import assert from "node:assert/strict";
import { test } from "node:test";
import handler from "../api/melody/continue.js";

function response() {
  return {
    statusCode: 200,
    headers: {},
    setHeader(name, value) { this.headers[name.toLowerCase()] = value; },
    end(body) { this.body = JSON.parse(body); },
  };
}

test("Vercel melody endpoint requires a server key and testing code", async () => {
  const oldKey = process.env.OPENAI_API_KEY;
  const oldCode = process.env.JAMSPACE_AI_ACCESS_CODE;
  try {
    delete process.env.OPENAI_API_KEY;
    delete process.env.JAMSPACE_AI_ACCESS_CODE;
    const request = { method: "POST", headers: { "content-type": "application/json" }, body: {} };
    const unavailable = response();
    await handler(request, unavailable);
    assert.equal(unavailable.statusCode, 503);
    assert.equal(unavailable.body.error.code, "AI_NOT_CONFIGURED");

    process.env.OPENAI_API_KEY = "test-key";
    process.env.JAMSPACE_AI_ACCESS_CODE = "private-test-code";
    const denied = response();
    await handler(request, denied);
    assert.equal(denied.statusCode, 403);
    assert.equal(denied.body.error.code, "AI_ACCESS_DENIED");

    const invalidJson = response();
    await handler({ ...request, headers: { ...request.headers, "x-jamspace-ai-code": "private-test-code" }, body: "{" }, invalidJson);
    assert.equal(invalidJson.statusCode, 400);
    assert.equal(invalidJson.body.error.code, "INVALID_JSON");

    const tooLarge = response();
    await handler({ ...request, headers: { ...request.headers, "x-jamspace-ai-code": "private-test-code" }, body: { notes: "x".repeat(70_000) } }, tooLarge);
    assert.equal(tooLarge.statusCode, 413);
  } finally {
    if (oldKey === undefined) delete process.env.OPENAI_API_KEY;
    else process.env.OPENAI_API_KEY = oldKey;
    if (oldCode === undefined) delete process.env.JAMSPACE_AI_ACCESS_CODE;
    else process.env.JAMSPACE_AI_ACCESS_CODE = oldCode;
  }
});
