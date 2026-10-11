import contextlib
import logging
from datetime import datetime

from apscheduler.schedulers.background import BackgroundScheduler
from fastapi import FastAPI, HTTPException
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

from . import config, service
from .store import Store

log = logging.getLogger(__name__)


class CalibrateBody(BaseModel):
    time: str  # "YYYY-MM-DD HH:MM"（也接受 "HH:MM"、"MM/DD HH:MM"）
    by: str = ""  # 校正人員（必填）


def now() -> datetime:
    return datetime.now(config.TZ)


def create_app(store: Store, crawl: bool = True) -> FastAPI:
    scheduler = BackgroundScheduler(timezone=config.TZ)

    def crawl_job():
        try:
            for r in service.crawl_maintenance(store, now()):
                log.info("維護公告：%s %s ~ %s 延長=%s", r["title"], r["start"], r["end"], r["extended"])
        except Exception:
            log.exception("爬取官網失敗，下一輪再試")

    @contextlib.asynccontextmanager
    async def lifespan(app):
        if crawl:
            scheduler.add_job(crawl_job, "interval", minutes=config.CRAWL_INTERVAL_MIN,
                              next_run_time=now(), max_instances=1, coalesce=True)
            scheduler.start()
        yield
        if crawl:
            scheduler.shutdown(wait=False)

    app = FastAPI(lifespan=lifespan)

    @app.get("/api/status")
    def get_status():
        return service.status(store, now())

    @app.post("/api/calibrate")
    def post_calibrate(body: CalibrateBody):
        by = body.by.strip()
        if not by:
            raise HTTPException(status_code=400, detail="請輸入校正人員")
        if len(by) > 20:
            raise HTTPException(status_code=400, detail="校正人員最多 20 字")
        if service.calibrate(store, body.time, now(), by) is None:
            raise HTTPException(status_code=400, detail="時間錯誤：請選擇現在前後 3 天內的日期與時間")
        return service.status(store, now())

    if config.WEB_DIST.exists():
        app.mount("/", StaticFiles(directory=config.WEB_DIST, html=True), name="web")
    return app
