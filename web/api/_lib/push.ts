import webpush from 'web-push'
import type { PushConfigDto, PushSubscriptionDto } from '../../shared/dto.js'
import { PURPLE } from '../../shared/rules.js'
import { TaipeiClock } from '../../shared/TaipeiClock.js'
import { HttpError } from './http.js'
import { getService, type PurpleService } from './service.js'
import { getStore, type PurpleStore } from './store.js'

/** 推播訂閱上限（避免被灌爆） */
const MAX_SUBSCRIPTIONS = 2000
/** 錯過提醒時間超過此值就不補發（例如排程延遲、剛校正到更近的時間） */
const GRACE_MS = 20 * 60_000

export interface PushMessage {
  title: string
  body: string
  /** 同 tag 的通知會取代前一則 */
  tag: string
  url: string
}

/** 實際送出推播；回傳 'gone' 代表訂閱已失效（使用者取消或解除安裝），應刪除 */
export interface PushSender {
  send(sub: PushSubscriptionDto, message: PushMessage): Promise<'ok' | 'gone' | 'failed'>
}

export interface Vapid {
  publicKey: string
  privateKey: string
  subject: string
}

/** web-push 套件（VAPID 簽章＋加密） */
export class WebPushSender implements PushSender {
  constructor(private readonly vapid: Vapid) {}

  async send(sub: PushSubscriptionDto, message: PushMessage): Promise<'ok' | 'gone' | 'failed'> {
    try {
      await webpush.sendNotification(sub, JSON.stringify(message), {
        TTL: GRACE_MS / 1000,
        urgency: 'high',
        vapidDetails: this.vapid,
      })
      return 'ok'
    } catch (err) {
      const status = (err as { statusCode?: number }).statusCode
      if (status === 404 || status === 410) return 'gone'
      console.error('推播失敗', status, err)
      return 'failed'
    }
  }
}

const isStr = (v: unknown, max: number): v is string => typeof v === 'string' && v.length > 0 && v.length <= max
const isObject = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null

function toSubscription(v: unknown): PushSubscriptionDto | null {
  if (!isObject(v) || !isStr(v.endpoint, 1000) || !v.endpoint.startsWith('https://') || !isObject(v.keys)) return null
  const { p256dh, auth } = v.keys
  if (!isStr(p256dh, 200) || !isStr(auth, 200)) return null
  return { endpoint: v.endpoint, keys: { p256dh, auth } }
}

/** `4 小時`／`30 分鐘` */
const leadText = (minutes: number) => (minutes >= 60 ? `${minutes / 60} 小時` : `${minutes} 分鐘`)

export interface NotifyResult {
  spawn: string | null
  /** 這次發送的提醒（開啟前幾分鐘）；沒有到點則為 null */
  reminder: number | null
  delivered: number
  removed: number
  failed: number
}

/** 紫洞開啟前提醒：訂閱管理＋定時檢查（由外部排程每 5 分鐘呼叫 notify） */
export class PushService {
  constructor(
    private readonly store: PurpleStore,
    private readonly purple: PurpleService,
    private readonly sender: PushSender | null,
    private readonly publicKey: string | null,
    private readonly notifyToken: string | undefined,
    private readonly clock: () => Date = () => new Date(),
  ) {}

  config(): PushConfigDto {
    return { public_key: this.sender ? this.publicKey : null }
  }

  async subscribe(body: unknown): Promise<{ ok: true }> {
    if (!this.sender) throw new HttpError(503, '推播尚未啟用')
    const sub = toSubscription(body)
    if (!sub) throw new HttpError(400, '推播訂閱格式錯誤')
    if (!(await this.store.addPushSubscription(sub, MAX_SUBSCRIPTIONS))) throw new HttpError(503, '推播訂閱人數已滿')
    return { ok: true }
  }

  async unsubscribe(body: unknown): Promise<{ ok: true }> {
    if (!isObject(body) || !isStr(body.endpoint, 1000)) throw new HttpError(400, '推播訂閱格式錯誤')
    await this.store.removePushSubscriptions([body.endpoint])
    return { ok: true }
  }

  async notify(authorization: string | null): Promise<NotifyResult> {
    if (!this.notifyToken) throw new HttpError(503, '伺服器未設定 NOTIFY_TOKEN')
    if (authorization !== `Bearer ${this.notifyToken}`) throw new HttpError(401, '未授權')

    const now = this.clock()
    const status = await this.purple.status()
    const result: NotifyResult = { spawn: null, reminder: null, delivered: 0, removed: 0, failed: 0 }
    // 下一場尚未開始的紫洞（最近那場已開始就看下一次預計）
    const span = [status.recent, status.next].find((s) => s && Date.parse(s.start) > now.getTime())
    if (!span || !this.sender) return result
    result.spawn = span.start

    const start = Date.parse(span.start)
    const log = await this.store.pushLog()
    const sent = log?.spawn === span.start ? log.sent : []
    const due = PURPLE.REMINDER_MINUTES.filter((m) => {
      const at = start - m * 60_000
      return at <= now.getTime() && now.getTime() - at < GRACE_MS && !sent.includes(m)
    })
    if (!due.length) return result

    const reminder = Math.min(...due)
    result.reminder = reminder
    // 先記錄再發送，排程重複觸發也不會重複推播
    await this.store.savePushLog({ spawn: span.start, sent: [...sent, ...due] })

    const time = `${TaipeiClock.monthDay(span.start)}  ${TaipeiClock.hourMinute(span.start)} – ${TaipeiClock.hourMinute(span.end)}`
    const warning = status.needs_calibration ? '\n維護後尚未重新校正，時間可能不準' : ''
    const message: PushMessage = {
      title: `紫洞再 ${leadText(reminder)}開啟`,
      body: `${time}${warning}`,
      tag: 'purple-reminder',
      url: '/',
    }

    const subs = await this.store.pushSubscriptions()
    const outcomes = await Promise.all(subs.map((s) => this.sender!.send(s, message)))
    const gone = subs.filter((_, i) => outcomes[i] === 'gone').map((s) => s.endpoint)
    await this.store.removePushSubscriptions(gone)
    result.delivered = outcomes.filter((o) => o === 'ok').length
    result.removed = gone.length
    result.failed = outcomes.filter((o) => o === 'failed').length
    return result
  }
}

/** VAPID 金鑰（Vercel 環境變數）；未設定時推播停用 */
export function vapidFromEnv(env: Record<string, string | undefined> = process.env): Vapid | null {
  const { VAPID_PUBLIC_KEY: publicKey, VAPID_PRIVATE_KEY: privateKey } = env
  if (!publicKey || !privateKey) return null
  const site = env.VERCEL_PROJECT_PRODUCTION_URL
  const subject = env.VAPID_SUBJECT ?? (site ? `https://${site}` : 'https://localhost')
  return { publicKey, privateKey, subject }
}

let shared: PushService | null = null

export function getPushService(): PushService {
  if (!shared) {
    const vapid = vapidFromEnv()
    shared = new PushService(
      getStore(), getService(), vapid && new WebPushSender(vapid), vapid?.publicKey ?? null, process.env.NOTIFY_TOKEN,
    )
  }
  return shared
}
