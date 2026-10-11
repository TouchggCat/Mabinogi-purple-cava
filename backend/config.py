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

HOST = os.getenv("HOST", "127.0.0.1")
PORT = int(os.getenv("PORT", "8000"))
