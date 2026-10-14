import { useState } from 'react'
import { CalibrateDialog, CalibrationHistoryDialog, CalibrationNotice, CommentFormDialog, CommentListDialog, CrawlHistoryDialog, MaintenanceAlert, MaintenanceInfo, PushToggle, StatusCard } from '@/components'
import { useNow, usePurpleStatus } from '@/hooks'
import type { CommentDto } from '@/models'
import { TaipeiClock } from '@/utils'
import version from './version.json'

export default function App() {
  const now = useNow()
  const { status, error, replace } = usePurpleStatus(now)
  const [calibrating, setCalibrating] = useState(false)
  const [showing, setShowing] = useState<'calibrations' | 'crawls' | 'comment' | 'comments' | null>(null)
  /** 剛留言完的最新列表，直接顯示不再讀取 */
  const [posted, setPosted] = useState<CommentDto[]>()

  return (
    <main className="page">
      <div className="topbar"><PushToggle /></div>
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

      <div className="comment-bar">
        <button className="btn ghost" onClick={() => setShowing('comment')}>意見／嘴砲留言</button>
        <button className="btn ghost" onClick={() => { setPosted(undefined); setShowing('comments') }}>查看留言</button>
      </div>
      {showing === 'comment' && (
        <CommentFormDialog onClose={() => setShowing(null)}
          onPosted={(comments) => { setPosted(comments); setShowing('comments') }} />
      )}
      {showing === 'comments' && <CommentListDialog initial={posted} onClose={() => setShowing(null)} />}

      <footer className="muted small site-updated">
        版本日期：{version.date}_V{version.build}
      </footer>
    </main>
  )
}
