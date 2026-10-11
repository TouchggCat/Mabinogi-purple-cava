/** 後端 API 的原始 JSON 結構（時間皆為 ISO 8601 字串） */

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
  text: string | null
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
