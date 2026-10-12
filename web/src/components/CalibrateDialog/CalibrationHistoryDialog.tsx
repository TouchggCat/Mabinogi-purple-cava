import { HistoryDialog } from '@/components/common'
import type { CalibrationRecord } from '@/models'
import { TaipeiClock } from '@/utils'

interface Props {
  history: CalibrationRecord[]
  now: Date
  onClose: () => void
}

/** 最近幾次校正：校正時間、校正人員、設定的紫洞開啟時間 */
export function CalibrationHistoryDialog({ history, now, onClose }: Props) {
  return (
    <HistoryDialog
      title="校正紀錄"
      entries={history.map((r) => ({
        at: r.calibratedAt,
        detail: <>校正人員：{r.by}<br />紫洞開啟時間：{TaipeiClock.monthDayTime(r.anchor)}</>,
      }))}
      now={now}
      onClose={onClose}
    />
  )
}
