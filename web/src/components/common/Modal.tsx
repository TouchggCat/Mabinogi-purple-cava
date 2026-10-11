import type { ReactNode } from 'react'

interface Props {
  onClose: () => void
  children: ReactNode
}

/** 置中對話框；點背景關閉 */
export function Modal({ onClose, children }: Props) {
  return (
    <div className="overlay" onClick={onClose}>
      <div className="dialog" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
        {children}
      </div>
    </div>
  )
}
