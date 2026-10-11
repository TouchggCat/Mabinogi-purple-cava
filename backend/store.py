import sqlite3
import threading
from datetime import datetime
from pathlib import Path

_SCHEMA = """
CREATE TABLE IF NOT EXISTS maintenance (
    post_id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    url TEXT NOT NULL,
    posted_at TEXT NOT NULL,
    modify_date INTEGER,
    type TEXT,
    start TEXT,
    "end" TEXT,
    original_end TEXT,
    extended INTEGER NOT NULL DEFAULT 0,
    raw_time_text TEXT,
    fetched_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS state (
    key TEXT PRIMARY KEY,
    value TEXT
);
"""

_MAINT_COLS = ["post_id", "title", "url", "posted_at", "modify_date", "type", "start", "end",
               "original_end", "extended", "raw_time_text", "fetched_at"]


def _iso(v):
    return v.isoformat() if isinstance(v, datetime) else v


class Store:
    def __init__(self, path: Path | str):
        if str(path) != ":memory:":
            Path(path).parent.mkdir(parents=True, exist_ok=True)
        self._conn = sqlite3.connect(str(path), check_same_thread=False)
        self._conn.row_factory = sqlite3.Row
        self._lock = threading.Lock()
        with self._lock:
            self._conn.executescript(_SCHEMA)

    # ---- state ----
    def get(self, key: str, default: str | None = None) -> str | None:
        with self._lock:
            row = self._conn.execute("SELECT value FROM state WHERE key=?", (key,)).fetchone()
        return row["value"] if row else default

    def set(self, key: str, value) -> None:
        with self._lock, self._conn:
            self._conn.execute(
                "INSERT INTO state(key, value) VALUES(?, ?) ON CONFLICT(key) DO UPDATE SET value=excluded.value",
                (key, _iso(value)),
            )

    def get_time(self, key: str) -> datetime | None:
        v = self.get(key)
        return datetime.fromisoformat(v) if v else None

    # ---- maintenance ----
    def get_maintenance(self, post_id: str) -> dict | None:
        with self._lock:
            row = self._conn.execute("SELECT * FROM maintenance WHERE post_id=?", (post_id,)).fetchone()
        return dict(row) if row else None

    def upsert_maintenance(self, rec: dict) -> None:
        values = [_iso(rec.get(c)) for c in _MAINT_COLS]
        values[_MAINT_COLS.index("extended")] = int(bool(rec.get("extended")))
        cols = ", ".join(f'"{c}"' for c in _MAINT_COLS)
        updates = ", ".join(f'"{c}"=excluded."{c}"' for c in _MAINT_COLS if c != "post_id")
        with self._lock, self._conn:
            self._conn.execute(
                f"INSERT INTO maintenance({cols}) VALUES({', '.join('?' * len(_MAINT_COLS))}) "
                f"ON CONFLICT(post_id) DO UPDATE SET {updates}",
                values,
            )

    def latest_maintenance(self) -> dict | None:
        """最近一次維護（依維護開始時間，無法解析時以發文時間）。"""
        with self._lock:
            row = self._conn.execute(
                'SELECT * FROM maintenance ORDER BY COALESCE(start, posted_at) DESC LIMIT 1').fetchone()
        return dict(row) if row else None
