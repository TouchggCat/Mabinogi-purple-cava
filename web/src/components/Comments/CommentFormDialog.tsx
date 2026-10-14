import { useState, type FormEvent } from 'react'
import { Field, Modal } from '@/components/common'
import { COMMENT, checkComment } from '@/config'
import type { CommentDto } from '@/models'
import { preferences, purpleApi } from '@/services'

interface Props {
  onClose: () => void
  /** 留言成功，帶回最新留言列表 */
  onPosted: (comments: CommentDto[]) => void
}

/** 意見／嘴砲留言：名稱、內容皆必填 */
export function CommentFormDialog({ onClose, onPosted }: Props) {
  const [name, setName] = useState(() => preferences.commenter)
  const [content, setContent] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    const check = checkComment(name, content)
    if (!check.ok) return setError(check.error)
    setBusy(true)
    setError('')
    try {
      const comments = await purpleApi.postComment({ name: check.name, content: check.content })
      preferences.commenter = check.name
      onPosted(comments)
    } catch (err) {
      setError(err instanceof Error ? err.message : '留言失敗')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal onClose={onClose}>
      <form onSubmit={(e) => void submit(e)}>
        <h2>意見／嘴砲留言</h2>
        <p className="muted">每人每 {COMMENT.USER_COOLDOWN_MS / 60_000} 分鐘可留言一次</p>
        <Field label="名稱" value={name} maxLength={COMMENT.NAME_MAX_LENGTH} placeholder="你的暱稱" required
          onChange={setName} />
        <label className="field">
          <span>內容</span>
          <textarea value={content} maxLength={COMMENT.CONTENT_MAX_LENGTH} rows={4} required
            placeholder="想說的話" onChange={(e) => setContent(e.target.value)} />
          <span className="field-count">{content.length} / {COMMENT.CONTENT_MAX_LENGTH}</span>
        </label>
        {error && <p className="error">{error}</p>}
        <div className="actions">
          <button type="button" className="btn ghost" onClick={onClose}>取消</button>
          <button type="submit" className="btn" disabled={busy}>{busy ? '送出中…' : '送出'}</button>
        </div>
      </form>
    </Modal>
  )
}
