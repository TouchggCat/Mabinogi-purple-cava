"""
python -m backend                         啟動網頁伺服器 + 每 30 分鐘爬官網
python -m backend --crawl-once [--headed] 只爬一次官網維護公告並印出結果（不寫入）
"""
import argparse
import logging
import sys
from datetime import datetime

import uvicorn

from . import config, service
from .app import create_app
from .store import Store


def setup_logging():
    config.LOG_PATH.parent.mkdir(parents=True, exist_ok=True)
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s %(levelname)s %(name)s: %(message)s",
        handlers=[logging.StreamHandler(sys.stdout), logging.FileHandler(config.LOG_PATH, encoding="utf-8")],
    )
    logging.getLogger("apscheduler").setLevel(logging.WARNING)


def main():
    ap = argparse.ArgumentParser(prog="python -m backend")
    ap.add_argument("--crawl-once", action="store_true")
    ap.add_argument("--headed", action="store_true", help="瀏覽器視窗顯示在螢幕上（手動通過 Cloudflare 驗證）")
    args = ap.parse_args()
    setup_logging()

    if args.crawl_once:
        recs = service.crawl_maintenance(Store(":memory:"), datetime.now(config.TZ), headed=args.headed, save=False)
        for r in recs:
            ext = "，已延長" if r["extended"] else ""
            print(f"{r['title']}\n  {r['start']} ~ {r['end']}（原定 {r['original_end']}）{ext}\n  {r['url']}")
        print(f"共 {len(recs)} 則維護公告")
        return

    if not config.WEB_DIST.exists():
        logging.warning("找不到前端 build（web/dist），請先在 web/ 執行 npm run build")
    uvicorn.run(create_app(Store(config.DB_PATH)), host=config.HOST, port=config.PORT)


if __name__ == "__main__":
    main()
