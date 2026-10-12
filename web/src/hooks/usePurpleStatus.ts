import { useCallback, useEffect, useState } from 'react'
import { APP } from '@/config'
import type { PurpleStatus } from '@/models'
import { purpleApi } from '@/services'

export interface PurpleStatusState {
  status: PurpleStatus | null
  error: string
  reload: () => Promise<void>
  /** 校正成功後直接套用回傳的新狀態 */
  replace: (status: PurpleStatus) => void
}

/**
 * 定期輪詢紫洞狀態；本地時鐘跨過下一場時也會重新取得。
 * 分頁在背景（切走、手機鎖螢幕）時暫停輪詢，回到畫面立即重新取得，以節省 API 用量。
 */
export function usePurpleStatus(now: Date): PurpleStatusState {
  const [status, setStatus] = useState<PurpleStatus | null>(null)
  const [error, setError] = useState('')

  const reload = useCallback(async () => {
    try {
      setStatus(await purpleApi.getStatus())
      setError('')
    } catch (err) {
      setError(`無法取得資料（${err instanceof Error ? err.message : String(err)}）`)
    }
  }, [])

  useEffect(() => {
    let id: ReturnType<typeof setInterval> | undefined
    const stop = () => clearInterval(id)
    const start = () => {
      stop()
      void reload()
      id = setInterval(() => void reload(), APP.POLL_MS)
    }
    const onVisibility = () => (document.hidden ? stop() : start())

    if (!document.hidden) start()
    document.addEventListener('visibilitychange', onVisibility)
    return () => {
      stop()
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [reload])

  const outdated = status?.isOutdated(now) ?? false
  useEffect(() => {
    if (outdated) void reload()
  }, [outdated, reload])

  return { status, error, reload, replace: setStatus }
}
