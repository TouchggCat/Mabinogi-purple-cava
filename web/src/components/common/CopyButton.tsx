import { useEffect, useState } from 'react'
import { Clipboard } from '@/services'

type State = 'idle' | 'copied' | 'failed'

const FEEDBACK_MS = 1500

const COPY_ICON = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="9" y="9" width="12" height="12" rx="2" /><path d="M5 15H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v1" />
  </svg>
)
const CHECK_ICON = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M5 12.5l4.5 4.5L19 7" />
  </svg>
)

const LABEL: Record<State, string> = { idle: '複製', copied: '已複製', failed: '複製失敗' }

/** 圖示按鈕：點擊複製 text，短暫顯示結果 */
export function CopyButton({ text, label = '複製' }: { text: string; label?: string }) {
  const [state, setState] = useState<State>('idle')

  useEffect(() => {
    if (state === 'idle') return
    const id = setTimeout(() => setState('idle'), FEEDBACK_MS)
    return () => clearTimeout(id)
  }, [state])

  const copy = async () => setState((await Clipboard.copy(text)) ? 'copied' : 'failed')

  return (
    <button type="button" className={`copy-btn copy-${state}`} onClick={() => void copy()}
      aria-label={state === 'idle' ? label : LABEL[state]} title={state === 'idle' ? label : LABEL[state]}>
      {state === 'copied' ? CHECK_ICON : COPY_ICON}
      <span className="copy-tip" role="status">{state === 'idle' ? '' : LABEL[state]}</span>
    </button>
  )
}
