import os
from pathlib import Path
from zoneinfo import ZoneInfo

from dotenv import load_dotenv

ROOT = Path(__file__).resolve().parent.parent
load_dotenv(ROOT / ".env")

TZ = ZoneInfo("Asia/Taipei")

# 官網（Cloudflare 保護，需透過瀏覽器取得）
SITE = "https://tw.nexon.com"
NOTICE_PAGE = f"{SITE}/mabinogimobile/home/news/notice"
NOTICE_BOARD_ID = "7125"
THREADS_API = "/mabinogimobile/api/content/community/boards/{board}/threads/?paginationType=PAGING&pageSize={size}&pageNo={page}"
THREAD_API = "/mabinogimobile/api/content/community/threads/{thread_id}/"
THREAD_URL = f"{NOTICE_PAGE}/{{thread_id}}"
PAGE_SIZE = 20

BROWSER_PROFILE = ROOT / ".browser-profile"
DB_PATH = ROOT / "data" / "bot.db"
LOG_PATH = ROOT / "data" / "bot.log"

CRAWL_INTERVAL_MIN = 30
WEB_DIST = ROOT / "web" / "dist"

# 雲端平台會給 PORT，此時預設對外監聽；本機預設只開給自己
HOST = os.getenv("HOST") or ("0.0.0.0" if os.getenv("PORT") else "127.0.0.1")
PORT = int(os.getenv("PORT", "8000"))

# 允許跨網域呼叫 API 的前端網址（逗號分隔），例如 https://xxx.vercel.app
CORS_ORIGINS = [o.strip().rstrip("/") for o in os.getenv("CORS_ORIGINS", "").split(",") if o.strip()]
