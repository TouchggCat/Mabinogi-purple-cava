import type { InputHTMLAttributes } from 'react'

interface Props extends Omit<InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
  label: string
  value: string
  onChange: (value: string) => void
}

/** 帶標題的輸入欄 */
export function Field({ label, onChange, ...input }: Props) {
  return (
    <label className="field">
      <span>{label}</span>
      <input {...input} onChange={(e) => onChange(e.target.value)} />
    </label>
  )
}
