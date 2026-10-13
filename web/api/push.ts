import { handle, readJson } from './_lib/http.js'
import { getPushService } from './_lib/push.js'

/** GET /api/push：VAPID 公鑰（null = 推播未啟用） */
export function GET(): Promise<Response> {
  return handle(async () => getPushService().config())
}

/** POST /api/push：訂閱推播（body 為 PushSubscription.toJSON()） */
export function POST(request: Request): Promise<Response> {
  return handle(async () => getPushService().subscribe(await readJson(request)))
}

/** DELETE /api/push { endpoint }：取消訂閱 */
export function DELETE(request: Request): Promise<Response> {
  return handle(async () => getPushService().unsubscribe(await readJson(request)))
}
