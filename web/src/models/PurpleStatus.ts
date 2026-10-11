import type { StatusDto } from '@shared/dto'
import { displayedUntil } from '@shared/rules'
import { Maintenance } from './Maintenance'
import { SpawnSpan } from './SpawnSpan'

/** 目前紫洞狀態（/api/status 的領域物件） */
export class PurpleStatus {
  private constructor(
    readonly recent: SpawnSpan | null,
    readonly next: SpawnSpan | null,
    readonly calibratedAt: Date | null,
    readonly calibratedBy: string | null,
    readonly needsCalibration: boolean,
    readonly maintenance: Maintenance | null,
    readonly lastCrawl: Date | null,
  ) {}

  static fromDto(dto: StatusDto): PurpleStatus {
    return new PurpleStatus(
      dto.recent && SpawnSpan.fromDto(dto.recent),
      dto.next && SpawnSpan.fromDto(dto.next),
      dto.calibrated_at ? new Date(dto.calibrated_at) : null,
      dto.calibrated_by,
      dto.needs_calibration,
      dto.maintenance && Maintenance.fromDto(dto.maintenance),
      dto.last_crawl ? new Date(dto.last_crawl) : null,
    )
  }

  get isCalibrated(): boolean {
    return this.recent !== null && this.next !== null
  }

  /** 已校正過，但之後發生維護 → 計時可能被打亂 */
  get isDisruptedByMaintenance(): boolean {
    return this.isCalibrated && this.needsCalibration
  }

  /** 本地時鐘已跨過輪換時間（最近那場結束 + 12 小時）→ 需要重新取得 */
  isOutdated(now: Date): boolean {
    return this.recent !== null && now >= displayedUntil(this.recent.start)
  }
}
