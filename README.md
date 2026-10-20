# 初音的瑪奇紫洞發布器（瑪奇 Mobile 紫洞查詢網頁）

- 顯示最近／下一次紫洞時間（下一場 = 上一場開啟 + 36 小時 15 分鐘，開放 15 分鐘；結束超過 12 小時後「最近」輪換到下一場）
- 「校正紫洞時間」：日期＋時間選擇器（現在 ±3 天，未來時間視為最近一場）＋校正人員（必填）→ 確認視窗 → 校正
- 右上角推播開關：最近一場紫洞開啟前 4、3、2、1 小時與 30、15 分鐘發送通知（iPhone／iPad 需先加入主畫面）
- GitHub Actions 每 30 分鐘爬官網公告，網頁底部顯示最近一次維護；3 天內的維護顯示紅字，校正後發生維護會提示重新校正

## 架構
```
GitHub Actions（每 30 分鐘）           Vercel
  python -m crawler --upload  ──POST──▶  /api/maintenance ─┐
                                         /api/status      ─┼─ Upstash Redis
  瀏覽器 ◀── React 網頁 ──────────────▶  /api/calibrate   ─┤
                                         /api/push        ─┤
                                         /api/comments    ─┤
cron-job.org（每 5 分鐘）──────────────▶  /api/notify      ─┘ → Web Push
```
- `crawler/` Python 爬蟲：Playwright 過官網 Cloudflare（需有畫面的瀏覽器，Actions 用 Xvfb）、`parse.py` 解析維護時間
- `web/` Vercel 專案
  - `api/` Vercel Functions（TypeScript）：`status`、`calibrate`、`maintenance`、`push`（訂閱）、`notify`（定時發送提醒）；`api/_lib/` 服務、儲存（Upstash Redis／本機記憶體）
  - `public/sw.js` 推播 Service Worker、`manifest.webmanifest`（加入主畫面）
  - `shared/` 前端與 API 共用：紫洞規則 `rules.ts`、台灣時間 `TaipeiClock.ts`、API 型別 `dto.ts`
  - `src/` React：`models/`、`services/`、`hooks/`、`components/`（`@/` = `src/`、`@shared/` = `shared/`）

## 部署
1. **Vercel**：匯入 GitHub repo，Root Directory 填 `web`（Framework 自動偵測 Vite）。
2. **資料庫**：Vercel 專案 → Storage → 建立 Upstash（Redis，免費方案）並連到此專案，會自動加入 `KV_REST_API_URL`、`KV_REST_API_TOKEN`。
3. **密鑰**：Vercel 專案 Environment Variables 加 `CRAWL_TOKEN`（自訂一串長隨機字），然後 Redeploy。
4. **GitHub**：repo → Settings → Secrets and variables → Actions 加
   - `PURPLE_API_URL` = Vercel 網址（例如 `https://xxx.vercel.app`，結尾不要斜線）
   - `CRAWL_TOKEN` = 與第 3 步相同
5. Actions → **crawl** → Run workflow 測一次，之後每 30 分鐘自動執行。
6. **推播**：
   - 產生金鑰：`cd web && npx web-push generate-vapid-keys`
   - Vercel Environment Variables 加 `VAPID_PUBLIC_KEY`、`VAPID_PRIVATE_KEY`、`NOTIFY_TOKEN`（自訂長隨機字），然後 Redeploy
   - [cron-job.org](https://cron-job.org) 建立排程：URL `https://<網站>/api/notify`、每 5 分鐘、Method **POST**、Header `Authorization: Bearer <NOTIFY_TOKEN>`
   - 金鑰產生後不要更換，否則已訂閱的人需重新開啟推播

推送前：`cd web && npm run version:bump`（頁面最下方「版本日期」= 當天第幾次推送）。

注意：GitHub 排程常延遲數分鐘；repo 連續 60 天沒有提交時排程會被暫停，需到 Actions 頁面重新啟用。

## 本機開發
```powershell
# 前端 + API（API 資料存在記憶體，重啟清空）
cd web; npm install; npm run dev        # http://localhost:5173
npm test; npm run build                 # 測試；型別檢查 + 建置

# 爬蟲
python -m venv .venv
.venv\Scripts\pip install -r requirements.txt
.venv\Scripts\python -m playwright install chromium
.venv\Scripts\python -m crawler                 # 爬一次並印出
.venv\Scripts\python -m crawler --upload        # 上傳（.env 設 PURPLE_API_URL、CRAWL_TOKEN）
.venv\Scripts\python -m crawler --headed        # Cloudflare 需手動驗證時顯示視窗
.venv\Scripts\python -m pytest
```
本機測試上傳：在 `web/.env` 設 `CRAWL_TOKEN`，`npm run dev` 後以 `PURPLE_API_URL=http://localhost:5173` 執行 `--upload`。
