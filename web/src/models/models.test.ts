import { describe, expect, it } from 'vitest'
import { CalibrationDraft, Maintenance, PurpleStatus, SpawnSpan, type StatusDto } from '@/models'
import { Duration, TaipeiClock } from '@/utils'

const tw = (s: string) => new Date(`${s}+08:00`)

describe('TaipeiClock', () => {
  it('formats in Taipei time', () => {
    const d = tw('2026-10-07T14:40:00')
    expect(TaipeiClock.monthDayTime(d)).toBe('10/07 14:40')
    expect(TaipeiClock.dateInput(d)).toBe('2026-10-07')
  })

  it('parses inputs and rejects overflowed dates', () => {
    expect(TaipeiClock.fromInputs('2026-10-07', '14:40')).toEqual(tw('2026-10-07T14:40:00'))
    expect(TaipeiClock.fromInputs('2026-02-30', '10:00')).toBeNull()
    expect(TaipeiClock.fromInputs('2026-10-07', '')).toBeNull()
  })
})

describe('Duration', () => {
  it.each([[0, '0 秒'], [65_000, '1 分 05 秒'], [3 * 3600_000 + 5 * 60_000, '3 小時 05 分']])('%i ms → %s', (ms, text) => {
    expect(new Duration(ms).toString()).toBe(text)
  })
})

describe('SpawnSpan', () => {
  it('follows the 36h15m cycle (Mon 12:00 → Wed 00:15)', () => {
    const next = SpawnSpan.openingAt(tw('2026-10-05T12:00:00')).following()
    expect(next.start).toEqual(tw('2026-10-07T00:15:00'))
    expect(next.end).toEqual(tw('2026-10-07T00:30:00'))
  })

  it('reports its phase', () => {
    const span = SpawnSpan.openingAt(tw('2026-10-07T14:40:00'))
    expect(span.phase(tw('2026-10-07T14:39:59'))).toBe('upcoming')
    expect(span.phase(tw('2026-10-07T14:40:00'))).toBe('open')
    expect(span.phase(tw('2026-10-07T14:55:00'))).toBe('ended')
  })

  it('is open for 15 minutes', () => {
    const span = SpawnSpan.openingAt(tw('2026-10-07T14:40:00'))
    expect(span.isOpen(tw('2026-10-07T14:54:59'))).toBe(true)
    expect(span.isOpen(tw('2026-10-07T14:55:00'))).toBe(false)
  })
})

describe('CalibrationDraft', () => {
  const now = tw('2026-10-11T20:00:00')

  it('previews what the page will show (rotates 12h after a spawn ends)', () => {
    const r = new CalibrationDraft('2026-10-09', '02:55', ' 阿紫 ').validate(now)
    expect(r).toEqual({ ok: true, preview: {
      spawn: tw('2026-10-09T02:55:00'), recent: tw('2026-10-12T03:25:00'), next: tw('2026-10-13T15:40:00'), by: '阿紫',
    } })
  })

  it('accepts a future time as the recent spawn', () => {
    const r = new CalibrationDraft('2026-10-12', '08:00', 'a').validate(now)
    expect(r.ok && r.preview.next).toEqual(tw('2026-10-13T20:15:00'))
  })

  it.each([
    ['2026-10-14', '20:01', 'a', '請選擇現在前後 3 天內的日期與時間'],
    ['2026-10-08', '19:59', 'a', '請選擇現在前後 3 天內的日期與時間'],
    ['2026-10-11', '10:00', '  ', '請輸入校正人員'],
    ['2026-10-11', '10:00', 'x'.repeat(21), '校正人員最多 20 字'],
  ])('%s %s by %j → error', (date, time, by, error) => {
    expect(new CalibrationDraft(date, time, by).validate(now)).toEqual({ ok: false, error })
  })

  it('builds the API request and date range', () => {
    expect(new CalibrationDraft('2026-10-11', '19:40', ' 阿紫 ').toRequest()).toEqual({ time: '2026-10-11 19:40', by: '阿紫' })
    expect(CalibrationDraft.dateRange(now)).toEqual({ min: '2026-10-08', max: '2026-10-14' })
  })
})

describe('Maintenance', () => {
  const dto = { title: 't', url: 'u', type: '例行', start: '2026-10-08T06:00:00+08:00', end: null,
    original_end: null, posted_at: '2026-10-07T18:00:00+08:00', extended: false }

  it('is recent within 3 days', () => {
    const m = Maintenance.fromDto(dto)
    expect(m.isRecent(tw('2026-10-11T06:00:00'), 3)).toBe(true)
    expect(m.isRecent(tw('2026-10-11T06:01:00'), 3)).toBe(false)
    expect(Maintenance.fromDto({ ...dto, start: null }).isRecent(tw('2026-10-10T18:00:00'), 3)).toBe(true)
  })
})

describe('PurpleStatus', () => {
  const dto: StatusDto = {
    now: '2026-10-07T20:00:00+08:00', anchor: '2026-10-07T14:40:00+08:00',
    calibrated_at: '2026-10-07T20:00:00+08:00', calibrated_by: '阿紫',
    recent: { start: '2026-10-07T14:40:00+08:00', end: '2026-10-07T14:55:00+08:00' },
    next: { start: '2026-10-09T02:55:00+08:00', end: '2026-10-09T03:10:00+08:00' },
    needs_calibration: true, calibration_history: [], maintenance: null, last_crawl: null, crawl_history: [],
  }

  it('maps the DTO and derives flags', () => {
    const s = PurpleStatus.fromDto(dto)
    expect(s.isCalibrated).toBe(true)
    expect(s.isDisruptedByMaintenance).toBe(true)
    // 14:40 場次 14:55 結束，再 12 小時（10/08 02:55）輪換
    expect(s.isOutdated(tw('2026-10-08T02:54:59'))).toBe(false)
    expect(s.isOutdated(tw('2026-10-08T02:55:00'))).toBe(true)
  })

  it('is not disrupted before the first calibration', () => {
    expect(PurpleStatus.fromDto({ ...dto, recent: null, next: null }).isDisruptedByMaintenance).toBe(false)
  })
})
