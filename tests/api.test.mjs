import test from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import { spawn } from "node:child_process";
import { setTimeout as delay } from "node:timers/promises";

async function freePort() {
  const probe = http.createServer();
  await new Promise((resolve) => probe.listen(0, "127.0.0.1", resolve));
  const address = probe.address();
  if (!address || typeof address === "string")
    throw new Error("Missing test port");
  const port = address.port;
  await new Promise((resolve) => probe.close(resolve));
  return port;
}
async function startCampusServer(configuration) {
  const port = await freePort();
  const child = spawn(process.execPath, ["server/index.mjs"], {
    env: {
      ...process.env,
      AI_BASE_URL: "",
      AI_MODEL: "",
      AI_API_KEY: "",
      ...configuration,
      PORT: String(port),
      HOST: "127.0.0.1",
    },
    stdio: ["ignore", "pipe", "pipe"],
  });
  const base = `http://127.0.0.1:${port}`;
  for (let attempt = 0; attempt < 40; attempt += 1) {
    try {
      const response = await fetch(`${base}/api/status`);
      if (response.ok) return { child, base };
    } catch {}
    if (child.exitCode !== null)
      throw new Error("Campus server exited before readiness");
    await delay(50);
  }
  child.kill();
  throw new Error("Campus server did not become ready");
}
async function question(base, message, headers = {}) {
  return fetch(`${base}/api/ask`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify({ message }),
  });
}
test("local API labels retrieval and rejects invalid input or origins", async (t) => {
  const { child, base } = await startCampusServer({});
  t.after(() => child.kill());
  const response = await question(base, "宿舍空调坏了");
  assert.equal(response.status, 200);
  const reply = await response.json();
  assert.equal(reply.mode, "local");
  assert.equal(reply.recommendations[0], "repair");
  assert.equal((await question(base, "")).status, 400);
  assert.equal(
    (await question(base, "查询", { Origin: "not-a-url" })).status,
    403,
  );
  assert.equal(
    (await question(base, "查询", { Origin: "https://untrusted.example" }))
      .status,
    403,
  );
  assert.equal((await fetch(`${base}/api/status`)).status, 200);
  for (const privatePath of [
    "/docs/catalog-provenance.json",
    "/Untitled.pdf",
    "/docs/pdf-page-map.json",
  ])
    assert.equal((await fetch(`${base}${privatePath}`)).status, 404);
});
test("model API validates provider recommendations and surfaces outages", async (t) => {
  let scenario = "valid";
  const provider = http.createServer(async (request, response) => {
    for await (const chunk of request) void chunk;
    if (scenario === "outage") {
      response.writeHead(503);
      response.end("{}");
      return;
    }
    const reply = {
      answer: "可以查看宿舍报修渠道。",
      recommendations:
        scenario === "valid" ? ["repair"] : ["unknown-external-destination"],
    };
    response.writeHead(200, { "Content-Type": "application/json" });
    response.end(
      JSON.stringify({
        choices: [{ message: { content: JSON.stringify(reply) } }],
      }),
    );
  });
  await new Promise((resolve) => provider.listen(0, "127.0.0.1", resolve));
  t.after(() => provider.close());
  const address = provider.address();
  if (!address || typeof address === "string")
    throw new Error("Missing provider test port");
  const { child, base } = await startCampusServer({
    AI_BASE_URL: `http://127.0.0.1:${address.port}/v1`,
    AI_MODEL: "test-model",
    AI_API_KEY: "fixture-not-a-real-key",
  });
  t.after(() => child.kill());
  const valid = await question(base, "报修");
  assert.equal(valid.status, 200);
  const reply = await valid.json();
  assert.equal(reply.mode, "model");
  assert.deepEqual(reply.recommendations, ["repair"]);
  scenario = "unknown";
  assert.equal((await question(base, "报修")).status, 502);
  scenario = "outage";
  assert.equal((await question(base, "报修")).status, 502);
  const urgent = await question(base, "胸痛呼吸困难怎么办");
  assert.equal(urgent.status, 200);
  const urgentReply = await urgent.json();
  assert.equal(urgentReply.mode, "local");
  assert.match(urgentReply.answer, /立即拨打 120/);
  assert.deepEqual(urgentReply.recommendations, ["health-guide"]);
});
