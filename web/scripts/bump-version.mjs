// 推送前執行：更新 src/version.json → 頁面最下方「版本日期：YYYY/MM/DD_Vn」
// 同一天（台灣時間）再推送 n + 1，換日從 V1 開始
import { readFileSync, writeFileSync } from 'node:fs'

const file = new URL('../src/version.json', import.meta.url)
const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Taipei' }).format(new Date()).replaceAll('-', '/')
const current = JSON.parse(readFileSync(file, 'utf8'))
const next = { date: today, build: current.date === today ? current.build + 1 : 1 }
writeFileSync(file, `${JSON.stringify(next)}\n`)
console.log(`版本：${next.date}_V${next.build}`)
