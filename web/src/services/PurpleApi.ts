import { PurpleStatus, type CalibrateRequestDto, type ErrorDto, type StatusDto } from '@/models'

export class ApiError extends Error {
  constructor(message: string, readonly status: number) {
    super(message)
    this.name = 'ApiError'
  }
}

/** 後端 REST API 用戶端 */
export class PurpleApi {
  constructor(private readonly baseUrl = '/api') {}

  async getStatus(): Promise<PurpleStatus> {
    return PurpleStatus.fromDto(await this.request<StatusDto>('/status'))
  }

  async calibrate(body: CalibrateRequestDto): Promise<PurpleStatus> {
    return PurpleStatus.fromDto(await this.request<StatusDto>('/calibrate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }))
  }

  private async request<T>(path: string, init?: RequestInit): Promise<T> {
    const res = await fetch(`${this.baseUrl}${path}`, init)
    if (!res.ok) {
      const err = (await res.json().catch(() => ({}))) as ErrorDto
      throw new ApiError(err.detail ?? `HTTP ${res.status}`, res.status)
    }
    return (await res.json()) as T
  }
}

export const purpleApi = new PurpleApi()
