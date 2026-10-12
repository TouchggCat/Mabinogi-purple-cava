import type { ReactNode } from 'react'
import { Duration, TaipeiClock } from '@/utils'
import { Modal } from './Modal'

export interface HistoryEntry {
  /** 紀錄時間：顯示日期時間與「多久前」 */
  at: Date
  /** 時間下方的補充說明 */
  detail?: ReactNode
}

interface Props {
  title: string
  /** 標題下方的說明；預設「最近 N 次」 */
  note?: string
  entries: HistoryEntry[]
  now: Date
  onClose: () => void
}

/** 時間紀錄清單（新到舊），供檢查紀錄、校正紀錄共用 */
export function HistoryDialog({ title, note, entries, now, onClose }: Props) {
  return (
    <Modal onClose={onClose}>
      <h2>{title}</h2>
      <p className="muted">{note ?? `最近 ${entries.length} 次`}</p>
      {entries.length > 0 ? (
        <ul className="history-list">
          {entries.map((e, i) => (
            <li key={i}>
              <div className="history-row">
                <span>{TaipeiClock.monthDayTime(e.at)}</span>
                <span className="muted">{Duration.between(e.at, now).toString()}前</span>
              </div>
              {e.detail && <div className="history-detail muted">{e.detail}</div>}
            </li>
          ))}
        </ul>
      ) : (
        <p>尚無紀錄</p>
      )}
      <div className="actions">
        <button className="btn" onClick={onClose}>關閉</button>
      </div>
    </Modal>
  )
}
