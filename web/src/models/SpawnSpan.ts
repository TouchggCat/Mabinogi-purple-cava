import { PURPLE } from '@/config'
import type { SpanDto } from './dto'

/** 一場紫洞：開啟到關閉 */
export class SpawnSpan {
  constructor(readonly start: Date, readonly end: Date) {}

  static fromDto(dto: SpanDto): SpawnSpan {
    return new SpawnSpan(new Date(dto.start), new Date(dto.end))
  }

  static openingAt(start: Date): SpawnSpan {
    return new SpawnSpan(start, new Date(start.getTime() + PURPLE.OPEN_MS))
  }

  /** 下一場 */
  following(): SpawnSpan {
    return SpawnSpan.openingAt(new Date(this.start.getTime() + PURPLE.CYCLE_MS))
  }

  hasStarted(now: Date): boolean {
    return now >= this.start
  }

  isOpen(now: Date): boolean {
    return this.hasStarted(now) && now < this.end
  }
}
