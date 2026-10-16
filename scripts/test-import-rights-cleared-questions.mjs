#!/usr/bin/env node
/**
 * Regression tests for the fail-closed rights gate.
 * Run: node --test scripts/test-import-rights-cleared-questions.mjs
 */
import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile, access } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";

const importer = resolve("scripts/import-rights-cleared-questions.mjs");
const validEvidence = {
  basis: "Explicit license grant reviewed for this intended use",
  evidenceUrl: "https://example.org/license",
  reviewedAt: "2026-10-17",
  reviewer: "rights-reviewer"
};
const validSourceCitation = {
  primarySource: {
    url: "https://example.org/official-paper.pdf",
    locator: "Question 1"
  }
};
async function runCase(questions) {
  const dir = await mkdtemp(join(tmpdir(), "cap-rights-gate-"));
  const source = join(dir, "source.json");
  const output = join(dir, "output.json");
  await writeFile(source, JSON.stringify({ exam: { id: "test", totalQuestionRecords: questions.length }, questions }));
  const result = spawnSync(process.execPath, [importer, source, output], { encoding: "utf8" });
  let outputExists = true;
  try { await access(output); } catch { outputExists = false; }
  let parsed = null;
  if (outputExists) parsed = JSON.parse(await readFile(output, "utf8"));
  await rm(dir, { recursive: true, force: true });
  return { result, outputExists, parsed };
}

test("imports only cleared record with complete evidence", async () => {
  const result = await runCase([
    { id: "ok", number: 1, rightsStatus: "cleared", rightsEvidence: validEvidence, sourceCitation: validSourceCitation },
    { id: "missing-evidence", number: 2, rightsStatus: "cleared", sourceCitation: validSourceCitation },
    { id: "restricted", number: 3, rightsStatus: "restricted", rightsEvidence: validEvidence, sourceCitation: validSourceCitation }
  ]);
  assert.equal(result.result.status, 0);
  assert.equal(result.outputExists, true);
  assert.deepEqual(result.parsed.questions.map(q => q.id), ["ok"]);
  assert.equal(result.parsed.importAudit.skippedRecordCount, 2);
});

test("does not write output when all records lack clearance/evidence", async () => {
  const result = await runCase([
    { id: "status-only", rightsStatus: "cleared", sourceCitation: validSourceCitation },
    { id: "unknown", rightsStatus: "unknown", rightsEvidence: validEvidence }
  ]);
  assert.equal(result.result.status, 0);
  assert.equal(result.outputExists, false);
  assert.match(result.result.stdout, /NO IMPORT/);
});

test("rejects malformed evidence URL and invalid review date", async () => {
  const result = await runCase([
    { id: "bad-url", rightsStatus: "cleared", rightsEvidence: { ...validEvidence, evidenceUrl: "javascript:alert(1)" }, sourceCitation: validSourceCitation },
    { id: "bad-date", rightsStatus: "cleared", rightsEvidence: { ...validEvidence, reviewedAt: "17-10-2026" }, sourceCitation: validSourceCitation }
  ]);
  assert.equal(result.result.status, 0);
  assert.equal(result.outputExists, false);
  assert.match(result.result.stdout, /Rights-cleared records with evidence selected: 0/);
});

test("skips cleared records without per-question source citation", async () => {
  const result = await runCase([
    { id: "no-citation", number: 1, rightsStatus: "cleared", rightsEvidence: validEvidence },
    { id: "with-citation", number: 2, rightsStatus: "cleared", rightsEvidence: validEvidence, sourceCitation: validSourceCitation }
  ]);
  assert.equal(result.result.status, 0);
  assert.equal(result.outputExists, true);
  assert.deepEqual(result.parsed.questions.map(q => q.id), ["with-citation"]);
  assert.equal(result.parsed.importAudit.skippedRecordCount, 1);
  assert.match(result.result.stdout, /question_source_citation_incomplete/);
});
