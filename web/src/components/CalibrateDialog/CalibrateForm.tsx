import type { FormEvent } from 'react'
import { PURPLE } from '@/config'
import { CalibrationDraft } from '@/models'
import { Field } from '@/components/common'

interface Props {
  draft: CalibrationDraft
  now: Date
  error: string
  onChange: (draft: CalibrationDraft) => void
  onNext: () => void
  onCancel: () => void
}

/** 第一步：選擇日期、時間並輸入校正人員 */
export function CalibrateForm({ draft, now, error, onChange, onNext, onCancel }: Props) {
  const range = CalibrationDraft.dateRange(now)
  const submit = (e: FormEvent) => {
    e.preventDefault()
    onNext()
  }

  return (
    <form onSubmit={submit}>
      <h2>校正紫洞時間</h2>
      <p className="muted">
        請選擇<b>紫洞開啟時間</b>（現在前後 {PURPLE.CALIBRATION_WINDOW_DAYS} 天內）。選未來時間會作為「最近紫洞時間」。
      </p>
      <Field label="日期" type="date" value={draft.date} min={range.min} max={range.max} required
        onChange={(date) => onChange(draft.with({ date }))} />
      <Field label="時間" type="time" value={draft.time} required
        onChange={(time) => onChange(draft.with({ time }))} />
      <Field label="校正人員" type="text" value={draft.by} maxLength={PURPLE.CALIBRATOR_MAX_LENGTH}
        placeholder="你的暱稱" required onChange={(by) => onChange(draft.with({ by }))} />
      {error && <p className="error">{error}</p>}
      <div className="actions">
        <button type="button" className="btn ghost" onClick={onCancel}>取消</button>
        <button type="submit" className="btn">下一步</button>
      </div>
    </form>
  )
}
