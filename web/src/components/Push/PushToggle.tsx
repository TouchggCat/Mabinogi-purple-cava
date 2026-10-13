import { useEffect, useState } from 'react'
import { Modal } from '@/components/common'
import { pushNotifications, type PushState } from '@/services'

const BELL_ICON = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" /><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
  </svg>
)

const SCHEDULE = '最近一場紫洞開啟前 4、3、2、1 小時，以及 30 分鐘前'

/** 對話框內容：依目前狀態說明下一步 */
function PushDialog({ state, busy, error, onConfirm, onClose }: {
  state: PushState
  busy: boolean
  error: string
  onConfirm: () => void
  onClose: () => void
}) {
  const close = <button className="btn ghost" onClick={onClose} disabled={busy}>{state === 'on' || state === 'off' ? '取消' : '知道了'}</button>
  switch (state) {
    case 'off':
      return (
        <>
          <h2>開啟紫洞推播</h2>
          <p>將在{SCHEDULE}發送通知。</p>
          <p className="muted">按下「確認開啟」後，瀏覽器會詢問是否允許通知，請選擇「允許」。</p>
          {error && <p className="error">{error}</p>}
          <div className="actions">{close}<button className="btn" onClick={onConfirm} disabled={busy}>{busy ? '開啟中…' : '確認開啟'}</button></div>
        </>
      )
    case 'on':
      return (
        <>
          <h2>關閉紫洞推播？</h2>
          <p>目前會在{SCHEDULE}通知你。關閉後就不會再收到。</p>
          {error && <p className="error">{error}</p>}
          <div className="actions">{close}<button className="btn" onClick={onConfirm} disabled={busy}>{busy ? '關閉中…' : '關閉推播'}</button></div>
        </>
      )
    case 'needs-install':
      return (
        <>
          <h2>請先加入主畫面</h2>
          <p>iPhone／iPad 需要把網站加入主畫面，才能接收推播（iOS 16.4 以上）：</p>
          <ol className="steps">
            <li>點 Safari 的「分享」按鈕</li>
            <li>選「加入主畫面」</li>
            <li>從主畫面的「紫洞」圖示打開，再按右上角的推播開關</li>
          </ol>
          <div className="actions">{close}</div>
        </>
      )
    case 'denied':
      return (
        <>
          <h2>通知已被封鎖</h2>
          <p>請到瀏覽器（或手機「設定」→「通知」）允許此網站傳送通知，再回來開啟推播。</p>
          <div className="actions">{close}</div>
        </>
      )
    case 'unsupported':
      return (
        <>
          <h2>不支援推播</h2>
          <p>這個瀏覽器不支援推播通知，請改用 Chrome、Edge、Firefox，或 iPhone／iPad 的 Safari（加入主畫面）。</p>
          <div className="actions">{close}</div>
        </>
      )
  }
}

/** 右上角推播開關：點擊 → 說明與確認 → 授權並訂閱 */
export function PushToggle() {
  const [state, setState] = useState<PushState | null>(null)
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    pushNotifications.state().then(setState, () => setState('unsupported'))
  }, [])

  if (!state) return null

  const confirm = async () => {
    setBusy(true)
    setError('')
    try {
      const next = state === 'on' ? await pushNotifications.disable() : await pushNotifications.enable()
      setState(next)
      // 開啟成功或關閉後收起；被拒絕則留著顯示說明
      if (next === 'on' || state === 'on') setOpen(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : '推播設定失敗')
    } finally {
      setBusy(false)
    }
  }

  const on = state === 'on'
  return (
    <>
      <button
        className={`push-toggle${on ? ' push-on' : ''}`}
        onClick={() => { setError(''); setOpen(true) }}
        aria-pressed={on}
        aria-label={on ? '推播已開啟' : '推播已關閉'}
      >
        {BELL_ICON}
        <span>推播</span>
        <span className="push-switch" aria-hidden="true" />
      </button>
      {open && (
        <Modal onClose={() => !busy && setOpen(false)}>
          <PushDialog state={state} busy={busy} error={error} onConfirm={() => void confirm()} onClose={() => setOpen(false)} />
        </Modal>
      )}
    </>
  )
}
