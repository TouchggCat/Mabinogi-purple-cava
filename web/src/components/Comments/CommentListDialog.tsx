import { useEffect, useState } from 'react'
import { Modal } from '@/components/common'
import { COMMENT } from '@/config'
import type { CommentDto } from '@/models'
import { purpleApi } from '@/services'
import { TaipeiClock } from '@/utils'

interface Props {
  /** 已有最新列表（剛留言完）就不再重新讀取 */
  initial?: CommentDto[]
  onClose: () => void
}

/** 最近 30 則留言：名稱、留言時間、內容 */
export function CommentListDialog({ initial, onClose }: Props) {
  const [comments, setComments] = useState<CommentDto[] | null>(initial ?? null)
  const [error, setError] = useState('')

  useEffect(() => {
    if (initial) return
    purpleApi.getComments().then(setComments, (err: unknown) => setError(err instanceof Error ? err.message : '讀取失敗'))
  }, [initial])

  return (
    <Modal onClose={onClose}>
      <h2>留言</h2>
      <p className="muted">最近 {COMMENT.KEEP} 則</p>
      {error ? (
        <p className="error">{error}</p>
      ) : !comments ? (
        <p className="muted">讀取中…</p>
      ) : comments.length ? (
        <ul className="history-list">
          {comments.map((c, i) => (
            <li key={`${c.posted_at}-${i}`}>
              <div className="history-row">
                <b className="comment-name">{c.name}</b>
                <span className="muted small comment-row-time">{TaipeiClock.monthDayTime(c.posted_at)}</span>
              </div>
              <div className="comment-content">{c.content}</div>
            </li>
          ))}
        </ul>
      ) : (
        <p>尚無留言</p>
      )}
      <div className="actions">
        <button className="btn" onClick={onClose}>關閉</button>
      </div>
    </Modal>
  )
}
