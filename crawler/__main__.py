"""
python -m crawler            爬一次官網維護公告並印出
python -m crawler --upload   爬一次並上傳到網站（需 PURPLE_API_URL、CRAWL_TOKEN）
python -m crawler --headed   瀏覽器視窗顯示在螢幕上（手動通過 Cloudflare 驗證）
"""
import argparse
import logging
import sys
from datetime import datetime

from . import config
from .crawl import crawl_maintenance
from .upload import build_payload, upload


def main() -> int:
    ap = argparse.ArgumentParser(prog="python -m crawler")
    ap.add_argument("--upload", action="store_true", help="上傳到 PURPLE_API_URL")
    ap.add_argument("--headed", action="store_true", help="瀏覽器視窗顯示在螢幕上")
    args = ap.parse_args()
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s",
                        stream=sys.stdout)

    posts = crawl_maintenance(headed=args.headed)
    for r in posts:
        ext = "，已延長" if r["extended"] else ""
        print(f"{r['title']}\n  {r['start']} ~ {r['end']}（原定 {r['original_end']}）{ext}\n  {r['url']}")
    print(f"共 {len(posts)} 則維護公告")

    if args.upload:
        result = upload(build_payload(posts, datetime.now(config.TZ)))
        print(f"已上傳：{result}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
