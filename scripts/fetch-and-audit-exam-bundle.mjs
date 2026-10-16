#!/usr/bin/env node
/**
 * Fetch a pinned public CAP dataset bundle for LOCAL metadata-only inspection.
 *
 * Usage:
 *   node scripts/fetch-and-audit-exam-bundle.mjs <exam-json-url> <output-dir>
 *
 * Safety:
 * - Only accepts HTTPS URLs on huggingface.co/datasets/JacobLinCool/taiwan-exams/resolve/
 * - Writes the payload and a metadata-only report to the chosen local directory.
 * - Does not print question text or commit/copy the payload into the repository.
 * - The source dataset notes exam content copyright belongs to the original publisher;
 *   local access is not a grant to republish stems, options, passages, or images.
 */
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { resolve, join } from "node:path";
import { createHash } from "node:crypto";

const [urlArg, outputDirArg] = process.argv.slice(2);
if (!urlArg || !outputDirArg) {
  console.error("Usage: node scripts/fetch-and-audit-exam-bundle.mjs <exam-json-url> <output-dir>");
  process.exit(2);
}

let sourceUrl;
try {
  sourceUrl = new URL(urlArg);
} catch {
  console.error("FAIL: invalid source URL");
  process.exit(2);
}
const allowedPrefix = "/datasets/JacobLinCool/taiwan-exams/resolve/";
if (sourceUrl.protocol !== "https:" || sourceUrl.hostname !== "huggingface.co" ||
    !sourceUrl.pathname.startsWith(allowedPrefix) || !sourceUrl.pathname.endsWith("/exam.json")) {
  console.error("FAIL: only HTTPS exam.json URLs under the approved dataset resolve path are accepted");
  process.exit(2);
}

const outputDir = resolve(outputDirArg);
await mkdir(outputDir, { recursive: true });
const response = await fetch(sourceUrl, { redirect: "follow", headers: { accept: "application/json" } });
if (!response.ok) {
  console.error(`FAIL: source returned HTTP ${response.status}`);
  process.exit(1);
}
const raw = await response.text();
let exam;
try {
  exam = JSON.parse(raw);
} catch {
  console.error("FAIL: downloaded payload is not valid JSON");
  process.exit(1);
}
if (!exam || typeof exam !== "object" || !Array.isArray(exam.sections)) {
  console.error("FAIL: expected an exam object with sections[]");
  process.exit(1);
}

const seenIds = new Set();
const seenNumbers = new Set();
const questionTypes = {};
const assets = new Set();
let questionCount = 0, textParts = 0, imageParts = 0, tableParts = 0;
let missingPromptOrNumber = 0, duplicateIds = 0, duplicateNumbers = 0;
function walk(value) {
  if (!value || typeof value !== "object") return;
  if (Array.isArray(value)) { for (const item of value) walk(item); return; }
  if (value.type === "text") textParts++;
  if (value.type === "image") {
    imageParts++;
    if (typeof value.asset === "string") assets.add(value.asset);
  }
  if (value.type === "table") tableParts++;
  for (const [key, child] of Object.entries(value)) {
    if (key === "asset" && typeof child === "string") assets.add(child);
    else walk(child);
  }
}
function collect(node) {
  if (!node || typeof node !== "object") return;
  if (Array.isArray(node)) { for (const child of node) collect(child); return; }
  if (typeof node.id === "string" && node.type && (node.prompt !== undefined || node.options !== undefined)) {
    questionCount++;
    questionTypes[node.type] = (questionTypes[node.type] ?? 0) + 1;
    if (seenIds.has(node.id)) duplicateIds++;
    seenIds.add(node.id);
    const number = String(node.number ?? "");
    if (!number) missingPromptOrNumber++;
    else if (seenNumbers.has(number)) duplicateNumbers++;
    seenNumbers.add(number);
    if (!Array.isArray(node.prompt) && typeof node.prompt !== "string") missingPromptOrNumber++;
    walk(node.prompt); walk(node.options); walk(node.children);
    return;
  }
  for (const child of Object.values(node)) collect(child);
}
collect(exam.sections);
const errors = [];
if (duplicateIds) errors.push(`${duplicateIds} duplicate question ID(s)`);
if (duplicateNumbers) errors.push(`${duplicateNumbers} duplicate question number(s)`);
const examFile = join(outputDir, "source-exam.local.json");
const reportFile = join(outputDir, "metadata-audit.json");
await writeFile(examFile, raw, { encoding: "utf8", flag: "wx" }).catch(error => {
  if (error.code === "EEXIST") throw new Error("source-exam.local.json already exists; choose a new output directory");
  throw error;
});
const report = {
  auditType: "metadata-only",
  sourceUrl: sourceUrl.href,
  retrievedAt: new Date().toISOString(),
  sha256: createHash("sha256").update(raw).digest("hex"),
  examId: exam.exam_id ?? null,
  title: exam.title ?? null,
  subject: exam.subject ?? null,
  questionCount,
  questionTypes,
  uniqueQuestionIds: seenIds.size,
  uniqueQuestionNumbers: seenNumbers.size,
  missingPromptOrNumber,
  textParts,
  imageParts,
  tableParts,
  uniqueAssetReferences: assets.size,
  structuralErrors: errors,
  sourcePayloadPath: examFile,
  note: "Metadata audit only. This report intentionally excludes question text, options, passages, answers, and image descriptions. Public access is not a republication licence."
};
await writeFile(reportFile, JSON.stringify(report, null, 2) + "\\n", "utf8");
console.log(JSON.stringify({ reportFile, sourcePayloadSavedLocally: true, sha256: report.sha256, questionCount, questionTypes, imageParts, tableParts, structuralErrors: errors.length }, null, 2));
if (errors.length) process.exit(1);
