# 國中教育會考題庫網站

這是靜態網頁原型，預設以 GitHub Pages 發佈，手機與桌面皆可使用。

## 本機預覽
從倉庫根目錄啟動任何靜態 HTTP 伺服器，並把 `docs/` 當作網站根目錄。請勿以 `file://` 直接開啟，因為瀏覽器會限制 JSON 載入。

## GitHub Pages
1. 在 GitHub 倉庫 Settings → Pages。
2. 在 Build and deployment 選擇 Deploy from a branch。
3. 選擇 `feature/question-bank-import` 分支與 `/docs` 資料夾（若此選項可用），儲存後等待部署。
4. GitHub Pages 預設網址會是 `https://<owner>.github.io/<repository>/`；要使用自訂 `.io` 網域，必須先註冊並擁有該網域，再在 Pages 設定 DNS 與 Custom domain。

## 原型限制
- 目前只呈現已存在的 115 年數學科草稿；不會假裝其他年度或科目已匯入。
- 題目來源連結與題號定位會顯示在每題底部。
- 答案核實標籤只依資料欄位顯示；正式上線前仍須稽核來源與答案狀態。
