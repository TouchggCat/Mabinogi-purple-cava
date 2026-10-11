import type { InputHTMLAttributes, MouseEvent, ReactElement } from 'react'

interface Props extends Omit<InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
  label: string
  value: string
  onChange: (value: string) => void
}

const ICONS: Partial<Record<string, ReactElement>> = {
  date: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <rect x="3" y="5" width="18" height="16" rx="2" /><path d="M3 10h18M8 3v4M16 3v4" />
    </svg>
  ),
  time: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" />
    </svg>
  ),
}

/** 點欄位任一處就打開原生選擇器（不支援 showPicker 的瀏覽器維持原本行為） */
function openPicker(e: MouseEvent<HTMLInputElement>) {
  try {
    e.currentTarget.showPicker?.()
  } catch {
    // 已開啟或瀏覽器不允許
  }
}

/** 帶標題的輸入欄；日期、時間欄位附圖示並可點開選擇器 */
export function Field({ label, onChange, type = 'text', ...input }: Props) {
  const icon = ICONS[type]
  return (
    <label className="field">
      <span>{label}</span>
      <span className={`field-box${icon ? ' has-icon' : ''}`}>
        <input {...input} type={type} onClick={icon ? openPicker : undefined}
          onChange={(e) => onChange(e.target.value)} />
        {icon && <span className="field-icon" aria-hidden="true">{icon}</span>}
      </span>
    </label>
  )
}
