/** 紫洞規則（需與後端 backend/purple.py 一致） */
export const PURPLE = {
  /** 下一場 = 上一場開啟 + 36 小時 15 分鐘 */
  CYCLE_MS: (36 * 60 + 15) * 60_000,
  /** 每場開放 15 分鐘 */
  OPEN_MS: 15 * 60_000,
  /** 校正可接受範圍：現在 ±3 天 */
  CALIBRATION_WINDOW_DAYS: 3,
  /** 校正人員名稱上限 */
  CALIBRATOR_MAX_LENGTH: 20,
} as const

export const APP = {
  /** 狀態輪詢間隔 */
  POLL_MS: 60_000,
  /** 官網公告爬取間隔（僅顯示用） */
  CRAWL_INTERVAL_MIN: 30,
  /** 維護在此天數內 → 顯示「近期有維護紀錄」 */
  RECENT_MAINTENANCE_DAYS: 3,
} as const
