import { continueMelody, MelodyServiceError } from "../../server/melody.js";
import { timingSafeEqual } from "node:crypto";

const MAX_BODY_BYTES = 64 * 1024;

function sendJson(response, status, value) {
  response.statusCode = status;
  response.setHeader("Content-Type", "application/json; charset=utf-8");
  response.setHeader("Cache-Control", "no-store");
  response.setHeader("X-Content-Type-Options", "nosniff");
  response.end(JSON.stringify(value));
}

function validAccessCode(provided, expected) {
  if (typeof provided !== "string" || provided.length > 128) return false;
  const actualBytes = Buffer.from(provided);
  const expectedBytes = Buffer.from(expected);
  return actualBytes.length === expectedBytes.length && timingSafeEqual(actualBytes, expectedBytes);
}

export default async function handler(request, response) {
  if (request.method !== "POST") {
    response.setHeader("Allow", "POST");
    sendJson(response, 405, { error: { code: "METHOD_NOT_ALLOWED", message: "Use POST to continue a melody." } });
    return;
  }
  if (!request.headers["content-type"]?.toLowerCase().startsWith("application/json")) {
    sendJson(response, 415, { error: { code: "UNSUPPORTED_MEDIA_TYPE", message: "Send JSON melody notes." } });
    return;
  }
  const accessCode = process.env.JAMSPACE_AI_ACCESS_CODE;
  if (!accessCode || !process.env.OPENAI_API_KEY) {
    sendJson(response, 503, { error: { code: "AI_NOT_CONFIGURED", message: "AI suggestions are not available yet." } });
    return;
  }
  if (!validAccessCode(request.headers["x-jamspace-ai-code"], accessCode)) {
    sendJson(response, 403, { error: { code: "AI_ACCESS_DENIED", message: "The AI testing code is incorrect. Try again." } });
    return;
  }
  try {
    let body;
    try {
      body = typeof request.body === "string" ? JSON.parse(request.body) : request.body;
    } catch {
      throw new MelodyServiceError(400, "INVALID_JSON", "Send valid JSON melody notes.");
    }
    if (Buffer.byteLength(JSON.stringify(body ?? null)) > MAX_BODY_BYTES) {
      throw new MelodyServiceError(413, "REQUEST_TOO_LARGE", "The melody request is too large.");
    }
    sendJson(response, 200, await continueMelody(body));
  } catch (error) {
    const known = error instanceof MelodyServiceError;
    sendJson(response, known ? error.status : 500, {
      error: {
        code: known ? error.code : "INTERNAL_ERROR",
        message: known ? error.message : "The melody agent could not complete this request.",
      },
    });
  }
}
