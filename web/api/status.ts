import { handle } from './_lib/http.js'
import { getService } from './_lib/service.js'

/** GET /api/status：目前紫洞時間、校正資訊、最近一次維護 */
export function GET(): Promise<Response> {
  return handle(() => getService().status())
}
