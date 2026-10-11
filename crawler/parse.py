"""官網維護公告解析。

公告內文的維護時間格式（實際範例）：
    ◼ 維護時間 - 2026年9月16日(三) 上午6時 ～ <s>上午8時30分</s> 上午9時
    * 因作業內容超乎預期需延長維護，敬請見諒！
被刪除線劃掉的是原定結束時間，後面接的是實際結束時間。
"""
import re
import unicodedata
from dataclasses import dataclass
from datetime import datetime, timedelta

from bs4 import BeautifulSoup

TITLE_RE = re.compile(r"例行維護|臨時維護|臨時維修|緊急維護")

_DEL_OPEN, _DEL_CLOSE = "[[DEL:", "]]"
_DEL_RE = re.compile(r"\[\[DEL:(.*?)\]\]")
_DATE_RE = re.compile(
    r"(?:(\d{4})\s*年\s*)?(\d{1,2})\s*月\s*(\d{1,2})\s*日"
    r"|(?:(\d{4})/)?(\d{1,2})/(\d{1,2})(?!\d)"
)
_TIME_RE = re.compile(
    r"(上午|下午|中午|晚上|凌晨|早上)?\s*(\d{1,2})\s*(?:時(?:\s*(\d{1,2})\s*分)?|:(\d{2}))"
)
_PM = {"下午", "晚上"}
_EXTEND_RE = re.compile(r"需延長|延長至|延長到|延長維護|延後開服")


@dataclass
class MaintenanceInfo:
    start: datetime | None
    end: datetime | None
    original_end: datetime | None
    extended: bool
    raw_time_text: str


def is_maintenance_title(title: str) -> bool:
    return bool(TITLE_RE.search(title))


def maintenance_type(title: str) -> str:
    return "例行" if "例行" in title else "臨時"


def html_to_text(html: str) -> str:
    soup = BeautifulSoup(html, "html.parser")
    for tag in soup(["style", "script"]):
        tag.decompose()
    for s in soup.find_all(["s", "strike", "del"]):
        s.replace_with(f"{_DEL_OPEN}{s.get_text()}{_DEL_CLOSE}")
    text = unicodedata.normalize("NFKC", soup.get_text(" "))
    return re.sub(r"\s+", " ", text).strip()


def _time_section(text: str) -> str:
    i = text.find("維護時間")
    if i < 0:
        return ""
    rest = text[i + len("維護時間"):]
    stop = re.search(r"◼|維護內容", rest)
    return rest[: stop.start() if stop else 300].strip(" -:")


def _find_date(s: str, default_year: int):
    m = _DATE_RE.search(s)
    if not m:
        return None
    y1, mo1, d1, y2, mo2, d2 = m.groups()
    year, month, day = (y1, mo1, d1) if mo1 else (y2, mo2, d2)
    return int(year or default_year), int(month), int(day)


def _find_time(s: str, inherit_period: str | None = None):
    """回傳 (hour, minute, period)。取字串中最後一個時間。"""
    found = list(_TIME_RE.finditer(s))
    if not found:
        return None
    period, h, m1, m2 = found[-1].groups()
    # 時段詞可能出現在刪除線之前（例：上午 [[DEL:9時]] 8時40分）
    if period is None:
        before = re.findall(r"上午|下午|中午|晚上|凌晨|早上", s[: found[-1].start()])
        period = before[-1] if before else inherit_period
    hour, minute = int(h), int(m1 or m2 or 0)
    if period in _PM and hour < 12:
        hour += 12
    return hour, minute, period


def parse_maintenance(title: str, html: str, posted_at: datetime) -> MaintenanceInfo:
    text = html_to_text(html)
    section = _time_section(text)
    extended = "延長" in title or bool(_EXTEND_RE.search(section))
    info = MaintenanceInfo(None, None, None, extended, section)

    parts = re.split(r"~|至(?!\d)", section, maxsplit=1)
    if len(parts) != 2:
        return info
    left, right = parts

    date = _find_date(left, posted_at.year)
    if date is None:
        date = (posted_at.year, posted_at.month, posted_at.day)
    st = _find_time(_DEL_RE.sub(" ", left))
    if st is None:
        return info
    tz = posted_at.tzinfo
    start = datetime(*date, st[0], st[1], tzinfo=tz)

    def resolve_end(s: str) -> datetime | None:
        t = _find_time(s, inherit_period=st[2])
        if t is None:
            return None
        d = _find_date(s, start.year)
        if d:
            end = datetime(*d, t[0], t[1], tzinfo=tz)
        else:
            end = start.replace(hour=t[0], minute=t[1])
            if "隔日" in s or "次日" in s or end <= start:
                end += timedelta(days=1)
        return end

    end = resolve_end(_DEL_RE.sub(" ", right))
    original_end = None
    if _DEL_RE.search(right):
        last_del = list(_DEL_RE.finditer(right))[-1]
        original_end = resolve_end(_DEL_RE.sub(r"\1", right[: last_del.end()]))
    if end and original_end and end > original_end:
        extended = True

    return MaintenanceInfo(start, end, original_end, extended, section)
