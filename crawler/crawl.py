import logging
from datetime import datetime

from . import config
from .fetch import notice_session
from .parse import is_maintenance_title, maintenance_type, parse_maintenance

log = logging.getLogger(__name__)


def _iso(t: datetime | None) -> str | None:
    return t.isoformat() if t else None


def crawl_maintenance(headed: bool = False) -> list[dict]:
    """讀取公告第一頁，解析所有維護公告。回傳可直接上傳的 JSON 結構（時間為 ISO 字串）。"""
    posts = []
    with notice_session(headed=headed) as s:
        for th in s.list_threads(1):
            if not is_maintenance_title(th["title"]):
                continue
            post_id = str(th["threadId"])
            detail = s.thread(post_id)
            posted_at = datetime.fromtimestamp(th["createDate"], config.TZ)
            info = parse_maintenance(detail["title"], detail.get("content") or "", posted_at)
            if info.start is None:
                log.warning("無法解析維護時間：%s｜%s", detail["title"], info.raw_time_text)
            posts.append({
                "post_id": post_id,
                "title": detail["title"],
                "url": config.THREAD_URL.format(thread_id=post_id),
                "type": maintenance_type(detail["title"]),
                "posted_at": posted_at.isoformat(),
                "start": _iso(info.start),
                "end": _iso(info.end),
                "original_end": _iso(info.original_end),
                "extended": info.extended,
            })
    return posts
