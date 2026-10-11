import { useState } from 'react'
import { Modal } from '@/components/common'
import { CalibrationDraft, type CalibrationPreview, type PurpleStatus } from '@/models'
import { preferences, purpleApi } from '@/services'
import { CalibrateConfirm } from './CalibrateConfirm'
import { CalibrateForm } from './CalibrateForm'

interface Props {
  now: Date
  onClose: () => void
  onCalibrated: (status: PurpleStatus) => void
}

/** 校正流程：輸入 → 確認 → 送出 */
export function CalibrateDialog({ now, onClose, onCalibrated }: Props) {
  const [draft, setDraft] = useState(() => CalibrationDraft.initial(new Date(), preferences.calibrator))
  const [preview, setPreview] = useState<CalibrationPreview | null>(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const review = () => {
    const result = draft.validate(new Date())
    if (!result.ok) return setError(result.error)
    setError('')
    setPreview(result.preview)
  }

  const submit = async () => {
    setBusy(true)
    try {
      const status = await purpleApi.calibrate(draft.toRequest())
      preferences.calibrator = draft.calibrator
      onCalibrated(status)
    } catch (err) {
      setError(err instanceof Error ? err.message : '校正失敗')
      setPreview(null)
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal onClose={onClose}>
      {preview ? (
        <CalibrateConfirm preview={preview} busy={busy} error={error}
          onBack={() => setPreview(null)} onConfirm={() => void submit()} />
      ) : (
        <CalibrateForm draft={draft} now={now} error={error}
          onChange={setDraft} onNext={review} onCancel={onClose} />
      )}
    </Modal>
  )
}
