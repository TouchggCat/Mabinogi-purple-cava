import { Modal } from '@/components/common'
import { Duration, TaipeiClock } from '@/utils'

interface Props {
  history: Date[]
  now: Date
  onClose: () => void
}

/** 最近幾次官網公告檢查時間 */
export function CrawlHistoryDialog({ history, now, onClose }: Props) {
  return (
    <Modal onClose={onClose}>
      <h2>官網公告檢查紀錄</h2>
      <p className="muted">最近 {history.length} 次（時間不固定）</p>
      <ul className="crawl-list">
        {history.map((t) => (
          <li key={t.toISOString()}>
            <span>{TaipeiClock.monthDayTime(t)}</span>
            <span className="muted">{Duration.between(t, now).toString()}前</span>
          </li>
        ))}
      </ul>
      <div className="actions">
        <button className="btn" onClick={onClose}>關閉</button>
      </div>
    </Modal>
  )
}
