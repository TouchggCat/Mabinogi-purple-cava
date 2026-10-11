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

/** 定期輪詢紫洞狀態；本地時鐘跨過下一場時也會重新取得 */
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
    void reload()
    const id = setInterval(() => void reload(), APP.POLL_MS)
    return () => clearInterval(id)
  }, [reload])

  const outdated = status?.isOutdated(now) ?? false
  useEffect(() => {
    if (outdated) void reload()
  }, [outdated, reload])

  return { status, error, reload, replace: setStatus }
}
