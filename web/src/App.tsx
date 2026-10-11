import { useState } from 'react'
import { CalibrateDialog, CalibrationNotice, MaintenanceAlert, MaintenanceInfo, StatusCard } from '@/components'
import { APP } from '@/config'
import { useNow, usePurpleStatus } from '@/hooks'
import { TaipeiClock } from '@/utils'

export default function App() {
  const now = useNow()
  const { status, error, replace } = usePurpleStatus(now)
  const [calibrating, setCalibrating] = useState(false)

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
              上次校正：{TaipeiClock.monthDayTime(status.calibratedAt)}
              {status.calibratedBy && <><br />校正人員：{status.calibratedBy}</>}
            </p>
          )}

          {status.maintenance && <MaintenanceInfo maintenance={status.maintenance} now={now} />}
          {status.lastCrawl && (
            <p className="muted small">
              官網公告最後檢查：{TaipeiClock.monthDayTime(status.lastCrawl)}（每 {APP.CRAWL_INTERVAL_MIN} 分鐘）
            </p>
          )}
        </>
      )}

      {calibrating && (
        <CalibrateDialog
          now={now}
          onClose={() => setCalibrating(false)}
          onCalibrated={(next) => { replace(next); setCalibrating(false) }}
        />
      )}
    </main>
  )
}
