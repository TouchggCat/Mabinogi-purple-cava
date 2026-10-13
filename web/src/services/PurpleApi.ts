import { PurpleStatus, type CalibrateRequestDto, type ErrorDto, type PushConfigDto, type PushSubscriptionDto, type StatusDto } from '@/models'

export class ApiError extends Error {
  constructor(message: string, readonly status: number) {
    super(message)
    this.name = 'ApiError'
  }
}

/** 後端網址：分開部署時由 VITE_API_BASE 指定（例如 https://xxx.onrender.com），未設定則用同網域 */
const API_BASE = `${(import.meta.env.VITE_API_BASE ?? '').replace(/\/+$/, '')}/api`

/** 後端 REST API 用戶端 */
export class PurpleApi {
  constructor(private readonly baseUrl = API_BASE) {}

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

  async pushConfig(): Promise<PushConfigDto> {
    return this.request<PushConfigDto>('/push')
  }

  async subscribePush(sub: PushSubscriptionDto): Promise<void> {
    await this.send('POST', '/push', sub)
  }

  async unsubscribePush(endpoint: string): Promise<void> {
    await this.send('DELETE', '/push', { endpoint })
  }

  private send<T>(method: string, path: string, body: unknown): Promise<T> {
    return this.request<T>(path, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
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
