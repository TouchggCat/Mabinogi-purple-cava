import { CopyButton } from '@/components/common'
import type { SpawnSpan } from '@/models'
import { Duration, TaipeiClock } from '@/utils'

interface Props {
  label: string
  span: SpawnSpan
  now: Date
  /** 顯示距離開啟的倒數 */
  showCountdown?: boolean
}

/** 一列紫洞時間：`10/07  14:40 – 14:55` */
export function SpawnSlot({ label, span, now, showCountdown = false }: Props) {
  const open = span.isOpen(now)
  // 純文字＋兩個空白，複製時就是 `10/07  14:40 – 14:55`
  const text = `${TaipeiClock.monthDay(span.start)}  ${TaipeiClock.hourMinute(span.start)} – ${TaipeiClock.hourMinute(span.end)}`
  return (
    <div className={`slot${open ? ' slot-open' : ''}`}>
      <div className="slot-label">{label}</div>
      <div className="slot-row">
        <div className="slot-time">{text}</div>
        <CopyButton text={text} label={`複製${label}`} />
      </div>
      {open && <div className="badge badge-open">開放中・剩 {Duration.between(now, span.end).toString()}</div>}
      {showCountdown && !open && <div className="slot-sub">還有 {Duration.between(now, span.start).toString()}</div>}
    </div>
  )
}
