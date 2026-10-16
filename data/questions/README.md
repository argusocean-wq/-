# 題庫資料目錄

本資料夾用於存放經來源核對及權利審查後可使用的題目資料。尚未完成審查時，不放入整份試題或答案原文。

## 建議資料分層

每題至少記錄：

- `id`：專案內唯一識別碼
- `subject`：對應 `data/catalog.json` 的科目 ID
- `difficulty`：`easy`、`medium` 或 `hard`
- `year`：年度（民國年）
- `sourceUrl`：官方來源網址
- `sourceTitle`：來源頁面或檔案名稱
- `rightsStatus`：`pending`、`allowed` 或 `link_only`
- `question`、`options`、`answer`、`explanation`：僅在使用權利已確認時存放內容

## 原則

難度是網站為練習體驗所做的分類，不應宣稱為官方難度。對於授權尚不明確的題目，保留官方連結及來源資訊，不複製題目全文。
