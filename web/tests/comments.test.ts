import { beforeEach, describe, expect, it } from 'vitest'
import { CommentService, commenterId } from '../api/_lib/comments.js'
import { MemoryStore } from '../api/_lib/store.js'

const tw = (s: string) => new Date(`${s}+08:00`)

describe('CommentService', () => {
  let clock: Date
  let comments: CommentService
  const at = (time: string) => { clock = tw(`2026-10-14T${time}`) }

  beforeEach(() => {
    at('10:00:00')
    comments = new CommentService(new MemoryStore(), () => clock)
  })

  it('posts and lists newest first', async () => {
    await comments.post({ name: ' 阿紫 ', content: ' 嗨 ' }, 'a')
    at('10:01:00')
    const list = await comments.post({ name: 'b', content: '你好' }, 'b')
    expect(list.map((c) => c.name)).toEqual(['b', '阿紫'])
    expect(await comments.list()).toEqual(list)
    expect(list[1]).toEqual({ name: '阿紫', content: '嗨', posted_at: tw('2026-10-14T10:00:00').toISOString() })
  })

  it.each([
    [{ name: '', content: 'x' }, '請輸入名稱'],
    [{ name: 'a', content: '  ' }, '請輸入內容'],
    [{ name: 'a'.repeat(21), content: 'x' }, '名稱最多 20 字'],
    [{ name: 'a', content: 'x'.repeat(101) }, '內容最多 100 字'],
    [null, '請輸入名稱'],
  ])('rejects %j', async (body, detail) => {
    await expect(comments.post(body, 'a')).rejects.toMatchObject({ status: 400, message: detail })
  })

  it('allows one comment per user every 5 minutes', async () => {
    await comments.post({ name: 'a', content: '1' }, 'a')
    at('10:04:59')
    await expect(comments.post({ name: 'a', content: '2' }, 'a')).rejects.toMatchObject({ status: 429 })
    await comments.post({ name: 'b', content: '2' }, 'b')
    at('10:05:00')
    await comments.post({ name: 'a', content: '3' }, 'a')
  })

  it('accepts at most 10 comments per hour site-wide and keeps 30', async () => {
    for (let i = 0; i < 10; i++) await comments.post({ name: 'u', content: `${i}` }, `u${i}`)
    await expect(comments.post({ name: 'u', content: 'x' }, 'x')).rejects.toMatchObject({ status: 429, message: '本站留言已達每小時上限，請稍後再試' })
    at('11:00:00')
    await comments.post({ name: 'u', content: 'x' }, 'x')

    for (let h = 12; h < 15; h++) {
      at(`${h}:00:00`)
      for (let i = 0; i < 10; i++) await comments.post({ name: 'u', content: `${h}-${i}` }, `${h}-${i}`)
    }
    const list = await comments.list()
    expect(list).toHaveLength(30)
    expect(list[29].content).toBe('12-0')
  })

  it('identifies users by hashed IP', () => {
    const req = (ip: string) => new Request('https://x', { headers: { 'x-forwarded-for': ip } })
    expect(commenterId(req('1.2.3.4, 10.0.0.1'))).toBe(commenterId(req('1.2.3.4')))
    expect(commenterId(req('1.2.3.4'))).not.toBe(commenterId(req('5.6.7.8')))
    expect(commenterId(req('1.2.3.4'))).not.toContain('1.2.3.4')
  })
})
