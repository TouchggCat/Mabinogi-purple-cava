"""紫洞時間計算：每場開放 15 分鐘，下一場 = 上一場開啟 + 36 小時 15 分鐘。"""
import re
from datetime import datetime, timedelta

CYCLE = timedelta(hours=36, minutes=15)
OPEN = timedelta(minutes=15)

CALIBRATION_WINDOW = timedelta(days=3)
_CALIBRATION_RE = re.compile(r"^(?:(\d{1,2})/(\d{1,2})\s+)?(\d{1,2}):(\d{2})$")
_FULL_RE = re.compile(r"^(\d{4})-(\d{1,2})-(\d{1,2})[ T](\d{1,2}):(\d{2})$")


def spawns_around(anchor: datetime, now: datetime) -> tuple[datetime, datetime]:
    """回傳 (最近一場開啟時間, 下一場開啟時間)。最近一場 = anchor 往後推算、<= now 的最後一場。"""
    k = max(0, (now - anchor) // CYCLE)
    recent = anchor + k * CYCLE
    return recent, recent + CYCLE


def resolve_calibration(arg: str, now: datetime) -> datetime | None:
    """解析 `YYYY-MM-DD HH:MM`、`MM/DD HH:MM` 或 `HH:MM`。只給時間時，若晚於現在則視為昨天（回報的是已出現的紫洞）。
    完整日期須在現在 ±3 天內；未來時間也接受（視為最近一場）。"""
    full = _FULL_RE.match(arg.strip())
    if full:
        try:
            y, mo, d, h, mi = (int(g) for g in full.groups())
            t = now.replace(year=y, month=mo, day=d, hour=h, minute=mi, second=0, microsecond=0)
        except ValueError:
            return None
        return t if abs(t - now) <= CALIBRATION_WINDOW else None
    m = _CALIBRATION_RE.match(arg.strip())
    if not m:
        return None
    month, day, hour, minute = (int(g) if g else None for g in m.groups())
    if hour > 23 or minute > 59:
        return None
    try:
        if month is None:
            t = now.replace(hour=hour, minute=minute, second=0, microsecond=0)
            return t - timedelta(days=1) if t > now else t
        t = now.replace(month=month, day=day, hour=hour, minute=minute, second=0, microsecond=0)
    except ValueError:
        return None
    # 1 月輸入 12/31 之類的情況 → 去年
    if t > now + timedelta(days=1):
        t = t.replace(year=t.year - 1)
    return t


def _span(t: datetime) -> str:
    return f"{t:%m/%d}  {t:%H:%M}-{t + OPEN:%H:%M}"


def format_status(recent: datetime, nxt: datetime) -> str:
    return f"最近紫洞時間 {_span(recent)}\n下一次預計   {_span(nxt)}"
