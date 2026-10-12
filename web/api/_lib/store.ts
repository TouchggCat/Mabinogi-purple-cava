import type { MaintenancePostDto } from '../../shared/dto.js'

export interface Calibration {
  /** 校正的紫洞開啟時間 (ISO) */
  anchor: string
  /** 校正操作時間 (ISO) */
  calibratedAt: string
  by: string
}

export interface Snapshot {
  /** 校正紀錄，新到舊；第一筆為目前使用的校正 */
  calibrations: Calibration[]
  maintenance: MaintenancePostDto[]
  /** 官網公告檢查時間 (ISO)，新到舊 */
  crawls: string[]
}

/** 資料存取介面：正式環境用 Upstash Redis，本機開發與測試用記憶體 */
export interface PurpleStore {
  snapshot(): Promise<Snapshot>
  saveCalibrations(calibrations: Calibration[]): Promise<void>
  /** 取得校正冷卻鎖；冷卻中（上次取得後未滿 ms）回傳 false */
  tryLockCalibration(now: Date, ms: number): Promise<boolean>
  saveMaintenance(posts: MaintenancePostDto[], crawls: string[]): Promise<void>
}

const KEYS = {
  calibrations: 'purple:calibrations',
  /** 舊版只存一筆校正；尚未有 calibrations 時沿用 */
  calibration: 'purple:calibration',
  maintenance: 'purple:maintenance',
  crawls: 'purple:crawls',
  /** 舊版只存最後一次檢查時間；尚未有 crawls 時沿用 */
  lastCrawl: 'purple:last_crawl',
  calibrationLock: 'purple:calibration_lock',
} as const

const parse = <T>(raw: string | null): T | null => (raw ? (JSON.parse(raw) as T) : null)

export class MemoryStore implements PurpleStore {
  private data: Snapshot = { calibrations: [], maintenance: [], crawls: [] }

  async snapshot(): Promise<Snapshot> {
    return structuredClone(this.data)
  }

  async saveCalibrations(calibrations: Calibration[]): Promise<void> {
    this.data.calibrations = structuredClone(calibrations)
  }

  private calibrationLockedUntil = 0

  async tryLockCalibration(now: Date, ms: number): Promise<boolean> {
    if (now.getTime() < this.calibrationLockedUntil) return false
    this.calibrationLockedUntil = now.getTime() + ms
    return true
  }

  async saveMaintenance(posts: MaintenancePostDto[], crawls: string[]): Promise<void> {
    this.data.maintenance = structuredClone(posts)
    this.data.crawls = [...crawls]
  }
}

/** Upstash Redis REST API（不需額外套件）；每次讀取只用一個 MGET 指令 */
export class RedisStore implements PurpleStore {
  constructor(private readonly url: string, private readonly token: string) {}

  private async command<T>(...args: string[]): Promise<T> {
    const res = await fetch(this.url, {
      method: 'POST',
      headers: { Authorization: `Bearer ${this.token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(args),
    })
    const body = (await res.json()) as { result?: T; error?: string }
    if (!res.ok || body.error) throw new Error(`Redis 錯誤：${body.error ?? res.status}`)
    return body.result as T
  }

  async snapshot(): Promise<Snapshot> {
    const [cals, cal, maint, crawls, last] = await this.command<(string | null)[]>(
      'MGET', KEYS.calibrations, KEYS.calibration, KEYS.maintenance, KEYS.crawls, KEYS.lastCrawl,
    )
    const legacy = parse<Calibration>(cal)
    return {
      calibrations: parse<Calibration[]>(cals) ?? (legacy ? [legacy] : []),
      maintenance: parse<MaintenancePostDto[]>(maint) ?? [],
      crawls: parse<string[]>(crawls) ?? (last ? [last] : []),
    }
  }

  async saveCalibrations(calibrations: Calibration[]): Promise<void> {
    await this.command('SET', KEYS.calibrations, JSON.stringify(calibrations))
  }

  /** SET NX PX：同時送出的請求也只有一個能拿到鎖，到期由 Redis 自動刪除 */
  async tryLockCalibration(now: Date, ms: number): Promise<boolean> {
    return (await this.command<string | null>('SET', KEYS.calibrationLock, now.toISOString(), 'NX', 'PX', String(ms))) === 'OK'
  }

  async saveMaintenance(posts: MaintenancePostDto[], crawls: string[]): Promise<void> {
    await this.command('MSET', KEYS.maintenance, JSON.stringify(posts), KEYS.crawls, JSON.stringify(crawls))
  }
}

/**
 * 依環境變數選擇儲存：Vercel 接上 Upstash 後會有 KV_REST_API_URL/TOKEN（或 UPSTASH_REDIS_REST_URL/TOKEN）。
 * 都沒有時用記憶體（僅限本機開發，重啟即清空）。
 */
export function createStore(env: Record<string, string | undefined> = process.env): PurpleStore {
  const url = env.KV_REST_API_URL ?? env.UPSTASH_REDIS_REST_URL
  const token = env.KV_REST_API_TOKEN ?? env.UPSTASH_REDIS_REST_TOKEN
  if (url && token) return new RedisStore(url, token)
  if (env.VERCEL) throw new Error('未設定 Upstash Redis（KV_REST_API_URL / KV_REST_API_TOKEN）')
  return new MemoryStore()
}
