/// <reference types="vite/client" />

/** 建置時間 (ISO)，由 vite.config.ts 注入 */
declare const __BUILD_TIME__: string

interface ImportMetaEnv {
  /** 後端網址（不含 /api），未設定則與前端同網域 */
  readonly VITE_API_BASE?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
