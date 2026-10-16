#!/usr/bin/env node
/**
 * Metadata-only audit for a CAP exam bundle.
 *
 * Usage:
 *   node scripts/audit-exam-bundle.mjs path/to/exam.json
 *
 * This intentionally emits only counts and structural diagnostics. It does not
 * copy or print exam stems, options, passages, answers, or image descriptions.
 */
import { readFile } from "node:fs/promises";

const file = process.argv[2];
if (!file) {
  console.error("Usage: node scripts/audit-exam-bundle.mjs <exam.json>");
  process.exit(2);
}

let exam;
try {
  exam = JSON.parse(await readFile(file, "utf8"));
} catch (error) {
  console.error(`FAIL: cannot read/parse JSON: ${error.message}`);
  process.exit(1);
}

const errors = [];
const seenIds = new Set();
const seenNumbers = new Set();
const questionTypes = {};
const assetRefs = new Set();
let questionCount = 0;
let textParts = 0;
let imageParts = 0;
let tableParts = 0;
let missingPrompt = 0;
let duplicateIds = 0;
let duplicateNumbers = 0;

function walk(value) {
  if (!value || typeof value !== "object") return;
  if (Array.isArray(value)) {
    for (const item of value) walk(item);
    return;
  }
  if (value.type === "text") textParts++;
  if (value.type === "image") {
    imageParts++;
    if (typeof value.asset === "string") assetRefs.add(value.asset);
  }
  if (value.type === "table") tableParts++;
  for (const [key, child] of Object.entries(value)) {
    if (key === "asset" && typeof child === "string") assetRefs.add(child);
    else walk(child);
  }
}

function collectQuestions(node) {
  if (!node || typeof node !== "object") return;
  if (Array.isArray(node)) {
    for (const child of node) collectQuestions(child);
    return;
  }
  if (typeof node.id === "string" && node.type && (node.prompt !== undefined || node.options !== undefined)) {
    questionCount++;
    questionTypes[node.type] = (questionTypes[node.type] ?? 0) + 1;
    if (seenIds.has(node.id)) duplicateIds++;
    seenIds.add(node.id);
    const number = String(node.number ?? "");
    if (!number) missingPrompt++;
    else if (seenNumbers.has(number)) duplicateNumbers++;
    seenNumbers.add(number);
    if (!Array.isArray(node.prompt) && typeof node.prompt !== "string") missingPrompt++;
    walk(node.prompt);
    walk(node.options);
    walk(node.children);
    return;
  }
  for (const child of Object.values(node)) collectQuestions(child);
}

if (!exam || typeof exam !== "object" || !Array.isArray(exam.sections)) {
  errors.push("expected an exam object with sections[]");
} else {
  collectQuestions(exam.sections);
}

if (duplicateIds) errors.push(`${duplicateIds} duplicate question ID(s)`);
if (duplicateNumbers) errors.push(`${duplicateNumbers} duplicate question number(s)`);

const report = {
  auditType: "metadata-only",
  examId: exam?.exam_id ?? null,
  title: exam?.title ?? null,
  subject: exam?.subject ?? null,
  declaredTotalPoints: exam?.total_points ?? null,
  questionCount,
  questionTypes,
  uniqueQuestionIds: seenIds.size,
  uniqueQuestionNumbers: seenNumbers.size,
  promptOrNumberIssues: missingPrompt,
  textParts,
  imageParts,
  tableParts,
  uniqueAssetReferences: assetRefs.size,
  structuralErrors: errors
};

console.log(JSON.stringify(report, null, 2));
if (errors.length) process.exit(1);
