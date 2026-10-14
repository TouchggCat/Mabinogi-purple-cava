/**
 * 個人偏好（存在本機瀏覽器 localStorage）。
 * 私密視窗或停用網站資料時存取會失敗，一律安靜忽略。
 */
export class PreferenceStore {
  private static readonly CALIBRATOR_KEY = 'calibratedBy'
  private static readonly COMMENTER_KEY = 'commentName'

  constructor(private readonly storage: Pick<Storage, 'getItem' | 'setItem'> | null = PreferenceStore.defaultStorage()) {}

  private static defaultStorage(): Storage | null {
    try {
      return window.localStorage
    } catch {
      return null
    }
  }

  get calibrator(): string {
    return this.get(PreferenceStore.CALIBRATOR_KEY)
  }

  set calibrator(name: string) {
    this.set(PreferenceStore.CALIBRATOR_KEY, name)
  }

  /** 留言名稱；沒留過言時沿用校正人員名稱 */
  get commenter(): string {
    return this.get(PreferenceStore.COMMENTER_KEY) || this.calibrator
  }

  set commenter(name: string) {
    this.set(PreferenceStore.COMMENTER_KEY, name)
  }

  private get(key: string): string {
    try {
      return this.storage?.getItem(key) ?? ''
    } catch {
      return ''
    }
  }

  private set(key: string, value: string) {
    try {
      this.storage?.setItem(key, value)
    } catch {
      // 無法記住也沒關係
    }
  }
}

export const preferences = new PreferenceStore()
