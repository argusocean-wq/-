# Random Question Draw Module

This branch contains a standalone, deterministic-testable random question selection module for the Taiwan junior-high mock exam project.

## Scope

- Select a balanced set of questions by subject and practice difficulty.
- Optionally filter by year, tags, and question type.
- Avoid duplicate question IDs in a single test.
- Prefer questions marked `published` and with `rightsStatus: allowed`.
- Never invent question content or mark unverified content as official.
- Seedable pseudo-random generator supports reproducible tests.
- Explicit validation errors for impossible selection requests.

## Data contract

A question object may contain:
- `id` (string, required)
- `subject` (string, required)
- `difficulty` (easy | medium | hard)
- `status` (published required by default)
- `rightsStatus` (allowed required by default)
- `year` (number, optional)
- `tags` (string[], optional)
- `type` (string, optional)

Question text and answer content are separate from selection logic.

## Example

```js
import { drawRandomQuestions } from "./src/random-question-draw.js";

const result = drawRandomQuestions(questionBank, {
  count: 20,
  subject: "mathematics",
  difficulty: "medium",
  seed: 20261017
});
```

## Run tests

Use Node.js 18+:

```sh
node --test
```

The module uses only built-in JavaScript features; no external dependencies are required.
