/**
 * Random question selection for mock exams.
 * ESM module, Node.js 18+; no external dependencies.
 */

const VALID_DIFFICULTIES = new Set(["easy", "medium", "hard"]);

function makeRng(seed) {
  // Mulberry32 PRNG. Seed makes selection reproducible for debugging/tests.
  let state = Number.isFinite(Number(seed)) ? Number(seed) >>> 0 : 0x6d2b79f5;
  return function rng() {
    state = (state + 0x6D2B79F5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffle(items, rng) {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

function matches(question, options) {
  if (options.subject && question.subject !== options.subject) return false;
  if (options.difficulty && question.difficulty !== options.difficulty) return false;
  if (options.year != null && question.year !== options.year) return false;
  if (options.type && question.type !== options.type) return false;

  if (options.tags?.length) {
    const tags = new Set(Array.isArray(question.tags) ? question.tags : []);
    if (!options.tags.every(tag => tags.has(tag))) return false;
  }

  if (options.status && question.status !== options.status) return false;
  if (options.rightsStatus && question.rightsStatus !== options.rightsStatus) return false;

  if (options.excludeIds?.has(question.id)) return false;
  return true;
}

/**
 * Draw random questions from an array.
 *
 * @param {Array<object>} questionBank
 * @param {object} options
 * @param {number} options.count Number of questions to draw.
 * @param {string} [options.subject]
 * @param {"easy"|"medium"|"hard"} [options.difficulty]
 * @param {number} [options.year]
 * @param {string} [options.type]
 * @param {string[]} [options.tags] All tags must match.
 * @param {string} [options.status="published"]
 * @param {string} [options.rightsStatus="allowed"]
 * @param {number|string} [options.seed] Reproducible random seed.
 * @param {string[]} [options.excludeIds] Question IDs to exclude.
 * @param {boolean} [options.allowUnreviewed=false] Explicitly allow non-published/unreviewed content.
 * @returns {{questions: Array<object>, requested: number, available: number, seed: number|string|null}}
 */
export function drawRandomQuestions(questionBank, options = {}) {
  if (!Array.isArray(questionBank)) {
    throw new TypeError("questionBank must be an array");
  }

  const count = Number(options.count);
  if (!Number.isInteger(count) || count < 0) {
    throw new RangeError("count must be a non-negative integer");
  }

  if (options.difficulty && !VALID_DIFFICULTIES.has(options.difficulty)) {
    throw new RangeError("difficulty must be easy, medium, or hard");
  }

  const allowUnreviewed = options.allowUnreviewed === true;
  const normalized = {
    ...options,
    status: options.status ?? (allowUnreviewed ? undefined : "published"),
    rightsStatus: options.rightsStatus ?? (allowUnreviewed ? undefined : "allowed"),
    excludeIds: new Set(options.excludeIds ?? [])
  };

  const seen = new Set();
  const valid = [];
  for (const q of questionBank) {
    if (!q || typeof q.id !== "string" || !q.id.trim()) continue;
    if (typeof q.subject !== "string" || !q.subject.trim()) continue;
    if (seen.has(q.id)) continue;
    seen.add(q.id);
    if (matches(q, normalized)) valid.push(q);
  }

  const seed = options.seed ?? null;
  const rng = makeRng(seed ?? (Date.now() ^ Math.floor(Math.random() * 0xffffffff)));
  const questions = shuffle(valid, rng).slice(0, count);

  return {
    questions,
    requested: count,
    available: valid.length,
    seed
  };
}

/**
 * Draw a multi-subject paper with requested per-subject counts.
 * Example: { mathematics: 8, chinese: 5, english: 7 }
 */
export function drawBalancedPaper(questionBank, subjectCounts, options = {}) {
  if (!subjectCounts || typeof subjectCounts !== "object" || Array.isArray(subjectCounts)) {
    throw new TypeError("subjectCounts must be an object mapping subject IDs to counts");
  }

  const selected = [];
  const shortages = {};
  const seedBase = options.seed ?? 20261017;

  for (const [subject, count] of Object.entries(subjectCounts)) {
    const result = drawRandomQuestions(questionBank, {
      ...options,
      subject,
      count,
      seed: String(seedBase) + ":" + subject
    });
    selected.push(...result.questions);
    if (result.questions.length < count) {
      shortages[subject] = { requested: count, available: result.available };
    }
  }

  // Interleave subjects so the exam isn't grouped entirely by subject.
  const rng = makeRng(seedBase);
  const interleaved = shuffle(selected, rng);
  return { questions: interleaved, shortages, requested: Object.values(subjectCounts).reduce((a, b) => a + b, 0) };
}
