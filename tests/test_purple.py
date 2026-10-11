from datetime import datetime

from backend.config import TZ
from backend.purple import format_status, resolve_calibration, spawns_around


def dt(*a):
    return datetime(*a, tzinfo=TZ)


def test_user_example_monday_noon():
    # 週一 12:00 出現、12:15 消失 → 週三 00:15 刷新
    mon = dt(2026, 10, 12, 12, 0)
    recent, nxt = spawns_around(mon, dt(2026, 10, 12, 13, 0))
    assert recent == mon
    assert nxt == dt(2026, 10, 14, 0, 15)
    assert nxt.strftime("%a") == "Wed"


def test_status_format_exact():
    anchor = dt(2026, 10, 7, 14, 40)
    text = format_status(*spawns_around(anchor, dt(2026, 10, 8, 9, 0)))
    assert text == "最近紫洞時間 10/07  14:40-14:55\n下一次預計   10/09  02:55-03:10"


def test_chain_multiple_cycles():
    anchor = dt(2026, 10, 7, 14, 40)
    # 10/09 02:55 → 10/10 15:10 → 10/12 03:25
    recent, nxt = spawns_around(anchor, dt(2026, 10, 11, 0, 0))
    assert recent == dt(2026, 10, 10, 15, 10)
    assert nxt == dt(2026, 10, 12, 3, 25)


def test_recent_is_spawn_exactly_at_now():
    anchor = dt(2026, 10, 7, 14, 40)
    recent, _ = spawns_around(anchor, dt(2026, 10, 9, 2, 55))
    assert recent == dt(2026, 10, 9, 2, 55)


def test_calibrate_today_and_yesterday():
    now = dt(2026, 10, 11, 20, 0)
    assert resolve_calibration("14:40", now) == dt(2026, 10, 11, 14, 40)
    # 晚於現在 → 昨天
    assert resolve_calibration("23:10", now) == dt(2026, 10, 10, 23, 10)
    assert resolve_calibration("0:15", now) == dt(2026, 10, 11, 0, 15)


def test_calibrate_with_date():
    now = dt(2026, 10, 11, 20, 0)
    assert resolve_calibration("10/09 02:55", now) == dt(2026, 10, 9, 2, 55)
    assert resolve_calibration("12/31 23:00", dt(2027, 1, 1, 10, 0)) == dt(2026, 12, 31, 23, 0)


def test_calibrate_bad_format():
    now = dt(2026, 10, 11, 20, 0)
    for bad in ["", "1440", "25:00", "12:60", "abc", "13/40 10:00"]:
        assert resolve_calibration(bad, now) is None


def test_calibration_full_date():
    now = dt(2026, 10, 11, 20, 0)
    assert resolve_calibration("2026-10-09 02:55", now) == dt(2026, 10, 9, 2, 55)
    assert resolve_calibration("2026-10-11T19:40", now) == dt(2026, 10, 11, 19, 40)
    assert resolve_calibration("2026-10-11 21:00", now) == dt(2026, 10, 11, 21, 0)  # 未來也接受
    assert resolve_calibration("2026-10-14 20:00", now) == dt(2026, 10, 14, 20, 0)  # 剛好 +3 天
    assert resolve_calibration("2026-10-14 20:01", now) is None
    assert resolve_calibration("2026-10-08 19:59", now) is None
    assert resolve_calibration("2026-02-30 10:00", now) is None


def test_future_anchor_is_recent():
    anchor, now = dt(2026, 10, 12, 8, 0), dt(2026, 10, 11, 20, 0)
    assert spawns_around(anchor, now) == (anchor, dt(2026, 10, 13, 20, 15))
