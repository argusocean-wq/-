import test from "node:test";
import assert from "node:assert/strict";
import { drawRandomQuestions, drawBalancedPaper } from "./random-question-draw.js";

const bank = [
  { id: "m1", subject: "mathematics", difficulty: "medium", status: "published", rightsStatus: "allowed", tags: ["algebra"] },
  { id: "m2", subject: "mathematics", difficulty: "medium", status: "published", rightsStatus: "allowed", tags: ["algebra"] },
  { id: "m3", subject: "mathematics", difficulty: "hard", status: "published", rightsStatus: "allowed" },
  { id: "c1", subject: "chinese", difficulty: "easy", status: "published", rightsStatus: "allowed" },
  { id: "draft1", subject: "mathematics", difficulty: "medium", status: "draft", rightsStatus: "pending" },
  { id: "m1", subject: "mathematics", difficulty: "medium", status: "published", rightsStatus: "allowed" }
];

test("filters by subject/difficulty and excludes unpublished or unapproved questions", () => {
  const result = drawRandomQuestions(bank, { count: 10, subject: "mathematics", difficulty: "medium", seed: 1 });
  assert.deepEqual(result.questions.map(q => q.id).sort(), ["m1", "m2"]);
  assert.equal(result.available, 2);
});

test("same seed yields same selection order", () => {
  const a = drawRandomQuestions(bank, { count: 2, seed: 42 }).questions.map(q => q.id);
  const b = drawRandomQuestions(bank, { count: 2, seed: 42 }).questions.map(q => q.id);
  assert.deepEqual(a, b);
});

test("does not return duplicate IDs", () => {
  const result = drawRandomQuestions(bank, { count: 10, seed: 9 });
  assert.equal(new Set(result.questions.map(q => q.id)).size, result.questions.length);
});

test("reports available count if fewer questions exist than requested", () => {
  const result = drawRandomQuestions(bank, { count: 5, subject: "mathematics", difficulty: "medium", seed: 3 });
  assert.equal(result.questions.length, 2);
  assert.equal(result.available, 2);
});

test("supports exclusions and tags", () => {
  const result = drawRandomQuestions(bank, { count: 5, subject: "mathematics", tags: ["algebra"], excludeIds: ["m1"], seed: 4 });
  assert.deepEqual(result.questions.map(q => q.id), ["m2"]);
});

test("balanced paper reports per-subject shortages", () => {
  const result = drawBalancedPaper(bank, { mathematics: 2, chinese: 2 }, { seed: 7 });
  assert.equal(result.questions.length, 3);
  assert.equal(result.shortages.chinese.requested, 2);
  assert.equal(result.shortages.chinese.available, 1);
});

test("rejects invalid counts and difficulty", () => {
  assert.throws(() => drawRandomQuestions(bank, { count: -1 }), RangeError);
  assert.throws(() => drawRandomQuestions(bank, { count: 1, difficulty: "extreme" }), RangeError);
});
