import type { PurpleStatus } from '@/models'
import { SpawnSlot } from './SpawnSlot'

interface Props {
  status: PurpleStatus
  now: Date
}

/** 最近／下一次紫洞時間 */
export function StatusCard({ status, now }: Props) {
  const { recent, next } = status
  return (
    <section className="card">
      {recent && next ? (
        <>
          <SpawnSlot label="最近紫洞時間" span={recent} now={now} />
          <SpawnSlot label="下一次預計" span={next} now={now} showCountdown />
        </>
      ) : (
        <p className="empty">尚未校正，請按下方按鈕輸入紫洞開啟時間。</p>
      )}
    </section>
  )
}
