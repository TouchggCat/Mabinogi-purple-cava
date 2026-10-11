/** 固定提醒：維護後需手動校正 */
export function CalibrationNotice() {
  return (
    <div className="alert" role="note">
      若近期有維護則需手動校正時間，如不確定請告知<span className="highlight">初音過去</span>
    </div>
  )
}

/** 校正後發生維護時的提示 */
export function MaintenanceAlert() {
  return (
    <div className="alert" role="alert">
      偵測到伺服器維護，紫洞計時可能已被打亂，請在看到紫洞後重新校正。
    </div>
  )
}
