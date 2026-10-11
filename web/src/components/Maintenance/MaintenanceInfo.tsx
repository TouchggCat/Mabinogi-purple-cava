import { APP } from '@/config'
import type { Maintenance } from '@/models'
import { TaipeiClock } from '@/utils'

/** 頁面底部：最近一次維護公告 */
export function MaintenanceInfo({ maintenance: m, now }: { maintenance: Maintenance; now: Date }) {
  return (
    <section className="maint">
      <h3>最近一次維護</h3>
      {m.isRecent(now, APP.RECENT_MAINTENANCE_DAYS) && <p className="error recent-maint">近期有維護紀錄</p>}
      <a href={m.url} target="_blank" rel="noreferrer">{m.title}</a>
      <p>
        {m.periodText}
        {m.originalEnd && <span className="muted">（原定 {TaipeiClock.monthDayTime(m.originalEnd)}）</span>}
        {m.extended && <span className="badge badge-warn">已延長</span>}
      </p>
    </section>
  )
}
