import type { SpawnSpan } from '@/models'
import { Duration, TaipeiClock } from '@/utils'

interface Props {
  label: string
  span: SpawnSpan
  now: Date
  /** 顯示距離開啟的倒數 */
  showCountdown?: boolean
}

/** 一列紫洞時間：`10/07  14:40–14:55` */
export function SpawnSlot({ label, span, now, showCountdown = false }: Props) {
  const open = span.isOpen(now)
  return (
    <div className={`slot${open ? ' slot-open' : ''}`}>
      <div className="slot-label">{label}</div>
      <div className="slot-time">
        <span className="slot-date">{TaipeiClock.monthDay(span.start)}</span>
        <span>{TaipeiClock.hourMinute(span.start)}–{TaipeiClock.hourMinute(span.end)}</span>
      </div>
      {open && <div className="badge badge-open">開放中・剩 {Duration.between(now, span.end).toString()}</div>}
      {showCountdown && !open && <div className="slot-sub">還有 {Duration.between(now, span.start).toString()}</div>}
    </div>
  )
}
