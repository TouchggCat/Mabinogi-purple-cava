import { handle, readJson } from './_lib/http.js'
import { getService } from './_lib/service.js'

/** POST /api/calibrate { time: "YYYY-MM-DD HH:MM", by } */
export function POST(request: Request): Promise<Response> {
  return handle(async () => getService().calibrate(await readJson(request)))
}
