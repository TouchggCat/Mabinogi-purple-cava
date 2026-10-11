/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** 後端網址（不含 /api），未設定則與前端同網域 */
  readonly VITE_API_BASE?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
