const pad = (n: number) => String(n).padStart(2, '0')

/** 剩餘時間的顯示文字 */
export class Duration {
  constructor(readonly ms: number) {}

  static between(from: Date, to: Date): Duration {
    return new Duration(to.getTime() - from.getTime())
  }

  /** `3 小時 05 分`／`12 分 08 秒`／`0 秒` */
  toString(): string {
    if (this.ms <= 0) return '0 秒'
    const total = Math.floor(this.ms / 1000)
    const h = Math.floor(total / 3600)
    const m = Math.floor((total % 3600) / 60)
    const s = total % 60
    return h > 0 ? `${h} 小時 ${pad(m)} 分` : `${m} 分 ${pad(s)} 秒`
  }
}
