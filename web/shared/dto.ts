/** API 的 JSON 結構（前端、Vercel Functions 與 Python 爬蟲共用約定；時間皆為 ISO 8601 字串） */

export interface SpanDto {
  start: string
  end: string
}

export interface MaintenanceDto {
  title: string
  url: string
  type: string | null
  start: string | null
  end: string | null
  original_end: string | null
  posted_at: string
  extended: boolean
}

/** 一筆校正紀錄 */
export interface CalibrationDto {
  /** 校正的紫洞開啟時間 */
  anchor: string
  /** 校正操作時間 */
  calibrated_at: string
  by: string
}

export interface StatusDto {
  now: string
  anchor: string | null
  calibrated_at: string | null
  calibrated_by: string | null
  recent: SpanDto | null
  next: SpanDto | null
  needs_calibration: boolean
  /** 最近幾次校正，新到舊 */
  calibration_history: CalibrationDto[]
  maintenance: MaintenanceDto | null
  last_crawl: string | null
  /** 最近幾次官網公告檢查時間，新到舊 */
  crawl_history: string[]
}

export interface CalibrateRequestDto {
  /** `YYYY-MM-DD HH:MM`（台灣時間） */
  time: string
  by: string
}

/** 瀏覽器推播訂閱（PushSubscription.toJSON()） */
export interface PushSubscriptionDto {
  endpoint: string
  expirationTime?: number | null
  keys: { p256dh: string; auth: string }
}

/** GET /api/push */
export interface PushConfigDto {
  /** VAPID 公鑰；未設定時為 null（推播停用） */
  public_key: string | null
}

/** 一則留言 */
export interface CommentDto {
  name: string
  content: string
  posted_at: string
}

/** POST /api/comments */
export interface CommentRequestDto {
  name: string
  content: string
}

export interface ErrorDto {
  detail?: string
}

/** 爬蟲上傳的單則維護公告（POST /api/maintenance） */
export interface MaintenancePostDto extends MaintenanceDto {
  post_id: string
}

export interface MaintenanceUploadDto {
  crawled_at: string
  posts: MaintenancePostDto[]
}
