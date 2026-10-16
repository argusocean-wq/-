# Replit 部署與底層驗收

## 目前狀態

這個分支加入了最小 Node.js HTTP 伺服器、題目資料 schema、示範資料與自動化測試。這些變更已推到 GitHub 分支；尚未匯入 Replit、尚未在 Replit 執行，也不能宣稱公開網址已部署成功。

## 匯入 Replit

1. 在 Replit 建立新的 App，選擇從 GitHub 匯入。
2. Repository：`https://github.com/argusocean-wq/-`
3. Branch：`feature/replit-foundation`。
4. 確認執行環境為 Node.js 20 或更新版本。
5. Run command 設為 `npm start`。伺服器會監聽平台提供的 `PORT`，並綁定 `0.0.0.0`。
6. 先執行 `npm test`，通過後再 Run。
7. 使用 Replit 提供的預覽／公開網址測試 Safari；不要使用 GitHub 的 `/blob/` 檔案檢視網址當作網站網址。

## 驗收清單

- [ ] Replit 匯入成功，來源分支正確
- [ ] `npm test` 通過
- [ ] `npm start` 正常啟動，首頁回應 HTTP 200
- [ ] iPhone Safari 實際開啟，沒有橫向溢出
- [ ] 測試 320、375、390、768、1024、1440 CSS px 視窗
- [ ] 首頁互動測試與來源連結正常
- [ ] 404、非 GET/HEAD 方法與錯誤路徑行為合理
- [ ] 部署網址在登出／無痕情境仍可存取（若設定為公開）
- [ ] 完成驗收後才逐批匯入題庫

## 題庫資料原則

每筆資料必須有穩定 ID、科目、年份、題型、來源 URL、來源核對時間、權利狀態及審核狀態。不得將「已找到來源」當成「已轉錄」，也不得將「公開可讀」當成「允許重製或再散布」。先用 `data/questions.example.json` 的虛構示範資料驗證流程。

## 下一步

完成 Replit 首次執行後，再建立匯入／匯出服務、重複偵測、審核佇列與持久化儲存。正式題庫資料庫應選用持久化資料服務，不應把 Replit 執行容器的本地檔案當作唯一儲存。
