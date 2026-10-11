import { PURPLE } from '@/config'
import { TaipeiClock } from '@/utils'
import type { CalibrateRequestDto } from './dto'
import { SpawnSpan } from './SpawnSpan'

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

/**
 * 校正表單的輸入值與驗證規則（與後端相同）：
 * 日期 + 時間須在現在 ±3 天內；未來時間也接受，視為最近一場。
 */
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
    const spawn = TaipeiClock.fromInputs(this.date, this.time)
    const windowMs = PURPLE.CALIBRATION_WINDOW_DAYS * TaipeiClock.DAY_MS
    if (!spawn || Math.abs(spawn.getTime() - now.getTime()) > windowMs) {
      return { ok: false, error: `請選擇現在前後 ${PURPLE.CALIBRATION_WINDOW_DAYS} 天內的日期與時間` }
    }
    if (!this.calibrator) return { ok: false, error: '請輸入校正人員' }
    if (this.calibrator.length > PURPLE.CALIBRATOR_MAX_LENGTH) {
      return { ok: false, error: `校正人員最多 ${PURPLE.CALIBRATOR_MAX_LENGTH} 字` }
    }

    let next = SpawnSpan.openingAt(spawn).following()
    while (next.hasStarted(now)) next = next.following()
    return { ok: true, preview: { spawn, next: next.start, by: this.calibrator } }
  }

  toRequest(): CalibrateRequestDto {
    return { time: `${this.date} ${this.time}`, by: this.calibrator }
  }
}
