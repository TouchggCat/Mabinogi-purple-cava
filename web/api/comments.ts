import { commenterId, getCommentService } from './_lib/comments.js'
import { handle, readJson } from './_lib/http.js'

/** GET /api/comments：最近 30 則留言（新到舊） */
export function GET(): Promise<Response> {
  return handle(() => getCommentService().list())
}

/** POST /api/comments { name, content } → 新增後的留言列表 */
export function POST(request: Request): Promise<Response> {
  return handle(async () => getCommentService().post(await readJson(request), commenterId(request)))
}
