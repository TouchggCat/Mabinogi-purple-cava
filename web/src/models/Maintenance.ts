import { TaipeiClock } from '@/utils'
import type { MaintenanceDto } from '@shared/dto'

const optionalDate = (v: string | null) => (v ? new Date(v) : null)

/** 官網公告解析出的維護資訊 */
export class Maintenance {
  constructor(
    readonly title: string,
    readonly url: string,
    readonly start: Date | null,
    readonly end: Date | null,
    readonly originalEnd: Date | null,
    readonly extended: boolean,
    readonly postedAt: Date,
  ) {}

  static fromDto(dto: MaintenanceDto): Maintenance {
    return new Maintenance(
      dto.title, dto.url,
      optionalDate(dto.start), optionalDate(dto.end), optionalDate(dto.original_end),
      dto.extended, new Date(dto.posted_at),
    )
  }

  /** 維護尚未開始（官網已公告未來的維護） */
  isUpcoming(now: Date): boolean {
    return !!this.start && this.start.getTime() > now.getTime()
  }

  /** 維護時間（無法解析時用公告時間）在最近 days 天內，或尚未到來 */
  isRecent(now: Date, days: number): boolean {
    const at = this.start ?? this.postedAt
    return at.getTime() >= TaipeiClock.addDays(now, -days).getTime()
  }

  /** `10/07 06:00 ~ 10/07 08:40` */
  get periodText(): string {
    if (!this.start) return '時間無法解析'
    const end = this.end ? TaipeiClock.monthDayTime(this.end) : '?'
    return `${TaipeiClock.monthDayTime(this.start)} ~ ${end}`
  }
}
