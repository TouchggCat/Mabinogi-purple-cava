import { CopyButton } from '@/components/common'
import type { SpawnPhase, SpawnSpan } from '@/models'
import { Duration, TaipeiClock } from '@/utils'

interface Props {
  label: string
  span: SpawnSpan
  now: Date
}

/** 狀態標籤：尚未開始（綠；6 小時內橘）→ 開放中（紫）→ 已結束（灰） */
function phaseBadge(phase: SpawnPhase, span: SpawnSpan, now: Date): string {
  switch (phase) {
    case 'upcoming': return `還有 ${Duration.between(now, span.start)}`
    case 'open': return `開放中・剩 ${Duration.between(now, span.end)}`
    case 'ended': return `已結束・${Duration.between(span.end, now)}前`
  }
}

/** 一列紫洞時間：`10/07  14:40 – 14:55` */
export function SpawnSlot({ label, span, now }: Props) {
  const phase = span.phase(now)
  // 純文字＋兩個空白，複製時就是 `10/07  14:40 – 14:55`
  const text = `${TaipeiClock.monthDay(span.start)}  ${TaipeiClock.hourMinute(span.start)} – ${TaipeiClock.hourMinute(span.end)}`
  return (
    <div className={`slot${phase === 'open' ? ' slot-open' : ''}`}>
      <div className="slot-label">{label}</div>
      <div className="slot-row">
        <div className="slot-time">{text}</div>
        <CopyButton text={text} label={`複製${label}`} />
      </div>
      <div className={`badge badge-${phase}${span.isSoon(now) ? ' badge-soon' : ''}`}>{phaseBadge(phase, span, now)}</div>
    </div>
  )
}
