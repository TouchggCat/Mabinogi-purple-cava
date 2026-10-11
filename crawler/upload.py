from datetime import datetime

import httpx

from . import config


class UploadError(RuntimeError):
    pass


def build_payload(posts: list[dict], crawled_at: datetime) -> dict:
    return {"crawled_at": crawled_at.isoformat(), "posts": posts}


def upload(payload: dict, api_url: str = config.PURPLE_API_URL, token: str = config.CRAWL_TOKEN) -> dict:
    """POST 到網站的 /api/maintenance（Bearer CRAWL_TOKEN）。"""
    if not api_url or not token:
        raise UploadError("未設定 PURPLE_API_URL 或 CRAWL_TOKEN")
    res = httpx.post(f"{api_url}/api/maintenance", json=payload,
                     headers={"Authorization": f"Bearer {token}"}, timeout=30)
    if res.status_code != 200:
        raise UploadError(f"上傳失敗 HTTP {res.status_code}：{res.text[:200]}")
    return res.json()
