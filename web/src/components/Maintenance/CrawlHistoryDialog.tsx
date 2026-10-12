import { HistoryDialog } from '@/components/common'

interface Props {
  history: Date[]
  now: Date
  onClose: () => void
}

/** 最近幾次官網公告檢查時間 */
export function CrawlHistoryDialog({ history, now, onClose }: Props) {
  return (
    <HistoryDialog
      title="官網公告檢查紀錄"
      note={`最近 ${history.length} 次（時間不固定）`}
      entries={history.map((at) => ({ at }))}
      now={now}
      onClose={onClose}
    />
  )
}
