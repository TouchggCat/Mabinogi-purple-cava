export class HttpError extends Error {
  constructor(readonly status: number, message: string) {
    super(message)
    this.name = 'HttpError'
  }
}

export function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' },
  })
}

export async function readJson(request: Request): Promise<unknown> {
  try {
    return await request.json()
  } catch {
    throw new HttpError(400, 'JSON 格式錯誤')
  }
}

/** 統一錯誤處理：HttpError → 對應狀態碼與 { detail }，其他 → 500 */
export async function handle(fn: () => Promise<unknown>): Promise<Response> {
  try {
    return json(await fn())
  } catch (err) {
    if (err instanceof HttpError) return json({ detail: err.message }, err.status)
    console.error(err)
    return json({ detail: '伺服器錯誤' }, 500)
  }
}
