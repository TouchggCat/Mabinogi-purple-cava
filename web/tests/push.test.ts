import { beforeEach, describe, expect, it } from 'vitest'
import { PushService, vapidFromEnv, type PushMessage, type PushSender } from '../api/_lib/push.js'
import { PurpleService } from '../api/_lib/service.js'
import { MemoryStore } from '../api/_lib/store.js'
import type { PushSubscriptionDto } from '../shared/dto.js'

const tw = (s: string) => new Date(`${s}+08:00`)
const AUTH = 'Bearer notify'
const sub = (id: string): PushSubscriptionDto => ({ endpoint: `https://push.example/${id}`, keys: { p256dh: 'p', auth: 'a' } })

class FakeSender implements PushSender {
  sent: { endpoint: string; message: PushMessage; ttl: number }[] = []
  gone = new Set<string>()
  async send(s: PushSubscriptionDto, message: PushMessage, ttl: number) {
    if (this.gone.has(s.endpoint)) return 'gone' as const
    this.sent.push({ endpoint: s.endpoint, message, ttl })
    return 'ok' as const
  }
}

describe('PushService', () => {
  let clock: Date
  let store: MemoryStore
  let sender: FakeSender
  let push: PushService

  beforeEach(async () => {
    clock = tw('2026-10-13T10:00:00')
    store = new MemoryStore()
    sender = new FakeSender()
    const purple = new PurpleService(store, 'crawl', () => clock)
    push = new PushService(store, purple, sender, 'PUBLIC', 'notify', () => clock)
    await purple.calibrate({ time: '2026-10-13 16:36', by: 'a' }) // 16:36 開啟
    await push.subscribe(sub('1'))
  })

  const at = async (time: string) => {
    clock = tw(`2026-10-13T${time}`)
    return push.notify(AUTH)
  }

  it('sends at 4, 3, 2, 1 hours and 30, 15 minutes before, once each', async () => {
    expect((await at('12:35:00')).reminder).toBeNull()
    expect((await at('12:36:00')).reminder).toBe(240)
    expect((await at('12:41:00')).reminder).toBeNull() // 同一個提醒不重發
    expect((await at('13:40:00')).reminder).toBe(180)
    expect((await at('14:36:00')).reminder).toBe(120)
    expect((await at('15:36:00')).reminder).toBe(60)
    expect((await at('16:06:00')).reminder).toBe(30)
    expect((await at('16:20:00')).reminder).toBeNull()
    expect((await at('16:21:00')).reminder).toBe(15)
    expect((await at('16:30:00')).reminder).toBeNull()
    expect(sender.sent.map((s) => s.message.title)).toEqual([
      '紫洞再 4 小時開啟', '紫洞再 3 小時開啟', '紫洞再 2 小時開啟', '紫洞再 1 小時開啟', '紫洞再 30 分鐘開啟', '紫洞再 15 分鐘開啟',
    ])
    expect(sender.sent.map((s) => s.ttl)).toEqual([1200, 1200, 1200, 1200, 1200, 900])
    expect(sender.sent[0].message.body).toBe('10/13  16:36 – 16:51')
  })

  it('skips reminders missed by more than 20 minutes', async () => {
    expect((await at('12:56:00')).reminder).toBeNull()
    expect((await at('13:36:00')).reminder).toBe(180)
  })

  it('removes expired subscriptions', async () => {
    await push.subscribe(sub('2'))
    sender.gone.add(sub('2').endpoint)
    expect(await at('12:36:00')).toMatchObject({ delivered: 1, removed: 1 })
    expect((await store.pushSubscriptions()).map((s) => s.endpoint)).toEqual([sub('1').endpoint])
  })

  it('validates subscriptions and the cron token', async () => {
    await expect(push.subscribe({ endpoint: 'http://x', keys: { p256dh: 'p', auth: 'a' } })).rejects.toMatchObject({ status: 400 })
    await expect(push.notify('Bearer wrong')).rejects.toMatchObject({ status: 401 })
    await push.unsubscribe({ endpoint: sub('1').endpoint })
    expect(await store.pushSubscriptions()).toEqual([])
  })

  it('reads VAPID keys from env', () => {
    expect(vapidFromEnv({})).toBeNull()
    expect(vapidFromEnv({ VAPID_PUBLIC_KEY: 'p', VAPID_PRIVATE_KEY: 'k', VERCEL_PROJECT_PRODUCTION_URL: 'a.vercel.app' }))
      .toEqual({ publicKey: 'p', privateKey: 'k', subject: 'https://a.vercel.app' })
  })
})
