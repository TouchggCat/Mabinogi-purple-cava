from datetime import datetime

import httpx
import pytest

from crawler import upload as up
from crawler.config import TZ


def test_build_payload():
    p = up.build_payload([{"post_id": "1"}], datetime(2026, 10, 11, 21, 0, tzinfo=TZ))
    assert p == {"crawled_at": "2026-10-11T21:00:00+08:00", "posts": [{"post_id": "1"}]}


def test_upload_sends_bearer(monkeypatch):
    sent = {}

    def fake_post(url, json, headers, timeout):
        sent.update(url=url, json=json, headers=headers)
        return httpx.Response(200, json={"ok": True, "stored": 1})

    monkeypatch.setattr(up.httpx, "post", fake_post)
    assert up.upload({"posts": []}, "https://x.vercel.app", "tok") == {"ok": True, "stored": 1}
    assert sent["url"] == "https://x.vercel.app/api/maintenance"
    assert sent["headers"] == {"Authorization": "Bearer tok"}


def test_upload_errors(monkeypatch):
    with pytest.raises(up.UploadError):
        up.upload({}, "", "tok")
    monkeypatch.setattr(up.httpx, "post", lambda *a, **k: httpx.Response(401, text="unauthorized"))
    with pytest.raises(up.UploadError, match="401"):
        up.upload({}, "https://x", "bad")
