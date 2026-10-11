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

# 上傳目的地（Vercel 網站）與共用密鑰；未設定時只印出結果
PURPLE_API_URL = os.getenv("PURPLE_API_URL", "").rstrip("/")
CRAWL_TOKEN = os.getenv("CRAWL_TOKEN", "")
