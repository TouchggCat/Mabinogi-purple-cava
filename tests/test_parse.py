import json
from datetime import datetime
from pathlib import Path

import pytest

from crawler.config import TZ
from crawler.parse import is_maintenance_title, parse_maintenance

FIX = Path(__file__).parent / "fixtures"


def dt(*a):
    return datetime(*a, tzinfo=TZ)


def load(name):
    d = json.loads((FIX / f"{name}.json").read_text(encoding="utf-8"))
    return parse_maintenance(d["title"], d["content"], datetime.fromtimestamp(d["createDate"], TZ))


def wrap(time_html, extra=""):
    return (f"<p>為提供更加穩定的遊戲服務環境，我們將於下列時間進行例行維護作業。</p>"
            f"<p>◼ 維護時間</p><p>- {time_html}</p>{extra}<p>◼ 維護內容</p><p>- 修正問題</p>"
            f"<p>- 維護時間可能依實際作業情況提前結束或延長，若有異動將透過本公告另行說明。</p>")


POSTED = dt(2026, 10, 6, 18, 0)


@pytest.mark.parametrize("title, expected", [
    ("10/07(三) 例行維護公告 (已結束)", True),
    ("9/10(四) 臨時維護公告", True),
    ("伺服器臨時維修公告", True),
    ("10/20(一) MyCard 臨時維護公告", False),
    ("mycard 儲值服務例行維護", False),
    ("10/5(一)違反營運政策帳號限制說明公告", False),
    ("已知問題 (10/6 10:22 更新)", False),
])
def test_title_filter(title, expected):
    assert is_maintenance_title(title) is expected


def test_real_routine_ended_early():
    # 上午6時 ～ 上午<s>9時</s> 8時40分
    info = load("3559001_routine_1007")
    assert info.start == dt(2026, 10, 7, 6, 0)
    assert info.end == dt(2026, 10, 7, 8, 40)
    assert info.original_end == dt(2026, 10, 7, 9, 0)
    assert info.extended is False


def test_real_temporary_ended_early():
    # 6時 ～ <s>8時</s> 7時50分
    info = load("3542046_temp_0910")
    assert info.start == dt(2026, 9, 10, 6, 0)
    assert info.end == dt(2026, 9, 10, 7, 50)
    assert info.original_end == dt(2026, 9, 10, 8, 0)
    assert info.extended is False


def test_real_extended():
    # 上午6時 ～ <s>上午8時30分</s> 上午9時 ＋「因作業內容超乎預期需延長維護」
    info = load("3545320_routine_0916_extended")
    assert info.start == dt(2026, 9, 16, 6, 0)
    assert info.end == dt(2026, 9, 16, 9, 0)
    assert info.original_end == dt(2026, 9, 16, 8, 30)
    assert info.extended is True


def test_plain_no_change():
    info = parse_maintenance("10/14(三) 例行維護公告", wrap("2026年10月14日(三) 上午6時 ～ 上午9時"), POSTED)
    assert (info.start, info.end, info.original_end) == (dt(2026, 10, 14, 6), dt(2026, 10, 14, 9), None)
    # 免責聲明中的「延長」不算
    assert info.extended is False


def test_extended_by_strikethrough_only():
    info = parse_maintenance("例行維護公告", wrap("2026年10月14日(三) 6時 ～ <s>9時</s> 10時30分"), POSTED)
    assert info.end == dt(2026, 10, 14, 10, 30)
    assert info.extended is True


def test_cross_day_and_pm():
    info = parse_maintenance("臨時維護公告", wrap("2026年10月14日(三) 下午11時 ～ 隔日 上午1時30分"), POSTED)
    assert info.start == dt(2026, 10, 14, 23, 0)
    assert info.end == dt(2026, 10, 15, 1, 30)


def test_missing_year_and_colon_format():
    info = parse_maintenance("臨時維護公告", wrap("10月14日(三) 22:00 ~ 01:00"), POSTED)
    assert info.start == dt(2026, 10, 14, 22, 0)
    assert info.end == dt(2026, 10, 15, 1, 0)


def test_pm_inherited_by_end():
    info = parse_maintenance("臨時維護公告", wrap("2026年10月14日(三) 下午2時 ～ 5時"), POSTED)
    assert info.end == dt(2026, 10, 14, 17, 0)


def test_extended_in_title():
    info = parse_maintenance("例行維護延長公告", wrap("2026年10月14日(三) 6時 ～ 9時"), POSTED)
    assert info.extended is True


def test_unparseable():
    info = parse_maintenance("臨時維護公告", "<p>維護中，開服時間另行公告</p>", POSTED)
    assert info.start is None and info.end is None
