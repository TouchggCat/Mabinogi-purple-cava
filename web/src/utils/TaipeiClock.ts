export type DateLike = Date | string | number

const FIELDS = ['year', 'month', 'day', 'hour', 'minute'] as const
type Parts = Record<(typeof FIELDS)[number], string>

/** 所有時間一律以台灣時間 (UTC+8) 顯示與換算，不受瀏覽器時區影響。 */
export class TaipeiClock {
  static readonly TIME_ZONE = 'Asia/Taipei'
  static readonly OFFSET = '+08:00'
  static readonly DAY_MS = 86_400_000

  private static readonly formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: TaipeiClock.TIME_ZONE,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  })

  private static parts(value: DateLike): Parts {
    const all = Object.fromEntries(
      this.formatter.formatToParts(new Date(value)).map((p) => [p.type, p.value]),
    )
    return Object.fromEntries(FIELDS.map((f) => [f, all[f]])) as Parts
  }

  /** `10/07` */
  static monthDay(value: DateLike): string {
    const p = this.parts(value)
    return `${p.month}/${p.day}`
  }

  /** `14:40` */
  static hourMinute(value: DateLike): string {
    const p = this.parts(value)
    return `${p.hour}:${p.minute}`
  }

  /** `10/07 14:40` */
  static monthDayTime(value: DateLike): string {
    return `${this.monthDay(value)} ${this.hourMinute(value)}`
  }

  /** `<input type="date">` 用的 `YYYY-MM-DD` */
  static dateInput(value: DateLike = new Date()): string {
    const p = this.parts(value)
    return `${p.year}-${p.month}-${p.day}`
  }

  /** `<input type="time">` 用的 `HH:MM` */
  static timeInput(value: DateLike = new Date()): string {
    return this.hourMinute(value)
  }

  /** 由 `YYYY-MM-DD` + `HH:MM`（台灣時間）建立 Date；格式錯誤回傳 null */
  static fromInputs(date: string, time: string): Date | null {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^\d{2}:\d{2}$/.test(time)) return null
    const d = new Date(`${date}T${time}:00${this.OFFSET}`)
    // 拒絕 02-30 這類會被自動進位的日期
    return Number.isNaN(d.getTime()) || this.dateInput(d) !== date ? null : d
  }

  static addDays(value: DateLike, days: number): Date {
    return new Date(new Date(value).getTime() + days * this.DAY_MS)
  }
}
