#!/usr/bin/env node
/**
 * Fail-closed importer for CAP question JSON.
 *
 * Usage:
 *   node scripts/import-rights-cleared-questions.mjs <source-paper.json> <output-paper.json>
 *
 * A record is eligible only when rightsStatus === "cleared" AND rightsEvidence
 * contains a human-reviewable basis, evidence URL, review date, and reviewer.
 * Public availability, source attribution, or a self-declared status alone is
 * not treated as permission. This tool does not provide legal advice.
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

function hasRightsEvidence(question) {
  const evidence = question?.rightsEvidence;
  if (!evidence || typeof evidence !== "object") return false;
  if (typeof evidence.basis !== "string" || !evidence.basis.trim()) return false;
  if (typeof evidence.evidenceUrl !== "string") return false;
  try {
    const url = new URL(evidence.evidenceUrl);
    if (url.protocol !== "https:" && url.protocol !== "http:") return false;
  } catch {
    return false;
  }
  if (typeof evidence.reviewedAt !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(evidence.reviewedAt)) return false;
  if (typeof evidence.reviewer !== "string" || !evidence.reviewer.trim()) return false;
  return true;
}

const cleared = [];
const skipped = [];
for (const [index, question] of paper.questions.entries()) {
  const statusCleared = question && typeof question === "object" && question.rightsStatus === "cleared";
  const evidenceComplete = hasRightsEvidence(question);
  if (statusCleared && evidenceComplete) {
    cleared.push(question);
  } else {
    let reason = "rights_status_missing";
    if (question?.rightsStatus && question.rightsStatus !== "cleared") {
      reason = `rightsStatus_not_cleared:${String(question.rightsStatus)}`;
    } else if (statusCleared && !evidenceComplete) {
      reason = "rights_evidence_incomplete";
    }
    skipped.push({
      index,
      id: typeof question?.id === "string" ? question.id : null,
      number: Number.isInteger(question?.number) ? question.number : null,
      reason
    });
  }
}

console.log(`Source records: ${paper.questions.length}`);
console.log(`Rights-cleared records with evidence selected: ${cleared.length}`);
console.log(`Skipped due to missing/uncleared/incomplete rights evidence: ${skipped.length}`);

if (cleared.length === 0) {
  console.log("NO IMPORT: no record has explicit rightsStatus=\"cleared\" plus complete rightsEvidence. No output file was written.");
  process.exit(0);
}

const output = {
  ...paper,
  exam: { ...paper.exam, totalQuestionRecords: cleared.length },
  questions: cleared,
  importAudit: {
    policy: "fail-closed-explicit-question-level-rights-clearance-with-evidence",
    sourceRecordCount: paper.questions.length,
    importedRecordCount: cleared.length,
    skippedRecordCount: skipped.length,
    skippedRecords: skipped,
    note: "Rights evidence must be reviewed for applicability. Rights clearance alone does not establish official answer verification or publication readiness."
  }
};

await mkdir(dirname(resolve(outputArg)), { recursive: true });
await writeFile(resolve(outputArg), JSON.stringify(output, null, 2) + "\n", "utf8");
console.log(`WROTE: ${resolve(outputArg)}`);
console.log("NEXT: run scripts/validate-question-batch.mjs on the output and separately verify answers and source fidelity.");
