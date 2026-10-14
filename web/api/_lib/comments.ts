import { createHash } from 'node:crypto'
import type { CommentDto } from '../../shared/dto.js'
import { COMMENT, checkComment } from '../../shared/rules.js'
import { HttpError } from './http.js'
import { getStore, type PurpleStore } from './store.js'

const HOUR_MS = 3600_000

const isObject = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null
const str = (v: unknown) => (typeof v === 'string' ? v : '')

/** 留言者代號：IP 的雜湊（不儲存原始 IP） */
export function commenterId(request: Request): string {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || request.headers.get('x-real-ip') || 'unknown'
  return createHash('sha256').update(ip).digest('hex').slice(0, 16)
}

/** 意見留言：最近 30 則；同一使用者 5 分鐘一則、全站每小時最多 10 則 */
export class CommentService {
  constructor(
    private readonly store: PurpleStore,
    private readonly clock: () => Date = () => new Date(),
  ) {}

  list(): Promise<CommentDto[]> {
    return this.store.comments()
  }

  async post(body: unknown, commenter: string): Promise<CommentDto[]> {
    const now = this.clock()
    const check = checkComment(isObject(body) ? str(body.name) : '', isObject(body) ? str(body.content) : '')
    if (!check.ok) throw new HttpError(400, check.error)

    // 保留的則數 ≥ 每小時上限，所以從現有留言就能算出最近一小時的數量
    const comments = await this.store.comments()
    const lastHour = comments.filter((c) => now.getTime() - Date.parse(c.posted_at) < HOUR_MS).length
    if (lastHour >= COMMENT.SITE_LIMIT_PER_HOUR) throw new HttpError(429, '本站留言已達每小時上限，請稍後再試')
    if (!(await this.store.tryLockCommenter(commenter, now, COMMENT.USER_COOLDOWN_MS))) {
      throw new HttpError(429, '留言過於頻繁，每 5 分鐘只能留言一次')
    }

    const comment = { name: check.name, content: check.content, posted_at: now.toISOString() }
    await this.store.addComment(comment, COMMENT.KEEP)
    return [comment, ...comments].slice(0, COMMENT.KEEP)
  }
}

let shared: CommentService | null = null

export function getCommentService(): CommentService {
  shared ??= new CommentService(getStore())
  return shared
}
