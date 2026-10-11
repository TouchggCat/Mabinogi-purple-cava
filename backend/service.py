import logging
from datetime import datetime

from . import config, purple
from .fetch import notice_session
from .parse import is_maintenance_title, maintenance_type, parse_maintenance
from .store import Store

log = logging.getLogger(__name__)


def crawl_maintenance(store: Store, now: datetime, headed: bool = False, save: bool = True) -> list[dict]:
    """讀取公告第一頁，解析新增或有更新的維護公告。"""
    results = []
    with notice_session(headed=headed) as s:
        for th in s.list_threads(1):
            if not is_maintenance_title(th["title"]):
                continue
            post_id = th["threadId"]
            old = store.get_maintenance(post_id)
            if old and old["modify_date"] == th.get("modifyDate") and old["title"] == th["title"]:
                continue
            detail = s.thread(post_id)
            posted_at = datetime.fromtimestamp(th["createDate"], config.TZ)
            info = parse_maintenance(detail["title"], detail.get("content") or "", posted_at)
            if info.start is None:
                log.warning("無法解析維護時間：%s｜%s", detail["title"], info.raw_time_text)
            rec = {
                "post_id": post_id, "title": detail["title"],
                "url": config.THREAD_URL.format(thread_id=post_id),
                "posted_at": posted_at, "modify_date": th.get("modifyDate"),
                "type": maintenance_type(detail["title"]),
                "start": info.start, "end": info.end, "original_end": info.original_end,
                "extended": info.extended, "raw_time_text": info.raw_time_text,
                "fetched_at": now,
            }
            if save:
                store.upsert_maintenance(rec)
            results.append(rec)
    if save:
        store.set("last_crawl", now)
    return results


def _span(t: datetime) -> dict:
    return {"start": t.isoformat(), "end": (t + purple.OPEN).isoformat()}


def _maint_json(rec: dict | None) -> dict | None:
    if not rec:
        return None
    return {k: rec[k] for k in ("title", "url", "type", "start", "end", "original_end", "posted_at")} | {
        "extended": bool(rec["extended"])}


def status(store: Store, now: datetime) -> dict:
    anchor = store.get_time("anchor_spawn")
    calibrated_at = store.get_time("calibrated_at")
    maint = store.latest_maintenance()
    maint_start = maint and datetime.fromisoformat(maint["start"] or maint["posted_at"])

    data = {
        "now": now.isoformat(),
        "anchor": anchor and anchor.isoformat(),
        "calibrated_at": calibrated_at and calibrated_at.isoformat(),
        "calibrated_by": store.get("calibrated_by"),
        "recent": None, "next": None, "text": None,
        # 校正之後才開始的維護 → 計時已被打亂，需要重新校正
        "needs_calibration": anchor is None or bool(maint_start and maint_start <= now and calibrated_at
                                                     and calibrated_at < maint_start),
        "maintenance": _maint_json(maint),
        "last_crawl": store.get("last_crawl"),
    }
    if anchor:
        recent, nxt = purple.spawns_around(anchor, now)
        data.update(recent=_span(recent), next=_span(nxt), text=purple.format_status(recent, nxt))
    return data


def calibrate(store: Store, arg: str, now: datetime, by: str) -> datetime | None:
    spawn = purple.resolve_calibration(arg, now)
    if spawn is not None:
        store.set("anchor_spawn", spawn)
        store.set("calibrated_at", now)
        store.set("calibrated_by", by)
    return spawn
