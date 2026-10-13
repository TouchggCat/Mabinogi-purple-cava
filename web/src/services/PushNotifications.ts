import type { PushSubscriptionDto } from '@/models'
import { purpleApi, type PurpleApi } from './PurpleApi'

/**
 * 推播狀態
 * - unsupported：瀏覽器不支援
 * - needs-install：iPhone／iPad 需先「加入主畫面」並從主畫面開啟（iOS 16.4+）
 * - denied：使用者已封鎖通知
 * - off／on：可開關
 */
export type PushState = 'unsupported' | 'needs-install' | 'denied' | 'off' | 'on'

const SW_URL = '/sw.js'

/** VAPID 公鑰（base64url）→ applicationServerKey */
function keyBytes(base64url: string): Uint8Array<ArrayBuffer> {
  const base64 = (base64url + '='.repeat((4 - (base64url.length % 4)) % 4)).replace(/-/g, '+').replace(/_/g, '/')
  return Uint8Array.from(atob(base64), (c) => c.charCodeAt(0))
}

/** 瀏覽器推播：Service Worker 註冊、通知權限、訂閱與取消 */
export class PushNotifications {
  constructor(private readonly api: PurpleApi = purpleApi) {}

  private static get isIos(): boolean {
    const ua = navigator.userAgent
    // iPadOS 13+ 的 Safari 會偽裝成 Mac
    return /iPhone|iPad|iPod/.test(ua) || (ua.includes('Macintosh') && navigator.maxTouchPoints > 1)
  }

  private static get isStandalone(): boolean {
    return window.matchMedia('(display-mode: standalone)').matches
      || (navigator as Navigator & { standalone?: boolean }).standalone === true
  }

  private static get isSupported(): boolean {
    return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window
  }

  private async subscription(): Promise<PushSubscription | null> {
    const reg = await navigator.serviceWorker.getRegistration(SW_URL)
    return (await reg?.pushManager.getSubscription()) ?? null
  }

  /** 目前狀態；已開啟時順便把訂閱同步給伺服器（伺服器可能已刪除失效的訂閱） */
  async state(): Promise<PushState> {
    if (PushNotifications.isIos && !PushNotifications.isStandalone) return 'needs-install'
    if (!PushNotifications.isSupported) return 'unsupported'
    if (Notification.permission === 'denied') return 'denied'
    const sub = Notification.permission === 'granted' ? await this.subscription() : null
    if (!sub) return 'off'
    void this.api.subscribePush(sub.toJSON() as PushSubscriptionDto).catch(() => {})
    return 'on'
  }

  /** 需在使用者點擊後呼叫：先詢問通知權限（iOS 規定），再訂閱並交給伺服器 */
  async enable(): Promise<PushState> {
    const permission = await Notification.requestPermission()
    if (permission === 'denied') return 'denied'
    if (permission !== 'granted') return 'off'

    const { public_key } = await this.api.pushConfig()
    if (!public_key) throw new Error('伺服器尚未啟用推播')
    await navigator.serviceWorker.register(SW_URL)
    const reg = await navigator.serviceWorker.ready
    const sub = (await reg.pushManager.getSubscription())
      ?? (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyBytes(public_key) }))
    await this.api.subscribePush(sub.toJSON() as PushSubscriptionDto)
    return 'on'
  }

  async disable(): Promise<PushState> {
    const sub = await this.subscription()
    if (sub) {
      await this.api.unsubscribePush(sub.endpoint).catch(() => {})
      await sub.unsubscribe()
    }
    return 'off'
  }
}

export const pushNotifications = new PushNotifications()
