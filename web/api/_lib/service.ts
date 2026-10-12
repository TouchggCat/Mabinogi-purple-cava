import type { CalibrationDto, MaintenanceDto, MaintenancePostDto, StatusDto } from '../../shared/dto.js'
import { CalibrationTime, PURPLE, checkCalibration, closingOf, spawnsAround } from '../../shared/rules.js'
import { HttpError } from './http.js'
import { createStore, type Calibration, type PurpleStore } from './store.js'

/** 保留的維護公告數量（依時間新到舊） */
const MAINTENANCE_KEEP = 20
/** 保留的官網公告檢查紀錄筆數 */
const CRAWL_HISTORY_KEEP = 3
/** 保留的校正紀錄筆數 */
const CALIBRATION_HISTORY_KEEP = 5

const isObject = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null
const isStr = (v: unknown): v is string => typeof v === 'string'
const isOptStr = (v: unknown): v is string | null => v === null || isStr(v)
const isIso = (v: unknown): v is string => isStr(v) && !Number.isNaN(Date.parse(v))
const isOptIso = (v: unknown) => v === null || isIso(v)

/** 維護發生時間：有解析出開始時間就用它，否則用公告時間 */
const occurredAt = (m: MaintenanceDto) => Date.parse(m.start ?? m.posted_at)

function isMaintenancePost(v: unknown): v is MaintenancePostDto {
  return isObject(v) && isStr(v.post_id) && isStr(v.title) && isStr(v.url) && isOptStr(v.type)
    && isIso(v.posted_at) && isOptIso(v.start) && isOptIso(v.end) && isOptIso(v.original_end)
    && typeof v.extended === 'boolean'
}

function toMaintenanceDto(m: MaintenancePostDto): MaintenanceDto {
  const { title, url, type, start, end, original_end, posted_at, extended } = m
  return { title, url, type, start, end, original_end, posted_at, extended }
}

const toCalibrationDto = (c: Calibration): CalibrationDto => ({ anchor: c.anchor, calibrated_at: c.calibratedAt, by: c.by })

const span = (start: Date) => ({ start: start.toISOString(), end: closingOf(start).toISOString() })

/** API 的業務邏輯；儲存、時鐘、密鑰皆可注入以便測試 */
export class PurpleService {
  constructor(
    private readonly store: PurpleStore,
    private readonly crawlToken: string | undefined,
    private readonly clock: () => Date = () => new Date(),
  ) {}

  async status(): Promise<StatusDto> {
    const now = this.clock()
    const { calibrations, maintenance, crawls } = await this.store.snapshot()
    const calibration = calibrations[0]
    const latest = [...maintenance].sort((a, b) => occurredAt(b) - occurredAt(a))[0] ?? null

    let recent = null
    let next = null
    let needsCalibration = true
    if (calibration) {
      const s = spawnsAround(new Date(calibration.anchor), now)
      recent = span(s.recent)
      next = span(s.next)
      // 校正之後才開始的維護 → 計時已被打亂，需要重新校正
      const mAt = latest ? occurredAt(latest) : NaN
      needsCalibration = mAt <= now.getTime() && Date.parse(calibration.calibratedAt) < mAt
    }

    return {
      now: now.toISOString(),
      anchor: calibration?.anchor ?? null,
      calibrated_at: calibration?.calibratedAt ?? null,
      calibrated_by: calibration?.by ?? null,
      recent,
      next,
      needs_calibration: needsCalibration,
      calibration_history: calibrations.map(toCalibrationDto),
      maintenance: latest && toMaintenanceDto(latest),
      last_crawl: crawls[0] ?? null,
      crawl_history: crawls,
    }
  }

  async calibrate(body: unknown): Promise<StatusDto> {
    const now = this.clock()
    const parts = isObject(body) && isStr(body.time) ? CalibrationTime.parse(body.time) : null
    const by = isObject(body) && isStr(body.by) ? body.by : ''
    if (!parts) throw new HttpError(400, '時間格式錯誤')
    const check = checkCalibration(parts[0], parts[1], by, now)
    if (!check.ok) throw new HttpError(400, check.error)
    if (!(await this.store.tryLockCalibration(now, PURPLE.CALIBRATION_COOLDOWN_MS))) {
      throw new HttpError(429, '更新時間過於密集，請稍後再試')
    }
    const { calibrations } = await this.store.snapshot()
    const latest = { anchor: check.spawn.toISOString(), calibratedAt: now.toISOString(), by: check.by }
    await this.store.saveCalibrations([latest, ...calibrations].slice(0, CALIBRATION_HISTORY_KEEP))
    return this.status()
  }

  /** 爬蟲上傳：與既有公告依 post_id 合併，保留最新 MAINTENANCE_KEEP 則；檢查時間保留最近 CRAWL_HISTORY_KEEP 次 */
  async ingestMaintenance(body: unknown, authorization: string | null): Promise<{ ok: true; stored: number }> {
    if (!this.crawlToken) throw new HttpError(503, '伺服器未設定 CRAWL_TOKEN')
    if (authorization !== `Bearer ${this.crawlToken}`) throw new HttpError(401, '未授權')
    if (!isObject(body) || !isIso(body.crawled_at) || !Array.isArray(body.posts) || !body.posts.every(isMaintenancePost)) {
      throw new HttpError(400, '維護資料格式錯誤')
    }

    const { maintenance, crawls } = await this.store.snapshot()
    const byId = new Map(maintenance.map((m) => [m.post_id, m]))
    for (const p of body.posts) byId.set(p.post_id, p)
    const merged = [...byId.values()].sort((a, b) => occurredAt(b) - occurredAt(a)).slice(0, MAINTENANCE_KEEP)
    await this.store.saveMaintenance(merged, [body.crawled_at, ...crawls].slice(0, CRAWL_HISTORY_KEEP))
    return { ok: true, stored: merged.length }
  }
}

let shared: PurpleService | null = null

/** Functions 共用的單例（同一個執行個體內重複使用） */
export function getService(): PurpleService {
  shared ??= new PurpleService(createStore(), process.env.CRAWL_TOKEN)
  return shared
}
