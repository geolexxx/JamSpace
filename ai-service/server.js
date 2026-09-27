import { createServer } from "node:http";
import { pathToFileURL } from "node:url";
import { continueMelody, MelodyServiceError } from "./melody.js";

const MAX_BODY_BYTES = 24 * 1024;

function sendJson(response, status, value) {
  response.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff",
  });
  response.end(JSON.stringify(value));
}

export function createMelodyServer(options = {}) {
  return createServer(async (request, response) => {
    if (request.url === "/api/melody/health" && request.method === "GET") {
      sendJson(response, 200, { ready: Boolean(options.apiKey ?? process.env.OPENAI_API_KEY) });
      return;
    }
    if (request.url !== "/api/melody/continue" || request.method !== "POST") {
      sendJson(response, 404, { error: { code: "NOT_FOUND", message: "Route not found." } });
      return;
    }
    if (!request.headers["content-type"]?.toLowerCase().startsWith("application/json")) {
      sendJson(response, 415, { error: { code: "UNSUPPORTED_MEDIA_TYPE", message: "Send JSON melody notes." } });
      return;
    }
    let bytes = 0;
    const chunks = [];
    try {
      for await (const chunk of request) {
        bytes += chunk.length;
        if (bytes > MAX_BODY_BYTES) {
          throw new MelodyServiceError(413, "REQUEST_TOO_LARGE", "The melody request is too large.");
        }
        chunks.push(chunk);
      }
      let body;
      try { body = JSON.parse(Buffer.concat(chunks).toString("utf8")); }
      catch { throw new MelodyServiceError(400, "INVALID_JSON", "Send valid JSON melody notes."); }
      const result = await continueMelody(body, options);
      sendJson(response, 200, result);
    } catch (error) {
      const known = error instanceof MelodyServiceError;
      sendJson(response, known ? error.status : 500, {
        error: {
          code: known ? error.code : "INTERNAL_ERROR",
          message: known ? error.message : "The melody agent could not complete this request.",
        },
      });
    }
  });
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const server = createMelodyServer();
  server.listen(8787, "127.0.0.1", () => {
    console.log("JamSpace melody agent listening on 127.0.0.1:8787");
  });
}
