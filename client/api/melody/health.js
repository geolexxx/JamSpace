export default function handler(_request, response) {
  response.setHeader("Content-Type", "application/json; charset=utf-8");
  response.setHeader("Cache-Control", "no-store");
  response.end(JSON.stringify({ ready: Boolean(process.env.OPENAI_API_KEY && process.env.JAMSPACE_AI_ACCESS_CODE) }));
}
