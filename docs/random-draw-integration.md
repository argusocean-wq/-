# 隨機抽題模組整合方式

隨機抽題模組位於 `feature/random-question-draw` 分支的 `src/random-question-draw.js`，與題庫匯入分支分開維護。

## 題目可被抽取的條件

預設只抽取同時符合以下條件的題目：

- `status: "published"`
- `rightsStatus: "allowed"`
- 有非空的 `id` 與 `subject`
- 符合指定科目、難度、年度、標籤等篩選條件

未經審核的題目不會進入正式隨機考卷。只有在本機測試時，才應顯式使用 `allowUnreviewed: true`。

## API 範例

```js
import { drawRandomQuestions, drawBalancedPaper } from "./src/random-question-draw.js";

const mathPractice = drawRandomQuestions(questionBank, {
  count: 10,
  subject: "mathematics",
  difficulty: "medium",
  seed: 20261017
});

const mixedPaper = drawBalancedPaper(questionBank, {
  chinese: 5,
  english: 5,
  mathematics: 10,
  social-studies: 5,
  natural-sciences: 5
}, { seed: 20261017 });
```

`seed` 可用於重現同一份抽題結果，方便除錯及測試。若符合條件的題數不足，回傳結果會提供實際可用數量，不會以重複題目補滿。

## 執行測試

進入 `src/` 目錄後執行 `node --test`（需要 Node.js 18 或更新版本）。目前 GitHub 上已加入測試案例，但尚未在此工作流程中實際執行測試命令。
