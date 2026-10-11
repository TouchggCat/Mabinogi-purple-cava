"""透過 Playwright 瀏覽器讀取官網公告 API。

官網有 Cloudflare JS 驗證，純 headless 會卡在「請稍候...」，
因此預設開一個放在螢幕外的有頭瀏覽器，通過驗證後在頁面內呼叫同源 API。
"""
import contextlib
import json
import logging
import os
from pathlib import Path

from playwright.sync_api import sync_playwright

from . import config

log = logging.getLogger(__name__)


class CrawlError(RuntimeError):
    pass


class NoticeSession:
    def __init__(self, page):
        self._page = page

    def _get_json(self, path: str) -> dict:
        res = self._page.evaluate(
            """async (path) => {
                const r = await fetch(path, {headers: {accept: 'application/json'}});
                return {status: r.status, body: await r.text()};
            }""",
            path,
        )
        if res["status"] != 200:
            raise CrawlError(f"GET {path} -> HTTP {res['status']}")
        data = json.loads(res["body"])
        if data.get("code") != 0:
            raise CrawlError(f"GET {path} -> {data.get('message')}")
        return data["data"]

    def list_threads(self, page_no: int = 1) -> list[dict]:
        path = config.THREADS_API.format(board=config.NOTICE_BOARD_ID, size=config.PAGE_SIZE, page=page_no)
        return self._get_json(path)["threads"]

    def thread(self, thread_id: str) -> dict:
        return self._get_json(config.THREAD_API.format(thread_id=thread_id))


def _save_debug(page) -> None:
    """設定 CRAWL_DEBUG_DIR 時，驗證失敗留下截圖與 HTML 方便排查（GitHub Actions 用）。"""
    out = os.getenv("CRAWL_DEBUG_DIR")
    if not out:
        return
    Path(out).mkdir(parents=True, exist_ok=True)
    page.screenshot(path=str(Path(out) / "cloudflare.png"), full_page=True)
    (Path(out) / "cloudflare.html").write_text(page.content(), encoding="utf-8")


@contextlib.contextmanager
def notice_session(headed: bool = False):
    """開啟瀏覽器並通過 Cloudflare 驗證；headed=True 時視窗顯示在螢幕上（需手動驗證時使用）。"""
    args = ["--disable-blink-features=AutomationControlled"]
    if not headed:
        args.append("--window-position=-32000,-32000")
    with sync_playwright() as p:
        ctx = p.chromium.launch_persistent_context(
            str(config.BROWSER_PROFILE), headless=False, locale="zh-TW", args=args,
        )
        try:
            page = ctx.new_page()
            page.goto(config.NOTICE_PAGE, wait_until="domcontentloaded", timeout=60_000)
            for _ in range(60 if headed else 30):
                if "Mobile" in page.title():
                    break
                page.wait_for_timeout(1000)
            else:
                _save_debug(page)
                raise CrawlError(f"Cloudflare 驗證未通過（標題：{page.title()}），請用 --crawl-once --headed 手動驗證一次")
            yield NoticeSession(page)
        finally:
            ctx.close()
