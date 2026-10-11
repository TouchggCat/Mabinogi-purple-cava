import type { CalibrationPreview } from '@/models'
import { TaipeiClock } from '@/utils'

interface Props {
  preview: CalibrationPreview
  busy: boolean
  error: string
  onBack: () => void
  onConfirm: () => void
}

/** 第二步：確認後才寫入 */
export function CalibrateConfirm({ preview, busy, error, onBack, onConfirm }: Props) {
  return (
    <div>
      <h2>確定要校正嗎？</h2>
      <p>最近紫洞時間將設為</p>
      <p className="confirm-time">{TaipeiClock.monthDayTime(preview.spawn)}</p>
      <p className="muted">
        下一次預計 {TaipeiClock.monthDayTime(preview.next)}
        <br />校正人員：{preview.by}
        <br />目前的時間記錄會被覆蓋。
      </p>
      {error && <p className="error">{error}</p>}
      <div className="actions">
        <button className="btn ghost" onClick={onBack} disabled={busy}>返回</button>
        <button className="btn" onClick={onConfirm} disabled={busy}>{busy ? '校正中…' : '確定校正'}</button>
      </div>
    </div>
  )
}
