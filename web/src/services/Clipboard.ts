/**
 * 複製文字到剪貼簿。
 * Clipboard API 只在 HTTPS／localhost 可用，其他情況（例如區網 http 預覽、部分 App 內建瀏覽器）退回 execCommand。
 */
export class Clipboard {
  static async copy(text: string): Promise<boolean> {
    try {
      if (window.isSecureContext && navigator.clipboard) {
        await navigator.clipboard.writeText(text)
        return true
      }
    } catch {
      // 權限被拒等情況 → 改用舊方法
    }
    return Clipboard.legacyCopy(text)
  }

  private static legacyCopy(text: string): boolean {
    const area = document.createElement('textarea')
    area.value = text
    area.setAttribute('readonly', '')
    area.style.cssText = 'position:fixed;top:0;left:0;opacity:0;pointer-events:none'
    document.body.append(area)
    area.select()
    area.setSelectionRange(0, text.length) // iOS 需要
    try {
      return document.execCommand('copy')
    } catch {
      return false
    } finally {
      area.remove()
    }
  }
}
