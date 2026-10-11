import catalog from "../src/catalog.json" with { type: "json" };
import { localAnswer, urgentHealthQuery } from "../server/catalog-search.mjs";
import { modelAnswer, readPayload } from "../server/model-answer.mjs";

export async function handleRequest(request, env) {
  const origin = request.headers.get("Origin");
  const allowed = (env.ALLOWED_ORIGINS || "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
  const trusted = allowed.includes(origin);
  const headers = {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff",
    Vary: "Origin",
  };
  if (trusted) headers["Access-Control-Allow-Origin"] = origin;
  const reply = (status, body) =>
    new Response(JSON.stringify(body), { status, headers });
  if (!trusted) return reply(403, { error: "请求来源不受支持。" });
  if (request.method === "OPTIONS") {
    if (
      request.headers.get("Access-Control-Request-Method") !== "POST" &&
      request.headers.get("Access-Control-Request-Method") !== "GET"
    )
      return reply(405, { error: "不支持的请求方式。" });
    return new Response(null, {
      status: 204,
      headers: {
        ...headers,
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
        "Access-Control-Max-Age": "86400",
      },
    });
  }
  const path = new URL(request.url).pathname;
  const ready = Boolean(
    env.AI_API_KEY &&
    env.AI_BASE_URL &&
    env.AI_MODEL &&
    env.AI_RATE_LIMITER &&
    env.GLOBAL_RATE_LIMITER,
  );
  if (path === "/api/status" && request.method === "GET")
    return reply(
      ready ? 200 : 503,
      ready
        ? { mode: "model", catalogCount: catalog.length }
        : { error: "校园向导正在配置，请稍后再试。" },
    );
  if (path !== "/api/ask") return reply(404, { error: "没有这个接口。" });
  if (request.method !== "POST")
    return reply(405, { error: "不支持的请求方式。" });
  if (!request.headers.get("Content-Type")?.startsWith("application/json"))
    return reply(415, { error: "请使用 JSON 提交问题。" });
  if (!ready) return reply(503, { error: "校园向导正在配置，请稍后再试。" });
  let payload;
  try {
    if (Number(request.headers.get("Content-Length")) > 60000)
      throw new Error("Too large");
    const reader = request.body?.getReader();
    if (!reader) throw new Error("Missing body");
    const chunks = [];
    let size = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > 60000) {
        await reader.cancel();
        throw new Error("Too large");
      }
      chunks.push(value);
    }
    const body = new Uint8Array(size);
    let offset = 0;
    for (const chunk of chunks) {
      body.set(chunk, offset);
      offset += chunk.length;
    }
    payload = readPayload(JSON.parse(new TextDecoder().decode(body)));
  } catch {
    return reply(400, { error: "请输入 1 至 1000 字的问题，或开始新的对话。" });
  }
  if (urgentHealthQuery(payload.message))
    return reply(200, localAnswer(payload.message, catalog));
  const ip = request.headers.get("CF-Connecting-IP");
  if (!ip) return reply(403, { error: "无法确认请求来源。" });
  try {
    if (
      !(await env.AI_RATE_LIMITER.limit({ key: ip })).success ||
      !(await env.GLOBAL_RATE_LIMITER.limit({ key: "campus-ai" })).success
    )
      return reply(429, { error: "提问较频繁，请稍后再试。" });
    return reply(
      200,
      await modelAnswer(payload, catalog, {
        baseUrl: env.AI_BASE_URL,
        model: env.AI_MODEL,
        apiKey: env.AI_API_KEY,
      }),
    );
  } catch {
    return reply(502, {
      error: "校园向导暂时无法连接。请稍后重试，或先按分类查找。",
    });
  }
}

export default { fetch: handleRequest };
