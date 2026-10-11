import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { HttpError, handle } from '../api/_lib/http.js'
import { PurpleService } from '../api/_lib/service.js'
import { MemoryStore, RedisStore, createStore } from '../api/_lib/store.js'
import type { MaintenancePostDto } from '../shared/dto.js'
import { spawnsAround } from '../shared/rules.js'

const tw = (s: string) => new Date(`${s}+08:00`)
const TOKEN = 'secret'

const post = (id: string, start: string | null, posted = '2026-10-13T18:00:00+08:00'): MaintenancePostDto => ({
  post_id: id, title: `${id} 例行維護公告`, url: `u/${id}`, type: '例行', posted_at: posted,
  start: start && `${start}+08:00`, end: null, original_end: null, extended: false,
})

describe('PurpleService', () => {
  let clock: Date
  let service: PurpleService
  const upload = (posts: MaintenancePostDto[], auth = `Bearer ${TOKEN}`) =>
    service.ingestMaintenance({ crawled_at: clock.toISOString(), posts }, auth)

  beforeEach(() => {
    clock = tw('2026-10-07T20:00:00')
    service = new PurpleService(new MemoryStore(), TOKEN, () => clock)
  })

  it('reports not calibrated', async () => {
    const s = await service.status()
    expect(s).toMatchObject({ anchor: null, recent: null, needs_calibration: true, maintenance: null })
  })

  it('calibrates and follows the cycle (10/07 14:40 → 10/09 02:55)', async () => {
    const s = await service.calibrate({ time: '2026-10-07 14:40', by: ' 阿紫 ' })
    expect(s.recent).toEqual({ start: tw('2026-10-07T14:40:00').toISOString(), end: tw('2026-10-07T14:55:00').toISOString() })
    expect(s.next?.start).toBe(tw('2026-10-09T02:55:00').toISOString())
    expect(s).toMatchObject({ calibrated_by: '阿紫', needs_calibration: false })

    clock = tw('2026-10-09T03:00:00')
    expect((await service.status()).recent?.start).toBe(tw('2026-10-09T02:55:00').toISOString())
  })

  it.each([
    [{ time: 'abc', by: 'a' }, '時間格式錯誤'],
    [{ time: '2026-10-11 14:40', by: 'a' }, '請選擇現在前後 3 天內的日期與時間'],
    [{ time: '2026-10-07 14:40', by: '  ' }, '請輸入校正人員'],
    [null, '時間格式錯誤'],
  ])('rejects %j', async (body, detail) => {
    await expect(service.calibrate(body)).rejects.toMatchObject({ status: 400, message: detail })
  })

  it('requires recalibration after a maintenance starts', async () => {
    await service.calibrate({ time: '2026-10-07 14:40', by: 'a' })
    await upload([post('1', '2026-10-14T06:00:00')])

    clock = tw('2026-10-14T05:00:00')
    expect((await service.status()).needs_calibration).toBe(false)
    clock = tw('2026-10-14T07:00:00')
    const s = await service.status()
    expect(s.needs_calibration).toBe(true)
    expect(s.maintenance).toMatchObject({ title: '1 例行維護公告', start: '2026-10-14T06:00:00+08:00' })
    expect(s.maintenance).not.toHaveProperty('post_id')

    clock = tw('2026-10-14T10:00:00')
    expect((await service.calibrate({ time: '2026-10-14 09:30', by: 'a' })).needs_calibration).toBe(false)
  })

  it('merges uploads by post_id and shows the newest', async () => {
    await upload([post('old', '2026-09-30T06:00:00'), post('new', '2026-10-14T06:00:00')])
    expect(await upload([post('new', '2026-10-14T07:00:00'), post('noTime', null, '2026-10-01T18:00:00+08:00')]))
      .toEqual({ ok: true, stored: 3 })
    const s = await service.status()
    expect(s.maintenance?.start).toBe('2026-10-14T07:00:00+08:00')
    expect(s.last_crawl).toBe(clock.toISOString())
  })

  it('protects the upload endpoint', async () => {
    await expect(upload([], 'Bearer wrong')).rejects.toMatchObject({ status: 401 })
    await expect(upload([{ ...post('1', null), extended: 'yes' } as never])).rejects.toMatchObject({ status: 400 })
    const noToken = new PurpleService(new MemoryStore(), undefined, () => clock)
    await expect(noToken.ingestMaintenance({}, 'Bearer x')).rejects.toMatchObject({ status: 503 })
  })
})

describe('shared rules', () => {
  it('keeps an ended spawn as recent for 12 hours, then rotates', () => {
    const anchor = tw('2026-10-07T14:40:00') // 14:55 結束
    expect(spawnsAround(anchor, tw('2026-10-08T02:54:59')))
      .toEqual({ recent: anchor, next: tw('2026-10-09T02:55:00') })
    expect(spawnsAround(anchor, tw('2026-10-08T02:55:00')))
      .toEqual({ recent: tw('2026-10-09T02:55:00'), next: tw('2026-10-10T15:10:00') })
    // 多輪之後
    expect(spawnsAround(anchor, tw('2026-10-11T20:00:00')).recent).toEqual(tw('2026-10-12T03:25:00'))
  })

  it('Mon 12:00 → Wed 00:15', () => {
    expect(spawnsAround(tw('2026-10-05T12:00:00'), tw('2026-10-05T13:00:00')).next).toEqual(tw('2026-10-07T00:15:00'))
  })

  it('future anchor is the recent spawn', () => {
    expect(spawnsAround(tw('2026-10-12T08:00:00'), tw('2026-10-11T20:00:00')))
      .toEqual({ recent: tw('2026-10-12T08:00:00'), next: tw('2026-10-13T20:15:00') })
  })
})

describe('http / store', () => {
  it('maps errors to responses', async () => {
    const bad = await handle(async () => { throw new HttpError(400, '錯') })
    expect(bad.status).toBe(400)
    expect(await bad.json()).toEqual({ detail: '錯' })
    expect((await handle(async () => ({ a: 1 }))).status).toBe(200)
  })

  afterEach(() => vi.unstubAllGlobals())

  it('talks to Upstash REST with one MGET per read', async () => {
    const calls: unknown[] = []
    vi.stubGlobal('fetch', async (_url: string, init: RequestInit) => {
      calls.push(JSON.parse(init.body as string))
      return Response.json({ result: calls.length === 1 ? 'OK' : ['{"anchor":"a","calibratedAt":"b","by":"c"}', null, null] })
    })
    const store = new RedisStore('https://r', 't')
    await store.saveCalibration({ anchor: 'a', calibratedAt: 'b', by: 'c' })
    expect(await store.snapshot()).toEqual({ calibration: { anchor: 'a', calibratedAt: 'b', by: 'c' }, maintenance: [], lastCrawl: null })
    expect(calls).toEqual([
      ['SET', 'purple:calibration', '{"anchor":"a","calibratedAt":"b","by":"c"}'],
      ['MGET', 'purple:calibration', 'purple:maintenance', 'purple:last_crawl'],
    ])
  })

  it('picks the store from env', () => {
    expect(createStore({})).toBeInstanceOf(MemoryStore)
    expect(createStore({ KV_REST_API_URL: 'https://r', KV_REST_API_TOKEN: 't' })).toBeInstanceOf(RedisStore)
    expect(() => createStore({ VERCEL: '1' })).toThrow()
  })
})
