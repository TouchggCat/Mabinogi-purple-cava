import { handle, readJson } from './_lib/http.js'
import { getService } from './_lib/service.js'

/** POST /api/maintenance（GitHub Actions 爬蟲上傳；Authorization: Bearer CRAWL_TOKEN） */
export function POST(request: Request): Promise<Response> {
  return handle(async () => getService().ingestMaintenance(await readJson(request), request.headers.get('authorization')))
}
