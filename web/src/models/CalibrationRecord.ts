import type { CalibrationDto } from '@shared/dto'

/** 一筆校正紀錄 */
export class CalibrationRecord {
  private constructor(
    /** 校正的紫洞開啟時間 */
    readonly anchor: Date,
    /** 校正操作時間 */
    readonly calibratedAt: Date,
    readonly by: string,
  ) {}

  static fromDto(dto: CalibrationDto): CalibrationRecord {
    return new CalibrationRecord(new Date(dto.anchor), new Date(dto.calibrated_at), dto.by)
  }
}
