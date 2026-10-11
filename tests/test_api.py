from datetime import datetime

import pytest
from fastapi.testclient import TestClient

from backend import app as app_mod
from backend.app import create_app
from backend.config import TZ
from backend.store import Store


def dt(*a):
    return datetime(*a, tzinfo=TZ)


@pytest.fixture
def ctx(monkeypatch):
    clock = {"now": dt(2026, 10, 7, 20, 0)}
    monkeypatch.setattr(app_mod, "now", lambda: clock["now"])
    store = Store(":memory:")
    return TestClient(create_app(store, crawl=False)), store, clock


def _maint(start):
    return {"post_id": "1", "title": "10/14(三) 例行維護公告", "url": "u", "posted_at": dt(2026, 10, 13, 18),
            "modify_date": 1, "type": "例行", "start": start, "end": dt(2026, 10, 14, 9),
            "original_end": dt(2026, 10, 14, 8, 30), "extended": True, "raw_time_text": "", "fetched_at": start}


def test_not_calibrated(ctx):
    client, _, _ = ctx
    d = client.get("/api/status").json()
    assert d["anchor"] is None and d["needs_calibration"] is True and d["maintenance"] is None


def test_calibrate_and_status(ctx):
    client, _, clock = ctx
    d = client.post("/api/calibrate", json={"time": "14:40", "by": "小明"}).json()
    assert d["text"] == "最近紫洞時間 10/07  14:40-14:55\n下一次預計   10/09  02:55-03:10"
    assert d["recent"] == {"start": "2026-10-07T14:40:00+08:00", "end": "2026-10-07T14:55:00+08:00"}
    assert d["needs_calibration"] is False
    clock["now"] = dt(2026, 10, 9, 3, 0)
    assert client.get("/api/status").json()["recent"]["start"] == "2026-10-09T02:55:00+08:00"


@pytest.mark.parametrize("bad", ["", "abc", "25:00"])
def test_calibrate_bad(ctx, bad):
    client, _, _ = ctx
    assert client.post("/api/calibrate", json={"time": bad, "by": "小明"}).status_code == 400


def test_maintenance_after_calibration_requires_recalibration(ctx):
    client, store, clock = ctx
    client.post("/api/calibrate", json={"time": "14:40", "by": "小明"})
    store.upsert_maintenance(_maint(dt(2026, 10, 14, 6)))

    clock["now"] = dt(2026, 10, 14, 5, 0)  # 維護尚未開始
    d = client.get("/api/status").json()
    assert d["needs_calibration"] is False
    assert d["maintenance"]["extended"] is True and d["maintenance"]["start"] == "2026-10-14T06:00:00+08:00"

    clock["now"] = dt(2026, 10, 14, 7, 0)  # 維護開始後
    assert client.get("/api/status").json()["needs_calibration"] is True

    clock["now"] = dt(2026, 10, 14, 10, 0)
    d = client.post("/api/calibrate", json={"time": "09:30", "by": "小明"}).json()
    assert d["needs_calibration"] is False


def test_latest_maintenance_picks_newest(ctx):
    _, store, _ = ctx
    store.upsert_maintenance(_maint(dt(2026, 10, 14, 6)))
    store.upsert_maintenance({**_maint(dt(2026, 9, 30, 6)), "post_id": "0"})
    assert store.latest_maintenance()["post_id"] == "1"


def test_calibrated_by(ctx):
    client, _, _ = ctx
    d = client.post("/api/calibrate", json={"time": "2026-10-07 14:40", "by": " 阿紫 "}).json()
    assert d["calibrated_by"] == "阿紫" and d["anchor"] == "2026-10-07T14:40:00+08:00"


@pytest.mark.parametrize("by", ["", "   ", "x" * 21])
def test_calibrate_requires_by(ctx, by):
    client, _, _ = ctx
    assert client.post("/api/calibrate", json={"time": "14:40", "by": by}).status_code == 400
