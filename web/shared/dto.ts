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

export interface StatusDto {
  now: string
  anchor: string | null
  calibrated_at: string | null
  calibrated_by: string | null
  recent: SpanDto | null
  next: SpanDto | null
  needs_calibration: boolean
  maintenance: MaintenanceDto | null
  last_crawl: string | null
}

export interface CalibrateRequestDto {
  /** `YYYY-MM-DD HH:MM`（台灣時間） */
  time: string
  by: string
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
