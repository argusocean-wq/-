#!/usr/bin/env node
/**
 * Fail-closed importer for CAP question JSON.
 *
 * Usage:
 *   node scripts/import-rights-cleared-questions.mjs <source-paper.json> <output-paper.json>
 *
 * Only question records with rightsStatus === "cleared" are copied.
 * Missing, ambiguous, or restricted rights metadata is skipped. This script
 * does not infer permission from public availability, and does not certify
 * answer accuracy or publication readiness.
 */
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";

const [sourceArg, outputArg] = process.argv.slice(2);
if (!sourceArg || !outputArg) {
  console.error("Usage: node scripts/import-rights-cleared-questions.mjs <source-paper.json> <output-paper.json>");
  process.exit(2);
}

let paper;
try {
  paper = JSON.parse(await readFile(resolve(sourceArg), "utf8"));
} catch (error) {
  console.error(`FAIL: cannot read/parse source JSON: ${error.message}`);
  process.exit(1);
}

if (!paper || typeof paper !== "object" || !paper.exam || !Array.isArray(paper.questions)) {
  console.error("FAIL: source must contain an exam object and questions array");
  process.exit(1);
}

const cleared = [];
const skipped = [];
for (const [index, question] of paper.questions.entries()) {
  if (question && typeof question === "object" && question.rightsStatus === "cleared") {
    cleared.push(question);
  } else {
    skipped.push({
      index,
      id: typeof question?.id === "string" ? question.id : null,
      number: Number.isInteger(question?.number) ? question.number : null,
      reason: question?.rightsStatus
        ? `rightsStatus_not_cleared:${String(question.rightsStatus)}`
        : "rights_status_missing"
    });
  }
}

console.log(`Source records: ${paper.questions.length}`);
console.log(`Rights-cleared records selected: ${cleared.length}`);
console.log(`Skipped due to missing/uncleared rights status: ${skipped.length}`);

if (cleared.length === 0) {
  console.log("NO IMPORT: no record has explicit rightsStatus=\"cleared\". No output file was written.");
  process.exit(0);
}

const output = {
  ...paper,
  exam: { ...paper.exam, totalQuestionRecords: cleared.length },
  questions: cleared,
  importAudit: {
    policy: "fail-closed-explicit-question-level-rights-clearance",
    sourceRecordCount: paper.questions.length,
    importedRecordCount: cleared.length,
    skippedRecordCount: skipped.length,
    skippedRecords: skipped,
    note: "Rights clearance alone does not establish official answer verification or publication readiness."
  }
};

await mkdir(dirname(resolve(outputArg)), { recursive: true });
await writeFile(resolve(outputArg), JSON.stringify(output, null, 2) + "\n", "utf8");
console.log(`WROTE: ${resolve(outputArg)}`);
console.log("NEXT: run scripts/validate-question-batch.mjs on the output and separately verify answers and source fidelity.");
