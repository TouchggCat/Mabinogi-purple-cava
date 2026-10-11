/**
 * 個人偏好（存在本機瀏覽器 localStorage）。
 * 私密視窗或停用網站資料時存取會失敗，一律安靜忽略。
 */
export class PreferenceStore {
  private static readonly CALIBRATOR_KEY = 'calibratedBy'

  constructor(private readonly storage: Pick<Storage, 'getItem' | 'setItem'> | null = PreferenceStore.defaultStorage()) {}

  private static defaultStorage(): Storage | null {
    try {
      return window.localStorage
    } catch {
      return null
    }
  }

  get calibrator(): string {
    try {
      return this.storage?.getItem(PreferenceStore.CALIBRATOR_KEY) ?? ''
    } catch {
      return ''
    }
  }

  set calibrator(name: string) {
    try {
      this.storage?.setItem(PreferenceStore.CALIBRATOR_KEY, name)
    } catch {
      // 無法記住也沒關係
    }
  }
}

export const preferences = new PreferenceStore()
