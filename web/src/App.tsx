import { useState } from 'react'
import { CalibrateDialog, CalibrationHistoryDialog, CalibrationNotice, CrawlHistoryDialog, MaintenanceAlert, MaintenanceInfo, StatusCard } from '@/components'
import { useNow, usePurpleStatus } from '@/hooks'
import { TaipeiClock } from '@/utils'

export default function App() {
  const now = useNow()
  const { status, error, replace } = usePurpleStatus(now)
  const [calibrating, setCalibrating] = useState(false)
  const [showing, setShowing] = useState<'calibrations' | 'crawls' | null>(null)

  return (
    <main className="page">
      <header>
        <h1>初音的瑪奇紫洞發布器</h1>
        <p className="muted">每 36 小時 15 分鐘刷新，開放 15 分鐘</p>
      </header>

      <CalibrationNotice />

      {error && <p className="error">{error}</p>}

      {status && (
        <>
          {status.isDisruptedByMaintenance && <MaintenanceAlert />}
          <StatusCard status={status} now={now} />

          <button className="btn btn-wide" onClick={() => setCalibrating(true)}>校正紫洞時間</button>
          {status.calibratedAt && (
            <p className="muted small">
              <button className="text-btn" onClick={() => setShowing('calibrations')}>
                上次校正：{TaipeiClock.monthDayTime(status.calibratedAt)}
                {status.calibratedBy && <><br />校正人員：{status.calibratedBy}</>}
              </button>
            </p>
          )}

          {status.maintenance && <MaintenanceInfo maintenance={status.maintenance} now={now} />}
          {status.lastCrawl && (
            <p className="muted small">
              <button className="text-btn" onClick={() => setShowing('crawls')}>
                官網公告最後檢查：{TaipeiClock.monthDayTime(status.lastCrawl)}
              </button>
            </p>
          )}
        </>
      )}

      {status && showing === 'calibrations' && (
        <CalibrationHistoryDialog history={status.calibrationHistory} now={now} onClose={() => setShowing(null)} />
      )}
      {status && showing === 'crawls' && (
        <CrawlHistoryDialog history={status.crawlHistory} now={now} onClose={() => setShowing(null)} />
      )}

      {calibrating && (
        <CalibrateDialog
          now={now}
          onClose={() => setCalibrating(false)}
          onCalibrated={(next) => { replace(next); setCalibrating(false) }}
        />
      )}

      <footer className="muted small site-updated">
        版本日期：{TaipeiClock.dateInput(__BUILD_TIME__).replaceAll('-', '/')}
      </footer>
    </main>
  )
}
