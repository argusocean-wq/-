#!/usr/bin/env node
/**
 * Validate a normalized CAP question-paper JSON file before repository import.
 *
 * Usage:
 *   node scripts/validate-question-batch.mjs data/questions/2026/mathematics/115-mathematics-full.json
 *
 * This checks structure and internal consistency only. It does NOT prove that
 * wording, answers, diagrams, source rights, or publication status are correct.
 */
import { readFile } from "node:fs/promises";

const file = process.argv[2];
if (!file) {
  console.error("Usage: node scripts/validate-question-batch.mjs <paper.json>");
  process.exit(2);
}

let paper;
try {
  paper = JSON.parse(await readFile(file, "utf8"));
} catch (error) {
  console.error(`FAIL: cannot read/parse JSON: ${error.message}`);
  process.exit(1);
}

const errors = [];
const warnings = [];
const questions = paper?.questions;
const exam = paper?.exam;

if (!exam || typeof exam !== "object") errors.push("missing exam object");
if (!Array.isArray(questions)) errors.push("questions must be an array");

if (Array.isArray(questions)) {
  if (Number.isInteger(exam?.totalQuestionRecords) && exam.totalQuestionRecords !== questions.length) {
    errors.push(`exam.totalQuestionRecords=${exam.totalQuestionRecords}, actual questions.length=${questions.length}`);
  }

  const ids = new Set();
  const numbers = new Set();

  questions.forEach((q, index) => {
    const where = `questions[${index}]`;
    if (!q || typeof q !== "object" || Array.isArray(q)) {
      errors.push(`${where} must be an object`);
      return;
    }

    if (typeof q.id !== "string" || !q.id.trim()) errors.push(`${where}.id is required`);
    else if (ids.has(q.id)) errors.push(`duplicate question id: ${q.id}`);
    else ids.add(q.id);

    if (!Number.isInteger(q.number) || q.number < 1) {
      errors.push(`${where}.number must be a positive integer`);
    } else if (numbers.has(q.number)) {
      warnings.push(`question number ${q.number} appears more than once (check multi-part item modeling)`);
    } else {
      numbers.add(q.number);
    }

    const questionText = q.question ?? q.prompt;
    if (typeof questionText !== "string" || !questionText.trim()) {
      errors.push(`${where} requires question or prompt text`);
    }

    const citation = q.sourceCitation;
    if (!citation || typeof citation !== "object") {
      errors.push(`${where}.sourceCitation is required (every question must cite its source)`);
    } else {
      const primary = citation.primarySource;
      if (!primary || typeof primary !== "object") {
        errors.push(`${where}.sourceCitation.primarySource is required`);
      } else {
        if (typeof primary.url !== "string" || !/^https?:\\/\\//i.test(primary.url)) {
          errors.push(`${where}.sourceCitation.primarySource.url must be an HTTP(S) URL`);
        }
        if (typeof primary.locator !== "string" || !primary.locator.trim()) {
          errors.push(`${where}.sourceCitation.primarySource.locator must identify the question in its source`);
        }
      }
      if (citation.sourceVerificationStatus !== "officially_reconciled" &&
          citation.sourceVerificationStatus !== "paper_level_source_attached_question_level_reconciliation_pending") {
        warnings.push(`${q.id ?? where} has no recognized question-level source verification status`);
      }
    }

    const recordStatus = q.status ?? q.verificationStatus ?? "draft";
    if (typeof recordStatus !== "string" || !recordStatus.trim()) {
      errors.push(`${where}.status/verificationStatus must be a non-empty string when provided`);
    }

    if (q.type === "single_choice" || q.type === "multiple_choice") {
      const optionEntries = Array.isArray(q.options)
        ? q.options.map((option, optionIndex) => [optionIndex, option])
        : q.options && typeof q.options === "object"
          ? Object.entries(q.options).map(([id, text]) => [id, { id, text }])
          : null;
      if (!optionEntries || optionEntries.length < 2) {
        errors.push(`${where} (${q.id ?? index}) must have at least two options in array or keyed-object form`);
      } else {
        const optionIds = new Set();
        for (const [optionIndex, option] of optionEntries) {
          if (!option || typeof option.id !== "string" || !option.id.trim()) {
            errors.push(`${where}.options[${optionIndex}].id is required`);
            continue;
          }
          if (optionIds.has(option.id)) errors.push(`${where} has duplicate option id ${option.id}`);
          optionIds.add(option.id);
          if (typeof option.text !== "string" || !option.text.trim()) {
            errors.push(`${where}.options[${optionIndex}].text is required`);
          }
        }
        if (q.answer === null || q.answer === undefined || q.answer === "") {
          warnings.push(`${q.id ?? where} has no answer recorded; official answer verification remains pending`);
        } else if (typeof q.answer !== "string" || !optionIds.has(q.answer)) {
          errors.push(`${where}.answer must match an option id when an answer is present`);
        }
      }
    }

    if (recordStatus === "published" &&
        ((q.answerVerificationStatus ?? q.verificationStatus) !== "officially_verified" || q.rightsStatus !== "cleared")) {
      errors.push(`${where} is published without official answer verification and rights clearance`);
    }

    if (recordStatus !== "published" &&
        ((q.answerVerificationStatus ?? q.verificationStatus) !== "officially_verified" || q.rightsStatus !== "cleared")) {
      // Expected for drafts; visible reminder only, not a structural failure.
      warnings.push(`${q.id ?? where} is not publication-ready; keep excluded from production draws`);
    }
  });
}

if (errors.length) {
  console.error(`VALIDATION FAILED: ${errors.length} error(s), ${warnings.length} warning(s)`);
  for (const item of errors) console.error(`ERROR: ${item}`);
  for (const item of warnings) console.warn(`WARN: ${item}`);
  process.exit(1);
}

console.log(`STRUCTURE OK: ${questions.length} question record(s)`);
console.log(`Unique IDs: ${new Set(questions.map(q => q.id)).size}`);
console.log(`Warnings: ${warnings.length}`);
for (const item of warnings) console.warn(`WARN: ${item}`);
console.log("NOTE: structural validation is not official source/answer/rights verification.");
