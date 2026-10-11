import { PURPLE } from '@/config'
import { TaipeiClock } from '@/utils'
import type { CalibrateRequestDto } from '@shared/dto'
import { CalibrationTime, checkCalibration, spawnsAround } from '@shared/rules'

export interface CalibrationPreview {
  /** 將設為「最近紫洞時間」的開啟時間 */
  spawn: Date
  /** 由 spawn 往後推算、晚於現在的下一場 */
  next: Date
  by: string
}

export type CalibrationResult =
  | { ok: true; preview: CalibrationPreview }
  | { ok: false; error: string }

type Fields = Pick<CalibrationDraft, 'date' | 'time' | 'by'>

/** 校正表單的輸入值；驗證規則與 API 共用（@shared/rules） */
export class CalibrationDraft {
  constructor(readonly date: string, readonly time: string, readonly by: string) {}

  static initial(now: Date, by = ''): CalibrationDraft {
    return new CalibrationDraft(TaipeiClock.dateInput(now), TaipeiClock.timeInput(now), by)
  }

  /** 日期選擇器的 min / max */
  static dateRange(now: Date): { min: string; max: string } {
    const days = PURPLE.CALIBRATION_WINDOW_DAYS
    return {
      min: TaipeiClock.dateInput(TaipeiClock.addDays(now, -days)),
      max: TaipeiClock.dateInput(TaipeiClock.addDays(now, days)),
    }
  }

  with(patch: Partial<Fields>): CalibrationDraft {
    return new CalibrationDraft(patch.date ?? this.date, patch.time ?? this.time, patch.by ?? this.by)
  }

  get calibrator(): string {
    return this.by.trim()
  }

  validate(now: Date): CalibrationResult {
    const check = checkCalibration(this.date, this.time, this.by, now)
    if (!check.ok) return check
    const { next } = spawnsAround(check.spawn, now)
    return { ok: true, preview: { spawn: check.spawn, next, by: check.by } }
  }

  toRequest(): CalibrateRequestDto {
    return { time: CalibrationTime.format(this.date, this.time), by: this.calibrator }
  }
}
