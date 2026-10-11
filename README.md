# 初音的瑪奇紫洞發布器（瑪奇 Mobile 紫洞查詢網頁）

- 顯示最近／下一次紫洞時間（下一場 = 上一場開啟 + 36 小時 15 分鐘，開放 15 分鐘）
- 「校正紫洞時間」按鈕：用日期（預設今天）＋時間選擇器選擇看到的開啟時間 → 確認視窗 → 校正（不可晚於現在）
- 每 30 分鐘爬官網公告，網頁底部顯示最近一次維護（開始／結束／原定／是否延長）；校正後若發生維護，頁面提示重新校正

## 安裝
```powershell
python -m venv .venv
.venv\Scripts\pip install -r requirements.txt
.venv\Scripts\python -m playwright install chromium
cd web; npm install; npm run build; cd ..
```

## 執行
```powershell
.venv\Scripts\python -m backend                        # http://127.0.0.1:8000
.venv\Scripts\python -m backend --crawl-once --headed  # 只爬一次（Cloudflare 需手動驗證時顯示視窗）
.venv\Scripts\python -m pytest
```
開發前端：後端啟動後，在 `web/` 執行 `npm run dev`（/api 會 proxy 到 8000）；`npm test` 跑單元測試、`npm run build` 型別檢查並建置。

給別人用：`.env` 設 `HOST=0.0.0.0`（區網），或用 ngrok/cloudflared 對外開放 8000。注意任何能開網頁的人都能校正。

## 結構
- `backend/` FastAPI：`/api/status`、`/api/calibrate`；`parse.py` 維護公告解析、`purple.py` 紫洞計算、`fetch.py` Playwright 爬蟲
- `web/` React + TypeScript (Vite)，build 結果 `web/dist` 由後端直接提供（`@/` = `web/src/`）
  - `config/` 紫洞規則常數　`utils/` TaipeiClock、Duration
  - `models/` DTO 型別與領域類別：SpawnSpan、Maintenance、PurpleStatus、CalibrationDraft
  - `services/` PurpleApi（後端 API）、PreferenceStore（localStorage）
  - `hooks/` useNow、usePurpleStatus　`components/` StatusCard、CalibrateDialog、Maintenance、common
- 資料 `data/bot.db`、記錄 `data/bot.log`
