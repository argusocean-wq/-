import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

test("package exposes reproducible test and start scripts", async () => {
  const pkg = JSON.parse(await readFile(new URL("../package.json", import.meta.url), "utf8"));
  assert.equal(pkg.scripts.start, "node server.js");
  assert.equal(pkg.scripts.test, "node --test");
});

test("question schema requires provenance, rights status, and review state", async () => {
  const schema = JSON.parse(await readFile(new URL("../data/question.schema.json", import.meta.url), "utf8"));
  assert.ok(schema.required.includes("source"));
  assert.ok(schema.required.includes("status"));
  assert.ok(schema.properties.source.required.includes("rightsStatus"));
  assert.ok(schema.properties.status.enum.includes("rights_reviewed"));
});

test("server binds to all interfaces for hosted deployment", async () => {
  const server = await readFile(new URL("../server.js", import.meta.url), "utf8");
  assert.match(server, /server\.listen\(port, "0\.0\.0\.0"/);
  assert.match(server, /X-Content-Type-Options/);
});
