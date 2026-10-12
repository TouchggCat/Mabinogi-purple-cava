/**
 * 紫洞規則（前端與 API 共用）。
 * 本資料夾內的 import 一律寫相對路徑並加 .js，Vercel Functions（Node ESM）才找得到。
 */
import { TaipeiClock } from './TaipeiClock.js'

export const PURPLE = {
  /** 下一場 = 上一場開啟 + 36 小時 15 分鐘 */
  CYCLE_MS: (36 * 60 + 15) * 60_000,
  /** 每場開放 15 分鐘 */
  OPEN_MS: 15 * 60_000,
  /** 結束後仍顯示為「最近紫洞時間」的時間；超過就輪換到下一場 */
  ENDED_HOLD_MS: 12 * 3600_000,
  /** 距離開啟在此時間內 → 倒數標籤改用醒目顏色 */
  SOON_MS: 6 * 3600_000,
  /** 校正可接受範圍：現在 ±3 天 */
  CALIBRATION_WINDOW_DAYS: 3,
  /** 校正人員名稱上限 */
  CALIBRATOR_MAX_LENGTH: 20,
  /** 校正冷卻時間：全站每分鐘最多校正一次 */
  CALIBRATION_COOLDOWN_MS: 60_000,
} as const

export const APP = {
  /** 狀態輪詢間隔（分頁在背景時暫停） */
  POLL_MS: 3 * 60_000,
  /** 維護在此天數內 → 顯示「近期有維護紀錄」 */
  RECENT_MAINTENANCE_DAYS: 3,
} as const

/** 一場紫洞的關閉時間 */
export function closingOf(start: Date): Date {
  return new Date(start.getTime() + PURPLE.OPEN_MS)
}

/** 這一場在「最近紫洞時間」顯示到何時：結束 + 12 小時 */
export function displayedUntil(start: Date): Date {
  return new Date(closingOf(start).getTime() + PURPLE.ENDED_HOLD_MS)
}

/**
 * 由校正的開啟時間推算畫面上的「最近紫洞時間」與「下一次預計」。
 * 最近 = anchor 往後推、結束未滿 12 小時的第一場（可能尚未開始、開放中或剛結束）；下一次 = 最近 + 36 小時 15 分。
 */
export function spawnsAround(anchor: Date, now: Date): { recent: Date; next: Date } {
  // 已「過期」（結束超過 12 小時）的場次數
  const passed = now.getTime() - displayedUntil(anchor).getTime()
  const k = passed < 0 ? 0 : Math.floor(passed / PURPLE.CYCLE_MS) + 1
  const recent = new Date(anchor.getTime() + k * PURPLE.CYCLE_MS)
  return { recent, next: new Date(recent.getTime() + PURPLE.CYCLE_MS) }
}

export type CalibrationCheck =
  | { ok: true; spawn: Date; by: string }
  | { ok: false; error: string }

/** 校正輸入驗證：日期 + 時間（台灣時間）須在現在 ±3 天內，校正人員必填 */
export function checkCalibration(date: string, time: string, by: string, now: Date): CalibrationCheck {
  const spawn = TaipeiClock.fromInputs(date, time)
  const windowMs = PURPLE.CALIBRATION_WINDOW_DAYS * TaipeiClock.DAY_MS
  if (!spawn || Math.abs(spawn.getTime() - now.getTime()) > windowMs) {
    return { ok: false, error: `請選擇現在前後 ${PURPLE.CALIBRATION_WINDOW_DAYS} 天內的日期與時間` }
  }
  const name = by.trim()
  if (!name) return { ok: false, error: '請輸入校正人員' }
  if (name.length > PURPLE.CALIBRATOR_MAX_LENGTH) {
    return { ok: false, error: `校正人員最多 ${PURPLE.CALIBRATOR_MAX_LENGTH} 字` }
  }
  return { ok: true, spawn, by: name }
}

/** API 傳送格式 `YYYY-MM-DD HH:MM` ↔ 日期、時間欄位 */
export const CalibrationTime = {
  format: (date: string, time: string) => `${date} ${time}`,
  parse: (value: string): [string, string] | null => {
    const m = /^(\d{4}-\d{2}-\d{2})[ T](\d{2}:\d{2})$/.exec(value.trim())
    return m ? [m[1], m[2]] : null
  },
}
