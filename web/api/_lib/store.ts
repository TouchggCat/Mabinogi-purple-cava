import type { CommentDto, MaintenancePostDto, PushSubscriptionDto } from '../../shared/dto.js'

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

/** 推播發送紀錄：某一場紫洞已發過哪些提醒（開啟前幾分鐘） */
export interface PushLog {
  spawn: string
  sent: number[]
}

/** 資料存取介面：正式環境用 Upstash Redis，本機開發與測試用記憶體 */
export interface PurpleStore {
  snapshot(): Promise<Snapshot>
  saveCalibrations(calibrations: Calibration[]): Promise<void>
  /** 取得校正冷卻鎖；冷卻中（上次取得後未滿 ms）回傳 false */
  tryLockCalibration(now: Date, ms: number): Promise<boolean>
  saveMaintenance(posts: MaintenancePostDto[], crawls: string[]): Promise<void>
  /** 新增或更新推播訂閱；已達上限且為新訂閱時回傳 false */
  addPushSubscription(sub: PushSubscriptionDto, max: number): Promise<boolean>
  removePushSubscriptions(endpoints: string[]): Promise<void>
  pushSubscriptions(): Promise<PushSubscriptionDto[]>
  pushLog(): Promise<PushLog | null>
  savePushLog(log: PushLog): Promise<void>
  /** 留言，新到舊 */
  comments(): Promise<CommentDto[]>
  /** 新增留言，只保留最新 keep 則 */
  addComment(comment: CommentDto, keep: number): Promise<void>
  /** 取得某位留言者的冷卻鎖；冷卻中回傳 false */
  tryLockCommenter(id: string, now: Date, ms: number): Promise<boolean>
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
  /** Hash：endpoint → 訂閱 JSON */
  pushSubscriptions: 'purple:push_subscriptions',
  pushLog: 'purple:push_log',
  /** List：留言 JSON，新到舊 */
  comments: 'purple:comments',
  /** 後接留言者代號（IP 雜湊） */
  commentLock: 'purple:comment_lock:',
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

  private subs = new Map<string, PushSubscriptionDto>()
  private log: PushLog | null = null

  async addPushSubscription(sub: PushSubscriptionDto, max: number): Promise<boolean> {
    if (!this.subs.has(sub.endpoint) && this.subs.size >= max) return false
    this.subs.set(sub.endpoint, structuredClone(sub))
    return true
  }

  async removePushSubscriptions(endpoints: string[]): Promise<void> {
    for (const e of endpoints) this.subs.delete(e)
  }

  async pushSubscriptions(): Promise<PushSubscriptionDto[]> {
    return structuredClone([...this.subs.values()])
  }

  async pushLog(): Promise<PushLog | null> {
    return structuredClone(this.log)
  }

  async savePushLog(log: PushLog): Promise<void> {
    this.log = structuredClone(log)
  }

  private commentList: CommentDto[] = []
  private commenterLockedUntil = new Map<string, number>()

  async comments(): Promise<CommentDto[]> {
    return structuredClone(this.commentList)
  }

  async addComment(comment: CommentDto, keep: number): Promise<void> {
    this.commentList = [structuredClone(comment), ...this.commentList].slice(0, keep)
  }

  async tryLockCommenter(id: string, now: Date, ms: number): Promise<boolean> {
    if (now.getTime() < (this.commenterLockedUntil.get(id) ?? 0)) return false
    this.commenterLockedUntil.set(id, now.getTime() + ms)
    return true
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

  async addPushSubscription(sub: PushSubscriptionDto, max: number): Promise<boolean> {
    const exists = await this.command<number>('HEXISTS', KEYS.pushSubscriptions, sub.endpoint)
    if (!exists && (await this.command<number>('HLEN', KEYS.pushSubscriptions)) >= max) return false
    await this.command('HSET', KEYS.pushSubscriptions, sub.endpoint, JSON.stringify(sub))
    return true
  }

  async removePushSubscriptions(endpoints: string[]): Promise<void> {
    if (endpoints.length) await this.command('HDEL', KEYS.pushSubscriptions, ...endpoints)
  }

  async pushSubscriptions(): Promise<PushSubscriptionDto[]> {
    // HGETALL 回傳 [field, value, field, value, ...]
    const flat = await this.command<string[]>('HGETALL', KEYS.pushSubscriptions)
    return flat.filter((_, i) => i % 2 === 1).map((v) => JSON.parse(v) as PushSubscriptionDto)
  }

  async pushLog(): Promise<PushLog | null> {
    return parse<PushLog>(await this.command<string | null>('GET', KEYS.pushLog))
  }

  async savePushLog(log: PushLog): Promise<void> {
    await this.command('SET', KEYS.pushLog, JSON.stringify(log))
  }

  async comments(): Promise<CommentDto[]> {
    return (await this.command<string[]>('LRANGE', KEYS.comments, '0', '-1')).map((v) => JSON.parse(v) as CommentDto)
  }

  async addComment(comment: CommentDto, keep: number): Promise<void> {
    await this.command('LPUSH', KEYS.comments, JSON.stringify(comment))
    await this.command('LTRIM', KEYS.comments, '0', String(keep - 1))
  }

  async tryLockCommenter(id: string, now: Date, ms: number): Promise<boolean> {
    return (await this.command<string | null>('SET', KEYS.commentLock + id, now.toISOString(), 'NX', 'PX', String(ms))) === 'OK'
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

let shared: PurpleStore | null = null

/** Functions 共用的儲存（本機開發時各 API 才會看到同一份記憶體資料） */
export function getStore(): PurpleStore {
  shared ??= createStore()
  return shared
}
