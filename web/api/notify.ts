import { handle } from './_lib/http.js'
import { getPushService } from './_lib/push.js'

/** 外部排程（cron-job.org）每 5 分鐘呼叫；到點就發送紫洞提醒。Authorization: Bearer NOTIFY_TOKEN */
function notify(request: Request): Promise<Response> {
  return handle(() => getPushService().notify(request.headers.get('authorization')))
}

export { notify as GET, notify as POST }
